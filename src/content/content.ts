/**
 * Content script injected into provider pages
 */

// Import overlay function directly
import { createProviderOverlay } from './overlay';

/**
 * Check if current page is a supported provider
 */
function isSupportedProvider(): boolean {
  const hostname = window.location.hostname.toLowerCase();
  const supportedHosts = [
    'twitter.com', 'x.com',
    'binance.com',
    'okx.com',
    'kucoin.com',
    'coinbase.com',
    'linkedin.com',
    'fiverr.com',
    'upwork.com',
    'youtube.com',
    'tiktok.com',
    'twitch.tv'
  ];
  
  return supportedHosts.some(host => hostname.includes(host));
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_ATTRIBUTES') {
    // This will be handled by the provider adapter via background script
    sendResponse({ success: true });
  } else if (message.type === 'SHOW_OVERLAY') {
    // Show overlay on any supported provider
    if (isSupportedProvider()) {
      createProviderOverlay(message.provider);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Current page is not a supported provider' });
    }
  } else if (message.type === 'HIDE_OVERLAY') {
    const overlay = document.getElementById('anylayer-zkTLS-overlay');
    if (overlay) {
      overlay.remove();
    }
    sendResponse({ success: true });
  }
  return true;
});

// Check if this page was opened from dashboard for verification
function checkPendingProvider() {
  if (!isSupportedProvider()) return;
  
  try {
    const pendingProvider = localStorage.getItem('zkTLS_pendingProvider');
    if (pendingProvider) {
      console.log('[AnyLayer] Pending provider verification detected:', pendingProvider);
      // Clear the flag
      localStorage.removeItem('zkTLS_pendingProvider');
      // Show overlay after a short delay to let page load
      setTimeout(() => {
        createProviderOverlay(pendingProvider as any);
      }, 2000);
    }
  } catch (error) {
    console.warn('[AnyLayer] Failed to check pending provider:', error);
  }
}

// Run on page load
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  checkPendingProvider();
} else {
  window.addEventListener('DOMContentLoaded', checkPendingProvider);
}

// Overlay is only shown when explicitly requested via message from platform/dashboard
// or when user opens a provider page from dashboard

// Inject script into page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);
