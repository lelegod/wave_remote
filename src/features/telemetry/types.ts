// Telemetry event contract. Allowed props per event (documented, not type-enforced):
//   mic_permission     { result: "granted" | "denied" }
//   listening_started  none
//   listening_stopped  { durationMs: number }
//   command_executed   { command: "playpause" | "seek_fwd" | "seek_back", site: "youtube" | "netflix" }
//   error              { where: "mic_init" | "no_active_tab" | "command_send" | "no_video" }
export type EventName =
  | "mic_permission"
  | "listening_started"
  | "listening_stopped"
  | "command_executed"
  | "error";

export type EventProps = Record<string, string | number | boolean>;
