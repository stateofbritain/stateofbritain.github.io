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
const REPD_PUBLICATION_PAGE = "https://www.gov.uk/government/publications/renewable-energy-planning-database-monthly-extract";
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

/**
 * Pull the latest REPD (Renewable Energy Planning Database) CSV and
 * index by NSIP-pattern Planning Application Reference. Gives each
 * energy NSIP its post-consent delivery status — "Under Construction",
 * "Operational", "Awaiting Construction", "Abandoned" — plus capacity
 * and operational/construction-start dates that PINS doesn't track.
 *
 * Returns Map<nsipRef, { status, statusShort, capacityMW, technology,
 *   operationalDate, constructionStartDate, plannedOperationalDate,
 *   developmentStartDate, lastUpdated, repdRefId }>.
 *
 * Records are joined on Planning Application Reference (e.g. "EN010001").
 * REPD is published quarterly, so the latest CSV's URL changes each
 * quarter — discover it from the publication page.
 */
async function fetchRepdMap() {
  console.log(`\nDiscovering latest REPD CSV…`);
  const html = await fetchText(REPD_PUBLICATION_PAGE);
  const m = html.match(/href="(https:\/\/assets\.publishing\.service\.gov\.uk\/[^"]*REPD[^"]*\.csv)"/i);
  if (!m) {
    console.warn("  REPD CSV not found on publication page; skipping enrichment");
    return new Map();
  }
  const csvUrl = m[1];
  console.log(`  Pulling ${csvUrl}…`);
  const csv = await fetchText(csvUrl);
  const rows = parseCsv(csv);
  const header = rows[0];
  const idx = (k) => header.indexOf(k);
  const cols = {
    par: idx("Planning Application Reference"),
    refId: idx("Ref ID"),
    siteName: idx("Site Name"),
    operator: idx("Operator (or Applicant)"),
    technology: idx("Technology Type"),
    capacity: idx("Installed Capacity (MWelec)"),
    statusFull: idx("Development Status"),
    statusShort: idx("Development Status (short)"),
    planAuth: idx("Planning Authority"),
    appSubmitted: idx("Planning Application Submitted"),
    permissionGranted: idx("Planning Permission  Granted"),
    permissionRefused: idx("Planning Permission Refused"),
    permissionExpired: idx("Planning Permission Expired"),
    appWithdrawn: idx("Planning Application Withdrawn"),
    operational: idx("Operational"),
    devStart: idx("Under Construction"),
    plannedOp: idx("Expected Operational"),
    lastUpdated: idx("Record Last Updated (dd/mm/yyyy)"),
  };

  // Match anything that looks like an NSIP reference (e.g. "EN010001",
  // "TR020012") — this catches all PINS-routed records reliably.
  const nsipRe = /^[A-Z]{2}\d{6,8}$/;
  const out = new Map();
  for (const r of rows.slice(1)) {
    const par = String(r[cols.par] || "").trim();
    if (!nsipRe.test(par)) continue;
    const capacityRaw = r[cols.capacity];
    const capacity = capacityRaw ? Number(String(capacityRaw).replace(/,/g, "")) : null;
    const entry = {
      status: r[cols.statusFull]?.trim() || null,
      statusShort: r[cols.statusShort]?.trim() || null,
      capacityMW: Number.isFinite(capacity) ? capacity : null,
      technology: r[cols.technology]?.trim() || null,
      operator: r[cols.operator]?.trim() || null,
      siteName: r[cols.siteName]?.trim() || null,
      operationalDate: parseDate(r[cols.operational]),
      constructionStartDate: parseDate(r[cols.devStart]),
      plannedOperationalDate: parseDate(r[cols.plannedOp]),
      permissionGrantedDate: parseDate(r[cols.permissionGranted]),
      permissionRefusedDate: parseDate(r[cols.permissionRefused]),
      permissionExpiredDate: parseDate(r[cols.permissionExpired]),
      withdrawnDate: parseDate(r[cols.appWithdrawn]),
      lastUpdated: parseDate(r[cols.lastUpdated]),
      repdRefId: r[cols.refId]?.trim() || null,
    };
    // Multiple REPD records can share a Planning Application Reference
    // (e.g. multi-phase wind farms); keep them all as an array on the map.
    if (!out.has(par)) out.set(par, []);
    out.get(par).push(entry);
  }
  console.log(`  REPD enrichment: ${out.size} unique NSIP refs matched (${[...out.values()].reduce((s, v) => s + v.length, 0)} REPD records)`);
  return out;
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

  // Enrich energy projects with REPD delivery status. REPD is keyed by
  // Planning Application Reference, so this is a clean exact-match join.
  const repdMap = await fetchRepdMap();
  let enriched = 0;
  for (const p of projects) {
    const records = repdMap.get(p.ref);
    if (!records || records.length === 0) continue;
    enriched++;
    // For multi-record projects (multi-phase developments), pick the
    // primary record by largest capacity, and roll up totals.
    const primary = [...records].sort((a, b) => (b.capacityMW || 0) - (a.capacityMW || 0))[0];
    const totalCapacity = records.reduce((s, r) => s + (r.capacityMW || 0), 0);
    p.delivery = {
      status: primary.status,
      statusShort: primary.statusShort,
      technology: primary.technology,
      capacityMW: totalCapacity > 0 ? Math.round(totalCapacity * 10) / 10 : primary.capacityMW,
      operationalDate: primary.operationalDate,
      constructionStartDate: primary.constructionStartDate,
      plannedOperationalDate: primary.plannedOperationalDate,
      permissionGrantedDate: primary.permissionGrantedDate,
      permissionRefusedDate: primary.permissionRefusedDate,
      permissionExpiredDate: primary.permissionExpiredDate,
      withdrawnDate: primary.withdrawnDate,
      lastUpdated: primary.lastUpdated,
      repdRecordCount: records.length,
    };
  }
  console.log(`  ${enriched}/${projects.length} projects enriched with REPD delivery status`);

  // Aggregate counts for the snapshot.
  const byCategory = {};
  const byStage = {};
  const byDeliveryStatus = {};
  let withGps = 0;
  let withDelivery = 0;
  let totalCapacityMW = 0;
  let operationalCapacityMW = 0;
  for (const p of projects) {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    byStage[p.stage || "Unknown"] = (byStage[p.stage || "Unknown"] || 0) + 1;
    if (p.lat != null) withGps++;
    if (p.delivery?.status) {
      withDelivery++;
      byDeliveryStatus[p.delivery.status] = (byDeliveryStatus[p.delivery.status] || 0) + 1;
      const cap = p.delivery.capacityMW || 0;
      totalCapacityMW += cap;
      if (/operational/i.test(p.delivery.status)) operationalCapacityMW += cap;
    }
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
      {
        id: "desnz-repd",
        name: "DESNZ Renewable Energy Planning Database",
        url: REPD_PUBLICATION_PAGE,
        publisher: "DESNZ / Barbour ABI",
        note: "Quarterly publication tracking every renewable energy project >150 kW from planning through construction to operation. Joined to the PINS register on Planning Application Reference (e.g. EN010001) — gives each energy NSIP its post-consent delivery status (Operational / Under Construction / Awaiting Construction / Abandoned / etc.), installed capacity in MW, technology type, and operational/construction-start dates. Non-energy NSIPs (highways, airports, water etc.) aren't covered here — they need separate scheme-tracker sources.",
      },
    ],
    snapshot: {
      total: projects.length,
      withGps,
      withDelivery,
      byCategory,
      byStage,
      byDeliveryStatus,
      totalCapacityMW: Math.round(totalCapacityMW),
      operationalCapacityMW: Math.round(operationalCapacityMW),
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
  console.log(`  delivery status (REPD-enriched):`);
  console.log(`    ${withDelivery}/${projects.length} projects · ${operationalCapacityMW.toLocaleString()} MW operational / ${totalCapacityMW.toLocaleString()} MW total`);
  for (const [k, v] of Object.entries(byDeliveryStatus).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(40)} ${v}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
