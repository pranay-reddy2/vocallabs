
let isDown = false;
let callbacks = {};
let started = false;

const KEYCODE_MAP = {
  "RIGHT ALT":   3640,
  "LEFT ALT":    56,
  "RIGHT CTRL":  3613,
  "LEFT CTRL":   29,
  "RIGHT SHIFT": 3638,
  "LEFT SHIFT":  42,
};

function start(hotkeyLabel, { onPress, onRelease }) {
  callbacks = { onPress, onRelease };

  try {
    const { uIOhook } = require("uiohook-napi");

    const targetCode = KEYCODE_MAP[hotkeyLabel] ?? KEYCODE_MAP["RIGHT ALT"];

    uIOhook.on("keydown", (e) => {
      if (e.keycode === targetCode && !isDown) {
        isDown = true;
        console.log(`[HotkeyManager] 🎙️ RECORDING STARTED`);
        callbacks.onPress?.();
      }
    });

    uIOhook.on("keyup", (e) => {
      if (e.keycode === targetCode && isDown) {
        isDown = false;
        console.log(`[HotkeyManager] ⏹️ RECORDING STOPPED`);
        callbacks.onRelease?.();
      }
    });

    if (!started) {
      uIOhook.start();
      started = true;
    }

    console.log(`[HotkeyManager] Listening for: ${hotkeyLabel} (keycode: ${targetCode})`);
  } catch (err) {
    console.error("[HotkeyManager] Failed to start:", err.message);
  }
}

function restart(hotkeyLabel) {
  isDown = false;
  try {
    const { uIOhook } = require("uiohook-napi");
    uIOhook.removeAllListeners();
  } catch {}
  start(hotkeyLabel, callbacks);
}

function stop() {
  try {
    const { uIOhook } = require("uiohook-napi");
    uIOhook.stop();
    started = false;
  } catch {}
}

module.exports = { start, restart, stop };