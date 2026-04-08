// ─────────────────────────────────────────────
//  src/main/audioEngine.js
// ─────────────────────────────────────────────

const { BrowserWindow } = require("electron");
const path = require("path");

let captureWindow = null;
let chunkCallback = null;
let isReady = false;

function init() {
  captureWindow = new BrowserWindow({
    width: 300,
    height: 100,
    show: true,        // ← VISIBLE for debugging
    skipTaskbar: false,
    title: "VocalFlow Audio",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  captureWindow.loadFile(path.join(__dirname, "../renderer/capture.html"));

  captureWindow.webContents.on("did-finish-load", () => {
    isReady = true;
    console.log("[AudioEngine] Capture window ready");
    // Open devtools so we can see capture.html console logs
    captureWindow.webContents.openDevTools({ mode: "detach" });
  });

  captureWindow.webContents.on("render-process-gone", (event, details) => {
    console.error("[AudioEngine] Render process gone:", details.reason, details.exitCode);
    isReady = false;
  });

  captureWindow.webContents.on("did-fail-load", (event, code, desc) => {
    console.error("[AudioEngine] Failed to load:", code, desc);
  });

  captureWindow.on("closed", () => {
    isReady = false;
    captureWindow = null;
    console.log("[AudioEngine] Capture window closed");
    setTimeout(() => init(), 1000);
  });

  console.log("[AudioEngine] Capture window initializing...");
}

function startCapture(onChunk) {
  chunkCallback = onChunk;
  console.log(`[AudioEngine] startCapture — isReady: ${isReady}, hasWindow: ${!!captureWindow}`);
  if (captureWindow && !captureWindow.isDestroyed() && isReady) {
    captureWindow.webContents.send("start-capture");
    console.log("[AudioEngine] Sent start-capture to renderer");
  } else {
    console.error("[AudioEngine] Cannot start — window not ready");
  }
}

function stopCapture() {
  console.log("[AudioEngine] stopCapture called");
  if (captureWindow && !captureWindow.isDestroyed() && isReady) {
    try {
      captureWindow.webContents.send("stop-capture");
      console.log("[AudioEngine] Sent stop-capture to renderer");
    } catch (err) {
      console.error("[AudioEngine] Error sending stop-capture:", err.message);
    }
  }
  setTimeout(() => {
    chunkCallback = null;
    console.log("[AudioEngine] Callback cleared");
  }, 500);
}

function receiveChunk(arrayBuffer) {
  if (chunkCallback) {
    chunkCallback(Buffer.from(arrayBuffer));
  } else {
    console.warn("[AudioEngine] receiveChunk — no callback");
  }
}

function hasCallback() {
  return !!chunkCallback;
}

module.exports = { init, startCapture, stopCapture, receiveChunk, hasCallback };