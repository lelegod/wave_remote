import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { WaveMark, MicIcon } from "./shared/components/icons";
import { FeedbackWidget } from "./features/feedback/FeedbackWidget";
import { insert } from "./shared/supabase";
import { coarseOs, PRIVACY_POLICY_URL } from "./shared/config";
import { track, getInstallId } from "./features/telemetry/track";
import "./shared/styles/tokens.css";
import "./shared/styles/options.css";

type Permission = "prompt" | "granted" | "denied";

const INTENTS = ["Cooking", "Accessibility", "Working out", "Just curious", "Other"];

export function App() {
  const [permission, setPermission] = useState<Permission>("prompt");
  const [requesting, setRequesting] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [intentPicked, setIntentPicked] = useState(false);
  const [intentError, setIntentError] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState("");

  async function pickIntent(usecase: string): Promise<void> {
    setIntentError(false);
    const ok = await insert("intents", {
      usecase,
      install_id: await getInstallId(),
      version: chrome.runtime.getManifest().version,
      os: coarseOs()
    });
    if (ok) setIntentPicked(true);
    else setIntentError(true);
  }

  // "Other" opens a free-text box so we capture use cases we did not anticipate.
  async function submitOther(): Promise<void> {
    const text = otherText.trim();
    if (text) await pickIntent(text);
  }

  // Load available microphones (same logic as the original options.ts)
  async function loadMicrophones(): Promise<void> {
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const mics: MediaDeviceInfo[] = allDevices.filter((d) => d.kind === "audioinput");

    // Get saved selection
    const saved = await chrome.storage.local.get(["selectedMicId"]);
    let selected: string | null = saved.selectedMicId ?? null;

    mics.forEach((mic, index) => {
      const isDefault = mic.deviceId === "default" || index === 0;
      const isSelected = mic.deviceId === selected || (!selected && isDefault);

      if (isSelected && !selected) {
        selected = mic.deviceId;
      }
    });

    setDevices(mics);
    setSelectedDeviceId(selected);
  }

  // Check current permission status
  async function checkPermission(): Promise<void> {
    try {
      const result = await navigator.permissions.query({
        name: "microphone" as PermissionName
      });
      setPermission(result.state as Permission);

      result.addEventListener("change", () => {
        setPermission(result.state as Permission);
      });

      if (result.state === "granted") {
        await loadMicrophones();
      }
    } catch (e) {
      console.error("Permission query failed:", e);
    }
  }

  useEffect(() => {
    void checkPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request microphone permission
  async function requestPermission(): Promise<void> {
    try {
      setRequesting(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      setPermission("granted");
      track("mic_permission", { result: "granted" });
      await loadMicrophones();
    } catch (error) {
      console.error("Permission denied:", error);
      setPermission("denied");
      track("mic_permission", { result: "denied" });
    } finally {
      setRequesting(false);
    }
  }

  function selectDevice(deviceId: string): void {
    setSelectedDeviceId(deviceId);
    setSavedMessage(null);
  }

  // Save settings and auto-restart if currently listening
  async function handleSave(): Promise<void> {
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
        setSavedMessage("Restarting with new microphone...");

        // Send restart command with new deviceId
        await chrome.runtime.sendMessage({
          type: "RESTART_LISTENING",
          deviceId: selectedDeviceId
        });

        // Update message after restart
        setTimeout(() => {
          setSavedMessage("Settings saved and mic switched!");
        }, 500);
      } else {
        // Not listening - initialize the microphone NOW while this page is open!
        setSavedMessage("Initializing microphone...");

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
          setSavedMessage("Ready! Listening for claps. You can close this tab.");
        } else {
          setSavedMessage("Settings saved! Click Start in popup to begin.");
        }
      }
    } catch (error) {
      console.error("Error saving:", error);
      setSavedMessage("Settings saved! You can close this tab.");
    }
  }

  const badgeText = permission === "granted" ? "Granted" : permission === "denied" ? "Denied" : "Not granted";
  const grantLabel = requesting
    ? "Requesting..."
    : permission === "granted"
      ? "Permission Granted"
      : permission === "denied"
        ? "Permission Denied - Check Chrome Settings"
        : "Grant Microphone Access";

  return (
    <div className="wr-options">
      <div className="wr-opt-head">
        <span className="wr-opt-mark"><WaveMark size={26} /></span>
        <div>
          <div className="wr-opt-title">Wave Remote Settings</div>
          <div className="wr-opt-sub">Configure your microphone for clap detection</div>
        </div>
      </div>

      <div className="wr-card">
        <div className="wr-card-title">What will you use Wave Remote for?</div>
        {intentPicked ? (
          <p className="wr-desc" data-testid="intent-thanks">Thanks, that helps us make it better.</p>
        ) : otherOpen ? (
          <div className="wr-intent-other">
            <input
              type="text"
              className="wr-input"
              data-testid="intent-other-input"
              placeholder="Tell us how you use it"
              value={otherText}
              autoFocus
              onChange={(e) => setOtherText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void submitOther(); }}
            />
            <button type="button" className="wr-btn" data-testid="intent-other-submit" disabled={!otherText.trim()} onClick={() => void submitOther()}>
              Submit
            </button>
          </div>
        ) : (
          <div className="wr-intent-options">
            {INTENTS.map((usecase) => (
              <button
                type="button"
                key={usecase}
                className="wr-chip"
                onClick={() => (usecase === "Other" ? setOtherOpen(true) : void pickIntent(usecase))}
              >
                {usecase}
              </button>
            ))}
          </div>
        )}
        {intentError && <p className="wr-desc" data-testid="intent-error">Could not save, please try again.</p>}
      </div>

      <div className="wr-card">
        <div className="wr-card-title">
          <span className="wr-icon"><MicIcon size={16} /></span>
          Microphone Permission
          <span className={`wr-badge ${permission}`}>{badgeText}</span>
        </div>
        <p className="wr-desc">
          Wave Remote needs access to your microphone to detect claps and snaps.
          Click the button below to grant permission.
        </p>
        <button className="wr-btn" disabled={permission === "granted"} onClick={() => void requestPermission()}>
          {!requesting && permission === "prompt" && <MicIcon size={14} />}
          {grantLabel}
        </button>
      </div>

      {permission === "granted" && (
        <div className="wr-card">
          <div className="wr-card-title">
            <span className="wr-icon"><MicIcon size={16} /></span>
            Select Microphone
          </div>
          <p className="wr-desc">Choose which microphone to use for clap detection.</p>
          <div className="wr-devices">
            {devices.map((mic, index) => {
              const isDefault = mic.deviceId === "default" || index === 0;
              const isSelected = mic.deviceId === selectedDeviceId;
              return (
                <label
                  key={mic.deviceId || index}
                  className={`wr-device${isSelected ? " selected" : ""}`}
                  onClick={() => selectDevice(mic.deviceId)}
                >
                  <input type="radio" name="mic" value={mic.deviceId} checked={isSelected} readOnly />
                  <span className="wr-device-name">{mic.label || "Microphone " + (index + 1)}</span>
                  {isDefault && <span className="wr-device-default">Default</span>}
                </label>
              );
            })}
          </div>
          <div className="wr-save-row">
            <button className="wr-btn" onClick={() => void handleSave()}>
              Save Settings and Start Listening
            </button>
          </div>
          {savedMessage && <p className="wr-saved-message">{savedMessage}</p>}
        </div>
      )}

      <FeedbackWidget />

      <p className="wr-disclosure">
        Wave Remote sends anonymous usage stats to improve the product.{" "}
        <a className="wr-link" data-testid="privacy-link" href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer">
          Privacy policy
        </a>
      </p>
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
