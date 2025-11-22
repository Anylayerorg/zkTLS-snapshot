/**
 * Floating overlay for all TLS providers
 * Shows guide, conditions, and Start button
 */

import type { ProviderId } from '../types';
import { getProviderOverlayConfig } from '../config/provider-overlay-config';

/**
 * Detect provider from current page hostname
 */
function detectProvider(): ProviderId | null {
  const hostname = window.location.hostname.toLowerCase();
  
  // Check each provider's host patterns
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return 'twitter';
  } else if (hostname.includes('binance.com')) {
    return 'binance';
  } else if (hostname.includes('okx.com')) {
    return 'okx';
  } else if (hostname.includes('kucoin.com')) {
    return 'kucoin';
  } else if (hostname.includes('coinbase.com')) {
    return 'coinbase';
  } else if (hostname.includes('linkedin.com')) {
    return 'linkedin';
  } else if (hostname.includes('fiverr.com')) {
    return 'fiverr';
  } else if (hostname.includes('upwork.com')) {
    return 'upwork';
  } else if (hostname.includes('youtube.com')) {
    return 'youtube';
  } else if (hostname.includes('tiktok.com')) {
    return 'tiktok';
  } else if (hostname.includes('twitch.tv')) {
    return 'twitch';
  }
  
  return null;
}

/**
 * Check if user is logged in (provider-specific)
 */
function checkLoginStatus(provider: ProviderId): boolean {
  const hostname = window.location.hostname.toLowerCase();
  
  switch (provider) {
    case 'twitter':
      return !!(
        document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]') ||
        document.querySelector('[aria-label*="Account menu"]')
      );
    case 'binance':
    case 'okx':
    case 'kucoin':
    case 'coinbase':
      return !!document.querySelector('[class*="user-menu"]') ||
             !!document.querySelector('[data-testid="user-menu"]') ||
             !!document.cookie.split(';').find(c => c.trim().startsWith('auth_token=') || c.trim().startsWith('token='));
    case 'linkedin':
      return !!document.cookie.split(';').find(c => c.trim().startsWith('li_at='));
    case 'fiverr':
      return !!document.cookie.split(';').find(c => c.trim().startsWith('fiverr_session='));
    case 'upwork':
      return !!document.cookie.split(';').find(c => c.trim().startsWith('oauth_token='));
    case 'youtube':
      return !!document.cookie.split(';').find(c => c.trim().startsWith('LOGIN_INFO='));
    case 'tiktok':
      return !!document.cookie.split(';').find(c => c.trim().startsWith('tt_chain_token='));
    case 'twitch':
      return !!document.cookie.split(';').find(c => c.trim().startsWith('auth-token='));
    default:
      return false;
  }
}

/**
 * Create provider overlay
 */
export function createProviderOverlay(providerId?: ProviderId) {
  // Detect provider if not provided
  const provider = providerId || detectProvider();
  
  if (!provider) {
    console.warn('[AnyLayer Overlay] No provider detected for current page');
    return null;
  }

  // Remove existing overlay if present
  const existing = document.getElementById('anylayer-zkTLS-overlay');
  if (existing) {
    existing.remove();
  }

  const config = getProviderOverlayConfig(provider);
  const providerName = config.providerName;

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'anylayer-zkTLS-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    width: 360px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 24px;
    max-height: 80vh;
    overflow-y: auto;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e0e0e0;
  `;

  const logo = document.createElement('div');
  logo.style.cssText = `
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 18px;
  `;
  logo.textContent = 'AL';

  const headerText = document.createElement('div');
  headerText.style.cssText = `
    flex: 1;
  `;
  const title = document.createElement('div');
  title.style.cssText = `
    font-weight: 600;
    font-size: 16px;
    color: #1a1a1a;
    margin-bottom: 4px;
  `;
  title.textContent = 'zkTLS runs locally in your browser. Your data is safe!';
  
  const audit = document.createElement('div');
  audit.style.cssText = `
    font-size: 12px;
    color: #666;
  `;
  audit.innerHTML = 'Audited by <strong>HALBORN</strong>';

  headerText.appendChild(title);
  headerText.appendChild(audit);
  header.appendChild(logo);
  header.appendChild(headerText);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    color: #666;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    line-height: 1;
  `;
  closeBtn.onclick = () => overlay.remove();
  header.appendChild(closeBtn);

  // Verification Guide section
  const guideSection = document.createElement('div');
  guideSection.style.cssText = `
    background: #f5f5f5;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
  `;
  const guideTitle = document.createElement('div');
  guideTitle.style.cssText = `
    font-weight: 600;
    font-size: 14px;
    color: #1a1a1a;
    margin-bottom: 8px;
  `;
  guideTitle.textContent = 'Verification Guide:';
  const guideText = document.createElement('div');
  guideText.style.cssText = `
    font-size: 13px;
    color: #666;
    line-height: 1.5;
  `;
  guideText.textContent = config.guide;
  guideSection.appendChild(guideTitle);
  guideSection.appendChild(guideText);

  // Conditions section
  const conditionsSection = document.createElement('div');
  conditionsSection.style.cssText = `
    background: #f5f5f5;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
  `;
  const conditionsTitle = document.createElement('div');
  conditionsTitle.style.cssText = `
    font-weight: 600;
    font-size: 14px;
    color: #1a1a1a;
    margin-bottom: 8px;
  `;
  conditionsTitle.textContent = 'Conditions to Satisfy:';
  const conditionsList = document.createElement('ul');
  conditionsList.style.cssText = `
    margin: 0;
    padding-left: 20px;
    font-size: 13px;
    color: #666;
    line-height: 1.8;
  `;
  // Add conditions from config
  config.conditions.forEach(condition => {
    const li = document.createElement('li');
    li.textContent = condition;
    conditionsList.appendChild(li);
  });
  conditionsSection.appendChild(conditionsTitle);
  conditionsSection.appendChild(conditionsList);

  // Status indicator
  const statusDiv = document.createElement('div');
  statusDiv.id = 'anylayer-status';
  statusDiv.style.cssText = `
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 8px;
    font-size: 13px;
    display: none;
  `;

  // Start button
  const startBtn = document.createElement('button');
  startBtn.id = 'anylayer-start-btn';
  startBtn.textContent = 'Start';
  startBtn.style.cssText = `
    width: 100%;
    padding: 14px;
    background: #1a1a1a;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  `;
  startBtn.onmouseover = () => {
    startBtn.style.background = '#333';
  };
  startBtn.onmouseout = () => {
    startBtn.style.background = '#1a1a1a';
  };

  // Footer
  const footer = document.createElement('div');
  footer.style.cssText = `
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #e0e0e0;
    text-align: center;
    font-size: 12px;
    color: #999;
  `;
  footer.textContent = 'Powered by AnyLayer';

  // Assemble overlay
  overlay.appendChild(header);
  overlay.appendChild(guideSection);
  overlay.appendChild(conditionsSection);
  overlay.appendChild(statusDiv);
  overlay.appendChild(startBtn);
  overlay.appendChild(footer);

  // Add to page
  document.body.appendChild(overlay);

  // Handle Start button click
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Starting...';
    startBtn.style.opacity = '0.6';
    startBtn.style.cursor = 'not-allowed';

    // Show status
    statusDiv.style.display = 'block';
    statusDiv.style.background = '#e3f2fd';
    statusDiv.style.color = '#1976d2';
    statusDiv.textContent = '⏳ Initiating verification...';

    try {
      // Send message to background script to start snapshot creation
      const response = await chrome.runtime.sendMessage({
        type: 'START_SNAPSHOT_FROM_OVERLAY',
        provider: provider
      });

      if (response.success) {
        statusDiv.style.background = '#e8f5e9';
        statusDiv.style.color = '#2e7d32';
        statusDiv.textContent = '✅ Verification started! Check extension popup for progress.';
        startBtn.textContent = 'Started';
      } else {
        throw new Error(response.error || 'Failed to start verification');
      }
    } catch (error) {
      statusDiv.style.background = '#ffebee';
      statusDiv.style.color = '#c62828';
      statusDiv.textContent = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      startBtn.disabled = false;
      startBtn.textContent = 'Start';
      startBtn.style.opacity = '1';
      startBtn.style.cursor = 'pointer';
    }
  });

  // Update status based on wallet/login state
  updateOverlayStatus(overlay, provider);

  return overlay;
}

async function updateOverlayStatus(overlay: HTMLElement, provider: ProviderId) {
  const statusDiv = overlay.querySelector('#anylayer-status') as HTMLElement;
  const startBtn = overlay.querySelector('#anylayer-start-btn') as HTMLButtonElement;

  if (!statusDiv || !startBtn) return;

  const config = getProviderOverlayConfig(provider);
  const providerName = config.providerName;

  try {
    // Check wallet connection
    const walletData = await chrome.storage.local.get('userAddress');
    const hasWallet = !!walletData.userAddress;

    // Check if logged in to provider
    const isLoggedIn = checkLoginStatus(provider);

    if (!hasWallet) {
      statusDiv.style.display = 'block';
      statusDiv.style.background = '#fff3cd';
      statusDiv.style.color = '#856404';
      statusDiv.textContent = '⚠️ Please connect your wallet first';
      startBtn.disabled = true;
      startBtn.style.opacity = '0.5';
      startBtn.style.cursor = 'not-allowed';
    } else if (!isLoggedIn) {
      statusDiv.style.display = 'block';
      statusDiv.style.background = '#fff3cd';
      statusDiv.style.color = '#856404';
      statusDiv.textContent = `⚠️ Please log in to ${providerName}`;
      startBtn.disabled = true;
      startBtn.style.opacity = '0.5';
      startBtn.style.cursor = 'not-allowed';
    } else {
      statusDiv.style.display = 'block';
      statusDiv.style.background = '#e8f5e9';
      statusDiv.style.color = '#2e7d32';
      statusDiv.textContent = '✅ Ready to start verification';
      startBtn.disabled = false;
      startBtn.style.opacity = '1';
      startBtn.style.cursor = 'pointer';
    }
  } catch (error) {
    console.error('[AnyLayer Overlay] Error updating status:', error);
  }
}

// Listen for storage changes to update status
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.userAddress) {
    const overlay = document.getElementById('anylayer-zkTLS-overlay');
    if (overlay) {
      const provider = detectProvider();
      if (provider) {
        updateOverlayStatus(overlay, provider);
      }
    }
  }
});

// Export for backward compatibility
export const createTwitterOverlay = createProviderOverlay;
