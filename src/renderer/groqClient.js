// ─────────────────────────────────────────────
//  src/renderer/groqClient.js
//  Thin wrapper — delegates to main via IPC
// ─────────────────────────────────────────────

// Post-processing is handled by the main process groqService.
// This module provides a renderer-friendly interface.

export async function processText(text, options, apiKey, model) {
  // For now, call via fetch directly from renderer
  // (main process exposes no direct IPC for this — add if needed)
  const instructions = [];
  let step = 1;

  if (options.codeMix) {
    instructions.push(`${step++}. The input is in ${options.codeMix}. Transliterate non-Roman script to Roman. Keep English as-is.`);
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

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0,
    }),
  });

  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || text;
}
