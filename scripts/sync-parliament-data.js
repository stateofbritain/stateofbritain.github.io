#!/usr/bin/env node
/**
 * sync-parliament-data.js
 *
 * Publishes the Hansard Highlights pipeline output to the web app.
 *
 * Copies the two browser-facing files for every sitting day —
 *   highlights-{date}.json        the resolved editorial highlights
 *   transcript-indexed-{date}.json the full sitting record
 * from parliament/output/ to public/data/parliament/, and writes an
 * index.json listing every available day (newest first) with the
 * metadata the /parliament tab needs to render its day picker.
 *
 * Run after `analyse resolve` + `captions`, in place of the legacy
 * `build_page` step:
 *   node scripts/sync-parliament-data.js
 */

import { readdirSync, copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "parliament", "output");
const DEST = join(ROOT, "public", "data", "parliament");

mkdirSync(DEST, { recursive: true });

// Sitting days are the resolved highlights files (the raw editorial drafts excluded).
const days = readdirSync(SRC)
  .map((f) => /^highlights-(\d{4}-\d{2}-\d{2})\.json$/.exec(f))
  .filter(Boolean)
  .map((m) => m[1])
  .sort()
  .reverse();

if (days.length === 0) {
  console.error("No highlights-{date}.json in parliament/output/. Run the pipeline first.");
  process.exit(1);
}

const index = [];
let copied = 0;

for (const date of days) {
  const highlightsFile = `highlights-${date}.json`;
  const transcriptFile = `transcript-indexed-${date}.json`;

  copyFileSync(join(SRC, highlightsFile), join(DEST, highlightsFile));
  copied++;

  const hasTranscript = existsSync(join(SRC, transcriptFile));
  if (hasTranscript) {
    copyFileSync(join(SRC, transcriptFile), join(DEST, transcriptFile));
    copied++;
  }

  const data = JSON.parse(readFileSync(join(SRC, highlightsFile), "utf-8"));
  index.push({
    date,
    house: data.house || "Commons",
    sitting_overview: data.sitting_overview || "",
    highlight_count: data.highlight_count ?? (data.highlights || []).length,
    contribution_count: data.contribution_count ?? null,
    has_full_record: hasTranscript,
  });
}

writeFileSync(
  join(DEST, "index.json"),
  JSON.stringify({ generated: new Date().toISOString(), latest: days[0], days: index }, null, 2),
);

console.log(`Synced ${copied} file(s) for ${days.length} sitting day(s) → public/data/parliament/`);
console.log(`Latest: ${days[0]}`);
