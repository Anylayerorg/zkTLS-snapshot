/**
 * Content script injected into provider pages
 */

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_ATTRIBUTES') {
    // This will be handled by the provider adapter via background script
    sendResponse({ success: true });
  }
  return true;
});

// Inject script into page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);

