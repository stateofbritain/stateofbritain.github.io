/**
 * fetch-school-absence.js
 *
 * Weekly pupil attendance / absence in state-funded schools, England.
 * DfE publishes a weekly release during term time; codified-reasons rule
 * change Autumn 2024 means pre-Autumn-2024 series isn't directly comparable.
 *
 * Strategy:
 *   1. Hit the EES content API for the latest "pupil-attendance-in-schools"
 *      release and its file list.
 *   2. Pick the headline weekly-absence CSV.
 *   3. Parse week-ending → overall absence rate.
 *
 * Source: DfE — Pupil attendance in schools
 * https://explore-education-statistics.service.gov.uk/find-statistics/pupil-attendance-in-schools
 *
 * Output: public/data/school-absence.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import { fetchHtml, fetchBuffer } from "./lib/xlsx-fetch.js";

const PUBLICATION_SLUG = "pupil-attendance-in-schools";
const PUBLIC_PAGE = `https://explore-education-statistics.service.gov.uk/find-statistics/${PUBLICATION_SLUG}`;
const CONTENT_API = `https://content.explore-education-statistics.service.gov.uk/api/publications/${PUBLICATION_SLUG}/releases/latest`;

async function fetchJson(url) {
  const buf = await fetchBuffer(url);
  return JSON.parse(buf.toString("utf-8"));
}

function findCsvLinks(html) {
  const re = /https?:\/\/[^"'\s]+?\.csv/gi;
  return [...new Set(html.match(re) || [])];
}

function parseWeekEnding(s) {
  if (typeof s !== "string") return null;
  // Accept "2024-09-13" or "13/09/2024" or "Week ending 13 September 2024".
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${mm}-${dd}`;
  }
  return null;
}

function parseAbsenceCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;
  const headers = lines[0].split(",").map((c) => c.trim().replace(/"/g, "").toLowerCase());
  const weekCol = headers.findIndex((c) => /week.?ending|time_period|date/.test(c));
  const overallCol = headers.findIndex(
    (c) => /overall.?absence.?rate|total.?absence|absence.?rate/.test(c)
  );
  if (weekCol < 0 || overallCol < 0) return null;

  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    const week = parseWeekEnding(cells[weekCol]);
    const rate = Number.parseFloat(cells[overallCol]);
    if (!week || !Number.isFinite(rate)) continue;
    out.push({ weekEnding: week, absenceRate: rate });
  }
  return out.length > 0 ? out.sort((a, b) => a.weekEnding.localeCompare(b.weekEnding)) : null;
}

async function tryContentApi() {
  try {
    const release = await fetchJson(CONTENT_API);
    const files = release.files || release.downloadFiles || [];
    for (const f of files) {
      if (!f || !f.fileName) continue;
      if (!/csv$/i.test(f.fileName)) continue;
      if (!/(week|attend|absence)/i.test(f.fileName)) continue;
      const fileId = f.id || f.fileId;
      const releaseId = release.id;
      if (!fileId || !releaseId) continue;
      const url = `https://content.explore-education-statistics.service.gov.uk/api/releases/${releaseId}/files/${fileId}/download`;
      try {
        const buf = await fetchBuffer(url);
        const data = parseAbsenceCsv(buf.toString("utf-8"));
        if (data) return { data, url, file: f.fileName };
      } catch (err) {
        console.warn(`  EES file ${f.fileName}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn(`EES content API failed: ${err.message}`);
  }
  return null;
}

async function tryPublicHtml() {
  try {
    const html = await fetchHtml(PUBLIC_PAGE);
    for (const url of findCsvLinks(html).slice(0, 8)) {
      try {
        const buf = await fetchBuffer(url);
        const data = parseAbsenceCsv(buf.toString("utf-8"));
        if (data) return { data, url };
      } catch (err) {
        console.warn(`  CSV ${url}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn(`Public page scrape failed: ${err.message}`);
  }
  return null;
}

async function main() {
  let result = await tryContentApi();
  if (!result) result = await tryPublicHtml();

  const data = result?.data ?? [];
  const liveUrl = result?.url ?? null;

  const output = {
    $schema: "sob-dataset-v1",
    id: "school-absence",
    pillar: "foundations",
    topic: "education",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "dfe-pupil-attendance",
        name: "DfE — Pupil attendance in schools (weekly)",
        url: liveUrl ?? PUBLIC_PAGE,
        publisher: "DfE",
        note: liveUrl
          ? "Weekly overall absence rate, state-funded schools in England. Codified-reasons rule from Autumn 2024 — earlier comparisons imperfect."
          : "Live discovery did not succeed this run; series empty.",
      },
    ],
    snapshot: data.length
      ? { absenceRate: data[data.length - 1].absenceRate, weekEnding: data[data.length - 1].weekEnding, absenceUnit: "%" }
      : {},
    series: {
      weekly: {
        sourceId: "dfe-pupil-attendance",
        timeField: "weekEnding",
        unit: "%",
        description:
          "Weekly overall absence rate, state-funded primary and secondary schools, England.",
        data,
      },
    },
  };

  writeFileSync("public/data/school-absence.json", JSON.stringify(output, null, 2) + "\n");
  console.log(
    `${data.length > 0 ? "✓" : "⚠"} public/data/school-absence.json (${data.length} weeks; source=${liveUrl ? "live" : "empty (no fallback)"})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
