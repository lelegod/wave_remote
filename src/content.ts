import type { ToContent } from "./messaging/messages";

function getVideoElement(): HTMLVideoElement | null {
  return (
    document.querySelector<HTMLVideoElement>("video.html5-main-video") ??
    document.querySelector<HTMLVideoElement>("video")
  );
}

function togglePlay(): void {
  const video = getVideoElement();
  if (!video) return;
  if (video.paused) void video.play();
  else video.pause();
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

function seekForward(seconds: number): void {
  const video = getVideoElement();
  if (!video) return;
  if (window.location.hostname.includes("netflix.com")) {
    dispatchArrowKey("ArrowRight");
    return;
  }
  video.currentTime = Math.min(video.currentTime + seconds, video.duration);
}

function seekBackward(seconds: number): void {
  const video = getVideoElement();
  if (!video) return;
  if (window.location.hostname.includes("netflix.com")) {
    dispatchArrowKey("ArrowLeft");
    return;
  }
  video.currentTime = Math.max(video.currentTime - seconds, 0);
}

chrome.runtime.onMessage.addListener((message: ToContent, _sender, sendResponse) => {
  switch (message.type) {
    case "TOGGLE_PLAY":
      togglePlay();
      sendResponse({ success: true });
      break;
    case "SEEK_FORWARD":
      seekForward(message.seconds ?? 10);
      sendResponse({ success: true });
      break;
    case "SEEK_BACKWARD":
      seekBackward(message.seconds ?? 10);
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
