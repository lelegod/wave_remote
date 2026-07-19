import type { ToContent } from "./shared/types/messaging";
import { track } from "./features/telemetry/track";

function getVideoElement(): HTMLVideoElement | null {
  return (
    document.querySelector<HTMLVideoElement>("video.html5-main-video") ??
    document.querySelector<HTMLVideoElement>("video")
  );
}

function togglePlay(): boolean {
  const video = getVideoElement();
  if (!video) return false;
  if (video.paused) void video.play();
  else video.pause();
  return true;
}

function dispatchArrowKey(key: "ArrowRight" | "ArrowLeft"): void {
  const container =
    document.querySelector<HTMLElement>(".watch-video") ??
    document.querySelector<HTMLElement>(".NFPlayer") ??
    document.body;
  container.focus();
  const code = key === "ArrowRight" ? 39 : 37;
  const event = new KeyboardEvent("keydown", {
    key,
    code: key,
    keyCode: code,
    which: code,
    bubbles: true,
    cancelable: true,
    view: window
  });
  document.activeElement?.dispatchEvent(event);
  document.dispatchEvent(event);
}

function seekForward(seconds: number): boolean {
  const video = getVideoElement();
  if (!video) return false;
  if (window.location.hostname.includes("netflix.com")) {
    dispatchArrowKey("ArrowRight");
    return true;
  }
  video.currentTime = Math.min(video.currentTime + seconds, video.duration);
  return true;
}

function seekBackward(seconds: number): boolean {
  const video = getVideoElement();
  if (!video) return false;
  if (window.location.hostname.includes("netflix.com")) {
    dispatchArrowKey("ArrowLeft");
    return true;
  }
  video.currentTime = Math.max(video.currentTime - seconds, 0);
  return true;
}

function currentSite(): "youtube" | "netflix" {
  return window.location.hostname.includes("netflix.com") ? "netflix" : "youtube";
}

// Emit command_executed on success, error:no_video otherwise.
function reportCommand(command: "playpause" | "seek_fwd" | "seek_back", acted: boolean): void {
  if (acted) track("command_executed", { command, site: currentSite() });
  else track("error", { where: "no_video" });
}

chrome.runtime.onMessage.addListener((message: ToContent, _sender, sendResponse) => {
  switch (message.type) {
    case "TOGGLE_PLAY":
      reportCommand("playpause", togglePlay());
      sendResponse({ success: true });
      break;
    case "SEEK_FORWARD":
      reportCommand("seek_fwd", seekForward(message.seconds ?? 10));
      sendResponse({ success: true });
      break;
    case "SEEK_BACKWARD":
      reportCommand("seek_back", seekBackward(message.seconds ?? 10));
      sendResponse({ success: true });
      break;
    case "GET_VIDEO_STATUS": {
      const video = getVideoElement();
      sendResponse({
        hasVideo: !!video,
        paused: video?.paused,
        currentTime: video?.currentTime,
        duration: video?.duration
      });
      break;
    }
  }
  return undefined;
});
