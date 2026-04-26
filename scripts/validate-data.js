#!/usr/bin/env node
/**
 * Validate all public/data/*.json files against the v1 dataset schema.
 *
 * Usage:
 *   node scripts/validate-data.js           # validate all
 *   node scripts/validate-data.js family     # validate one
 *
 * Exit code 0 if all pass, 1 if any fail.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(import.meta.dirname, "..", "public", "data");
const SCHEMA_PATH = join(import.meta.dirname, "..", "data", "schema", "dataset-v1.json");

const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));

// ─── Lightweight structural validator ────────────────────────────────
// We don't pull in ajv as a dependency; instead we check the key
// structural constraints from dataset-v1.json directly.

function validate(id, data) {
  const errors = [];
  const warnings = [];
  const warn = (msg) => errors.push(msg);
  const note = (msg) => warnings.push(msg);

  // Check v1 marker
  if (data.$schema !== "sob-dataset-v1") {
    warn(`Missing or wrong $schema (expected "sob-dataset-v1", got "${data.$schema}")`);
    return { id, v1: false, errors, valid: errors.length === 0 };
  }

  // Required top-level fields
  for (const field of ["id", "pillar", "topic", "generated", "sources"]) {
    if (!(field in data)) warn(`Missing required field "${field}"`);
  }

  // id should match filename
  if (data.id && data.id !== id) {
    warn(`id "${data.id}" does not match filename "${id}"`);
  }

  // pillar enum
  const validPillars = ["foundations", "growth", "state", "challenges"];
  if (data.pillar && !validPillars.includes(data.pillar)) {
    warn(`Invalid pillar "${data.pillar}", expected one of: ${validPillars.join(", ")}`);
  }

  // generated should be a date string
  if (data.generated && !/^\d{4}-\d{2}-\d{2}/.test(data.generated)) {
    warn(`"generated" should be an ISO date, got "${data.generated}"`);
  }

  // sources array
  if (Array.isArray(data.sources)) {
    const sourceIds = new Set();
    for (let i = 0; i < data.sources.length; i++) {
      const s = data.sources[i];
      if (!s.id) warn(`sources[${i}] missing "id"`);
      if (!s.name) warn(`sources[${i}] missing "name"`);
      if (s.id && sourceIds.has(s.id)) warn(`Duplicate source id "${s.id}"`);
      if (s.id) sourceIds.add(s.id);
    }

    // Validate series sourceId references
    const validSourceIds = sourceIds;
    if (data.series) {
      for (const [seriesId, seriesDef] of Object.entries(data.series)) {
        if (!seriesDef.sourceId) {
          warn(`series.${seriesId} missing "sourceId"`);
        } else if (!validSourceIds.has(seriesDef.sourceId)) {
          warn(`series.${seriesId}.sourceId "${seriesDef.sourceId}" not found in sources`);
        }
        if (!seriesDef.timeField) {
          warn(`series.${seriesId} missing "timeField"`);
        }
        if (seriesDef.data == null) {
          warn(`series.${seriesId}.data is missing`);
        } else if (Array.isArray(seriesDef.data)) {
          if (seriesDef.data.length === 0) {
            // Empty arrays are a soft warning — when an upstream fetch
            // discovers nothing, the v1 file is still structurally valid
            // and the tile renders "no data" honestly.
            note(`series.${seriesId}.data is empty (live discovery yielded no rows)`);
          } else if (seriesDef.timeField && typeof seriesDef.data[0] === "object" && !(seriesDef.timeField in seriesDef.data[0])) {
            warn(`series.${seriesId}.data[0] missing timeField "${seriesDef.timeField}"`);
          }
        } else if (typeof seriesDef.data !== "object") {
          warn(`series.${seriesId}.data must be an array or object`);
        }

        // Validate methodology breaks
        if (seriesDef.methodologyBreaks) {
          for (let j = 0; j < seriesDef.methodologyBreaks.length; j++) {
            const mb = seriesDef.methodologyBreaks[j];
            if (mb.at == null) warn(`series.${seriesId}.methodologyBreaks[${j}] missing "at"`);
            if (!mb.label) warn(`series.${seriesId}.methodologyBreaks[${j}] missing "label"`);
            if (mb.severity && !["major", "minor"].includes(mb.severity)) {
              warn(`series.${seriesId}.methodologyBreaks[${j}].severity invalid: "${mb.severity}"`);
            }
          }
        }
      }
    }

    // Validate snapshot sourceId references
    if (data.snapshot) {
      for (const [key, entry] of Object.entries(data.snapshot)) {
        if (entry && typeof entry === "object" && entry.sourceId) {
          if (!validSourceIds.has(entry.sourceId)) {
            warn(`snapshot.${key}.sourceId "${entry.sourceId}" not found in sources`);
          }
        }
      }
    }
  }

  // Check for unexpected top-level keys
  const allowedKeys = new Set(["$schema", "id", "pillar", "topic", "generated", "sources", "snapshot", "series"]);
  for (const key of Object.keys(data)) {
    if (!allowedKeys.has(key)) {
      warn(`Unexpected top-level key "${key}" (v1 only allows: ${[...allowedKeys].join(", ")})`);
    }
  }

  return { id, v1: true, errors, warnings, valid: errors.length === 0 };
}

// ─── CLI ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const targetIds = args.length > 0
  ? args
  : readdirSync(DATA_DIR)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".v0.json"))
      .map((f) => f.replace(".json", ""));

let passed = 0;
let failed = 0;
let v0Count = 0;

for (const id of targetIds) {
  const filePath = join(DATA_DIR, `${id}.json`);
  let data;
  try {
    data = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.error(`✗ ${id}: Failed to parse JSON: ${e.message}`);
    failed++;
    continue;
  }

  const result = validate(id, data);

  if (!result.v1) {
    console.log(`○ ${id}: v0 format (not yet migrated)`);
    v0Count++;
    continue;
  }

  if (result.valid) {
    const seriesCount = Object.keys(data.series ?? {}).length;
    const snapCount = Object.keys(data.snapshot ?? {}).length;
    const warnNote = result.warnings?.length ? ` — ${result.warnings.length} warning(s)` : "";
    console.log(`✓ ${id}: valid (${seriesCount} series, ${snapCount} snapshot values)${warnNote}`);
    if (result.warnings?.length) {
      for (const w of result.warnings) console.log(`    ⚠ ${w}`);
    }
    passed++;
  } else {
    console.error(`✗ ${id}: ${result.errors.length} error(s)`);
    for (const err of result.errors) {
      console.error(`    - ${err}`);
    }
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed, ${v0Count} v0 (not migrated)`);
process.exit(failed > 0 ? 1 : 0);
