/**
 * Wave Remote - Options Page Script
 */

const grantBtn = document.getElementById('grantBtn');
const permissionBadge = document.getElementById('permissionBadge');
const micSelectCard = document.getElementById('micSelectCard');
const micList = document.getElementById('micList');
const saveBtn = document.getElementById('saveBtn');
const savedMessage = document.getElementById('savedMessage');

let selectedDeviceId = null;

// Check current permission status
async function checkPermission() {
    try {
        const result = await navigator.permissions.query({ name: 'microphone' });
        updatePermissionUI(result.state);

        result.addEventListener('change', () => {
            updatePermissionUI(result.state);
        });

        if (result.state === 'granted') {
            await loadMicrophones();
        }
    } catch (e) {
        console.error('Permission query failed:', e);
    }
}

function updatePermissionUI(state) {
    permissionBadge.className = 'status-badge ' + state;

    if (state === 'granted') {
        permissionBadge.textContent = '✓ Granted';
        grantBtn.textContent = '✓ Permission Granted';
        grantBtn.disabled = true;
        micSelectCard.style.display = 'block';
    } else if (state === 'denied') {
        permissionBadge.textContent = '✗ Denied';
        grantBtn.textContent = 'Permission Denied - Check Chrome Settings';
    } else {
        permissionBadge.textContent = 'Not granted';
        grantBtn.textContent = '🎤 Grant Microphone Access';
    }
}

// Request microphone permission
grantBtn.addEventListener('click', async () => {
    try {
        grantBtn.textContent = 'Requesting...';
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());

        updatePermissionUI('granted');
        await loadMicrophones();
    } catch (error) {
        console.error('Permission denied:', error);
        updatePermissionUI('denied');
    }
});

// Load available microphones
async function loadMicrophones() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter(d => d.kind === 'audioinput');

    // Get saved selection
    const saved = await chrome.storage.local.get(['selectedMicId']);
    selectedDeviceId = saved.selectedMicId;

    micList.innerHTML = '';

    mics.forEach((mic, index) => {
        const isDefault = mic.deviceId === 'default' || index === 0;
        const isSelected = mic.deviceId === selectedDeviceId ||
            (!selectedDeviceId && isDefault);

        if (isSelected && !selectedDeviceId) {
            selectedDeviceId = mic.deviceId;
        }

        const item = document.createElement('label');
        item.className = 'mic-item' + (isSelected ? ' selected' : '');

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'mic';
        radio.value = mic.deviceId;
        radio.checked = isSelected;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'mic-name';
        nameSpan.textContent = mic.label || 'Microphone ' + (index + 1);

        item.appendChild(radio);
        item.appendChild(nameSpan);

        if (isDefault) {
            const defaultSpan = document.createElement('span');
            defaultSpan.className = 'mic-default';
            defaultSpan.textContent = 'Default';
            item.appendChild(defaultSpan);
        }

        item.addEventListener('click', () => {
            document.querySelectorAll('.mic-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            selectedDeviceId = mic.deviceId;
            savedMessage.classList.remove('show');
        });

        micList.appendChild(item);
    });
}

// Save settings
saveBtn.addEventListener('click', async () => {
    await chrome.storage.local.set({
        selectedMicId: selectedDeviceId,
        hasPermission: true
    });
    savedMessage.classList.add('show');
});

// Initialize
checkPermission();
