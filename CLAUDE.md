# Wave Remote

Chrome extension (Manifest V3) that controls YouTube and Netflix playback with acoustic impulses (claps/snaps). Audio is processed entirely on-device and never leaves the machine. This is the product's core promise and must never be broken.

Claps map to actions: 1 = play/pause, 2 = seek +10s, 3 = seek −10s.

## Architecture

MV3 uses an offscreen document for microphone access because the service worker can't reach `getUserMedia`. TypeScript sources in `src/` are bundled by esbuild into `dist/*.js`, and .html files and manifest.json are copied to `dist/`. Five modules collaborate over `chrome.runtime` messaging:

- `src/offscreen.ts` — captures the mic and detects claps with the Web Audio API (high-pass filter into an analyser, then impulse validation: a spike that decays back to baseline fast). Sends `CLAP_DETECTED` with a count. Tunable `CONFIG` at the top.
- `src/background.ts` — service worker. Creates and manages the offscreen document, maps clap count to a command, finds the active YouTube/Netflix tab, relays the command. Not persistent, so it holds no long-lived state.
- `src/content.ts` — injected on YouTube/Netflix. Acts on the `<video>` element. YouTube seeks directly via `currentTime`; Netflix needs synthetic arrow-key events because its player rejects direct seeking.
- `src/popup.ts` and `src/options.ts` — UI. Popup toggles listening. Options handles mic permission and device selection.
- `src/messaging/messages.ts` — typed message contracts for `chrome.runtime` messaging.

Signal flow: mic → `offscreen` (detect) → `background` (route) → `content` (act on the video).

The offscreen document is created only when the user clicks Start Listening, never on startup.

## Key files

- `manifest.json` — permissions, host permissions, content-script matches
- `src/offscreen.ts` + `offscreen.html` — audio capture and clap detection (tunable `CONFIG` at top)
- `src/background.ts` — command routing
- `src/content.ts` — video control
- `src/popup.ts` + `popup.html`, `src/options.ts` + `options.html` — UI
- `src/messaging/messages.ts` — typed message contracts

## Project structure

The five MV3 entry points (`background.ts`, `content.ts`, `offscreen.ts`, `popup.ts`, `options.ts`) live at `src/` root. `build.mjs` bundles these and `manifest.json` and the HTML files reference them, so they stay at root.

Shared code is grouped by category folder. Put new shared modules in the matching folder, never at `src/` root, and create the folder when its first file lands:

- `src/messaging/` — `chrome.runtime` message contracts and helpers
- `src/services/` — cross-context services such as telemetry and storage (Plan 3)
- `src/audio/` — audio capture and the clap-detection logic extracted from `offscreen` (Phase 2, so the detector can be unit tested)
- `src/ui/` — shared UI: the live meter component, icons, and design tokens (Plan 2)

Only `src/messaging/` exists today. The rest are the designated homes for code arriving in later plans.

## Running and testing

Build with `npm run build` (or `npm run watch`), which bundles `src/*.ts` into `dist/`. Load unpacked at `chrome://extensions` from the `dist/` folder, and reload the extension after each build. Grant mic permission through the options page.

Tests: `npm test` (Vitest unit), `npm run test:e2e` (Playwright loads the built extension), `npm run typecheck` (tsc).

## Coding rules

**Comments.** Write sparingly, only where the code can't explain itself. Keep them concise, like a senior engineer. No em-dashes, no semicolons. Plain and direct.

**Git.** Never commit, including when running as or dispatching subagents. When your work is done, stage only the files you changed, then ask the user to review. Each subagent stages only its own task's files. Never stage changes made by the user or another agent, even if they are left unstaged. Committing is always the user's action.

**Task review gate.** When running a multi-task plan with subagents, pause after each task subagent completes and ask the user to review the staged work before starting the next task. Do not chain tasks without the user's review.

## Roadmap

Active plan and design decisions live in `docs/superpowers/specs/`. Current work is Phase 1 (redesign + usage instrumentation); product bug hardening is Phase 2.
