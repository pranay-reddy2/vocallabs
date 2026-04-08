// ─────────────────────────────────────────────
//  src/main/groqService.js
//  LLM post-processing + model listing + balance
// ─────────────────────────────────────────────

const https = require("https");

function post(apiKey, path, body) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: "api.groq.com",
      path,
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on("error", () => resolve(null));
    req.write(payload);
    req.end();
  });
}

function get(apiKey, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: "api.groq.com",
      path,
      headers: { Authorization: `Bearer ${apiKey}` },
    };
    https.get(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    }).on("error", () => resolve(null));
  });
}

async function fetchGroqModels(apiKey) {
  if (!apiKey) return [];
  const root = await get(apiKey, "/openai/v1/models");
  return (root?.data || [])
    .filter((m) => m.object === "model")
    .map((m) => ({ id: m.id, name: m.id }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

// Groq doesn't expose a public balance API — return a note
async function fetchGroqBalance(apiKey) {
  if (!apiKey) return null;
  // Attempt to check via usage endpoint (may not be available on all plans)
  const root = await get(apiKey, "/v1/usage");
  if (root && !root.error) {
    return { note: "Usage data available — check console.groq.com for billing" };
  }
  return { note: "Balance not available via API — see console.groq.com" };
}

async function processText(text, options, apiKey, model) {
  if (!apiKey || !model || !options.hasAnyStep) return text;

  const instructions = [];
  let step = 1;

  if (options.codeMix) {
    instructions.push(`${step++}. The input is in ${options.codeMix}. Transliterate non-Roman script to Roman. Keep English as-is. Do not translate.`);
  }
  if (options.fixSpelling) {
    instructions.push(`${step++}. Fix spelling mistakes. Do not change meaning.`);
  }
  if (options.fixGrammar) {
    instructions.push(`${step++}. Fix grammar mistakes. Do not add content.`);
  }
  if (options.targetLanguage) {
    instructions.push(`${step++}. Translate everything to ${options.targetLanguage}.`);
  }

  const systemPrompt =
    "Process the following text by applying these steps in order:\n" +
    instructions.join("\n") +
    "\nReturn only the final processed text with no explanation.";

  const result = await post(apiKey, "/openai/v1/chat/completions", {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    temperature: 0,
  });

  return result?.choices?.[0]?.message?.content?.trim() || text;
}

module.exports = { fetchGroqModels, fetchGroqBalance, processText };
