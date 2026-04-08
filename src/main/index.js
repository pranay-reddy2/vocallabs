// ─────────────────────────────────────────────
//  src/main/index.js — Electron main process
// ─────────────────────────────────────────────

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } = require("electron");
const path = require("path");
const keys = require("../../config/keys");

let mainWindow = null;
let overlayWindow = null;
let tray = null;
let hotkeyManager = null;
let audioEngine = null;
let deepgramService = null;

// ── Lazy-load heavy modules after app ready ──
function loadServices() {
  hotkeyManager = require("./hotkeyManager");
  audioEngine = require("./audioEngine");
  deepgramService = require("./deepgramService");
}

// ── Settings window ──────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 720,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: "#0a0a0f",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "../../assets/icon.png"),
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  mainWindow.once("ready-to-show", () => {
    // Don't show on startup — open via tray
  });

  mainWindow.on("close", (e) => {
    e.preventDefault();
    mainWindow.hide();
  });
}

// ── Recording overlay ────────────────────────
function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  overlayWindow = new BrowserWindow({
    width: 160,
    height: 60,
    x: Math.floor(width / 2 - 80),
    y: height - 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  overlayWindow.loadFile(path.join(__dirname, "../renderer/overlay.html"));
  overlayWindow.setIgnoreMouseEvents(true);
  overlayWindow.hide();
}

// ── System tray ──────────────────────────────
function createTray() {
  // Use a simple 16×16 PNG fallback if no icon file exists
  const iconPath = path.join(__dirname, "../../assets/tray-icon.png");
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip("VocalFlow — Hold Right Alt to dictate");

  const menu = Menu.buildFromTemplate([
    {
      label: "Open Settings",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: "separator" },
    {
      label: "Quit VocalFlow",
      click: () => {
        app.exit(0);
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on("click", () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// ── IPC handlers ─────────────────────────────

// Settings persistence via electron-store equivalent (simple JSON)
const Store = require("./store");
const store = new Store();

ipcMain.handle("get-settings", () => store.getAll());
ipcMain.handle("save-settings", (_, settings) => {
  store.setAll(settings);
  // Restart hotkey with new key if changed
  if (hotkeyManager) {
    hotkeyManager.restart(settings.hotkey || "RIGHT ALT");
  }
  return true;
});

ipcMain.handle("get-config-keys", () => ({
  deepgramKey: keys.DEEPGRAM_API_KEY,
  groqKey: keys.GROQ_API_KEY,
}));

ipcMain.handle("fetch-deepgram-models", async (_, apiKey) => {
  return deepgramService.fetchModels(apiKey);
});

ipcMain.handle("fetch-deepgram-balance", async (_, apiKey) => {
  return deepgramService.fetchBalance(apiKey);
});

ipcMain.handle("fetch-groq-models", async (_, apiKey) => {
  const { fetchGroqModels } = require("./groqService");
  return fetchGroqModels(apiKey);
});

ipcMain.handle("fetch-groq-balance", async (_, apiKey) => {
  const { fetchGroqBalance } = require("./groqService");
  return fetchGroqBalance(apiKey);
});

ipcMain.handle("set-recording-state", (_, state) => {
  updateTrayIcon(state);
  if (state === "recording") {
    overlayWindow.show();
    overlayWindow.webContents.send("recording-state", "recording");
  } else {
    overlayWindow.webContents.send("recording-state", state);
    if (state === "idle") {
      setTimeout(() => overlayWindow.hide(), 400);
    }
  }
});

ipcMain.handle("inject-text", async (_, text) => {
  const { injectText } = require("./textInjector");
  await injectText(text);
});

// Receive audio chunks from renderer Web Audio API
ipcMain.on("audio-chunk", (_, arrayBuffer) => {
  audioEngine.receiveChunk(arrayBuffer);
});

// ── Tray icon states ─────────────────────────
function updateTrayIcon(state) {
  const labels = {
    idle: "VocalFlow — Hold Right Alt to dictate",
    recording: "VocalFlow — Recording…",
    transcribing: "VocalFlow — Transcribing…",
    error: "VocalFlow — Error",
  };
  tray.setToolTip(labels[state] || labels.idle);
}

// ── App lifecycle ────────────────────────────
app.whenReady().then(() => {
  loadServices();
  createMainWindow();
  createOverlayWindow();
  createTray();

  const settings = store.getAll();

  // Start hotkey listener
  hotkeyManager.start(settings.hotkey || "RIGHT ALT", {
    onPress: () => {
      const liveKeys = require("../../config/keys");
      const liveSettings = store.getAll();
      // Reconnect fresh each recording so key/model changes take effect
      deepgramService.connect(
        liveKeys.DEEPGRAM_API_KEY,
        liveSettings.model || "nova-2-general",
        liveSettings.language || "en-US"
      );
      mainWindow.webContents.send("hotkey-press");
      audioEngine.startCapture((chunk) => {
        deepgramService.sendChunk(chunk);
      });
      updateTrayIcon("recording");
      overlayWindow.show();
      overlayWindow.webContents.send("recording-state", "recording");
    },
    onRelease: () => {
      audioEngine.stopCapture();
      updateTrayIcon("transcribing");
      overlayWindow.webContents.send("recording-state", "transcribing");
      deepgramService.closeStream((transcript) => {
        updateTrayIcon("idle");
        if (!transcript) {
          overlayWindow.webContents.send("recording-state", "idle");
          setTimeout(() => overlayWindow.hide(), 400);
          return;
        }
        mainWindow.webContents.send("transcript-raw", transcript);
        // Post-processing happens in renderer, then calls inject-text
      });
    },
  });

  // Connect Deepgram on startup with key from config file
  const configKeys = require("../../config/keys");
  const dgKey = configKeys.DEEPGRAM_API_KEY;

  if (!dgKey || dgKey === "YOUR_DEEPGRAM_API_KEY_HERE") {
    console.warn("[Deepgram] No API key set in config/keys.js — skipping connect");
  } else {
    deepgramService.connect(
      dgKey,
      settings.model || "nova-2-general",
      settings.language || "en-US"
    );
  }
});

app.on("window-all-closed", (e) => e.preventDefault());

module.exports = { mainWindow, overlayWindow };
