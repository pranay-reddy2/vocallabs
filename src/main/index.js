
const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, session } = require("electron");
const path = require("path");
const keys = require("../../config/keys");
const Store = require("./store");

const store = new Store();

let mainWindow = null;
let overlayWindow = null;
let tray = null;
let hotkeyManager = null;
let audioEngine = null;
let deepgramService = null;

function loadServices() {
  hotkeyManager = require("./hotkeyManager");
  audioEngine = require("./audioEngine");
  deepgramService = require("./deepgramService");
}

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

  mainWindow.on("close", (e) => {
    e.preventDefault();
    mainWindow.hide();
  });
}

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

function createTray() {
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


ipcMain.handle("get-settings", () => store.getAll());

ipcMain.handle("save-settings", (_, settings) => {
  store.setAll(settings);
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
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.show();
      overlayWindow.webContents.send("recording-state", "recording");
    }
  } else {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send("recording-state", state);
      if (state === "idle") {
        setTimeout(() => {
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.hide();
          }
        }, 400);
      }
    }
  }
});

ipcMain.handle("inject-text", async (_, text) => {
  const { injectText } = require("./textInjector");
  await injectText(text);
});


function updateTrayIcon(state) {
  if (!tray || tray.isDestroyed()) return;
  const labels = {
    idle: "VocalFlow — Hold Right Alt to dictate",
    recording: "VocalFlow — Recording…",
    transcribing: "VocalFlow — Transcribing…",
    error: "VocalFlow — Error",
  };
  tray.setToolTip(labels[state] || labels.idle);
}


function onHotkeyPress() {
  const liveKeys = require("../../config/keys");
  const liveSettings = store.getAll();

  const dgKey = liveKeys.DEEPGRAM_API_KEY;
  if (!dgKey || dgKey === "YOUR_DEEPGRAM_API_KEY_HERE") {
    console.warn("[Recording] No Deepgram API key set — aborting");
    return;
  }

  deepgramService.connect(
    dgKey,
    liveSettings.model || "nova-2-general",
    liveSettings.language || "en-US"
  );

  audioEngine.startCapture((chunk) => {
    deepgramService.sendChunk(chunk);
  });

  updateTrayIcon("recording");

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.show();
    overlayWindow.webContents.send("recording-state", "recording");
  }

  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
    mainWindow.webContents.send("recording-state", "recording");
  }
}

function onHotkeyRelease() {
  audioEngine.stopCapture();
  updateTrayIcon("transcribing");

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send("recording-state", "transcribing");
  }

  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
    mainWindow.webContents.send("recording-state", "transcribing");
  }

  deepgramService.closeStream(async (transcript) => {
    updateTrayIcon("idle");

    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send("recording-state", "idle");
      setTimeout(() => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.hide();
        }
      }, 400);
    }

    if (!transcript || transcript.trim() === "") {
      console.log("[Recording] Empty transcript — nothing to inject");
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
        mainWindow.webContents.send("recording-state", "idle");
      }
      return;
    }

    console.log(`[Recording] Transcript ready: "${transcript}"`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("transcript-raw", transcript);
    } else {
      const { injectText } = require("./textInjector");
      await injectText(transcript);
    }
  });
}


app.whenReady().then(() => {
  loadServices();
  createMainWindow();
  createOverlayWindow();
  createTray();

  // Init audio engine — just verifies SoX, no window created
  audioEngine.init();

  const settings = store.getAll();

  hotkeyManager.start(settings.hotkey || "RIGHT ALT", {
    onPress: onHotkeyPress,
    onRelease: onHotkeyRelease,
  });

  const dgKey = keys.DEEPGRAM_API_KEY;
  if (!dgKey || dgKey === "YOUR_DEEPGRAM_API_KEY_HERE") {
    console.warn("[Deepgram] No API key set in config/keys.js — skipping pre-connect");
  } else {
    deepgramService.connect(
      dgKey,
      settings.model || "nova-2-general",
      settings.language || "en-US"
    );
  }
}).catch((err) => {
  console.error("[App] Fatal error during startup:", err);
  app.exit(1);
});

app.on("window-all-closed", (e) => e.preventDefault());

app.on("before-quit", () => {
  if (hotkeyManager) {
    try { hotkeyManager.stop(); } catch {}
  }
  if (audioEngine) {
    try { audioEngine.stopCapture(); } catch {}
  }
});

module.exports = { mainWindow, overlayWindow };