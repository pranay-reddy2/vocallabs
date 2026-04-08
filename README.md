# VocalFlow Windows

> Hold a key → speak → release → text appears at your cursor. Anywhere on Windows.

A Windows port of [VocalFlow](https://github.com/mritunjoy/VocalFlow) built with **Electron + TypeScript-flavoured JS**. Streams audio to [Deepgram](https://deepgram.com) for real-time transcription, optionally post-processes through [Groq](https://groq.com) for spelling/grammar/translation, then injects the result at your cursor via simulated Ctrl+V.

---

## Features

- **Hold-to-record hotkey** — Right Alt (or any modifier key you pick)
- **Real-time streaming ASR** — Deepgram WebSocket, same wire protocol as the macOS original
- **Balance dashboard** — See your Deepgram credit balance and Groq tier live in the UI
- **LLM post-processing via Groq**
  - Spelling correction
  - Grammar correction
  - Code-mix transliteration (Hinglish, Tanglish, Spanglish, and more)
  - Translation to any target language
- **Works in any app** — text injected via Clipboard + Ctrl+V simulation
- **System tray** — no taskbar icon, lives in the notification area
- **Floating recording overlay** — waveform animation bottom-center while recording

---

## Requirements

| Requirement | Notes |
|---|---|
| Node.js ≥ 18 | [nodejs.org](https://nodejs.org) |
| SoX audio utility | Required for mic capture — see below |
| Deepgram API key | [Free tier available](https://console.deepgram.com/signup) |
| Groq API key | Optional — for post-processing |
| Windows 10/11 x64 | Tested on Windows 11 |

### Install SoX (required for microphone capture)

**Option A — Chocolatey (recommended):**
```powershell
choco install sox
```

**Option B — Manual:** Download from [sourceforge.net/projects/sox](https://sourceforge.net/projects/sox/files/sox/) and add to `PATH`.

Verify: `sox --version` should print a version number.

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/pranay-reddy2/vocalflow-windows.git
cd vocalflow-windows
npm install
```

### 2. Add your API keys

Open `config/keys.js` and paste your keys:

```js
module.exports = {
  DEEPGRAM_API_KEY: "YOUR_DEEPGRAM_KEY_HERE",
  GROQ_API_KEY:     "YOUR_GROQ_KEY_HERE",   // optional
};
```

> **Note:** `config/keys.js` is in `.gitignore` — your keys are never committed.

### 3. Run

```bash
npm start
```

VocalFlow appears in your system tray (notification area, bottom-right).  
Click the tray icon → **Open Settings** to configure models and hotkey.

---

## Usage

1. Open any app with a text field (Notepad, browser, VS Code, anywhere)
2. Click into a text field
3. **Hold Right Alt** (or your configured key)
4. Speak
5. **Release** — the transcription appears at your cursor

The floating overlay at the bottom of your screen shows recording/transcribing state.

---

## Configuration

All settings are in the **Settings window** (tray → Open Settings):

| Setting | Description |
|---|---|
| Deepgram API Key | Your Deepgram key for speech recognition |
| Groq API Key | Your Groq key for post-processing (optional) |
| Model | Deepgram ASR model (fetch from API) |
| Language | Recognition language / `multi` for code-switching |
| Groq Model | LLM for corrections (fetch from API) |
| Spelling correction | Fix misspelled words |
| Grammar correction | Fix grammar |
| Code-mix input | Transliterate Hinglish/Tanglish/etc to Roman |
| Translate output | Convert transcript to another language |
| Hotkey | Which modifier key triggers recording |

### Balance display

The top of the settings window shows your live **Deepgram credit balance** and **Groq tier status**. Hit the ↻ button to refresh.

---

## Project Structure

```
vocalflow-windows/
├── config/
│   └── keys.js              ← API keys (gitignored — edit this)
├── src/
│   ├── main/
│   │   ├── index.js         ← Electron main process, app lifecycle
│   │   ├── preload.js       ← Context bridge (main ↔ renderer)
│   │   ├── store.js         ← JSON settings persistence
│   │   ├── hotkeyManager.js ← Global hotkey via node-global-key-listener
│   │   ├── audioEngine.js   ← Mic capture via node-record-lpcm16 + SoX
│   │   ├── deepgramService.js ← WebSocket streaming + REST (models, balance)
│   │   ├── groqService.js   ← LLM post-processing + model listing
│   │   └── textInjector.js  ← Clipboard + Ctrl+V injection
│   └── renderer/
│       ├── index.html       ← Settings window shell
│       ├── overlay.html     ← Recording overlay (borderless, always-on-top)
│       ├── app.js           ← All UI logic and runtime
│       ├── groqClient.js    ← Renderer-side Groq fetch wrapper
│       └── styles/
│           └── main.css     ← Dark premium theme
├── assets/                  ← Icons
├── package.json
└── README.md
```

---

## Building a distributable

```bash
npm run build
```

Output: `dist/VocalFlow Setup 1.0.0.exe` (NSIS installer)

---

## Troubleshooting

**Hotkey doesn't work**  
→ Run VocalFlow as Administrator (right-click → Run as administrator). Windows requires elevated privileges for low-level keyboard hooks in some setups.

**No audio / mic not captured**  
→ Verify SoX is installed: `sox --version`  
→ Check Windows microphone privacy settings (Settings → Privacy → Microphone)

**Text not injected**  
→ The target app may not support Ctrl+V paste. Try a text editor like Notepad first.  
→ Ensure the text field was focused before releasing the hotkey.

**Models don't fetch**  
→ Check your API key is correct in `config/keys.js` then click Save Key → Fetch Models.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Electron 28 |
| Main process | Node.js (CommonJS) |
| Renderer | Vanilla JS + CSS (no framework — keeps it fast) |
| Hotkey | `node-global-key-listener` |
| Mic capture | `node-record-lpcm16` + SoX |
| ASR | Deepgram WebSocket API |
| LLM | Groq Chat Completions API |
| Text injection | `@nut-tree-fork/nut-js` / robotjs fallback |
| Settings storage | JSON file in `%APPDATA%` |

---

## Contributing

PRs welcome. Open an issue first for significant changes.

1. Fork → feature branch → PR
2. Run `npm start` during development
3. Test the hotkey, recording, and injection before submitting

---

## License

MIT — see [LICENSE](LICENSE)
