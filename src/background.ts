import { commandForClapCount } from "./features/clap-control/commands";
import type { WaveMessage, ClapCommand } from "./shared/types/messaging";
import { recordEvent, getInstallId } from "./features/telemetry/track";
import type { EventName } from "./features/telemetry/types";

let offscreenCreated = false;
let creating = false;
let isListening = false;

async function createOffscreenDocument(): Promise<void> {
  if (creating) return;
  creating = true;
  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT" as chrome.runtime.ContextType]
    });
    if (contexts.length > 0) {
      offscreenCreated = true;
      return;
    }
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["USER_MEDIA" as chrome.offscreen.Reason],
      justification: "Microphone access for clap detection"
    });
    offscreenCreated = true;
  } catch (error) {
    console.error("[Wave Remote] Failed to create offscreen:", error);
  } finally {
    creating = false;
  }
}

async function findMediaTab(): Promise<chrome.tabs.Tab | undefined> {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.url?.match(/youtube\.com|netflix\.com/)) return activeTab;
  const allTabs = await chrome.tabs.query({});
  return allTabs.find((tab) => tab.url?.match(/youtube\.com|netflix\.com/));
}

async function sendCommand(command: ClapCommand): Promise<void> {
  const tab = await findMediaTab();
  if (!tab?.id) {
    void recordEvent("error", { where: "no_active_tab" });
    return;
  }
  try {
    await chrome.tabs.sendMessage(tab.id, command);
  } catch (error) {
    console.error("[Wave Remote] Failed to send command:", error);
    void recordEvent("error", { where: "command_send" });
  }
}

function handleClap(count: number): void {
  const command = commandForClapCount(count);
  if (command) void sendCommand(command);
}

chrome.runtime.onInstalled.addListener((details) => {
  void getInstallId();
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((message: WaveMessage, _sender, sendResponse) => {
  switch (message.type) {
    case "CLAP_DETECTED":
      handleClap(message.count);
      break;
    case "OFFSCREEN_READY":
      isListening = true;
      void chrome.storage.local.set({ listeningStartedAt: Date.now() });
      void recordEvent("listening_started");
      break;
    case "OFFSCREEN_ERROR":
      isListening = false;
      void recordEvent("error", { where: "mic_init" });
      break;
    case "START_OFFSCREEN":
      void createOffscreenDocument().then(() => sendResponse({ success: true }));
      return true;
    case "GET_STATUS":
      sendResponse({ offscreenCreated, isListening });
      break;
    case "TRACK_EVENT":
      void recordEvent(message.name as EventName, message.props).then(() => sendResponse({ ok: true }));
      return true;
    case "STOP_LISTENING": {
      isListening = false;
      sendResponse({ success: true });
      chrome.runtime.sendMessage({ type: "STOP_LISTENING" }).catch(() => {});
      void chrome.storage.local.get(["listeningStartedAt"]).then((s) => {
        const startedAt = s.listeningStartedAt;
        if (typeof startedAt === "number") {
          void recordEvent("listening_stopped", { durationMs: Date.now() - startedAt });
        }
      });
      break;
    }
  }
  return undefined;
});
