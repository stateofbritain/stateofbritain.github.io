#!/usr/bin/env node
/**
 * sync-api-data.js
 *
 * Copies JSON data files from public/data/ to public/api/data/,
 * keeping the public API directory in sync with the primary data.
 *
 * Files in EXCLUDE are skipped — these datasets have source licenses
 * that do not permit onward distribution via the public API.
 *
 * Run after any fetch script or data update:
 *   node scripts/sync-api-data.js
 */

import { readdirSync, copyFileSync, mkdirSync } from "fs";
import { join } from "path";

const SRC = join(import.meta.dirname, "..", "public", "data");
const DEST = join(import.meta.dirname, "..", "public", "api", "data");

// Datasets excluded from the public API due to source licensing restrictions.
// Add the filename (without path) to exclude a dataset.
const EXCLUDE = new Set([
  "mental-health.json",
  "nhs-funding.json",
  "safety.json",
]);

mkdirSync(DEST, { recursive: true });

const files = readdirSync(SRC).filter(f => f.endsWith(".json") && !EXCLUDE.has(f));
let copied = 0;
let skipped = 0;

for (const file of files) {
  copyFileSync(join(SRC, file), join(DEST, file));
  copied++;
}

skipped = EXCLUDE.size;
console.log(`Synced ${copied} files from public/data/ → public/api/data/ (${skipped} excluded for licensing)`);
