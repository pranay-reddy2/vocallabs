// ─────────────────────────────────────────────
//  src/main/audioEngine.js
//  Direct SoX spawn — bypasses node-record-lpcm16
//  Windows-compatible 16kHz mono PCM capture
// ─────────────────────────────────────────────

const { spawn, execSync } = require("child_process");

let soxProcess = null;
let chunkCallback = null;
let isCapturing = false;

function init() {
  try {
    const ver = execSync("sox --version 2>&1").toString().trim();
    console.log("[AudioEngine] SoX found:", ver);
  } catch {
    console.error("[AudioEngine] SoX not found on PATH.");
    console.error("[AudioEngine] Install via: choco install sox");
  }
}

function startCapture(onChunk) {
  if (isCapturing) {
    console.warn("[AudioEngine] Already capturing — ignoring");
    return;
  }

  chunkCallback = onChunk;
  isCapturing = true;

  console.log("[AudioEngine] Spawning SoX...");

  // SoX args: read from default Windows audio input, output raw 16kHz mono s16le to stdout
  const args = [
    "-q",                  // quiet — suppress header/progress output
    "-t", "waveaudio",     // Windows audio input type
    "default",             // default input device
    "-r", "16000",         // sample rate
    "-c", "1",             // mono
    "-e", "signed-integer",
    "-b", "16",            // 16-bit
    "-t", "raw",           // raw output format
    "-",                   // output to stdout
  ];

  console.log("[AudioEngine] SoX args:", args.join(" "));

  soxProcess = spawn("sox", args, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  soxProcess.stdout.on("data", (chunk) => {
    if (!isCapturing || !chunkCallback) return;
    chunkCallback(chunk);
  });

  soxProcess.stderr.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) console.log("[AudioEngine] SoX stderr:", msg);
  });

  soxProcess.on("error", (err) => {
    console.error("[AudioEngine] SoX process error:", err.message);
    isCapturing = false;
    soxProcess = null;
  });

  soxProcess.on("close", (code, signal) => {
    console.log(`[AudioEngine] SoX exited — code: ${code}, signal: ${signal}`);
    isCapturing = false;
    soxProcess = null;
  });

  console.log("[AudioEngine] SoX capture started — PID:", soxProcess.pid);
}

function stopCapture() {
  console.log("[AudioEngine] Stopping SoX capture...");
  isCapturing = false;

  if (soxProcess) {
    try {
      soxProcess.kill("SIGTERM");
      console.log("[AudioEngine] SoX process killed");
    } catch (err) {
      console.error("[AudioEngine] Error killing SoX:", err.message);
    }
    soxProcess = null;
  }

  setTimeout(() => {
    chunkCallback = null;
    console.log("[AudioEngine] Callback cleared");
  }, 800);
}

function receiveChunk() {
  // No-op — not used in direct SoX mode
}

function hasCallback() {
  return !!chunkCallback;
}

module.exports = { init, startCapture, stopCapture, receiveChunk, hasCallback };