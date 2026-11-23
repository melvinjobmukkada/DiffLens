
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

async function generateAISummary(changes) {
  const prompt = `
You are an expert website content comparison assistant.

Analyze the following differences between E2 (new website)
and E3 (old website).

E2 additions:
${JSON.stringify(changes.added || [], null, 2)}

E3 removals:
${JSON.stringify(changes.removed || [], null, 2)}

Provide a concise report with these headings:

1. Overall Summary
2. New Content in E2
3. Removed Content from E3
4. Important Observations

Rules:
- Only use information supplied above.
- Do not invent changes or facts.
- Do not assume an E2 addition replaces an E3 removal.
- Clearly distinguish additions from removals.
- If there are no changes, say so.
`;

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.response) {
    throw new Error("Ollama returned an empty summary.");
  }

  return data.response;
}

module.exports = { generateAISummary };
