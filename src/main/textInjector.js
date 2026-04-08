// ─────────────────────────────────────────────
//  src/main/textInjector.js
//  Clipboard-based text injection (mirrors TextInjector.swift)
//  Uses robotjs or nut-js to simulate Ctrl+V
// ─────────────────────────────────────────────

const { clipboard } = require("electron");

async function injectText(text) {
  // 1. Save previous clipboard
  const previous = clipboard.readText();

  // 2. Write transcript to clipboard
  clipboard.writeText(text);

  // 3. Small delay for clipboard write to propagate
  await sleep(60);

  // 4. Simulate Ctrl+V
  await simulatePaste();

  // 5. Restore clipboard after paste is processed
  await sleep(350);
  clipboard.writeText(previous || "");
}

async function simulatePaste() {
  // Try @nut-tree-fork/nut-js (best Windows support)
  try {
    const { keyboard, Key } = require("@nut-tree-fork/nut-js");
    await keyboard.pressKey(Key.LeftControl, Key.V);
    await keyboard.releaseKey(Key.LeftControl, Key.V);
    return;
  } catch {}

  // Fallback: robotjs
  try {
    const robot = require("robotjs");
    robot.keyTap("v", ["control"]);
    return;
  } catch {}

  console.warn("[TextInjector] No keyboard automation library available. Text was copied to clipboard.");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { injectText };
