/**
 * Wave Remote - Options Page Script
 */

export {};

const grantBtn = document.getElementById("grantBtn") as HTMLButtonElement;
const permissionBadge = document.getElementById("permissionBadge")!;
const micSelectCard = document.getElementById("micSelectCard") as HTMLElement;
const micList = document.getElementById("micList") as HTMLElement;
const saveBtn = document.getElementById("saveBtn") as HTMLButtonElement;
const savedMessage = document.getElementById("savedMessage")!;

let selectedDeviceId: string | null = null;

// Check current permission status
async function checkPermission(): Promise<void> {
  try {
    const result = await navigator.permissions.query({
      name: "microphone" as PermissionName
    });
    updatePermissionUI(result.state);

    result.addEventListener("change", () => {
      updatePermissionUI(result.state);
    });

    if (result.state === "granted") {
      await loadMicrophones();
    }
  } catch (e) {
    console.error("Permission query failed:", e);
  }
}

function updatePermissionUI(state: PermissionState): void {
  permissionBadge.className = "status-badge " + state;

  if (state === "granted") {
    permissionBadge.textContent = "✓ Granted";
    grantBtn.textContent = "✓ Permission Granted";
    grantBtn.disabled = true;
    micSelectCard.style.display = "block";
  } else if (state === "denied") {
    permissionBadge.textContent = "✗ Denied";
    grantBtn.textContent = "Permission Denied - Check Chrome Settings";
  } else {
    permissionBadge.textContent = "Not granted";
    grantBtn.textContent = "🎤 Grant Microphone Access";
  }
}

// Request microphone permission
grantBtn.addEventListener("click", async () => {
  try {
    grantBtn.textContent = "Requesting...";
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());

    updatePermissionUI("granted");
    await loadMicrophones();
  } catch (error) {
    console.error("Permission denied:", error);
    updatePermissionUI("denied");
  }
});

// Load available microphones
async function loadMicrophones(): Promise<void> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const mics: MediaDeviceInfo[] = devices.filter((d) => d.kind === "audioinput");

  // Get saved selection
  const saved = await chrome.storage.local.get(["selectedMicId"]);
  selectedDeviceId = saved.selectedMicId;

  micList.innerHTML = "";

  mics.forEach((mic, index) => {
    const isDefault = mic.deviceId === "default" || index === 0;
    const isSelected = mic.deviceId === selectedDeviceId || (!selectedDeviceId && isDefault);

    if (isSelected && !selectedDeviceId) {
      selectedDeviceId = mic.deviceId;
    }

    const item = document.createElement("label");
    item.className = "mic-item" + (isSelected ? " selected" : "");

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "mic";
    radio.value = mic.deviceId;
    radio.checked = isSelected;

    const nameSpan = document.createElement("span");
    nameSpan.className = "mic-name";
    nameSpan.textContent = mic.label || "Microphone " + (index + 1);

    item.appendChild(radio);
    item.appendChild(nameSpan);

    if (isDefault) {
      const defaultSpan = document.createElement("span");
      defaultSpan.className = "mic-default";
      defaultSpan.textContent = "Default";
      item.appendChild(defaultSpan);
    }

    item.addEventListener("click", () => {
      document.querySelectorAll(".mic-item").forEach((el) => el.classList.remove("selected"));
      item.classList.add("selected");
      selectedDeviceId = mic.deviceId;
      savedMessage.classList.remove("show");
    });

    micList.appendChild(item);
  });
}

// Save settings and auto-restart if currently listening
saveBtn.addEventListener("click", async () => {
  // Save settings
  await chrome.storage.local.set({
    selectedMicId: selectedDeviceId,
    hasPermission: true
  });

  // Check if currently listening
  try {
    const status = await chrome.runtime.sendMessage({ type: "GET_STATUS" });

    if (status?.isListening) {
      // Restart with new mic
      savedMessage.textContent = "↻ Restarting with new microphone...";
      savedMessage.classList.add("show");

      // Send restart command with new deviceId
      await chrome.runtime.sendMessage({
        type: "RESTART_LISTENING",
        deviceId: selectedDeviceId
      });

      // Update message after restart
      setTimeout(() => {
        savedMessage.textContent = "✓ Settings saved and mic switched!";
      }, 500);
    } else {
      // Not listening - initialize the microphone NOW while this page is open!
      savedMessage.textContent = "⏳ Initializing microphone...";
      savedMessage.classList.add("show");

      // Create offscreen document
      await chrome.runtime.sendMessage({ type: "START_OFFSCREEN" });

      // Wait a moment for offscreen to load
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Start listening - this will call getUserMedia in the offscreen document
      await chrome.runtime.sendMessage({
        type: "START_LISTENING",
        deviceId: selectedDeviceId
      });

      // Wait a moment for initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if it worked
      const newStatus = await chrome.runtime.sendMessage({ type: "GET_STATUS" });

      if (newStatus?.isListening) {
        savedMessage.textContent = "✓ Ready! Listening for claps. You can close this tab.";
      } else {
        savedMessage.textContent = "✓ Settings saved! Click Start in popup to begin.";
      }
    }
  } catch (error) {
    console.error("Error saving:", error);
    savedMessage.textContent = "✓ Settings saved! You can close this tab.";
    savedMessage.classList.add("show");
  }
});

// Initialize
void checkPermission();
