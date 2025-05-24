console.log('GeoStateNet Assistant content script loaded (Keybinds, Single Predict, UI Toggle)');

// API endpoint URL
const API_ENDPOINT = 'http://127.0.0.1:8000';

// --- Constants ---
const CAPTURE_PANEL_ID = 'geoguesser-assistant-capture-panel';
const RESULTS_DIV_ID = 'geoguesser-assistant-results';
const DIRECTIONS = ['NORTH', 'EAST', 'SOUTH', 'WEST'];

// --- State Variables ---
let isCapturingPanorama = false;
let currentCaptureIndex = 0;
let capturedImages = {};
let gameUIVisible = true; // State for UI visibility

// --- *** RE-ADDED: UI Selectors and Toggle Function (with Debugging) *** ---
const GEOGUESSR_UI_SELECTORS = [
    '.game-layout__status', '.game-layout__controls', '.game-status',
    '.guess-map__guess-button', '.gm-style-cc', // Google Maps controls
    '.game_guessMap__8jK3B', '.game_controls__xgq6p', '.game_topHud__P_g7z',
    '.game_status___YFni', '.game_statusWithCompassTop__HYd6L',
    '#adconsent-usp-link', // Ad consent elements if present
    '.compass_compass__lRB0J', // Hide compass too? Optional.
    // Add any other selectors if needed
];

function toggleGameUI() {
    return new Promise((resolve) => {
        const action = gameUIVisible ? 'Hiding' : 'Showing';
        console.log(`[UI Toggle] Attempting to toggle UI elements ${action}...`);
        let foundAny = false;
        let notFound = [];

        GEOGUESSR_UI_SELECTORS.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    foundAny = true;
                    // console.log(`[UI Toggle] Found ${elements.length} element(s) for selector: ${selector}`); // Verbose log
                    elements.forEach(element => {
                        element.style.visibility = gameUIVisible ? 'hidden' : 'visible';
                    });
                } else {
                    notFound.push(selector);
                }
            } catch (e) {
                console.error(`[UI Toggle] Error querying selector "${selector}":`, e);
                notFound.push(`${selector} (Error)`);
            }
        });

        if (!foundAny) {
            console.warn("[UI Toggle] Failed: No elements found for *any* selector.");
            resolve(false); // Indicate failure / no change
            return;
        }

        if (notFound.length > 0) {
             console.warn(`[UI Toggle] Warning: Did not find elements for ${notFound.length} selectors:`, notFound);
        } else {
             console.log(`[UI Toggle] Successfully toggled elements found for all selectors.`);
        }

        gameUIVisible = !gameUIVisible; // Update the state ONLY if some elements were found
        setTimeout(() => resolve(true), 100); // Indicate success, add Delay for DOM update
    });
}


// --- Screenshot and Image Processing Functions ---
function takeScreenshot() { /* ... same ... */
    console.log("[Screenshot] Requesting screenshot from background script...");
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'captureTab' }, function(response) {
            if (chrome.runtime.lastError) { console.error('[Screenshot] Capture error:', chrome.runtime.lastError.message); reject(new Error(chrome.runtime.lastError.message)); }
            else if (response && response.dataUrl) { console.log("[Screenshot] dataUrl received."); resolve(response.dataUrl); }
            else if (response && response.error) { console.error('[Screenshot] Capture error response:', response.error); reject(new Error(response.error)); }
            else { console.error('[Screenshot] Unknown error or empty response.'); reject(new Error('Failed to capture screenshot.')); }
        });
    });
}
function processImage(dataUrl, imageIndex) { /* ... same ... */
    console.log(`[Processing] Processing image ${imageIndex + 1}...`);
    return new Promise((resolve, reject) => { /* ... blob conversion ... */
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const targetSize = 224; canvas.width = targetSize; canvas.height = targetSize;
            console.log(`[Processing] Resizing image ${imageIndex + 1} from ${img.naturalWidth}x${img.naturalHeight} to ${targetSize}x${targetSize}`); ctx.drawImage(img, 0, 0, targetSize, targetSize);
            canvas.toBlob( (blob) => { if (blob) { console.log(`[Processing] Image ${imageIndex + 1} processed into Blob, size: ${Math.round(blob.size / 1024)} KB`); resolve(blob); } else { console.error(`[Processing] Canvas toBlob failed for image ${imageIndex + 1}.`); reject(new Error('Canvas toBlob failed.')); } }, 'image/jpeg', 0.9 );
        };
        img.onerror = (error) => { console.error(`[Processing] Failed to load image ${imageIndex + 1}:`, error); reject(new Error(`Failed to load image ${imageIndex + 1} for processing.`)); }
        img.src = dataUrl;
    });
}
function blobToBase64(blob) { /* ... same ... */
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => { const base64String = reader.result.split(',')[1]; if (base64String) { resolve(base64String); } else { reject(new Error("Failed to extract base64 string from blob data URL.")); } };
        reader.onerror = (error) => { console.error("FileReader error:", error); reject(error); };
        reader.readAsDataURL(blob);
    });
}


// --- Functions to Display Results/Errors on Page ---
function displayResultsOnPage(predictionsData) { /* ... same ... */
    removeResultsDiv(); removeCapturePanel();
    if (!predictionsData || !predictionsData.predictions || !predictionsData.top_prediction) { console.error("Invalid prediction data structure received:", predictionsData); displayErrorOnPage("Invalid prediction data received from API."); return; }
    const resultsDiv = document.createElement('div'); resultsDiv.id = RESULTS_DIV_ID;
    Object.assign(resultsDiv.style, { /* ... styling ... */ position: 'fixed', top: '10px', right: '10px', width: '250px', backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #ccc', borderRadius: '5px', padding: '10px', zIndex: '99999', fontFamily: 'Arial, sans-serif', fontSize: '13px', lineHeight: '1.4', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' });
    let content = `<strong>Top Prediction: ${predictionsData.top_prediction} (${predictionsData.confidence}%)</strong><hr style="margin: 5px 0;">`;
    predictionsData.predictions.forEach(p => { content += `<div>${p.rank}. ${p.state} (${p.probability}%)</div>`; });
    resultsDiv.innerHTML = content; const closeButton = document.createElement('button'); closeButton.textContent = 'X';
    Object.assign(closeButton.style, { /* ... styling ... */ position: 'absolute', top: '2px', right: '2px', background: '#eee', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', lineHeight: '1', padding: '2px 4px' });
    closeButton.onclick = removeResultsDiv; resultsDiv.appendChild(closeButton); document.body.appendChild(resultsDiv);
}
function displayErrorOnPage(errorMessage) { /* ... same ... */
    removeResultsDiv(); removeCapturePanel();
    const errorDiv = document.createElement('div'); errorDiv.id = RESULTS_DIV_ID;
    Object.assign(errorDiv.style, { /* ... styling ... */ position: 'fixed', top: '10px', right: '10px', width: '250px', backgroundColor: 'rgba(255, 220, 220, 0.9)', border: '1px solid #f88', borderRadius: '5px', padding: '10px', zIndex: '99999', fontFamily: 'Arial, sans-serif', fontSize: '13px', lineHeight: '1.4', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' });
    errorDiv.innerHTML = `<strong>Error:</strong> ${errorMessage}`; const closeButton = document.createElement('button'); /* ... */ closeButton.textContent = 'X'; Object.assign(closeButton.style, { position: 'absolute', top: '2px', right: '2px', background: '#eee', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', lineHeight: '1', padding: '2px 4px' }); closeButton.onclick = removeResultsDiv; errorDiv.appendChild(closeButton); document.body.appendChild(errorDiv);
}
function removeResultsDiv() { /* ... same ... */
    const existingDiv = document.getElementById(RESULTS_DIV_ID); if (existingDiv) { existingDiv.remove(); }
}


// --- Functions for Capture UI Panel ---
function showCapturePanel() { /* ... same ... */
    removeCapturePanel(); removeResultsDiv();
    const panel = document.createElement('div'); panel.id = CAPTURE_PANEL_ID;
    Object.assign(panel.style, { /* ... styling ... */ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white', border: '1px solid #555', borderRadius: '5px', padding: '15px', zIndex: '100000', fontFamily: 'Arial, sans-serif', fontSize: '14px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' });
    panel.innerHTML = ` <div id="${CAPTURE_PANEL_ID}-text" style="margin-bottom: 10px;"></div> <button id="${CAPTURE_PANEL_ID}-capture" style="padding: 5px 10px; margin-right: 10px; cursor: pointer;">Capture</button> <button id="${CAPTURE_PANEL_ID}-cancel" style="padding: 5px 10px; cursor: pointer;">Cancel</button> `;
    document.body.appendChild(panel);
    document.getElementById(`${CAPTURE_PANEL_ID}-capture`).addEventListener('click', handleCaptureClick);
    document.getElementById(`${CAPTURE_PANEL_ID}-cancel`).addEventListener('click', cancelCapture);
    updateCapturePanel();
}
function updateCapturePanel(textOverride = null) { /* ... same ... */
    const panel = document.getElementById(CAPTURE_PANEL_ID); if (!panel) return;
    const textElement = document.getElementById(`${CAPTURE_PANEL_ID}-text`); const captureButton = document.getElementById(`${CAPTURE_PANEL_ID}-capture`);
    if (textOverride) { textElement.textContent = textOverride; captureButton.disabled = true; captureButton.style.cursor = 'default'; captureButton.style.opacity = '0.6'; }
    else if (isCapturingPanorama) { const direction = DIRECTIONS[currentCaptureIndex]; textElement.textContent = `Orient view to ${direction}, then click Capture (${currentCaptureIndex + 1}/4)`; captureButton.disabled = false; captureButton.style.cursor = 'pointer'; captureButton.style.opacity = '1'; }
    else { textElement.textContent = "Ready."; captureButton.disabled = true; captureButton.style.cursor = 'default'; captureButton.style.opacity = '0.6'; }
}
function removeCapturePanel() { /* ... same ... */
    const existingPanel = document.getElementById(CAPTURE_PANEL_ID); if (existingPanel) { existingPanel.remove(); }
}

// --- Capture Button Handler (Includes UI Toggle) ---
async function handleCaptureClick() {
    if (!isCapturingPanorama) return;

    const direction = DIRECTIONS[currentCaptureIndex];
    console.log(`[Manual Capture] Capturing ${direction}...`);
    updateCapturePanel(`Capturing ${direction}...`);

    let uiNeedsRestoring = false;
    const capturePanel = document.getElementById(CAPTURE_PANEL_ID);

    try {
        // --- Attempt to HIDE UI ---
        if (gameUIVisible) {
            console.log("[Manual Capture] Hiding Game UI before screenshot...");
            const success = await toggleGameUI();
            if (success) { uiNeedsRestoring = true; }
            else { console.warn("[Manual Capture] Failed to hide Game UI (or some elements). Proceeding anyway."); }
        } else { console.log("[Manual Capture] Game UI is already hidden."); }

        // --- HIDE CAPTURE PANEL ---
        if (capturePanel) { console.log("[Manual Capture] Hiding Capture Panel..."); capturePanel.style.display = 'none'; }

        await new Promise(resolve => setTimeout(resolve, 50)); // Brief pause

        const dataUrl = await takeScreenshot();
        const blob = await processImage(dataUrl, currentCaptureIndex);
        capturedImages[direction] = blob;
        console.log(`[Manual Capture] Stored image for ${direction}.`);

        // --- SHOW CAPTURE PANEL ---
        if (capturePanel) { console.log("[Manual Capture] Showing Capture Panel..."); capturePanel.style.display = 'block'; }

        // --- Attempt to RESTORE UI ---
        if (uiNeedsRestoring) { console.log("[Manual Capture] Restoring Game UI after screenshot..."); await toggleGameUI(); }


        currentCaptureIndex++;

        if (currentCaptureIndex >= DIRECTIONS.length) {
            console.log("[Manual Capture] All 4 images captured.");
            updateCapturePanel("Processing all images...");
            await sendPanoramaToApi(); // Sends to API and handles cleanup
        } else {
            updateCapturePanel(); // Update text for next direction
        }

    } catch (error) {
        console.error(`[Manual Capture] Error during capture for ${direction}:`, error);
        displayErrorOnPage(`Error capturing ${direction}: ${error.message}`);
        // --- Attempt to RESTORE UI on error ---
        if (uiNeedsRestoring && !gameUIVisible) { console.log("[Manual Capture] Attempting to restore Game UI after error..."); await toggleGameUI(); }
        if (capturePanel) capturePanel.style.display = 'block'; // Ensure panel is visible on error
        cancelCapture();
    }
}

// --- Cancel Button Handler (Includes UI Restore) ---
function cancelCapture() {
    console.log("[Manual Capture] Cancelling panorama capture.");
    isCapturingPanorama = false; currentCaptureIndex = 0; capturedImages = {};
    removeCapturePanel();
    // Restore UI if it was left hidden
    if (!gameUIVisible) {
        console.log("[Manual Capture] Restoring UI after cancel.");
        toggleGameUI(); // Attempt to restore
    }
}

// --- Function to Send Collected Images to API (Includes UI Restore) ---
async function sendPanoramaToApi() {
    if (Object.keys(capturedImages).length !== 4) { console.error("[API Send] Not all images were captured.", capturedImages); displayErrorOnPage("Failed to capture all 4 images before sending."); return; }
    const formData = new FormData(); const apiKeys = ['north', 'east', 'south', 'west'];
    for (let i = 0; i < apiKeys.length; i++) { const dir = DIRECTIONS[i]; if (capturedImages[dir]) { formData.append(apiKeys[i], capturedImages[dir], `${apiKeys[i]}.jpg`); } else { throw new Error(`Missing image blob for direction: ${dir}`); } }
    console.log("[API Send] FormData prepared with 4 images."); const apiUrl = `${API_ENDPOINT}/predict_panorama`; console.log(`[API Send] Sending FormData to API: ${apiUrl}`);
    let uiNeedsRestoring = !gameUIVisible; // Check if UI is hidden before API call
    try {
        const response = await fetch(apiUrl, { method: 'POST', mode: 'cors', body: formData }); console.log("[API Send] API response received, status:", response.status);
        if (!response.ok) { let errorBody = await response.text(); console.error(`[API Send] API Error Body: ${errorBody}`); throw new Error(`API error: ${response.status} ${response.statusText}.`); }
        const predictions = await response.json(); console.log("[API Send] Raw API Response JSON:", JSON.stringify(predictions)); console.log("[API Send] API predictions parsed successfully.");
        displayResultsOnPage(predictions); // This also removes capture panel
    } catch (error) {
        console.error("[API Send] Error sending to API:", error);
        displayErrorOnPage(error.message || "Unknown error sending to API."); // This also removes capture panel
    } finally {
        // Clean up state
        isCapturingPanorama = false; currentCaptureIndex = 0; capturedImages = {};
        // removeCapturePanel(); // Already called in displayResults/Error
        // Restore UI if it was hidden
        if (uiNeedsRestoring && !gameUIVisible) { // Check again in case toggle failed mid-process
            console.log("[API Send] Restoring UI in finally block.");
            toggleGameUI(); // Attempt to restore
        }
    }
}

// --- Handler for Single Prediction (Includes UI Toggle) ---
async function handleSinglePrediction() {
    console.log('[Single Predict] Starting...');
    removeResultsDiv(); removeCapturePanel();

    let uiNeedsRestoring = false;

    try {
        // --- Attempt to HIDE UI ---
        if (gameUIVisible) {
            console.log("[Single Predict] Hiding Game UI before screenshot...");
            const success = await toggleGameUI();
            if (success) { uiNeedsRestoring = true; }
            else { console.warn("[Single Predict] Failed to hide Game UI. Proceeding anyway."); }
        } else { console.log("[Single Predict] Game UI is already hidden."); }

        await new Promise(resolve => setTimeout(resolve, 50)); // Brief pause

        console.log('[Single Predict] Taking screenshot...');
        const dataUrl = await takeScreenshot();
        console.log('[Single Predict] Processing image...');
        const blob = await processImage(dataUrl, 0);
        console.log('[Single Predict] Converting blob to base64...');
        const base64Image = await blobToBase64(blob);

        // --- Attempt to RESTORE UI ---
        if (uiNeedsRestoring) { console.log("[Single Predict] Restoring Game UI after screenshot..."); await toggleGameUI(); }

        // Call the Base64 Prediction API Endpoint
        const apiUrl = `${API_ENDPOINT}/predict_base64`;
        console.log(`[Single Predict] Sending base64 image to API: ${apiUrl}`);
        const response = await fetch(apiUrl, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ image: base64Image }) });
        console.log("[Single Predict] API response received, status:", response.status);
        if (!response.ok) { let errorBody = await response.text(); console.error(`[Single Predict] API Error Body: ${errorBody}`); throw new Error(`API error: ${response.status} ${response.statusText}.`); }
        const predictions = await response.json();
        console.log("[Single Predict] Raw API Response JSON:", JSON.stringify(predictions)); console.log("[Single Predict] API predictions parsed.");
        displayResultsOnPage(predictions);

    } catch (error) {
        console.error("[Single Predict] Error:", error);
        // --- Attempt to RESTORE UI on error ---
        if (uiNeedsRestoring && !gameUIVisible) { console.log("[Single Predict] Attempting to restore Game UI after error..."); await toggleGameUI(); }
        displayErrorOnPage(error.message || "Unknown error during single prediction.");
    } finally {
         // Ensure UI is restored if something unexpected happened
         if (!gameUIVisible) {
             console.log("[Single Predict] Restoring UI in finally block.");
             toggleGameUI();
         }
    }
}


// --- Main Listener for Messages from Popup / Background ---
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
     console.log('[Listener] Message received:', message);
     switch (message.action) {
        case 'startManualPanorama':
            if (isCapturingPanorama) { console.warn("[Listener] Capture process already in progress."); return false; }
            console.log(`[Listener] Received ${message.action}. Starting guided capture.`);
            isCapturingPanorama = true; currentCaptureIndex = 0; capturedImages = {};
            gameUIVisible = true; // Assume UI is visible initially
            showCapturePanel();
            break;
        case 'triggerCapture':
            if (isCapturingPanorama) {
                console.log(`[Listener] Received ${message.action}. Triggering capture button click...`);
                const captureButton = document.getElementById(`${CAPTURE_PANEL_ID}-capture`);
                if (captureButton && !captureButton.disabled) { captureButton.click(); }
                else { console.warn(`[Listener] Could not trigger capture: Button not found, disabled, or capture not active.`); }
            } else { console.warn(`[Listener] Received ${message.action} but panorama capture is not active.`); }
            break;
        case 'predictSingleLocation':
             console.log(`[Listener] Received ${message.action}. Starting single prediction...`);
             handleSinglePrediction();
             break;
        default:
            console.log(`[Listener] Received unknown action: ${message.action}`);
            break;
     }
    return false; // Indicate we are not sending an async response back to sender
});


console.log('GeoGuesser Assistant content script loaded (Keybinds, Single Predict, UI Toggle)');
