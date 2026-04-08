// ─────────────────────────────────────────────
//  src/main/deepgramService.js
//  WebSocket streaming to Deepgram — mirrors DeepgramService.swift
// ─────────────────────────────────────────────

const WebSocket = require("ws");
const https = require("https");

let ws = null;
let accumulated = "";
let isWaitingForFinal = false;
let finalCallback = null;
let timeoutHandle = null;
let currentApiKey = "";
let currentModel = "";
let currentLanguage = "";

function connect(apiKey, model, language) {
  currentApiKey = apiKey;
  currentModel = model;
  currentLanguage = language;

  accumulated = "";
  isWaitingForFinal = false;
  finalCallback = null;

  if (!apiKey) return;

  const params = new URLSearchParams({
    encoding: "linear16",
    sample_rate: "16000",
    channels: "1",
    model,
    language,
    punctuate: "true",
    interim_results: "true",
  });

  const url = `wss://api.deepgram.com/v1/listen?${params}`;

  ws = new WebSocket(url, {
    headers: { Authorization: `Token ${apiKey}` },
  });

  ws.on("open", () => console.log("[Deepgram] Connected"));
  ws.on("message", (data) => handleMessage(data.toString()));
  ws.on("error", (err) => {
    console.error("[Deepgram] WS error:", err.message);
    if (isWaitingForFinal) deliverAndDisconnect();
  });
  ws.on("close", () => {
    if (isWaitingForFinal) deliverAndDisconnect();
  });
}

function reconnect() {
  connect(currentApiKey, currentModel, currentLanguage);
}

function sendChunk(buffer) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(buffer);
  }
}

function closeStream(callback) {
  finalCallback = callback;
  isWaitingForFinal = true;

  // Send empty frame — Deepgram's signal to flush
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(Buffer.alloc(0));
  }

  // Safety timeout — deliver after 3s no matter what
  timeoutHandle = setTimeout(() => {
    if (isWaitingForFinal) deliverAndDisconnect();
  }, 3000);
}

function handleMessage(json) {
  let msg;
  try {
    msg = JSON.parse(json);
  } catch {
    return;
  }

  const transcript = msg?.channel?.alternatives?.[0]?.transcript ?? "";

  if (msg.is_final && transcript) {
    accumulated += (accumulated ? " " : "") + transcript;
  }

  if (isWaitingForFinal && msg.is_final && msg.speech_final) {
    clearTimeout(timeoutHandle);
    deliverAndDisconnect();
  }
}

function deliverAndDisconnect() {
  if (!isWaitingForFinal) return;
  isWaitingForFinal = false;
  const text = accumulated;
  accumulated = "";
  const cb = finalCallback;
  finalCallback = null;
  cb?.(text);

  // Reconnect for next recording
  setTimeout(() => reconnect(), 300);
}

// ── REST: fetch available models ─────────────
async function fetchModels(apiKey) {
  return new Promise((resolve) => {
    const options = {
      hostname: "api.deepgram.com",
      path: "/v1/models",
      headers: { Authorization: `Token ${apiKey}` },
    };
    https.get(options, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          const root = JSON.parse(body);
          const models = (root.stt || [])
            .filter((m) => m.streaming)
            .map((m) => ({ id: m.canonical_name, name: m.name || m.canonical_name }))
            .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
            .sort((a, b) => a.id.localeCompare(b.id));
          resolve(models);
        } catch {
          resolve([]);
        }
      });
    }).on("error", () => resolve([]));
  });
}

// ── REST: fetch account balance ──────────────
async function fetchBalance(apiKey) {
  return new Promise((resolve) => {
    const options = {
      hostname: "api.deepgram.com",
      path: "/v1/projects",
      headers: { Authorization: `Token ${apiKey}` },
    };
    https.get(options, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", async () => {
        try {
          const root = JSON.parse(body);
          const projectId = root.projects?.[0]?.project_id;
          if (!projectId) return resolve(null);

          // Fetch balance for first project
          const balOptions = {
            hostname: "api.deepgram.com",
            path: `/v1/projects/${projectId}/balances`,
            headers: { Authorization: `Token ${apiKey}` },
          };
          https.get(balOptions, (res2) => {
            let body2 = "";
            res2.on("data", (c) => (body2 += c));
            res2.on("end", () => {
              try {
                const balRoot = JSON.parse(body2);
                const bal = balRoot.balances?.[0];
                resolve(bal ? { amount: bal.amount, units: bal.units } : null);
              } catch {
                resolve(null);
              }
            });
          }).on("error", () => resolve(null));
        } catch {
          resolve(null);
        }
      });
    }).on("error", () => resolve(null));
  });
}

module.exports = { connect, sendChunk, closeStream, fetchModels, fetchBalance };
