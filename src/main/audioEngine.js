// ─────────────────────────────────────────────
//  src/main/audioEngine.js
//  Mic capture via renderer Web Audio API (no SoX needed)
//  Renderer captures mic → sends PCM chunks via IPC → main forwards to Deepgram
// ─────────────────────────────────────────────

let chunkCallback = null;

function startCapture(onChunk) {
  chunkCallback = onChunk;
  console.log("[AudioEngine] Capture started (Web Audio)");
}

function stopCapture() {
  chunkCallback = null;
  console.log("[AudioEngine] Capture stopped");
}

// Called from IPC when renderer sends an audio chunk
function receiveChunk(arrayBuffer) {
  if (chunkCallback) {
    chunkCallback(Buffer.from(arrayBuffer));
  }
}

module.exports = { startCapture, stopCapture, receiveChunk };
