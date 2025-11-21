/**
 * Injected script (runs in page context, not extension context)
 * 
 * This script can intercept network requests and access page context
 * for TLSNotary integration
 */

console.log('[zkTLS] Injected script loaded');

/**
 * Intercept fetch requests for TLSNotary capture
 * 
 * This allows us to capture API requests made by the page
 * and potentially route them through TLSNotary
 */
(function() {
  'use strict';

  // Store original fetch
  const originalFetch = window.fetch;

  // Override fetch to intercept requests
  window.fetch = async function(...args: Parameters<typeof fetch>) {
    const [input, init] = args;
    const url = typeof input === 'string' ? input : input.url;

    // Check if this is a request we want to capture
    // Send message to content script
    window.postMessage({
      type: 'ZKTLS_FETCH_REQUEST',
      payload: {
        url,
        method: init?.method || 'GET',
        headers: init?.headers || {},
      }
    }, window.location.origin);

    // Call original fetch
    return originalFetch.apply(this, args);
  };

  // Also intercept XMLHttpRequest if needed
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...rest: any[]) {
    // Notify content script
    window.postMessage({
      type: 'ZKTLS_XHR_REQUEST',
      payload: {
        url: typeof url === 'string' ? url : url.toString(),
        method,
      }
    }, window.location.origin);

    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  console.log('[zkTLS] Network interception enabled');
})();

/**
 * Listen for messages from content script
 */
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data.type === 'ZKTLS_CAPTURE_REQUEST') {
    console.log('[zkTLS] Capture request received:', event.data.payload);
    // Handle TLSNotary capture request
    // This would trigger the actual TLSNotary capture process
  }
});

