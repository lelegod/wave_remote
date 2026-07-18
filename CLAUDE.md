# Wave Remote

Chrome extension (Manifest V3) that controls YouTube and Netflix playback with acoustic impulses (claps/snaps). Audio is processed entirely on-device and never leaves the machine. This is the product's core promise and must never be broken.

Claps map to actions: 1 = play/pause, 2 = seek +10s, 3 = seek −10s.

## Architecture

MV3 uses an offscreen document for microphone access because the service worker can't reach `getUserMedia`. TypeScript sources in `src/` are bundled by esbuild into `dist/*.js`, and .html files and manifest.json are copied to `dist/`. Five modules collaborate over `chrome.runtime` messaging:

- `src/offscreen.ts` — captures the mic and detects claps with the Web Audio API (high-pass filter into an analyser, then impulse validation: a spike that decays back to baseline fast). Sends `CLAP_DETECTED` with a count. Tunable `CONFIG` at the top.
- `src/background.ts` — service worker. Creates and manages the offscreen document, maps clap count to a command, finds the active YouTube/Netflix tab, relays the command. Not persistent, so it holds no long-lived state.
- `src/content.ts` — injected on YouTube/Netflix. Acts on the `<video>` element. YouTube seeks directly via `currentTime`; Netflix needs synthetic arrow-key events because its player rejects direct seeking.
- `src/popup.tsx` and `src/options.tsx` — UI (React). Popup toggles listening. Options handles mic permission and device selection.
- `src/shared/types/messaging.ts` — typed message contracts for `chrome.runtime` messaging (cross-context protocol).

Signal flow: mic → `offscreen` (detect) → `background` (route) → `content` (act on the video).

The offscreen document is created only when the user clicks Start Listening, never on startup.

## Key files

- `manifest.json` — permissions, host permissions, content-script matches
- `src/offscreen.ts` + `offscreen.html` — audio capture and clap detection (tunable `CONFIG` at top)
- `src/background.ts` — command routing
- `src/content.ts` — video control
- `src/popup.tsx` + `popup.html`, `src/options.tsx` + `options.html` — UI entries (React)
- `src/features/clap-control/` — the core feature: `commands.ts` (clap → command), `Meter.tsx` (live meter)
- `src/shared/types/messaging.ts` — message contracts (cross-context protocol)
- `src/shared/components/` — generic shared React components (icons)
- `src/shared/styles/` — CSS: design tokens + per-surface styles

## Project structure

**Feature-first.** The five MV3 entry points (`background.ts`, `content.ts`, `offscreen.ts`, `popup.tsx`, `options.tsx`) live at `src/` root and *compose* features. `build.mjs` bundles them and `manifest.json` / the HTML files reference them, so they stay at root.

- `src/features/<name>/` — one self-contained folder per feature: its UI, domain logic, and feature-only types together. Today: `clap-control/` (`commands.ts` clap → command, `Meter.tsx` live meter; the extracted clap detector lands here in Phase 2). Plan 3 adds `telemetry/`, `feedback/`, `onboarding/`.
- `src/shared/` — cross-feature building blocks only: `types/` (types used beyond one feature, e.g. `messaging.ts` — the `chrome.runtime` protocol consumed by the router and every surface), `components/` (generic UI like icons), `styles/` (design tokens + per-surface CSS).

**Rule for types:** a type used beyond its feature goes in `src/shared/types/`; a feature-only type goes in `features/<name>/types.ts`. Business/domain logic never goes in `shared/` — only in the owning feature. (The message protocol is in `shared/types/` because the router and all surfaces depend on it, not just clap-control.)

Tests live under `tests/`, never in `src/`: `tests/unit/` (Vitest), `tests/e2e/` (Playwright), `tests/support/` (chrome mock + Vitest setup).

## Running and testing

Build with `npm run build` (or `npm run watch`), which bundles `src/*.ts` into `dist/`. Load unpacked at `chrome://extensions` from the `dist/` folder, and reload the extension after each build. Grant mic permission through the options page.

Tests: `npm test` (Vitest unit), `npm run test:e2e` (Playwright loads the built extension), `npm run typecheck` (tsc).

## Coding rules

**Comments.** Write sparingly, only where the code can't explain itself. Keep them concise, like a senior engineer. No em-dashes, no semicolons. Plain and direct.

**Git.** Never commit, including when running as or dispatching subagents. When your work is done, stage only the files you changed, then ask the user to review. Each subagent stages only its own task's files. Never stage changes made by the user or another agent, even if they are left unstaged. Committing is always the user's action.

**Task review gate.** When running a multi-task plan with subagents, pause after each task subagent completes and ask the user to review the staged work before starting the next task. Do not chain tasks without the user's review.

## Roadmap

Active plan and design decisions live in `docs/superpowers/specs/`. Current work is Phase 1 (redesign + usage instrumentation); product bug hardening is Phase 2.
