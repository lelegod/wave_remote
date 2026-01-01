/**
 * Wave Remote - Background Service Worker
 * 
 * Responsibilities:
 * 1. Create and manage the offscreen document for audio processing
 * 2. Listen for CLAP_DETECTED messages from offscreen.js
 * 3. Relay commands to content.js on YouTube/Netflix tabs
 */

let offscreenCreated = false;
let creating = false;
let isListening = false;  // Track actual listening state

// Create the offscreen document for audio processing
async function createOffscreenDocument() {
    if (creating) return;
    creating = true;

    try {
        // Check if already exists
        const contexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT']
        });

        if (contexts.length > 0) {
            offscreenCreated = true;
            return;
        }

        // Create offscreen document
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['USER_MEDIA'],
            justification: 'Microphone access for clap detection'
        });

        offscreenCreated = true;
        console.log('[Wave Remote] Offscreen document created');
    } catch (error) {
        console.error('[Wave Remote] Failed to create offscreen:', error);
    } finally {
        creating = false;
    }
}

// Find YouTube or Netflix tab
async function findMediaTab() {
    // Check active tab first
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (activeTab?.url?.match(/youtube\.com|netflix\.com/)) {
        return activeTab;
    }

    // Search all tabs
    const allTabs = await chrome.tabs.query({});
    return allTabs.find(tab => tab.url?.match(/youtube\.com|netflix\.com/));
}

// Send command to content script
async function sendCommand(command, data = {}) {
    const tab = await findMediaTab();

    if (!tab) {
        console.log('[Wave Remote] No YouTube/Netflix tab found');
        return;
    }

    try {
        await chrome.tabs.sendMessage(tab.id, { type: command, ...data });
        console.log(`[Wave Remote] Sent ${command} to tab ${tab.id}`);
    } catch (error) {
        console.error('[Wave Remote] Failed to send command:', error);
    }
}

// Handle clap detection
function handleClap(count) {
    console.log(`[Wave Remote] ${count} clap(s) detected`);

    switch (count) {
        case 1:
            sendCommand('TOGGLE_PLAY');
            break;
        case 2:
            sendCommand('SEEK_FORWARD', { seconds: 10 });
            break;
        case 3:
            sendCommand('SEEK_BACKWARD', { seconds: 10 });
            break;
        default:
            console.log(`[Wave Remote] No action for ${count} claps`);
    }
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Wave Remote] Received:', message.type);

    switch (message.type) {
        case 'CLAP_DETECTED':
            handleClap(message.count);
            break;

        case 'OFFSCREEN_READY':
            isListening = true;
            console.log('[Wave Remote] Offscreen is listening');
            break;

        case 'OFFSCREEN_ERROR':
            isListening = false;
            console.error('[Wave Remote] Offscreen error:', message.error);
            break;

        case 'START_OFFSCREEN':
            createOffscreenDocument().then(() => sendResponse({ success: true }));
            return true;

        case 'GET_STATUS':
            sendResponse({ offscreenCreated, isListening });
            break;

        case 'STOP_LISTENING':
            isListening = false;
            // Respond to popup first
            sendResponse({ success: true });
            // Forward to offscreen
            chrome.runtime.sendMessage({ type: 'STOP_LISTENING' }).catch(() => { });
            break;
    }
});

// Don't auto-create offscreen on startup
// Only create when user clicks "Start Listening" in popup

console.log('[Wave Remote] Background loaded (waiting for user to start)');
