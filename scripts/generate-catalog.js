#!/usr/bin/env node
/**
 * Generate data/catalog.json from v1 data files + data/enrichment.yaml.
 *
 * Usage:
 *   node scripts/generate-catalog.js
 *
 * Reads all public/data/*.json v1 files, merges with enrichment metadata,
 * and outputs the catalog to data/catalog.json (server-side, not in public/).
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const DATA_DIR = join(ROOT, "public", "data");
const ENRICHMENT_PATH = join(ROOT, "data", "enrichment.yaml");
const CATALOG_PATH = join(ROOT, "data", "catalog.json");

// ─── Minimal YAML parser (enough for our flat enrichment format) ─────
// We avoid adding a yaml dependency. The enrichment file uses a simple
// structure: top-level keys are dataset ids, with nested scalar fields.

function parseSimpleYaml(text) {
  const result = {};
  let currentId = null;
  let currentSeries = null;
  let currentSeriesId = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "");

    // Skip comments and empty lines
    if (/^\s*#/.test(line) || /^\s*$/.test(line)) continue;

    // Top-level key (no indent): "family:"
    const topMatch = line.match(/^(\w[\w-]*):\s*$/);
    if (topMatch) {
      currentId = topMatch[1];
      result[currentId] = result[currentId] || {};
      currentSeries = null;
      currentSeriesId = null;
      continue;
    }

    if (!currentId) continue;

    // Second-level key (2-space indent): "  title: ..."
    const secondMatch = line.match(/^  (\w[\w.]*):\s*(.*)$/);
    if (secondMatch) {
      const [, key, val] = secondMatch;

      if (key === "series") {
        currentSeries = {};
        result[currentId].series = currentSeries;
        continue;
      }
      if (key === "tags") {
        // tags: [fertility, births, TFR]
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

    // Third-level key (4-space indent, inside series): "    tfrByOrder:"
    if (currentSeries !== null || (result[currentId].series && line.match(/^    /))) {
      if (!currentSeries) currentSeries = result[currentId].series;

      const thirdMatch = line.match(/^    ([\w.]+):\s*$/);
      if (thirdMatch) {
        currentSeriesId = thirdMatch[1];
        currentSeries[currentSeriesId] = currentSeries[currentSeriesId] || {};
        continue;
      }

      // Fourth-level (6-space indent, series fields): "      title: ..."
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

// Load enrichment data
let enrichment = {};
if (existsSync(ENRICHMENT_PATH)) {
  const yamlText = readFileSync(ENRICHMENT_PATH, "utf-8");
  enrichment = parseSimpleYaml(yamlText);
} else {
  console.warn("⚠ No enrichment.yaml found, catalog will have minimal metadata");
}

// Scan all v1 data files
const files = readdirSync(DATA_DIR)
  .filter((f) => f.endsWith(".json") && !f.endsWith(".v0.json"));

const datasets = [];
const byPillar = {};
const byTag = {};

for (const file of files) {
  const filePath = join(DATA_DIR, file);
  const data = JSON.parse(readFileSync(filePath, "utf-8"));

  // Only process v1 files
  if (data.$schema !== "sob-dataset-v1") continue;

  const id = data.id;
  const enrich = enrichment[id] || {};

  const entry = {
    id,
    title: enrich.title || id.charAt(0).toUpperCase() + id.slice(1),
    pillar: data.pillar,
    ...(enrich.geography ? { geography: enrich.geography } : {}),
    summary: enrich.summary || "",
    tags: enrich.tags || [],
    dataFile: `/data/${file}`,
    series: {},
  };

  // Extract series metadata
  if (data.series) {
    for (const [seriesId, seriesDef] of Object.entries(data.series)) {
      const seriesEnrich = enrich.series?.[seriesId] || {};
      const dataArr = seriesDef.data || [];
      const timeField = seriesDef.timeField || "year";

      // Compute time range
      let start, end;
      if (dataArr.length > 0) {
        start = dataArr[0][timeField];
        end = dataArr[dataArr.length - 1][timeField];
      }

      // Extract field names (excluding time field)
      const fields = {};
      if (dataArr.length > 0) {
        for (const key of Object.keys(dataArr[0])) {
          if (key === timeField) continue;
          fields[key] = {
            label: seriesEnrich.fields?.[key]?.label || key,
          };
        }
      }

      entry.series[seriesId] = {
        title: seriesEnrich.title || seriesId,
        ...(seriesEnrich.summary ? { summary: seriesEnrich.summary } : {}),
        ...(seriesEnrich.unit ? { unit: seriesEnrich.unit } : {}),
        fields,
        ...(start != null ? { timeRange: { start, end } } : {}),
      };
    }
  }

  datasets.push(entry);

  // Build indexes
  if (!byPillar[data.pillar]) byPillar[data.pillar] = [];
  byPillar[data.pillar].push(id);

  for (const tag of entry.tags) {
    if (!byTag[tag]) byTag[tag] = [];
    byTag[tag].push(id);
  }
}

// Sort datasets by id
datasets.sort((a, b) => a.id.localeCompare(b.id));

const catalog = {
  $schema: "sob-catalog-v1",
  generated: new Date().toISOString().slice(0, 10),
  datasets,
  index: { byPillar, byTag },
};

writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n");
console.log(`✓ Generated catalog with ${datasets.length} datasets at data/catalog.json`);
console.log(`  Pillars: ${Object.entries(byPillar).map(([k, v]) => `${k}(${v.length})`).join(", ")}`);
console.log(`  Tags: ${Object.keys(byTag).length} unique tags`);
