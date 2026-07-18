import { createRoot } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import { WaveMark, StopIcon, PlayIcon } from "./shared/components/icons";
import { Meter, type MeterController } from "./features/clap-control/Meter";
import { FeedbackWidget } from "./features/feedback/FeedbackWidget";
import type { WaveMessage } from "./shared/types/messaging";
import "./shared/styles/tokens.css";
import "./shared/styles/popup.css";

const COMMANDS: Array<[string, string]> = [
  ["1 CLAP", "Play / Pause"],
  ["2 CLAPS", "Seek +10s"],
  ["3 CLAPS", "Seek -10s"]
];

export function App() {
  const [isListening, setListening] = useState(false);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const meter = useRef<MeterController | null>(null);

  async function loadState() {
    try {
      const data = await chrome.storage.local.get(["selectedMicId", "hasPermission"]);
      setReady(Boolean(data.hasPermission && data.selectedMicId));
      const status = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
      setListening(Boolean(status?.isListening));
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void loadState();
    const onMessage = (msg: WaveMessage) => {
      if (msg.type === "AMPLITUDE") meter.current?.push(msg.value);
    };
    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, []);

  async function toggle() {
    setError(false);
    try {
      if (isListening) {
        await chrome.runtime.sendMessage({ type: "STOP_LISTENING" });
        setListening(false);
        return;
      }
      const data = await chrome.storage.local.get(["selectedMicId", "hasPermission"]);
      if (!data.hasPermission || !data.selectedMicId) {
        chrome.runtime.openOptionsPage();
        return;
      }
      await chrome.runtime.sendMessage({ type: "START_OFFSCREEN" });
      await chrome.runtime.sendMessage({ type: "START_LISTENING", deviceId: data.selectedMicId });
      setListening(true);
    } catch {
      setError(true);
    }
  }

  const statusText = error
    ? "Error"
    : !loaded
      ? "Checking..."
      : isListening
        ? "Listening"
        : ready
          ? "Ready"
          : "Setup required";

  return (
    <div className="wr-popup">
      <div className="wr-head">
        <span className="wr-mark"><WaveMark size={17} /></span>
        <div>
          <div className="wr-title">Wave Remote</div>
          <div className="wr-sub">Acoustic control</div>
        </div>
      </div>

      <div className="wr-viz">
        <Meter controller={meter} />
        <div className={`wr-status${isListening ? " on" : ""}${error ? " error" : ""}`}>
          <span className="wr-dot" /> {statusText}
        </div>
      </div>

      <button className={`wr-btn${isListening ? " on" : ""}`} data-testid="toggle" onClick={toggle}>
        {isListening ? <StopIcon /> : <PlayIcon />}
        {isListening ? "Stop Listening" : "Start Listening"}
      </button>

      <div className="wr-cmds">
        {COMMANDS.map(([k, v]) => (
          <div className="wr-cmd" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
        ))}
      </div>

      <div className="wr-foot">
        {ready ? (
          "Works on YouTube and Netflix"
        ) : (
          <button type="button" className="wr-link" onClick={() => chrome.runtime.openOptionsPage()}>
            Set up microphone to start
          </button>
        )}
      </div>

      <FeedbackWidget inline />
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
