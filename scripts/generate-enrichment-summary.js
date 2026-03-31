#!/usr/bin/env node
/**
 * Generate data/enrichment-summary.json — a condensed routing catalog for the
 * "Ask the Data" feature. Read by Google Apps Script to route user questions
 * to the right datasets before fetching full data.
 *
 * Usage:
 *   node scripts/generate-enrichment-summary.js
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const ENRICHMENT_PATH = join(ROOT, "data", "enrichment.yaml");
const OUTPUT_PATH = join(ROOT, "public", "data", "enrichment-summary.json");

// ─── Minimal YAML parser (same as generate-catalog.js) ─────────────

function parseSimpleYaml(text) {
  const result = {};
  let currentId = null;
  let currentSeries = null;
  let currentSeriesId = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (/^\s*#/.test(line) || /^\s*$/.test(line)) continue;

    const topMatch = line.match(/^(\w[\w-]*):\s*$/);
    if (topMatch) {
      currentId = topMatch[1];
      result[currentId] = result[currentId] || {};
      currentSeries = null;
      currentSeriesId = null;
      continue;
    }

    if (!currentId) continue;

    const secondMatch = line.match(/^  (\w[\w.]*):\s*(.*)$/);
    if (secondMatch) {
      const [, key, val] = secondMatch;
      if (key === "series") {
        currentSeries = {};
        result[currentId].series = currentSeries;
        continue;
      }
      if (key === "tags") {
        const tagMatch = val.match(/^\[(.*)\]$/);
        if (tagMatch) {
          result[currentId].tags = tagMatch[1].split(",").map((t) => t.trim().replace(/^["']|["']$/g, ""));
        }
        currentSeries = null;
        currentSeriesId = null;
        continue;
      }
      result[currentId][key] = val.replace(/^["']|["']$/g, "");
      currentSeries = null;
      currentSeriesId = null;
      continue;
    }

    if (currentSeries !== null || (result[currentId].series && line.match(/^    /))) {
      if (!currentSeries) currentSeries = result[currentId].series;
      const thirdMatch = line.match(/^    ([\w.]+):\s*$/);
      if (thirdMatch) {
        currentSeriesId = thirdMatch[1];
        currentSeries[currentSeriesId] = currentSeries[currentSeriesId] || {};
        continue;
      }
      if (currentSeriesId) {
        const fourthMatch = line.match(/^      (\w+):\s*(.+)$/);
        if (fourthMatch) {
          const [, key, val] = fourthMatch;
          currentSeries[currentSeriesId][key] = val.replace(/^["']|["']$/g, "");
          continue;
        }
      }
    }
  }

  return result;
}

// ─── Main ───────────────────────────────────────────────────────────

if (!existsSync(ENRICHMENT_PATH)) {
  console.error("✗ data/enrichment.yaml not found");
  process.exit(1);
}

const enrichment = parseSimpleYaml(readFileSync(ENRICHMENT_PATH, "utf-8"));

const datasets = Object.entries(enrichment).map(([id, data]) => {
  const seriesSummaries = data.series
    ? Object.values(data.series)
        .filter((s) => s.summary)
        .map((s) => s.summary)
    : [];

  return {
    id,
    title: data.title || id,
    summary: data.summary || "",
    tags: data.tags || [],
    seriesSummaries,
  };
});

const output = {
  generated: new Date().toISOString().slice(0, 10),
  datasets,
};

writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
console.log(`✓ Wrote ${datasets.length} datasets to public/data/enrichment-summary.json`);
