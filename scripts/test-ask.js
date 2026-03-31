#!/usr/bin/env node
/**
 * Local test for the Ask the Data pipeline.
 * Simulates what the Apps Script does: two-pass Gemini (route → answer).
 *
 * Usage:
 *   GEMINI_KEY=your_key node scripts/test-ask.js "What is the UK fertility rate?"
 */

import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const GEMINI_KEY = process.env.GEMINI_KEY;
const QUESTION = process.argv[2];

if (!GEMINI_KEY) { console.error("Set GEMINI_KEY env var"); process.exit(1); }
if (!QUESTION) { console.error("Usage: GEMINI_KEY=... node scripts/test-ask.js \"your question\""); process.exit(1); }

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.candidates[0].content.parts[0].text;
}

const EDITORIAL_PROMPT = `You are a data lookup tool for State of Britain, a site presenting official UK government statistics.

RULES:
- Answer the question using ONLY the data provided below. Never invent or assume numbers.
- Cite the specific time period and geography for every number you mention.
- If the data does not cover the question, say so explicitly.
- Be neutral and factual. Never editorialise: avoid words like crisis, soaring, collapsed, plummeted, broken, dramatic.
- Present trade-offs symmetrically, showing both sides.
- If data is estimated or methodology changed, note the caveat.
- Keep answers to 2-4 sentences unless the question clearly warrants more detail.
- Use plain language suitable for a general audience.
- Format numbers with commas for thousands (e.g. 1,234,567).
- When referencing percentage changes, state both the start and end values.`;

async function main() {
  console.log(`\nQuestion: "${QUESTION}"\n`);

  // Pass 1: Route
  console.log("Pass 1: Routing...");
  const catalog = readFileSync(join(ROOT, "public", "data", "enrichment-summary.json"), "utf-8");

  const routingPrompt = `You are a dataset router for a UK statistics site called State of Britain.

Given the dataset catalog below, identify which 1-3 datasets are most relevant to the user's question. Return ONLY a JSON array of dataset IDs, nothing else. Example: ["nhs-waiting", "health-outcomes"]

If the question cannot be answered by any dataset, return an empty array: []

CATALOG:
${catalog}

QUESTION: ${QUESTION}`;

  const routingResult = await callGemini(routingPrompt);
  console.log("Router response:", routingResult.trim());

  const match = routingResult.match(/\[[\s\S]*?\]/);
  const datasetIds = match ? JSON.parse(match[0]) : [];

  if (datasetIds.length === 0) {
    console.log("\nNo relevant datasets found.");
    return;
  }

  // Pass 2: Answer
  console.log(`\nPass 2: Answering with datasets: ${datasetIds.join(", ")}...`);
  const dataTexts = [];
  for (const id of datasetIds.slice(0, 3)) {
    try {
      const text = readFileSync(join(ROOT, "public", "data", `${id}.json`), "utf-8");
      dataTexts.push(text);
    } catch {
      console.warn(`  ⚠ Could not read ${id}.json`);
    }
  }

  const answerPrompt = EDITORIAL_PROMPT + "\n\nDATA:\n" + dataTexts.join("\n\n---\n\n") + "\n\nQUESTION: " + QUESTION;

  const answer = await callGemini(answerPrompt);
  console.log("\n─── Answer ───────────────────────────────────────");
  console.log(answer.trim());
  console.log("──────────────────────────────────────────────────\n");
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
