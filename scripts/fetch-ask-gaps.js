#!/usr/bin/env node
/**
 * fetch-ask-gaps.js
 *
 * Fetches unanswered questions from the Ask Log (Google Sheet via Apps Script),
 * deduplicates them, and outputs a categorised gap analysis.
 *
 * Usage:
 *   # From Apps Script endpoint (requires EXPORT_KEY in .env or env var):
 *   ASK_EXPORT_KEY=xxx node scripts/fetch-ask-gaps.js
 *
 *   # From a local CSV export of the Ask Log sheet:
 *   node scripts/fetch-ask-gaps.js --csv path/to/ask-log.csv
 *
 * Output: data/ask-gaps.json — deduplicated unanswered questions grouped by theme
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT_PATH = join(__dirname, "..", "data", "ask-gaps.json");
const CATALOG_PATH = join(__dirname, "..", "public", "data", "enrichment-summary.json");

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxe0o8gieqssvL8X7nH-TDtILq62-9f7HUGtWtCt0fl_GwRrSrRKIM6QsKmAEbAajEU2Q/exec";

function fetch(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location); return;
        }
        if (res.statusCode !== 200) { reject(new Error("HTTP " + res.statusCode)); return; }
        const chunks = [];
        res.on("data", c => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString()));
        res.on("error", reject);
      }).on("error", reject);
    };
    get(url);
  });
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map(line => {
    // Simple CSV parse (handles quoted fields)
    const vals = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { vals.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    vals.push(current.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });
    return row;
  });
}

function normalise(q) {
  return q.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function dedup(questions) {
  const seen = new Map();
  for (const q of questions) {
    const norm = normalise(q.question);
    if (!norm || norm.length < 5) continue;
    if (seen.has(norm)) {
      seen.get(norm).count++;
    } else {
      seen.set(norm, { question: q.question, normalised: norm, count: 1 });
    }
  }
  return [...seen.values()].sort((a, b) => b.count - a.count);
}

// Simple keyword-based grouping using catalog tags
function categorise(questions, catalog) {
  const tagIndex = {};
  for (const ds of catalog.datasets) {
    for (const tag of ds.tags || []) {
      const t = tag.toLowerCase();
      if (!tagIndex[t]) tagIndex[t] = [];
      tagIndex[t].push(ds.id);
    }
  }

  const themes = {};
  const uncategorised = [];

  for (const q of questions) {
    const words = q.normalised.split(" ");
    const matchedDatasets = new Set();
    for (const word of words) {
      if (tagIndex[word]) {
        for (const dsId of tagIndex[word]) matchedDatasets.add(dsId);
      }
    }

    if (matchedDatasets.size > 0) {
      // These questions match existing tags but the AI still couldn't answer —
      // likely the data exists but the series doesn't cover this specific angle
      const key = [...matchedDatasets].sort().join("+");
      if (!themes[key]) {
        themes[key] = { datasets: [...matchedDatasets], type: "partial_coverage", questions: [] };
      }
      themes[key].questions.push(q);
    } else {
      uncategorised.push(q);
    }
  }

  return { themes: Object.values(themes), uncategorised };
}

async function main() {
  const args = process.argv.slice(2);
  const csvIndex = args.indexOf("--csv");
  let questions;

  if (csvIndex !== -1 && args[csvIndex + 1]) {
    // Read from local CSV
    console.log("Reading from CSV:", args[csvIndex + 1]);
    const csv = readFileSync(args[csvIndex + 1], "utf-8");
    questions = parseCSV(csv);
  } else {
    // Fetch from Apps Script
    const key = process.env.ASK_EXPORT_KEY;
    if (!key) {
      console.error("Set ASK_EXPORT_KEY env var, or use --csv <path>");
      console.error("To set the key: add EXPORT_KEY to Script Properties in Apps Script, then:");
      console.error("  ASK_EXPORT_KEY=your-key node scripts/fetch-ask-gaps.js");
      process.exit(1);
    }
    console.log("Fetching Ask Log from Apps Script...");
    const url = SCRIPT_URL + "?key=" + encodeURIComponent(key) + "&depth=no_match";
    const body = await fetch(url);
    const data = JSON.parse(body);
    if (data.error) { console.error("Error:", data.error); process.exit(1); }
    questions = data.questions;
  }

  // Filter to unanswered — check both "answer" and "" keys (Apps Script
  // may map the Answer column header to an empty key depending on sheet state)
  const getAnswer = q => q.answer || q[""] || "";
  const unanswered = questions.filter(q => {
    // Skip rows marked as done in the spreadsheet
    if (q.done && q.done.toString().toLowerCase() === "done") return false;
    const ans = getAnswer(q);
    return q.depth === "no_match" ||
      ans.includes("don't have data on that topic") ||
      ans.includes("don't have data on") ||
      (q.datasets === "" && ans === "");
  });

  console.log(`Total questions: ${questions.length}`);
  console.log(`Unanswered (no_match): ${unanswered.length}`);

  if (unanswered.length === 0) {
    console.log("No unanswered questions found.");
    return;
  }

  // Deduplicate
  const deduped = dedup(unanswered);
  console.log(`Unique questions after dedup: ${deduped.length}`);

  // Load catalog for tag-based grouping
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf-8"));
  const { themes, uncategorised } = categorise(deduped, catalog);

  const output = {
    generated: new Date().toISOString().slice(0, 10),
    totalQuestions: questions.length,
    unansweredCount: unanswered.length,
    uniqueUnanswered: deduped.length,
    partialCoverage: themes.map(t => ({
      relatedDatasets: t.datasets,
      questions: t.questions.map(q => ({ question: q.question, count: q.count })),
    })),
    newTopics: uncategorised.map(q => ({ question: q.question, count: q.count })),
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${OUT_PATH}`);
  console.log(`  ${themes.length} groups with partial coverage in existing datasets`);
  console.log(`  ${uncategorised.length} questions needing entirely new datasets`);

  // Print summary
  if (uncategorised.length > 0) {
    console.log("\n── New topics needed ──────────────────────────────────");
    for (const q of uncategorised.slice(0, 20)) {
      console.log(`  [${q.count}x] ${q.question}`);
    }
    if (uncategorised.length > 20) {
      console.log(`  ... and ${uncategorised.length - 20} more`);
    }
  }

  if (themes.length > 0) {
    console.log("\n── Partial coverage (data exists but incomplete) ─────");
    for (const t of themes.slice(0, 10)) {
      console.log(`  Datasets: ${t.datasets.join(", ")}`);
      for (const q of t.questions.slice(0, 3)) {
        console.log(`    [${q.count}x] ${q.question}`);
      }
    }
  }
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
