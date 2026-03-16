#!/usr/bin/env node
/**
 * Migrate a v0 data file to the v1 sob-dataset schema.
 *
 * Usage:
 *   node scripts/migrate-v0-to-v1.js family
 *   node scripts/migrate-v0-to-v1.js --all          # migrate everything
 *   node scripts/migrate-v0-to-v1.js family --dry    # preview without writing
 *
 * The script reads from public/data/{id}.json, transforms to v1, and writes
 * back to the same path. The original is backed up to public/data/{id}.v0.json.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join, basename } from "path";

const DATA_DIR = join(import.meta.dirname, "..", "public", "data");

// ─── Dataset metadata registry ──────────────────────────────────────
// Maps dataset id → { pillar, topic, sourceIdPrefix }
const REGISTRY = {
  family:         { pillar: "foundations", topic: "family" },
  education:      { pillar: "growth",      topic: "education" },
  defence:        { pillar: "state",       topic: "defence" },
  startups:       { pillar: "growth",      topic: "startups" },
  research:       { pillar: "growth",      topic: "research" },
  productivity:   { pillar: "growth",      topic: "productivity" },
  investment:     { pillar: "growth",      topic: "investment" },
  immigration:    { pillar: "state",       topic: "immigration" },
  justice:        { pillar: "state",       topic: "justice" },
  infrastructure: { pillar: "growth",      topic: "infrastructure" },
  energy:         { pillar: "foundations",  topic: "energy" },
  water:          { pillar: "foundations",  topic: "water" },
  nhs:            { pillar: "foundations",  topic: "nhs" },
  cpih:           { pillar: "state",       topic: "cpih" },
  spending:       { pillar: "state",       topic: "spending" },
  industrial:     { pillar: "growth",      topic: "industrial" },
  environment:    { pillar: "foundations",  topic: "environment" },
  workforce:      { pillar: "foundations",  topic: "workforce" },
};

// ─── Known methodology breaks ───────────────────────────────────────
const METHODOLOGY_BREAKS = {
  education: {
    gcseResults: [
      { at: 2017, label: "New 9-1 grading", description: "GCSE grading changed from A*-G to 9-1 scale", severity: "major" },
      { at: 2020, label: "COVID assessments", description: "Teacher-assessed grades replaced exams due to COVID-19", severity: "major" },
      { at: 2021, label: "COVID assessments", description: "Teacher-assessed grades replaced exams due to COVID-19", severity: "major" },
    ],
  },
  nhs: {
    rtt: [
      { at: "2020-03", label: "COVID impact", description: "Elective care suspended during COVID-19 pandemic", severity: "major" },
    ],
    ae: [
      { at: "2020-03", label: "COVID impact", description: "A&E attendance patterns disrupted by pandemic", severity: "major" },
    ],
  },
  infrastructure: {
    "rail.journeys": [
      { at: 2020, label: "COVID collapse", description: "Rail journeys fell ~80% during COVID-19 lockdowns", severity: "major" },
    ],
  },
  immigration: {
    netMigration: [
      { at: 2012, label: "Admin data switch", description: "ONS methodology changed from International Passenger Survey to admin-based estimates", severity: "major" },
    ],
  },
};

// ─── Helpers ────────────────────────────────────────────────────────

function inferTimeField(dataArray) {
  if (!Array.isArray(dataArray) || dataArray.length === 0) return "year";
  const first = dataArray[0];
  if (first == null || typeof first !== "object") return "year";
  if ("year" in first) return "year";
  if ("date" in first) return "date";
  if ("time" in first) return "time";
  if ("period" in first) return "period";
  if ("fy" in first) return "fy";
  return Object.keys(first)[0];
}

/**
 * Check if an array looks like a data series (array of objects with consistent keys).
 */
function isDataArray(val) {
  return Array.isArray(val) && val.length > 0 && typeof val[0] === "object" && val[0] !== null;
}

function makeSourceId(datasetId, sourceName) {
  // e.g. "ONS Births in England and Wales, 2024" → "ons-births-2024"
  const slug = sourceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return slug || `${datasetId}-source`;
}

/**
 * Detect whether a value looks like a snapshot value (scalar metric).
 * v0 snapshots have bare numbers/strings, not arrays.
 */
function isSnapshotLike(val) {
  return val != null && !Array.isArray(val) && typeof val !== "object";
}

// ─── Core migration ─────────────────────────────────────────────────

function migrate(id, v0) {
  // Already v1?
  if (v0.$schema === "sob-dataset-v1") {
    console.log(`  ⏭  ${id}.json is already v1, skipping`);
    return null;
  }

  const reg = REGISTRY[id];
  if (!reg) {
    console.warn(`  ⚠  No registry entry for "${id}", skipping`);
    return null;
  }

  const v1 = {
    $schema: "sob-dataset-v1",
    id,
    pillar: reg.pillar,
    topic: reg.topic,
    generated: v0.meta?.generated ?? new Date().toISOString().slice(0, 10),
    sources: [],
    snapshot: {},
    series: {},
  };

  // ── Sources ──
  const oldSources = v0.meta?.sources ?? [];
  const sourceMap = new Map(); // name → id
  for (const s of oldSources) {
    const sid = makeSourceId(id, s.name);
    sourceMap.set(s.name, sid);
    const entry = { id: sid, name: s.name };
    if (s.url) entry.url = s.url;
    if (s.note) entry.note = s.note;
    v1.sources.push(entry);
  }
  // Fallback source if none found
  if (v1.sources.length === 0) {
    v1.sources.push({ id: `${id}-source`, name: `${id} data` });
  }
  const defaultSourceId = v1.sources[0].id;

  // ── Snapshot ──
  // Preserve v0 snapshot verbatim. The v0 naming conventions are irregular
  // (e.g. main key "perPupilLatest" with companion "perPupilYear", not
  // "perPupilLatestYear"), so restructuring into {value, year} objects
  // would lose the original key names and break backward compat.
  // The unwrap passes through bare scalar snapshot values unchanged.
  const oldSnapshot = v0.snapshot ?? {};
  for (const [key, val] of Object.entries(oldSnapshot)) {
    v1.snapshot[key] = val;
  }

  // ── Series ──
  // Identify top-level keys that are arrays (time-series data)
  const skipKeys = new Set(["meta", "snapshot", "$schema", "id", "pillar", "topic", "generated", "sources"]);

  for (const [key, val] of Object.entries(v0)) {
    if (skipKeys.has(key)) continue;

    if (isDataArray(val)) {
      // Simple array series (array of objects)
      const breaks = METHODOLOGY_BREAKS[id]?.[key] ?? [];
      v1.series[key] = {
        sourceId: defaultSourceId,
        timeField: inferTimeField(val),
        ...(breaks.length > 0 ? { methodologyBreaks: breaks } : {}),
        data: val,
      };
    } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      // Nested domain object. Two strategies:
      //  1. If ALL sub-values are data arrays → dot-notation series (broadband.fttp, etc.)
      //  2. If mixed (has non-data-array properties) → store whole object as one series

      const subEntries = Object.entries(val);
      const allDataArrays = subEntries.length > 0 &&
        subEntries.every(([, sv]) => isDataArray(sv));

      if (allDataArrays) {
        // Pure data-array domain (e.g. infrastructure.broadband, rail, roads)
        for (const [subKey, subVal] of subEntries) {
          // Check if items look like product definitions (industrial pattern)
          if (subVal[0].series && Array.isArray(subVal[0].series) && subVal[0].id) {
            for (const product of subVal) {
              if (product.id && isDataArray(product.series)) {
                const dotKey = `${key}.${product.id}`;
                v1.series[dotKey] = {
                  sourceId: defaultSourceId,
                  timeField: inferTimeField(product.series),
                  data: product.series,
                };
              }
            }
          } else {
            const dotKey = `${key}.${subKey}`;
            const breaks = METHODOLOGY_BREAKS[id]?.[dotKey] ?? [];
            v1.series[dotKey] = {
              sourceId: defaultSourceId,
              timeField: inferTimeField(subVal),
              ...(breaks.length > 0 ? { methodologyBreaks: breaks } : {}),
              data: subVal,
            };
          }
        }
      } else {
        // Mixed nested object (e.g. spending.departments, nhs.bySpecialty)
        // Store entire object so components can access all sub-fields
        const breaks = METHODOLOGY_BREAKS[id]?.[key] ?? [];
        v1.series[key] = {
          sourceId: defaultSourceId,
          timeField: "year",
          ...(breaks.length > 0 ? { methodologyBreaks: breaks } : {}),
          data: val,
        };
      }
    }
    // Skip bare snapshot-like values at top level that aren't in the snapshot object
  }

  // Clean up empty objects
  if (Object.keys(v1.snapshot).length === 0) delete v1.snapshot;

  return v1;
}

// ─── CLI ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry");
const migrateAll = args.includes("--all");
const ids = migrateAll
  ? readdirSync(DATA_DIR)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".v0.json"))
      .map((f) => f.replace(".json", ""))
      .filter((id) => id !== "asylum-framework") // special case, skip
  : args.filter((a) => !a.startsWith("--"));

if (ids.length === 0) {
  console.error("Usage: node scripts/migrate-v0-to-v1.js <id> [--dry] | --all [--dry]");
  process.exit(1);
}

let migrated = 0;
let skipped = 0;

for (const id of ids) {
  const filePath = join(DATA_DIR, `${id}.json`);
  if (!existsSync(filePath)) {
    console.warn(`  ⚠  ${filePath} not found, skipping`);
    skipped++;
    continue;
  }

  console.log(`Migrating ${id}...`);
  const v0 = JSON.parse(readFileSync(filePath, "utf-8"));
  const v1 = migrate(id, v0);

  if (!v1) {
    skipped++;
    continue;
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Would write ${Object.keys(v1.series).length} series, ${Object.keys(v1.snapshot ?? {}).length} snapshot values`);
    console.log(`  Series: ${Object.keys(v1.series).join(", ")}`);
  } else {
    // Backup original
    const backupPath = join(DATA_DIR, `${id}.v0.json`);
    writeFileSync(backupPath, readFileSync(filePath));
    // Write v1
    writeFileSync(filePath, JSON.stringify(v1, null, 2) + "\n");
    console.log(`  ✓ Wrote v1 (${Object.keys(v1.series).length} series), backup at ${basename(backupPath)}`);
  }
  migrated++;
}

console.log(`\nDone: ${migrated} migrated, ${skipped} skipped${dryRun ? " (dry run)" : ""}`);
