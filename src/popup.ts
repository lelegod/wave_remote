export {};

const statusDot = document.getElementById("statusDot")!;
const statusText = document.getElementById("statusText")!;
const toggleBtn = document.getElementById("toggleBtn")!;
const footer = document.getElementById("footer")!;
const setupLink = document.getElementById("setupLink")!;
const openSettings = document.getElementById("openSettings")!;

let isListening = false;
let hasPermission = false;
let selectedDeviceId: string | null = null;

async function loadSettings(): Promise<void> {
  const data = await chrome.storage.local.get(["selectedMicId", "hasPermission"]);
  hasPermission = data.hasPermission || false;
  selectedDeviceId = data.selectedMicId || null;
}

function updateSetupUI(): void {
  if (!hasPermission || !selectedDeviceId) {
    footer.style.display = "none";
    setupLink.style.display = "block";
  } else {
    footer.style.display = "block";
    setupLink.style.display = "none";
  }
}

openSettings.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

async function updateStatus(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
    isListening = response?.isListening || false;
    if (isListening) {
      statusDot.classList.add("active");
      statusDot.classList.remove("error");
      statusText.textContent = "Listening";
      toggleBtn.textContent = "🔴 Stop Listening";
      toggleBtn.classList.add("listening");
    } else {
      statusDot.classList.remove("active");
      if (!hasPermission || !selectedDeviceId) {
        statusText.textContent = "Setup required";
        statusDot.classList.add("error");
      } else {
        statusText.textContent = "Ready";
        statusDot.classList.remove("error");
      }
      toggleBtn.textContent = "🎧 Start Listening";
      toggleBtn.classList.remove("listening");
    }
  } catch {
    statusDot.classList.add("error");
    statusText.textContent = "Error";
  }
}

toggleBtn.addEventListener("click", async () => {
  try {
    if (isListening) {
      await chrome.runtime.sendMessage({ type: "STOP_LISTENING" });
      isListening = false;
      statusDot.classList.remove("active");
      statusText.textContent = "Ready";
      toggleBtn.textContent = "🎧 Start Listening";
      toggleBtn.classList.remove("listening");
    } else {
      if (!hasPermission || !selectedDeviceId) {
        chrome.runtime.openOptionsPage();
        return;
      }
      await chrome.runtime.sendMessage({ type: "START_OFFSCREEN" });
      await chrome.runtime.sendMessage({ type: "START_LISTENING", deviceId: selectedDeviceId });
      isListening = true;
      statusDot.classList.add("active");
      statusDot.classList.remove("error");
      statusText.textContent = "Listening";
      toggleBtn.textContent = "🔴 Stop Listening";
      toggleBtn.classList.add("listening");
    }
  } catch {
    statusText.textContent = "Error";
    statusDot.classList.add("error");
  }
});

async function init(): Promise<void> {
  await loadSettings();
  updateSetupUI();
  await updateStatus();
}

void init();
