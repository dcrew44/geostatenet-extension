document.addEventListener('DOMContentLoaded', function() {
  // Get button elements
  const startPanoramaButton = document.getElementById('startManualPanoramaButton');
  const predictSingleButton = document.getElementById('predictSingleButton'); // New button

  // --- Event Listener for the Start Panorama Button ---
  startPanoramaButton.addEventListener('click', function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (tabs.length === 0 || !tabs[0].id) { console.error('Error - Could not find active tab.'); window.close(); return; }
          const tabId = tabs[0].id;
          console.log('Popup sending startManualPanorama message...');
          chrome.tabs.sendMessage(tabId, { action: "startManualPanorama" }, function(response) {
              if (chrome.runtime.lastError) { console.warn("Error sending message:", chrome.runtime.lastError.message); }
              else { console.log("Popup received response:", response); }
          });
          window.close();
      });
  });

  // --- *** NEW: Event Listener for the Predict Single Button *** ---
  predictSingleButton.addEventListener('click', function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (tabs.length === 0 || !tabs[0].id) { console.error('Error - Could not find active tab.'); window.close(); return; }
          const tabId = tabs[0].id;
          console.log('Popup sending predictSingleLocation message...');
          chrome.tabs.sendMessage(tabId, { action: "predictSingleLocation" }, function(response) { // New action name
              if (chrome.runtime.lastError) { console.warn("Error sending message:", chrome.runtime.lastError.message); }
              else { console.log("Popup received response:", response); }
          });
          window.close(); // Close popup after sending message
      });
  });

}); // End DOMContentLoaded
