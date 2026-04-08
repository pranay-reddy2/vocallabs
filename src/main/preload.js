// ─────────────────────────────────────────────
//  src/main/preload.js — Context bridge
// ─────────────────────────────────────────────

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("vocalflow", {
  // Settings
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (s) => ipcRenderer.invoke("save-settings", s),
  getConfigKeys: () => ipcRenderer.invoke("get-config-keys"),

  // Models & balances
  fetchDeepgramModels: (key) => ipcRenderer.invoke("fetch-deepgram-models", key),
  fetchDeepgramBalance: (key) => ipcRenderer.invoke("fetch-deepgram-balance", key),
  fetchGroqModels: (key) => ipcRenderer.invoke("fetch-groq-models", key),
  fetchGroqBalance: (key) => ipcRenderer.invoke("fetch-groq-balance", key),

  // Recording lifecycle
  injectText: (text) => ipcRenderer.invoke("inject-text", text),
  setRecordingState: (state) => ipcRenderer.invoke("set-recording-state", state),

  // Audio capture (renderer → main)
  sendAudioChunk: (buffer) => ipcRenderer.send("audio-chunk", buffer),

  // Events from main → renderer
  onHotkeyPress: (cb) => ipcRenderer.on("hotkey-press", cb),
  onTranscriptRaw: (cb) => ipcRenderer.on("transcript-raw", (_, t) => cb(t)),
  onRecordingState: (cb) => ipcRenderer.on("recording-state", (_, s) => cb(s)),
});
