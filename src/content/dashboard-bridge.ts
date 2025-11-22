/**
 * Dashboard Bridge Content Script
 * Bridges communication between app.anylayer.org dashboard and the extension
 */

console.log('[AnyLayer Extension] Dashboard bridge loaded');

// Listen for messages from the dashboard webpage
window.addEventListener('message', (event) => {
  // Only accept messages from our dashboard
  if (event.origin !== 'https://app.anylayer.org') {
    return;
  }

  const message = event.data;
  
  // Handle wallet connection from dashboard
  if (message.type === 'ANYLAYER_WALLET_CONNECTED' && message.address) {
    console.log('[Dashboard Bridge] Wallet connected:', message.address);
    
    // Send to background script
    chrome.runtime.sendMessage({
      type: 'SET_WALLET_ADDRESS',
      address: message.address
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Dashboard Bridge] Error:', chrome.runtime.lastError);
      } else {
        console.log('[Dashboard Bridge] Wallet synced to extension:', response);
        
        // Send confirmation back to dashboard
        window.postMessage({
          type: 'ANYLAYER_EXTENSION_READY',
          success: response?.success || false
        }, 'https://app.anylayer.org');
      }
    });
  }
  
  // Handle wallet disconnection
  if (message.type === 'ANYLAYER_WALLET_DISCONNECTED') {
    console.log('[Dashboard Bridge] Wallet disconnected');
    
    chrome.runtime.sendMessage({
      type: 'CLEAR_WALLET_ADDRESS'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Dashboard Bridge] Error:', chrome.runtime.lastError);
      }
    });
  }
});

// Notify dashboard that extension is ready
window.postMessage({
  type: 'ANYLAYER_EXTENSION_READY',
  version: chrome.runtime.getManifest().version
}, 'https://app.anylayer.org');

console.log('[AnyLayer Extension] Dashboard bridge ready');

