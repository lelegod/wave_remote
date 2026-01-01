/**
 * Wave Remote - Popup Script
 * Controls the extension popup UI
 */

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const toggleBtn = document.getElementById('toggleBtn');
const footer = document.getElementById('footer');
const setupLink = document.getElementById('setupLink');
const openSettings = document.getElementById('openSettings');

let isListening = false;
let hasPermission = false;
let selectedDeviceId = null;

// Load saved settings from storage
async function loadSettings() {
    const data = await chrome.storage.local.get(['selectedMicId', 'hasPermission']);
    hasPermission = data.hasPermission || false;
    selectedDeviceId = data.selectedMicId || null;
    return data;
}

// Update UI based on setup status
function updateSetupUI() {
    if (!hasPermission || !selectedDeviceId) {
        // Show setup link, hide regular footer
        footer.style.display = 'none';
        setupLink.style.display = 'block';
    } else {
        // Show regular footer, hide setup link
        footer.style.display = 'block';
        setupLink.style.display = 'none';
    }
}

// Open settings link handler
openSettings.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
});

// Get current status from background
async function updateStatus() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });

        // Use the listening state from background
        isListening = response?.isListening || false;

        if (response?.isListening) {
            statusDot.classList.add('active');
            statusDot.classList.remove('error');
            statusText.textContent = 'Listening';
            toggleBtn.textContent = '🔴 Stop Listening';
            toggleBtn.classList.add('listening');
        } else {
            statusDot.classList.remove('active');

            if (!hasPermission || !selectedDeviceId) {
                statusText.textContent = 'Setup required';
                statusDot.classList.add('error');
            } else {
                statusText.textContent = 'Ready';
                statusDot.classList.remove('error');
            }

            toggleBtn.textContent = '🎧 Start Listening';
            toggleBtn.classList.remove('listening');
        }
    } catch (error) {
        statusDot.classList.add('error');
        statusText.textContent = 'Error';
        console.error('Failed to get status:', error);
    }
}

// Toggle listening
toggleBtn.addEventListener('click', async () => {
    try {
        if (isListening) {
            // Stop listening
            await chrome.runtime.sendMessage({ type: 'STOP_LISTENING' });
            isListening = false;
        } else {
            // Check if we have permission and a selected device
            if (!hasPermission || !selectedDeviceId) {
                // Open options page to set up
                chrome.runtime.openOptionsPage();
                return;
            }

            // Start the offscreen document
            await chrome.runtime.sendMessage({ type: 'START_OFFSCREEN' });

            // Start listening with the selected device
            await chrome.runtime.sendMessage({
                type: 'START_LISTENING',
                deviceId: selectedDeviceId
            });

            isListening = true;
        }

        // Update UI
        setTimeout(updateStatus, 300);
    } catch (error) {
        console.error('Toggle failed:', error);
        statusText.textContent = 'Error';
    }
});

// Initialize
async function init() {
    await loadSettings();
    updateSetupUI();
    updateStatus();
}

init();
