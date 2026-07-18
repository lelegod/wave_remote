import { useEffect, useRef, useState } from "react";
import { insert } from "../../shared/supabase";
import { coarseOs, isValidEmail } from "../../shared/config";
import "../../shared/styles/feedback.css";

type Status = "idle" | "sending" | "sent" | "error";
type Sentiment = "up" | "down" | null;

// Feedback affordance mounted on every surface, so the user can message us from anywhere.
// inline = render in normal flow for the small popup. Default = floating pill for full-page surfaces.
export function FeedbackWidget({ inline = false }: { inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const [sentiment, setSentiment] = useState<Sentiment>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const version = chrome.runtime.getManifest().version;
  const os = coarseOs();
  const panelRef = useRef<HTMLDivElement>(null);

  // In the popup the panel opens in flow, so smoothly bring it into view instead of it appearing below the fold.
  useEffect(() => {
    if (open && inline) {
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panelRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
    }
  }, [open, inline]);

  async function send() {
    if (status === "sending") return;
    const trimmedEmail = email.trim();
    // Email is optional, but if provided it must be valid.
    if (trimmedEmail !== "" && !isValidEmail(trimmedEmail)) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setStatus("sending");
    const ok = await insert("feedback", { sentiment, message, email: trimmedEmail, version, os });
    setStatus(ok ? "sent" : "error");
  }

  function close() {
    setOpen(false);
    if (status === "sent") {
      setStatus("idle");
      setSentiment(null);
      setMessage("");
      setEmail("");
    }
  }

  if (!open) {
    return (
      <button type="button" className={inline ? "wr-fab wr-fab-inline" : "wr-fab"} data-testid="fb-open" onClick={() => setOpen(true)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Feedback
      </button>
    );
  }

  return (
    <div ref={panelRef} className={inline ? "wr-fb-panel wr-fb-panel-inline" : "wr-fb-panel"} role="dialog" aria-label="Send feedback">
      <div className="wr-fb-head">
        <span className="wr-fb-title">Send us a message</span>
        <button type="button" className="wr-fb-x" data-testid="fb-close" aria-label="Close" onClick={close}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {status === "sent" ? (
        <div className="wr-fb-thanks" data-testid="fb-thanks">
          <span className="wr-fb-check">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <p>Thanks for the message. If you left your email, we will be in touch.</p>
        </div>
      ) : (
        <div className="wr-fb-body">
          <div className="wr-fb-q">How is Wave Remote working for you?</div>
          <div className="wr-fb-chips">
            <button type="button" className={`wr-fb-chip${sentiment === "up" ? " on" : ""}`} data-testid="fb-up" onClick={() => setSentiment("up")}>👍 Good</button>
            <button type="button" className={`wr-fb-chip${sentiment === "down" ? " on" : ""}`} data-testid="fb-down" onClick={() => setSentiment("down")}>👎 Needs work</button>
          </div>
          <textarea
            data-testid="fb-message"
            className="wr-fb-textarea"
            placeholder="Tell us more (optional)"
            value={message}
            onChange={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
          />
          <input
            data-testid="fb-email"
            className="wr-fb-input"
            type="email"
            placeholder="Email (optional)"
            aria-invalid={emailError}
            value={email}
            onChange={(e) => {
              setEmail((e.target as HTMLInputElement).value);
              if (emailError) setEmailError(false);
            }}
          />
          {emailError && <div className="wr-fb-error" data-testid="fb-email-error">Enter a valid email or leave it blank.</div>}
          <button type="button" className="wr-fb-send" data-testid="fb-send" disabled={status === "sending"} onClick={send}>
            {status === "sending" ? "Sending..." : "Send message"}
          </button>
          {status === "error" && <div className="wr-fb-error" data-testid="fb-error">Could not send. Try again.</div>}
          <div className="wr-fb-note">We read every message.</div>
        </div>
      )}
    </div>
  );
}
