// ─────────────────────────────────────────────
//  src/main/hotkeyManager.js
//  Global hotkey: hold to record, release to transcribe
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
//  src/main/hotkeyManager.js
//  Uses uiohook-napi — native Windows hook, no binary spawn needed
// ─────────────────────────────────────────────

let isDown = false;
let callbacks = {};
let started = false;

// uiohook-napi key codes for Windows
const KEYCODE_MAP = {
  "RIGHT ALT":   0xE038,
  "LEFT ALT":    0x0038,
  "RIGHT CTRL":  0xE01D,
  "LEFT CTRL":   0x001D,
  "RIGHT SHIFT": 0xE036,
  "LEFT SHIFT":  0x002A,
};

function start(hotkeyLabel, { onPress, onRelease }) {
  callbacks = { onPress, onRelease };

  try {
    const { uIOhook, UiohookKey } = require("uiohook-napi");

    const targetCode = KEYCODE_MAP[hotkeyLabel] ?? KEYCODE_MAP["RIGHT ALT"];

    uIOhook.on("keydown", (e) => {
      if (e.keycode === targetCode && !isDown) {
        isDown = true;
        callbacks.onPress?.();
      }
    });

    uIOhook.on("keyup", (e) => {
      if (e.keycode === targetCode && isDown) {
        isDown = false;
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
    console.log("[HotkeyManager] Tip: run 'npm install uiohook-napi' if missing");
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
