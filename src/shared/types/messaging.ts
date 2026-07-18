// Every chrome.runtime message contract in one typed place. Keeps the contexts in sync.
// Contracts only. Domain logic lives in features, not here.

export type ClapCommand =
  | { type: "TOGGLE_PLAY" }
  | { type: "SEEK_FORWARD"; seconds: number }
  | { type: "SEEK_BACKWARD"; seconds: number };

// offscreen -> background
export type OffscreenToBackground =
  | { type: "CLAP_DETECTED"; count: number }
  | { type: "OFFSCREEN_READY"; status: string }
  | { type: "OFFSCREEN_ERROR"; error: string }
  | { type: "AMPLITUDE"; value: number };

// popup -> background
export type PopupToBackground =
  | { type: "START_OFFSCREEN" }
  | { type: "STOP_LISTENING" }
  | { type: "GET_STATUS" };

// background/popup -> offscreen
export type ToOffscreen =
  | { type: "START_LISTENING"; deviceId: string | null }
  | { type: "RESTART_LISTENING"; deviceId: string | null }
  | { type: "STOP_LISTENING" }
  | { type: "GET_STATUS" }
  | { type: "UPDATE_CONFIG"; config: Record<string, number> };

// background -> content
export type ToContent = ClapCommand | { type: "GET_VIDEO_STATUS" };

export type WaveMessage =
  | OffscreenToBackground
  | PopupToBackground
  | ToOffscreen
  | ToContent;
