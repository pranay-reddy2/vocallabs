// ─────────────────────────────────────────────
//  src/renderer/app.js — Settings UI + runtime
// ─────────────────────────────────────────────

const api = window.vocalflow;

// ── State ────────────────────────────────────
let settings = {};
let configKeys = {};
let deepgramModels = [];
let groqModels = [];

const CODE_MIX_OPTIONS = [
  { id: "Hinglish",     label: "Hinglish (Hindi + English)" },
  { id: "Tanglish",     label: "Tanglish (Tamil + English)" },
  { id: "Benglish",     label: "Benglish (Bengali + English)" },
  { id: "Kanglish",     label: "Kanglish (Kannada + English)" },
  { id: "Tenglish",     label: "Tenglish (Telugu + English)" },
  { id: "Minglish",     label: "Minglish (Marathi + English)" },
  { id: "Punglish",     label: "Punglish (Punjabi + English)" },
  { id: "Spanglish",    label: "Spanglish (Spanish + English)" },
  { id: "Franglais",    label: "Franglais (French + English)" },
  { id: "Arabizi",      label: "Arabizi (Arabic + English)" },
];

const TARGET_LANGUAGES = [
  "English","Hindi","Spanish","French","German","Portuguese","Japanese",
  "Korean","Arabic","Bengali","Tamil","Telugu","Kannada","Marathi",
  "Punjabi","Russian","Chinese (Simplified)","Italian","Dutch","Swahili",
  "Hinglish","Tanglish","Spanglish","Franglais",
];

const HOTKEYS = [
  { id: "RIGHT ALT",   label: "Right Alt" },
  { id: "LEFT ALT",    label: "Left Alt" },
  { id: "RIGHT CTRL",  label: "Right Ctrl" },
  { id: "LEFT CTRL",   label: "Left Ctrl" },
  { id: "RIGHT SHIFT", label: "Right Shift" },
];

// ── Render ────────────────────────────────────
function render() {
  document.getElementById("app").innerHTML = `
    ${renderStatusBanner()}
    ${renderBalanceRow()}
    ${renderDeepgramSection()}
    ${renderGroqSection()}
    ${renderCorrectionsSection()}
    ${renderHotkeySection()}
    ${renderFooter()}
  `;
  attachEvents();
}

function renderStatusBanner() {
  return `
    <div id="status-banner">
      <div class="status-dot idle" id="status-dot"></div>
      <div>
        <span class="status-text"><strong>Idle</strong> — Hold hotkey to dictate</span>
      </div>
      <span id="last-transcript"></span>
    </div>
  `;
}

function renderBalanceRow() {
  return `
    <div id="balance-row">
      <div class="balance-card deepgram">
        <div class="balance-label">Deepgram</div>
        <div class="balance-value loading" id="dg-balance">Loading…</div>
        <div class="balance-sub" id="dg-balance-sub"></div>
        <button class="btn-refresh-bal" id="btn-refresh-dg" title="Refresh balance">↻</button>
      </div>
      <div class="balance-card groq">
        <div class="balance-label">Groq</div>
        <div class="balance-value loading" id="groq-balance">Loading…</div>
        <div class="balance-sub" id="groq-balance-sub"></div>
        <button class="btn-refresh-bal" id="btn-refresh-groq" title="Refresh balance">↻</button>
      </div>
    </div>
  `;
}

function renderDeepgramSection() {
  const models = deepgramModels.length
    ? `<div class="row">
         <label>Model</label>
         <select id="sel-dg-model">
           ${deepgramModels.map(m => `<option value="${m.id}" ${settings.model === m.id ? "selected" : ""}>${m.name}</option>`).join("")}
         </select>
       </div>
       <div class="row">
         <label>Language</label>
         <select id="sel-dg-lang">
           <option value="en-US" ${settings.language === "en-US" ? "selected" : ""}>en-US</option>
           <option value="en-IN" ${settings.language === "en-IN" ? "selected" : ""}>en-IN</option>
           <option value="hi"    ${settings.language === "hi"    ? "selected" : ""}>hi (Hindi)</option>
           <option value="multi" ${settings.language === "multi" ? "selected" : ""}>multi (code-switch)</option>
         </select>
       </div>`
    : `<div class="row">
         <label>Model</label>
         <div class="input-wrap" style="flex:1"><input type="text" id="inp-dg-model" value="${settings.model || "nova-2-general"}" placeholder="nova-2-general" /></div>
       </div>`;

  return `
    <div class="section">
      <div class="section-header">Deepgram — Speech Recognition</div>
      <div class="section-body">
        <div class="row">
          <label>API Key</label>
          <div class="input-wrap">
            <input type="password" id="inp-dg-key" value="${configKeys.deepgramKey || ""}" placeholder="Enter Deepgram API key" />
            <button class="btn-icon" id="btn-toggle-dg-key">Show</button>
          </div>
        </div>
        <div class="btn-save-row">
          <button class="btn btn-ghost" id="btn-fetch-dg-models">Fetch Models</button>
          <button class="btn btn-primary" id="btn-save-dg">Save Key</button>
          <span class="save-feedback" id="fb-dg">Saved ✓</span>
        </div>
        ${models}
      </div>
    </div>
  `;
}

function renderGroqSection() {
  const models = groqModels.length
    ? `<div class="row">
         <label>Model</label>
         <select id="sel-groq-model">
           ${groqModels.map(m => `<option value="${m.id}" ${settings.groqModel === m.id ? "selected" : ""}>${m.name}</option>`).join("")}
         </select>
       </div>`
    : "";

  return `
    <div class="section">
      <div class="section-header">Groq — LLM Post-processing</div>
      <div class="section-body">
        <div class="row">
          <label>API Key</label>
          <div class="input-wrap">
            <input type="password" id="inp-groq-key" value="${configKeys.groqKey || ""}" placeholder="Enter Groq API key (optional)" />
            <button class="btn-icon" id="btn-toggle-groq-key">Show</button>
          </div>
        </div>
        <div class="btn-save-row">
          <button class="btn btn-ghost" id="btn-fetch-groq-models">Fetch Models</button>
          <button class="btn btn-primary" id="btn-save-groq">Save Key</button>
          <span class="save-feedback" id="fb-groq">Saved ✓</span>
        </div>
        ${models}
      </div>
    </div>
  `;
}

function renderCorrectionsSection() {
  const codeMixSub = settings.codeMixEnabled ? `
    <div class="sub-section">
      <div class="row">
        <label>Mix style</label>
        <select id="sel-codemix">
          ${CODE_MIX_OPTIONS.map(o => `<option value="${o.id}" ${settings.codeMix === o.id ? "selected" : ""}>${o.label}</option>`).join("")}
        </select>
      </div>
    </div>` : "";

  const langSub = settings.targetLangEnabled ? `
    <div class="sub-section">
      <div class="row">
        <label>Target</label>
        <select id="sel-target-lang">
          ${TARGET_LANGUAGES.map(l => `<option value="${l}" ${settings.targetLanguage === l ? "selected" : ""}>${l}</option>`).join("")}
        </select>
      </div>
    </div>` : "";

  return `
    <div class="section">
      <div class="section-header">Corrections & Features</div>
      <div class="section-body">
        ${toggle("fixSpelling", settings.fixSpelling, "Spelling correction", "Auto-fix misspelled words")}
        ${toggle("fixGrammar", settings.fixGrammar, "Grammar correction", "Clean up grammar")}
        ${toggle("codeMixEnabled", settings.codeMixEnabled, "Code-mix input", "Hinglish, Tanglish, Spanglish…")}
        ${codeMixSub}
        ${toggle("targetLangEnabled", settings.targetLangEnabled, "Translate output", "Convert to another language")}
        ${langSub}
      </div>
    </div>
  `;
}

function toggle(id, checked, label, hint) {
  return `
    <div class="toggle-row">
      <div class="toggle-label">
        ${label}
        <small>${hint}</small>
      </div>
      <label class="toggle">
        <input type="checkbox" id="tog-${id}" ${checked ? "checked" : ""} />
        <div class="toggle-track"></div>
        <div class="toggle-thumb"></div>
      </label>
    </div>
  `;
}

function renderHotkeySection() {
  return `
    <div class="section">
      <div class="section-header">Hotkey — Hold to Record</div>
      <div class="section-body">
        <div class="hotkey-pills">
          ${HOTKEYS.map(h => `
            <button class="hotkey-pill ${settings.hotkey === h.id ? "active" : ""}" data-hotkey="${h.id}">
              ${h.label}
            </button>
          `).join("")}
        </div>
        <div style="font-size:11px;color:var(--text-hint);margin-top:4px;">
          Hold the selected key to record → release to transcribe → text appears at cursor
        </div>
      </div>
    </div>
  `;
}

function renderFooter() {
  return `
    <div id="footer">
      <span class="version">VocalFlow v1.0.0</span>
      <div class="footer-links">
        <a class="footer-link" href="https://console.deepgram.com" target="_blank">Deepgram Console</a>
        <a class="footer-link" href="https://console.groq.com" target="_blank">Groq Console</a>
        <a class="footer-link" href="https://github.com/pranay-reddy2" target="_blank">GitHub</a>
      </div>
    </div>
  `;
}

// ── Event wiring ──────────────────────────────
function attachEvents() {
  // Close button
  document.getElementById("btn-close")?.addEventListener("click", () => {
    window.close();
  });

  // Key show/hide toggles
  setupKeyToggle("inp-dg-key", "btn-toggle-dg-key");
  setupKeyToggle("inp-groq-key", "btn-toggle-groq-key");

  // Save Deepgram key
  document.getElementById("btn-save-dg")?.addEventListener("click", async () => {
    const key = document.getElementById("inp-dg-key").value.trim();
    configKeys.deepgramKey = key;
    await saveSettings({ deepgramKey: key });
    showFeedback("fb-dg");
    fetchBalances();
  });

  // Save Groq key
  document.getElementById("btn-save-groq")?.addEventListener("click", async () => {
    const key = document.getElementById("inp-groq-key").value.trim();
    configKeys.groqKey = key;
    await saveSettings({ groqKey: key });
    showFeedback("fb-groq");
    fetchBalances();
  });

  // Fetch Deepgram models
  document.getElementById("btn-fetch-dg-models")?.addEventListener("click", async () => {
    const key = document.getElementById("inp-dg-key").value.trim() || configKeys.deepgramKey;
    if (!key) return;
    const btn = document.getElementById("btn-fetch-dg-models");
    btn.textContent = "Fetching…";
    deepgramModels = await api.fetchDeepgramModels(key);
    render();
  });

  // Fetch Groq models
  document.getElementById("btn-fetch-groq-models")?.addEventListener("click", async () => {
    const key = document.getElementById("inp-groq-key").value.trim() || configKeys.groqKey;
    if (!key) return;
    const btn = document.getElementById("btn-fetch-groq-models");
    btn.textContent = "Fetching…";
    groqModels = await api.fetchGroqModels(key);
    render();
  });

  // Balance refresh
  document.getElementById("btn-refresh-dg")?.addEventListener("click", () => fetchDeepgramBalance());
  document.getElementById("btn-refresh-groq")?.addEventListener("click", () => fetchGroqBalance());

  // Model / language selects
  sel("sel-dg-model", (v) => saveSettings({ model: v }));
  sel("sel-dg-lang", (v) => saveSettings({ language: v }));
  sel("sel-groq-model", (v) => saveSettings({ groqModel: v }));
  sel("sel-codemix", (v) => saveSettings({ codeMix: v }));
  sel("sel-target-lang", (v) => saveSettings({ targetLanguage: v }));

  // Manual model input fallback
  const modelInp = document.getElementById("inp-dg-model");
  modelInp?.addEventListener("change", () => saveSettings({ model: modelInp.value }));

  // Toggles
  setupToggle("fixSpelling", (v) => saveSettings({ fixSpelling: v }));
  setupToggle("fixGrammar",  (v) => saveSettings({ fixGrammar: v }));
  setupToggle("codeMixEnabled", (v) => { settings.codeMixEnabled = v; saveSettings({ codeMixEnabled: v }); render(); });
  setupToggle("targetLangEnabled", (v) => { settings.targetLangEnabled = v; saveSettings({ targetLangEnabled: v }); render(); });

  // Hotkey pills
  document.querySelectorAll(".hotkey-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const hk = pill.dataset.hotkey;
      settings.hotkey = hk;
      saveSettings({ hotkey: hk });
      document.querySelectorAll(".hotkey-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
    });
  });
}

function setupKeyToggle(inputId, btnId) {
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!inp || !btn) return;
  btn.addEventListener("click", () => {
    const showing = inp.type === "text";
    inp.type = showing ? "password" : "text";
    btn.textContent = showing ? "Show" : "Hide";
  });
}

function sel(id, cb) {
  const el = document.getElementById(id);
  el?.addEventListener("change", () => cb(el.value));
}

function setupToggle(id, cb) {
  const el = document.getElementById(`tog-${id}`);
  el?.addEventListener("change", () => cb(el.checked));
}

async function saveSettings(partial) {
  settings = { ...settings, ...partial };
  await api.saveSettings(settings);
}

function showFeedback(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2000);
}

// ── Balance fetching ─────────────────────────
async function fetchDeepgramBalance() {
  const btn = document.getElementById("btn-refresh-dg");
  btn?.classList.add("spinning");
  const key = configKeys.deepgramKey || settings.deepgramKey;
  if (!key) {
    setBalance("dg", null, "No key configured");
    btn?.classList.remove("spinning");
    return;
  }
  const result = await api.fetchDeepgramBalance(key);
  btn?.classList.remove("spinning");
  if (result) {
    const fmt = typeof result.amount === "number"
      ? `$${result.amount.toFixed(4)}`
      : "—";
    setBalance("dg", fmt, result.units || "credits");
  } else {
    setBalance("dg", null, "Unavailable");
  }
}

async function fetchGroqBalance() {
  const btn = document.getElementById("btn-refresh-groq");
  btn?.classList.add("spinning");
  const key = configKeys.groqKey || settings.groqKey;
  if (!key) {
    setBalance("groq", null, "No key configured");
    btn?.classList.remove("spinning");
    return;
  }
  const result = await api.fetchGroqBalance(key);
  btn?.classList.remove("spinning");
  if (result?.note) {
    setBalance("groq", "Free tier", result.note);
  } else {
    setBalance("groq", null, "See console.groq.com");
  }
}

function setBalance(which, value, sub) {
  const valEl = document.getElementById(`${which}-balance`);
  const subEl = document.getElementById(`${which}-balance-sub`);
  if (valEl) {
    valEl.className = "balance-value" + (value ? "" : " error");
    valEl.textContent = value || "Error";
  }
  if (subEl) subEl.textContent = sub || "";
}

function fetchBalances() {
  fetchDeepgramBalance();
  fetchGroqBalance();
}

// ── Web Audio mic capture ─────────────────────
let audioContext = null;
let mediaStream = null;
let scriptProcessor = null;
let isCapturing = false;

async function startMicCapture() {
  try {
    // Request mic permission
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

    // Create audio context at 16kHz (what Deepgram wants)
    audioContext = new AudioContext({ sampleRate: 16000 });

    const source = audioContext.createMediaStreamSource(mediaStream);

    // ScriptProcessor gives us raw PCM buffers
    scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

    scriptProcessor.onaudioprocess = (e) => {
      if (!isCapturing) return;

      // Get float32 samples
      const float32 = e.inputBuffer.getChannelData(0);

      // Convert float32 → int16 (linear16 PCM for Deepgram)
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Send to main process → Deepgram
      api.sendAudioChunk(int16.buffer);
    };

    source.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);
    isCapturing = true;

    console.log("[AudioCapture] Started — sampleRate:", audioContext.sampleRate);
  } catch (err) {
    console.error("[AudioCapture] Failed:", err.message);
    alert("Microphone access denied. Please allow microphone access and restart.");
  }
}

function stopMicCapture() {
  isCapturing = false;

  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  console.log("[AudioCapture] Stopped");
}

// ── Recording state events ───────────────────
api.onHotkeyPress(() => {
  updateStatusUI("recording");
  startMicCapture();
});

api.onTranscriptRaw(async (raw) => {
  stopMicCapture();
  updateStatusUI("transcribing");
  // Apply Groq post-processing if configured
  const groqKey = configKeys.groqKey || settings.groqKey;
  const groqModel = settings.groqModel;
  let final = raw;

  if (groqKey && groqModel && hasAnyGroqOption()) {
    try {
      const { processText } = await import("./groqClient.js");
      final = await processText(raw, buildGroqOptions(), groqKey, groqModel);
    } catch {
      final = raw;
    }
  }

  await api.injectText(final);
  document.getElementById("last-transcript").textContent = final.slice(0, 40) + (final.length > 40 ? "…" : "");
  updateStatusUI("idle");
});

function hasAnyGroqOption() {
  return settings.fixSpelling || settings.fixGrammar ||
    (settings.codeMixEnabled && settings.codeMix) ||
    (settings.targetLangEnabled && settings.targetLanguage);
}

function buildGroqOptions() {
  return {
    fixSpelling: !!settings.fixSpelling,
    fixGrammar: !!settings.fixGrammar,
    codeMix: settings.codeMixEnabled ? settings.codeMix : null,
    targetLanguage: settings.targetLangEnabled ? settings.targetLanguage : null,
    hasAnyStep: hasAnyGroqOption(),
  };
}

function updateStatusUI(state) {
  const dot = document.getElementById("status-dot");
  const text = document.querySelector(".status-text");
  if (!dot || !text) return;
  dot.className = `status-dot ${state}`;
  const labels = {
    idle: "<strong>Idle</strong> — Hold hotkey to dictate",
    recording: "<strong>Recording…</strong> — Release to transcribe",
    transcribing: "<strong>Transcribing…</strong> — Processing",
  };
  text.innerHTML = labels[state] || labels.idle;
}

// ── Boot sequence ─────────────────────────────
async function boot() {
  [settings, configKeys] = await Promise.all([
    api.getSettings(),
    api.getConfigKeys(),
  ]);

  // Set defaults
  settings.hotkey = settings.hotkey || "RIGHT ALT";
  settings.model = settings.model || "nova-2-general";
  settings.language = settings.language || "en-US";

  render();
  fetchBalances();

  // Auto-fetch models if keys are present
  if (configKeys.deepgramKey) {
    deepgramModels = await api.fetchDeepgramModels(configKeys.deepgramKey);
    render();
    fetchBalances();
  }
  if (configKeys.groqKey) {
    groqModels = await api.fetchGroqModels(configKeys.groqKey);
    render();
  }
}

boot();
