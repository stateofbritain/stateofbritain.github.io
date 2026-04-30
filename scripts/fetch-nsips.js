/**
 * fetch-nsips.js
 *
 * UK Nationally Significant Infrastructure Projects (NSIPs) — every
 * project ever submitted under the Planning Act 2008 development-
 * consent regime, from the Planning Inspectorate's national
 * infrastructure register.
 *
 * The CSV ships with GPS coordinates and stage already, so this is
 * a thin pull-and-reshape job. Categories are derived from the
 * project reference prefix (EN0=energy, TR0=transport, etc.). Years
 * in the system come from the earliest dated event on the project.
 *
 * Source: Planning Inspectorate — National Infrastructure Consenting.
 * https://national-infrastructure-consenting.planninginspectorate.gov.uk/register-of-applications
 *
 * Output: public/data/nsips.json (sob-dataset-v1)
 */
import https from "https";
import { writeFileSync } from "fs";

const CSV_URL =
  "https://national-infrastructure-consenting.planninginspectorate.gov.uk/api/applications-download";
const OUT = "public/data/nsips.json";

// Project-reference prefix → category. Each PINS prefix is a fixed
// 4-character code; the second pair of digits identifies the
// sub-type. We collapse to five categories on the dashboard.
const CATEGORY_BY_PREFIX = {
  EN01: { category: "energy", subtype: "Generating station" },
  EN02: { category: "energy", subtype: "Electric line" },
  EN03: { category: "energy", subtype: "Underground gas storage" },
  EN04: { category: "energy", subtype: "LNG facility" },
  EN05: { category: "energy", subtype: "Gas reception facility" },
  EN06: { category: "energy", subtype: "Gas transporter pipeline" },
  EN07: { category: "energy", subtype: "Other pipeline" },
  TR01: { category: "transport", subtype: "Highway" },
  TR02: { category: "transport", subtype: "Airport" },
  TR03: { category: "transport", subtype: "Harbour" },
  TR04: { category: "transport", subtype: "Railway" },
  TR05: { category: "transport", subtype: "Rail freight interchange" },
  WA01: { category: "water", subtype: "Dam / reservoir" },
  WA02: { category: "water", subtype: "Water transfer" },
  WW01: { category: "water", subtype: "Wastewater treatment" },
  WS01: { category: "waste", subtype: "Hazardous waste facility" },
  BC03: { category: "industrial", subtype: "Industrial process" },
  BC04: { category: "industrial", subtype: "Carbon capture / storage" },
};

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "stateofbritain-nsips/1.0" }, timeout: 30_000 }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        res.resume();
        return fetchText(res.headers.location.startsWith("http") ? res.headers.location : new URL(res.headers.location, url).toString()).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.on("error", reject);
  });
}

// Robust CSV parser (handles quoted fields containing commas, newlines, "" escape).
function parseCsv(text) {
  const rows = [];
  let cur = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c !== "\r") field += c;
    }
  }
  if (field || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

function parseGps(s) {
  // Field looks like: "'-4.871, 50.378" — leading apostrophe is an
  // Excel-protect prefix. Strip it, then split on comma.
  if (!s) return null;
  const cleaned = s.replace(/^'+/, "").trim();
  const m = cleaned.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  // PINS publishes lon, lat (the first number is x = longitude, second is y = latitude).
  // Sanity-check: UK lat range ~49–61; lon range ~-8–2. Many UK projects have lon in the
  // negative single digits, lat in the 50s.
  const lon = Number(m[1]);
  const lat = Number(m[2]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  if (lat < 49 || lat > 62 || lon < -10 || lon > 3) return null;
  return { lat, lon };
}

function parseDate(s) {
  if (!s) return null;
  // PINS dates are like "21/01/2024" or "2024-01-21".
  const dm = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dm) return `${dm[3]}-${dm[2]}-${dm[1]}`;
  const iso = s.trim().match(/^\d{4}-\d{2}-\d{2}$/);
  if (iso) return s.trim();
  return null;
}

function earliestDate(row) {
  const cands = [
    row.dateOfApplication,
    row.dateApplicationAccepted,
    row.dateExaminationStarted,
  ].filter(Boolean).sort();
  return cands[0] || null;
}

function yearsInSystem(row) {
  const earliest = earliestDate(row);
  if (!earliest) return null;
  const start = new Date(earliest + "T00:00:00Z").getTime();
  const end = row.dateOfDecision ? new Date(row.dateOfDecision + "T00:00:00Z").getTime() : Date.now();
  return Math.round((end - start) / (365.25 * 86_400_000) * 10) / 10;
}

function categorise(ref) {
  const prefix = (ref || "").slice(0, 4);
  return CATEGORY_BY_PREFIX[prefix] || { category: "other", subtype: "Other" };
}

async function main() {
  console.log(`Pulling PINS register…`);
  const csv = await fetchText(CSV_URL);
  const rows = parseCsv(csv);
  const header = rows[0].map((h) => h.trim());
  const records = rows.slice(1).filter((r) => r[0]);
  console.log(`  ${records.length} records`);

  // Lookup column indices defensively in case PINS reorders columns.
  const idx = {
    ref:        header.indexOf("Project reference"),
    name:       header.indexOf("Project name"),
    applicant:  header.indexOf("Applicant name"),
    appType:    header.indexOf("Application type"),
    region:     header.indexOf("Region"),
    location:   header.indexOf("Location"),
    gps:        header.indexOf("GPS co-ordinates"),
    stage:      header.indexOf("Stage"),
    description: header.indexOf("Description"),
    dateApp:    header.indexOf("Date of application"),
    dateAccept: header.indexOf("Date application accepted"),
    dateExStart: header.indexOf("Date Examination started"),
    dateExEnd:  header.indexOf("Date Examination closed"),
    dateRecommend: header.indexOf("Date of recommendation"),
    dateDecision: header.indexOf("Date of decision"),
    dateWithdraw: header.indexOf("Date withdrawn"),
  };

  const projects = [];
  const skipped = [];
  for (const r of records) {
    const ref = r[idx.ref]?.trim();
    if (!ref || !/^[A-Z]{2}\d{2}/.test(ref)) {
      skipped.push({ ref, reason: "bad-reference" });
      continue;
    }
    const gps = parseGps(r[idx.gps]);
    const cat = categorise(ref);
    const project = {
      ref,
      name: r[idx.name]?.trim() || null,
      applicant: r[idx.applicant]?.trim() || null,
      appType: r[idx.appType]?.trim() || null,
      category: cat.category,
      subtype: cat.subtype,
      region: r[idx.region]?.trim() || null,
      location: r[idx.location]?.trim() || null,
      lat: gps?.lat ?? null,
      lon: gps?.lon ?? null,
      stage: r[idx.stage]?.trim() || null,
      description: r[idx.description]?.trim() || null,
      dateOfApplication:    parseDate(r[idx.dateApp]),
      dateApplicationAccepted: parseDate(r[idx.dateAccept]),
      dateExaminationStarted:  parseDate(r[idx.dateExStart]),
      dateExaminationClosed:   parseDate(r[idx.dateExEnd]),
      dateOfRecommendation:    parseDate(r[idx.dateRecommend]),
      dateOfDecision:          parseDate(r[idx.dateDecision]),
      dateWithdrawn:           parseDate(r[idx.dateWithdraw]),
    };
    project.yearsInSystem = yearsInSystem(project);
    project.projectUrl = `https://national-infrastructure-consenting.planninginspectorate.gov.uk/projects/${ref}`;
    projects.push(project);
  }

  // Aggregate counts for the snapshot.
  const byCategory = {};
  const byStage = {};
  let withGps = 0;
  for (const p of projects) {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    byStage[p.stage || "Unknown"] = (byStage[p.stage || "Unknown"] || 0) + 1;
    if (p.lat != null) withGps++;
  }

  const output = {
    $schema: "sob-dataset-v1",
    id: "nsips",
    pillar: "state",
    topic: "construction",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "pins-register",
        name: "Planning Inspectorate — National Infrastructure Consenting register",
        url: "https://national-infrastructure-consenting.planninginspectorate.gov.uk/register-of-applications",
        publisher: "Planning Inspectorate",
        note: "Every project applied-for under the Planning Act 2008 DCO regime since 2010, with GPS coordinates, applicant, regulatory stage, and a record of every dated examination event. Categorisation is derived from the project reference prefix (EN01–EN07 = energy, TR01–TR05 = transport, WA0x = water, WW0x = wastewater, WS0x = waste, BC0x = industrial / CCUS).",
      },
    ],
    snapshot: {
      total: projects.length,
      withGps,
      byCategory,
      byStage,
      skipped: skipped.length,
    },
    series: {
      projects: {
        sourceId: "pins-register",
        timeField: "ref",
        unit: "projects",
        description: `${projects.length} NSIPs (Nationally Significant Infrastructure Projects) on the PINS register, categorised by reference prefix.`,
        data: projects,
      },
    },
  };

  writeFileSync(OUT, JSON.stringify(output, null, 2) + "\n");
  console.log(`\n✓ ${OUT}`);
  console.log(`  ${projects.length} projects (${withGps} with GPS)`);
  console.log(`  by category:`);
  for (const [k, v] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(12)} ${v}`);
  }
  console.log(`  by stage:`);
  for (const [k, v] of Object.entries(byStage).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(20)} ${v}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
