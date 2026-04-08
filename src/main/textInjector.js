
const { clipboard } = require("electron");

async function injectText(text) {
  const previous = clipboard.readText();

  clipboard.writeText(text);

  await sleep(60);

  await simulatePaste();

  await sleep(350);
  clipboard.writeText(previous || "");
}

async function simulatePaste() {
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
