/**
 * Background service worker for zkTLS extension
 */

import { initializeProviders, providerRegistry } from '../providers';
import { generateSnapshotId } from '../utils/uuid';
import { generateCommitment, generateRandomness } from '../crypto/commitment';
import { storeSnapshot, getEncryptionKey, deriveEncryptionKey, setEncryptionKey } from '../crypto/storage';
import { createSnapshot } from '../api/backend';
import { TLSSnapshotSecret, ProviderId } from '../types';
import { generateZkTLSProof } from '../circuits/zktls';
import { tlsNotaryService } from '../services/tlsnotary';
import { computeHumanScoreLocal, ProviderAttributes } from '../services/localScoring';

// Initialize providers on startup
initializeProviders();

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('[zkTLS Extension] Installed');
});

/**
 * Handle messages from popup/content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void
) {
  try {
    switch (message.type) {
      case 'CREATE_SNAPSHOT':
        await handleCreateSnapshot(message, sendResponse);
        break;
      case 'LIST_SNAPSHOTS':
        await handleListSnapshots(message, sendResponse);
        break;
      case 'GENERATE_PROOF':
        await handleGenerateProof(message, sendResponse);
        break;
      case 'REVOKE_SNAPSHOT':
        await handleRevokeSnapshot(message, sendResponse);
        break;
      case 'CHECK_PROVIDER':
        await handleCheckProvider(message, sendResponse);
        break;
      case 'START_SNAPSHOT_FROM_OVERLAY':
        await handleStartSnapshotFromOverlay(message, sendResponse);
        break;
      case 'SHOW_PROVIDER_OVERLAY':
        await handleShowProviderOverlay(message, sendResponse);
        break;
      case 'HIDE_PROVIDER_OVERLAY':
        await handleHideProviderOverlay(message, sendResponse);
        break;
      case 'SET_WALLET_ADDRESS':
        await handleSetWalletAddress(message, sendResponse);
        break;
      case 'PING':
        sendResponse({ success: true, message: 'Extension is ready' });
        break;
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('[Background] Error handling message:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Create snapshot for a provider
 */
async function handleStartSnapshotFromOverlay(
  message: { provider: string },
  sendResponse: (response: any) => void
) {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      sendResponse({ success: false, error: 'No active tab' });
      return;
    }

    // Verify provider matches current tab
    const url = new URL(tab.url!);
    const detectedAdapter = providerRegistry.findByHost(url.hostname);
    
    if (!detectedAdapter || detectedAdapter.id !== message.provider) {
      sendResponse({ 
        success: false, 
        error: `Provider mismatch. Expected ${message.provider} but current page is ${detectedAdapter?.id || 'unknown'}` 
      });
      return;
    }

    // Get user address from storage
    const result = await chrome.storage.local.get('userAddress');
    const userAddress = result.userAddress;

    if (!userAddress) {
      sendResponse({ 
        success: false, 
        error: 'Wallet not connected. Please connect wallet first.' 
      });
      return;
    }

    // Trigger snapshot creation (without signature for now, can be added later)
    handleCreateSnapshot(
      { provider: message.provider, userAddress, signature: undefined },
      sendResponse
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Background] Error starting snapshot from overlay:', errorMessage);
    sendResponse({ success: false, error: errorMessage });
  }
}

async function handleCreateSnapshot(
  message: { provider: string; userAddress: string; signature?: string },
  sendResponse: (response: any) => void
) {
  try {
    const { provider, userAddress, signature } = message;
    const adapter = providerRegistry.get(provider as any);
    
    if (!adapter) {
      sendResponse({ success: false, error: `Unknown provider: ${provider}` });
      return;
    }

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }

    // Check if logged in
    const isLoggedIn = await adapter.isLoggedIn(tab);
    if (!isLoggedIn) {
      sendResponse({ success: false, error: 'Not logged in to provider' });
      return;
    }

    // Fetch attributes using TLSNotary (preferred method)
    let attrs;
    let tlsNotaryProof = null;
    
    try {
      // Try TLSNotary method first (if adapter supports it)
      if (typeof (adapter as any).fetchAttributesWithTLSNotary === 'function') {
        attrs = await (adapter as any).fetchAttributesWithTLSNotary(tab);
        // Capture TLS proof for later use
        tlsNotaryProof = await (adapter as any).captureTLSProof(tab);
      } else {
        // Fallback to DOM scraping
        attrs = await adapter.fetchAttributes(tab);
      }
    } catch (error) {
      console.error('[Background] TLSNotary capture failed, falling back to DOM:', error);
      // Fallback to DOM scraping
      attrs = await adapter.fetchAttributes(tab);
    }

    // Generate commitment
    const randomness = generateRandomness();
    const commitment = await generateCommitment(attrs, randomness);
    
    // Generate zkTLS proof if TLSNotary proof is available
    let initialProofHash: string | undefined;
    if (tlsNotaryProof) {
      try {
        const zkTLSProof = await generateZkTLSProof(
          tlsNotaryProof,
          adapter.id,
          1
        );
        // Hash the proof for storage
        const proofString = JSON.stringify(zkTLSProof);
        initialProofHash = '0x' + Array.from(new TextEncoder().encode(proofString))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } catch (error) {
        console.error('[Background] Error generating zkTLS proof:', error);
      }
    }

    // Create snapshot secret
    const snapshotId = generateSnapshotId();
    const now = Date.now();
    const expiresAt = now + adapter.getDefaultExpiry();

    const snapshotSecret: TLSSnapshotSecret = {
      snapshotId,
      userAddress,
      provider: adapter.id,
      attrs,
      randomness,
      createdAt: now,
      expiresAt,
      snapshotVersion: 1
    };

    // Derive encryption key
    if (!signature) {
      sendResponse({ success: false, error: 'Wallet signature required' });
      return;
    }

    const encryptionKey = await deriveEncryptionKey(userAddress, signature);
    setEncryptionKey(encryptionKey);

    // Store encrypted snapshot locally
    await storeSnapshot(snapshotSecret, encryptionKey);

    // Compute human scores locally (privacy-preserving - no raw metrics sent to backend)
    const localAttributes: ProviderAttributes = {};
    if (adapter.id === 'twitter') {
      const twitterAttrs = attrs as any;
      localAttributes.followers = Number(twitterAttrs.followers || 0);
      localAttributes.hasBlueCheck = Boolean(twitterAttrs.hasBlueCheck);
      localAttributes.accountAgeDays = Number(twitterAttrs.accountAgeDays || 0);
    } else if (['binance', 'coinbase', 'okx', 'kucoin'].includes(adapter.id)) {
      const exchangeAttrs = attrs as any;
      localAttributes.kycLevel = Number(exchangeAttrs.kycLevel || 0);
      localAttributes.accountAgeDays = Number(exchangeAttrs.accountAgeDays || 0);
    } else if (adapter.id === 'linkedin') {
      const linkedinAttrs = attrs as any;
      localAttributes.connections = Number(linkedinAttrs.connections || 0);
      localAttributes.accountAgeDays = Number(linkedinAttrs.accountAgeDays || 0);
    } else if (['youtube', 'tiktok', 'twitch'].includes(adapter.id)) {
      const creatorAttrs = attrs as any;
      localAttributes.subsOrFollowers = Number(creatorAttrs.subsOrFollowers || 0);
      localAttributes.totalViewsBucket = Number(creatorAttrs.totalViewsBucket || 0);
      localAttributes.partnerStatus = Boolean(creatorAttrs.partnerStatus);
      localAttributes.accountAgeDays = Number(creatorAttrs.accountAgeDays || 0);
    }

    // Compute scores locally - only send final score/points, not raw metrics
    const localScoreResult = computeHumanScoreLocal(adapter.id, localAttributes);

    // Send to backend (only computed scores, NOT raw metrics)
    const backendResponse = await createSnapshot(
      {
        userAddress,
        provider: adapter.id,
        snapshotType: adapter.getSnapshotType(),
        commitment,
        commitmentScheme: 'poseidon',
        snapshotVersion: 1,
        snapshotAt: Math.floor(now / 1000),
        expiresAt: Math.floor(expiresAt / 1000),
        verificationMethod: 'extension_chrome',
        initialProofHash,
        // Only send computed scores, not raw metrics (privacy-preserving)
        computedScore: localScoreResult.scoreDelta > 0 ? localScoreResult.scoreDelta : undefined,
        computedPoints: localScoreResult.pointsDelta > 0 ? localScoreResult.pointsDelta : undefined,
      },
      signature
    );

    if (!backendResponse.success) {
      sendResponse({ success: false, error: backendResponse.error });
      return;
    }

    sendResponse({
      success: true,
      snapshotId,
      commitment
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * List snapshots for user
 */
async function handleListSnapshots(
  message: { userAddress: string; signature?: string },
  sendResponse: (response: any) => void
) {
  try {
    const { listSnapshots } = await import('../api/backend');
    const response = await listSnapshots(message.userAddress, message.signature);
    sendResponse(response);
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Generate proof from snapshot
 */
async function handleGenerateProof(
  message: { snapshotId: string; policyId: string; policyParams: any; userAddress: string; signature?: string },
  sendResponse: (response: any) => void
) {
  try {
    // This will be implemented with zkPolicy_from_snapshot circuit
    sendResponse({
      success: false,
      error: 'Proof generation not yet implemented'
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Revoke snapshot
 */
async function handleRevokeSnapshot(
  message: { snapshotId: string; userAddress: string; reason: string; signature?: string },
  sendResponse: (response: any) => void
) {
  try {
    const { revokeSnapshot } = await import('../api/backend');
    const { getEncryptionKey } = await import('../crypto/storage');
    
    const response = await revokeSnapshot(
      message.snapshotId,
      message.userAddress,
      message.reason,
      message.signature
    );

    if (response.success) {
      // Delete local snapshot
      const { deleteSnapshot: deleteLocalSnapshot } = await import('../crypto/storage');
      await deleteLocalSnapshot(message.snapshotId);
    }

    sendResponse(response);
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Check if provider is available on current tab
 */
async function handleCheckProvider(
  message: { url?: string },
  sendResponse: (response: any) => void
) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      sendResponse({ success: false, error: 'No active tab' });
      return;
    }

    const url = new URL(tab.url);
    const adapter = providerRegistry.findByHost(url.hostname);

    if (!adapter) {
      sendResponse({ success: false, provider: null });
      return;
    }

    const isLoggedIn = await adapter.isLoggedIn(tab);
    sendResponse({
      success: true,
      provider: adapter.id,
      isLoggedIn
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Show provider overlay on current tab
 * Called from platform/dashboard when user clicks provider tab
 */
async function handleShowProviderOverlay(
  message: { provider: ProviderId; tabId?: number },
  sendResponse: (response: any) => void
) {
  try {
    let tab: chrome.tabs.Tab | undefined;
    
    if (message.tabId) {
      // Use provided tab ID
      tab = await chrome.tabs.get(message.tabId);
    } else {
      // Get current active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = activeTab;
    }

    if (!tab || !tab.id) {
      sendResponse({ success: false, error: 'No tab found' });
      return;
    }

    // Verify provider matches tab URL
    if (tab.url) {
      const url = new URL(tab.url);
      const adapter = providerRegistry.findByHost(url.hostname);
      
      if (!adapter || adapter.id !== message.provider) {
        sendResponse({ 
          success: false, 
          error: `Provider ${message.provider} does not match current page (${url.hostname})` 
        });
        return;
      }
    }

    // Send message to content script to show overlay
    await chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_OVERLAY',
      provider: message.provider
    });

    sendResponse({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Background] Error showing overlay:', errorMessage);
    sendResponse({ success: false, error: errorMessage });
  }
}

/**
 * Hide provider overlay on current tab
 */
async function handleHideProviderOverlay(
  message: { tabId?: number },
  sendResponse: (response: any) => void
) {
  try {
    let tab: chrome.tabs.Tab | undefined;
    
    if (message.tabId) {
      tab = await chrome.tabs.get(message.tabId);
    } else {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = activeTab;
    }

    if (!tab || !tab.id) {
      sendResponse({ success: false, error: 'No tab found' });
      return;
    }

    // Send message to content script to hide overlay
    await chrome.tabs.sendMessage(tab.id, {
      type: 'HIDE_OVERLAY'
    });

    sendResponse({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Background] Error hiding overlay:', errorMessage);
    sendResponse({ success: false, error: errorMessage });
  }
}

/**
 * Set wallet address from dashboard
 */
async function handleSetWalletAddress(
  message: { address: string },
  sendResponse: (response: any) => void
) {
  try {
    if (!message.address || typeof message.address !== 'string') {
      sendResponse({ success: false, error: 'Invalid address' });
      return;
    }

    // Store wallet address in extension storage
    await chrome.storage.local.set({ userAddress: message.address.toLowerCase() });
    
    console.log('[Background] Wallet address set:', message.address);
    sendResponse({ success: true, address: message.address });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Background] Error setting wallet address:', errorMessage);
    sendResponse({ success: false, error: errorMessage });
  }
}

