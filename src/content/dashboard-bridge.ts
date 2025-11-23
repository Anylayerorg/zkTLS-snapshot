/**
 * Dashboard Bridge Content Script
 * Bridges communication between app.anylayer.org dashboard and the extension
 */

console.log('[AnyLayer Extension] Dashboard bridge loaded');

// Listen for messages from the dashboard webpage
window.addEventListener('message', (event) => {
  // Only accept messages from our dashboard (support both prod and localhost)
  const allowedOrigins = ['https://app.anylayer.org', 'http://localhost:3000', 'http://localhost:3001'];
  if (!allowedOrigins.includes(event.origin)) {
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
        // DO NOT send EXTENSION_READY here - that creates an infinite loop!
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
  
  // Handle pending provider setup
  if (message.type === 'ANYLAYER_SET_PENDING_PROVIDER' && message.provider) {
    console.log('[Dashboard Bridge] Setting pending provider:', message.provider);
    
    // Store in chrome.storage so it's accessible from any domain
    chrome.storage.local.set({ 
      pendingProvider: message.provider,
      pendingProviderTimestamp: Date.now()
    }, () => {
      console.log('[Dashboard Bridge] Pending provider saved to chrome.storage');
    });
  }
});

// Dashboard bridge ready - no need to notify dashboard
// The dashboard will send wallet sync messages directly
console.log('[AnyLayer Extension] Dashboard bridge ready');

