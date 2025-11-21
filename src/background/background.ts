/**
 * Background service worker for zkTLS extension
 */

import { initializeProviders, providerRegistry } from '../providers';
import { generateSnapshotId } from '../utils/uuid';
import { generateCommitment, generateRandomness } from '../crypto/commitment';
import { storeSnapshot, getEncryptionKey, deriveEncryptionKey, setEncryptionKey } from '../crypto/storage';
import { createSnapshot } from '../api/backend';
import { TLSSnapshotSecret } from '../types';
import { generateZkTLSProof } from '../circuits/zktls';
import { tlsNotaryService } from '../services/tlsnotary';

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

    // Send to backend
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
    const { revokeSnapshot, deleteSnapshot } = await import('../api/backend');
    const { getEncryptionKey } = await import('../crypto/storage');
    
    const response = await revokeSnapshot(
      message.snapshotId,
      message.userAddress,
      message.reason,
      message.signature
    );

    if (response.success) {
      // Delete local snapshot
      await deleteSnapshot(message.snapshotId);
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

