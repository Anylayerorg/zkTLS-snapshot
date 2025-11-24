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
    'youtube.com', 'studio.youtube.com',
    'tiktok.com', 'tiktokstudio',
    'instagram.com',
    'twitch.tv',
    'github.com',
    'telegram.org', 'web.telegram.org',
    'coursera.org',
    'udemy.com',
    'edx.org',
    'uaepass.ae', 'ids.uaepass.ae' // UAE PASS support including login page
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
    // Check chrome.storage instead of localStorage (works across domains)
    chrome.storage.local.get(['pendingProvider', 'pendingProviderTimestamp'], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('[AnyLayer] Failed to check pending provider:', chrome.runtime.lastError);
        return;
      }
      
      const { pendingProvider, pendingProviderTimestamp } = result;
      
      if (pendingProvider) {
        // Check if timestamp is recent (within last 30 seconds)
        const now = Date.now();
        const age = now - (pendingProviderTimestamp || 0);
        
        if (age < 30000) { // 30 seconds
          console.log('[AnyLayer] Pending provider verification detected:', pendingProvider);
          
          // Clear the flag
          chrome.storage.local.remove(['pendingProvider', 'pendingProviderTimestamp']);
          
          // Show overlay after a short delay to let page load
          setTimeout(() => {
            console.log('[AnyLayer] Showing overlay for:', pendingProvider);
            createProviderOverlay(pendingProvider as any);
          }, 2000);
        } else {
          console.log('[AnyLayer] Pending provider too old, ignoring');
          chrome.storage.local.remove(['pendingProvider', 'pendingProviderTimestamp']);
        }
      }
    });
  } catch (error) {
    console.warn('[AnyLayer] Failed to check pending provider:', error);
  }
}

// Run on page load
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  checkPendingProvider();
  checkPersistedOverlay();
} else {
  window.addEventListener('DOMContentLoaded', () => {
    checkPendingProvider();
    checkPersistedOverlay();
  });
}

// Check for persisted overlay state (for navigation persistence)
function checkPersistedOverlay() {
  if (!isSupportedProvider()) {
    // If not a supported provider, clear persisted state
    chrome.storage.local.remove(['overlayProvider', 'overlayTimestamp']);
    return;
  }
  
  chrome.storage.local.get(['overlayProvider', 'overlayTimestamp'], (result) => {
    if (chrome.runtime.lastError) {
      console.warn('[AnyLayer] Error checking persisted overlay:', chrome.runtime.lastError);
      return;
    }
    
    const { overlayProvider, overlayTimestamp } = result;
    
    if (overlayProvider) {
      // Check if timestamp is recent (within last 5 minutes)
      const now = Date.now();
      const age = now - (overlayTimestamp || 0);
      
      if (age < 300000) { // 5 minutes
        // Verify provider still matches current page
        const hostname = window.location.hostname.toLowerCase();
        let providerStillValid = false;
        
        // Check if current page matches the persisted provider
        // Also allow navigation to login pages for same provider
        if (overlayProvider === 'twitter' && (hostname.includes('twitter.com') || hostname.includes('x.com'))) {
          providerStillValid = true;
        } else if (overlayProvider === 'youtube' && (hostname.includes('youtube.com') || hostname.includes('studio.youtube.com'))) {
          providerStillValid = true;
        } else if (overlayProvider === 'linkedin' && hostname.includes('linkedin.com')) {
          providerStillValid = true;
        } else if (overlayProvider === 'github' && hostname.includes('github.com')) {
          providerStillValid = true;
        } else if (overlayProvider === 'fiverr' && hostname.includes('fiverr.com')) {
          providerStillValid = true;
        } else if (overlayProvider === 'uaepass' && (hostname.includes('uaepass.ae') || hostname.includes('ids.uaepass.ae'))) {
          providerStillValid = true; // Allow navigation to login page
        } else if (overlayProvider === 'tiktok' && (hostname.includes('tiktok.com') || hostname.includes('tiktokstudio'))) {
          providerStillValid = true;
        } else if (overlayProvider === 'instagram' && hostname.includes('instagram.com')) {
          providerStillValid = true;
        } else {
          // Generic check for other providers
          providerStillValid = hostname.includes(overlayProvider);
        }
        
        if (providerStillValid) {
          // Check if overlay already exists
          const existingOverlay = document.getElementById('anylayer-zkTLS-overlay');
          if (!existingOverlay) {
            console.log('[AnyLayer] Restoring overlay after navigation:', overlayProvider, 'on', hostname);
            // Wait for page to settle before restoring (longer wait for login pages)
            const waitTime = hostname.includes('ids.uaepass.ae') || hostname.includes('authenticationendpoint') ? 2500 : 1500;
            setTimeout(() => {
              // Double-check overlay doesn't exist (race condition protection)
              if (!document.getElementById('anylayer-zkTLS-overlay')) {
                // For login pages, use the persisted provider
                // createProviderOverlay will detect provider internally, but we pass the persisted one as fallback
                console.log('[AnyLayer] Restoring overlay for provider:', overlayProvider);
                createProviderOverlay(overlayProvider as any);
              }
            }, waitTime);
          }
        } else {
          console.log('[AnyLayer] Provider mismatch after navigation, clearing persisted state');
          chrome.storage.local.remove(['overlayProvider', 'overlayTimestamp']);
        }
      } else {
        // Clear old overlay state
        console.log('[AnyLayer] Persisted overlay too old, clearing');
        chrome.storage.local.remove(['overlayProvider', 'overlayTimestamp']);
      }
    }
  });
}

// Listen for navigation events (SPA navigation)
let lastUrl = location.href;
let navigationTimeout: NodeJS.Timeout | null = null;

function handleNavigation() {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('[AnyLayer] Navigation detected:', url);
    
    // Clear any pending navigation checks
    if (navigationTimeout) {
      clearTimeout(navigationTimeout);
    }
    
    // Wait for page to settle before checking overlay
    navigationTimeout = setTimeout(() => {
      checkPersistedOverlay();
      navigationTimeout = null;
    }, 1000);
  }
}

// Use MutationObserver for SPA navigation
new MutationObserver(() => {
  handleNavigation();
}).observe(document, { subtree: true, childList: true });

// Listen for pushState/replaceState (SPA navigation)
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(history, args);
  setTimeout(handleNavigation, 100);
};

history.replaceState = function(...args) {
  originalReplaceState.apply(history, args);
  setTimeout(handleNavigation, 100);
};

// Listen for popstate (browser back/forward)
window.addEventListener('popstate', () => {
  setTimeout(() => {
    handleNavigation();
  }, 500);
});

// Listen for hashchange
window.addEventListener('hashchange', () => {
  setTimeout(() => {
    handleNavigation();
  }, 500);
});

// Overlay is only shown when explicitly requested via message from platform/dashboard
// or when user opens a provider page from dashboard

// Inject script into page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);
