# Wave Remote 👏 -> 📺

**Wave Remote** is a Chrome Extension that lets you control playing media on **YouTube** and **Netflix** using simple acoustic impulses (claps or snaps). It is designed for hands-free control—perfect for when you're cooking, exercising, or just don't want to touch your keyboard.

## ✨ Features

*   **Hands-Free Media Control**: Use claps to control video playback.
*   **Privacy-First**: Audio is processed **100% locally** on your device. No audio is ever recorded or sent to the cloud.
*   **Universal Support**: Works seamlessly on all YouTube and Netflix videos.
*   **Background Operation**: Controls media even when the tab is in the background or minimized.

## 🎮 How to Use

Once installed, simply grant microphone access and start the extension.

| Usage | Action |
| :--- | :--- |
| **1 Clap** 👏 | Play / Pause |
| **2 Claps** 👏👏 | Seek Forward **10s** |
| **3 Claps** 👏👏👏 | Seek Backward **10s** |

## 🚀 Installation (Developer Mode)

1.  Clone or download this repository.
2.  Run `npm install && npm run build` to bundle the extension into `dist/`.
3.  Open Chrome and navigate to `chrome://extensions/`.
4.  Toggle **Developer mode** (top right corner).
5.  Click **Load unpacked**.
6.  Select the `dist/` folder.
7.  Open the extension popup and grant microphone permissions!

## 🧑‍💻 Development

The extension is written in TypeScript and bundled with esbuild.

*   `npm install` — install dependencies
*   `npm run build` — bundle `src/*.ts` into `dist/`
*   `npm run watch` — rebuild on change
*   `npm test` — run the Vitest unit tests
*   `npm run test:e2e` — run the Playwright end-to-end test (loads the built extension)
*   `npm run typecheck` — type-check with `tsc`
*   `npm run package` — zip a built `dist/` into `wave-remote-<version>.zip` for the store

Source lives in `src/`: entry points at the root, shared code in category folders (`messaging/`, and later `services/`, `audio/`, `ui/`). See `CLAUDE.md` for architecture.

## 📦 Releases

CI runs on every push/PR (typecheck, unit tests, build, e2e). Releases are triggered
manually from the GitHub Actions UI (Actions → Release → Run workflow), which
publishes to the Chrome Web Store. See [`docs/deploy.md`](docs/deploy.md) for the
secrets setup and release steps.

## 🛠️ Tech Stack

*   **Manifest V3**: Compliant with the latest Chrome Extension standards.
*   **TypeScript + esbuild**: Typed source bundled into `dist/`.
*   **Web Audio API**: Real-time audio analysis using the `AudioContext` and `AnalyserNode` APIs.
*   **Offscreen Documents**: Uses the `chrome.offscreen` API to access the microphone securely in the background.

## 🔒 Privacy

Wave Remote respects your privacy.
*   **No Recording**: Audio is never recorded to a file.
*   **No Transmission**: Audio data is analyzed in RAM and discarded immediately. No data leaves your computer.
*   **Local Processing**: All clap detection happens locally within the browser.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
