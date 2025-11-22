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

// Overlay is only shown when explicitly requested via message from platform/dashboard
// Do not auto-show overlay - it will be triggered when user clicks provider tab on platform

// Inject script into page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);
