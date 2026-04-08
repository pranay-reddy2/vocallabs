const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("vocalflow", {
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (s) => ipcRenderer.invoke("save-settings", s),
  getConfigKeys: () => ipcRenderer.invoke("get-config-keys"),

  fetchDeepgramModels: (key) => ipcRenderer.invoke("fetch-deepgram-models", key),
  fetchDeepgramBalance: (key) => ipcRenderer.invoke("fetch-deepgram-balance", key),
  fetchGroqModels: (key) => ipcRenderer.invoke("fetch-groq-models", key),
  fetchGroqBalance: (key) => ipcRenderer.invoke("fetch-groq-balance", key),

  injectText: (text) => ipcRenderer.invoke("inject-text", text),
  setRecordingState: (state) => ipcRenderer.invoke("set-recording-state", state),

  sendAudioChunk: (buffer) => ipcRenderer.send("audio-chunk", buffer),

  onStartCapture: (cb) => ipcRenderer.on("start-capture", cb),
  onStopCapture: (cb) => ipcRenderer.on("stop-capture", cb),

  onHotkeyPress: (cb) => ipcRenderer.on("hotkey-press", cb),
  onTranscriptRaw: (cb) => ipcRenderer.on("transcript-raw", (_, t) => cb(t)),
  onRecordingState: (cb) => ipcRenderer.on("recording-state", (_, s) => cb(s)),
});