// Listen for keyboard shortcut commands
chrome.commands.onCommand.addListener((command) => {
  console.log(`Command received: ${command}`);

  // Find the active Geoguessr tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // Ensure we have an active tab and it's a GeoGuessr page
    const currentTab = tabs && tabs.length > 0 ? tabs[0] : null;
    if (currentTab && currentTab.id && currentTab.url && currentTab.url.includes('geoguessr.com')) {
      const tabId = currentTab.id;
      let action = '';

      // Determine the action based on the command
      switch (command) {
        case 'start_panorama':
          action = 'startManualPanorama'; // Matches action in content script
          break;
        case 'trigger_capture':
          action = 'triggerCapture'; // New action for content script
          break;
        case 'predict_single':
          action = 'predictSingleLocation'; // New action for content script
          break;
        default:
          console.warn(`Unhandled command: ${command}`);
          return; // Exit if command is not recognized
      }

      // Send the corresponding action message to the content script
      console.log(`Sending action '${action}' to tab ${tabId}`);
      chrome.tabs.sendMessage(tabId, { action: action }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(`Error sending message for action '${action}':`, chrome.runtime.lastError.message);
          // Handle error - maybe notify user via badge text or console
          chrome.action.setBadgeText({ text: 'ERR', tabId: tabId });
          setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tabId }), 2000);
        } else {
          console.log(`Message for action '${action}' sent successfully. Response:`, response);
          // Optional: Provide feedback on success
          // chrome.action.setBadgeText({ text: 'OK', tabId: tabId });
          // setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tabId }), 1000);
        }
      });

    } else {
      console.log("Command ignored: No active GeoGuessr tab found.");
      // Optional: Notify user they need to be on GeoGuessr
      chrome.action.setBadgeText({ text: '!', tabId: currentTab ? currentTab.id : undefined });
      setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: currentTab ? currentTab.id : undefined }), 2000);
    }
  });
});

// Listener for screenshot capture (still needed)
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'captureTab') {
      // Ensure the sender is the content script from the intended tab if needed for security
      // const senderTabId = sender.tab ? sender.tab.id : null;
      // if (senderTabId) { ... }

      chrome.tabs.captureVisibleTab(null, { format: 'png' }, function(dataUrl) {
        if (chrome.runtime.lastError) {
          console.error("Screenshot error in background:", chrome.runtime.lastError.message);
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ dataUrl: dataUrl });
        }
      });
      return true; // Required for async sendResponse
    }
    // Handle other messages if necessary
});

console.log("GeoGuesser Assistant background script loaded.");
