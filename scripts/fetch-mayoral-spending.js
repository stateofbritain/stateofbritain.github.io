#!/usr/bin/env node
/**
 * fetch-mayoral-spending.js
 *
 * Downloads:
 *  1. CAUTH (Combined Authorities) boundaries from ONS Open Geography Portal
 *  2. London region boundary for GLA
 *  3. MHCLG Revenue Outturn CSV — extracts combined authority & GLA rows
 *
 * Outputs:
 *  - public/data/geo/cauth.topo.json — boundary TopoJSON for choropleth map
 *  - public/data/mayoral-spending.json — per-authority spending data (sob-dataset-v1)
 */
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";
import { topology } from "topojson-server";
import { presimplify, simplify } from "topojson-simplify";
import { feature } from "topojson-client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEO_OUT = path.join(__dirname, "..", "public", "data", "geo", "cauth.topo.json");
const DATA_OUT = path.join(__dirname, "..", "public", "data", "mayoral-spending.json");

// ONS Open Geography Portal — CAUTH May 2025, Ultra Generalised Clipped (BUC)
const CAUTH_BASE = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/CAUTH_MAY_2025_EN_BUC/FeatureServer/0/query";
// London region boundary (for GLA, which is not in CAUTH)
const REGION_BASE = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Regions_December_2024_Boundaries_EN_BUC/FeatureServer/0/query";

// MHCLG Revenue Outturn time series CSV (same as council data)
const MHCLG_CSV = "https://assets.publishing.service.gov.uk/media/6937fe05e447374889cd8f4b/Revenue_Outturn_time_series_data_v3.1.csv";

// Combined authority populations (ONS mid-2024, sum of constituent LAs)
const CA_POPULATIONS = {
  E12000007: 9002488,   // Greater London Authority
  E47000001: 2867800,   // Greater Manchester
  E47000002: 1415600,   // South Yorkshire
  E47000003: 2342100,   // West Yorkshire
  E47000004: 1575900,   // Liverpool City Region
  E47000006: 672500,    // Tees Valley
  E47000007: 2928600,   // West Midlands
  E47000008: 862100,    // Cambridgeshire and Peterborough
  E47000009: 961700,    // West of England
  E47000012: 832100,    // York and North Yorkshire
  E47000013: 2234300,   // East Midlands
  E47000014: 1999800,   // North East
  E47000015: 835600,    // Devon and Torbay
  E47000016: 610200,    // Hull and East Yorkshire
  E47000017: 1122400,   // Greater Lincolnshire
  E47000018: 1538600,   // Lancashire
};

// North East time series chaining:
// E47000005 (2017-19) → E47000010 (2019-24) → E47000014 (2024-25)
const NE_CHAIN = {
  predecessors: ["E47000005", "E47000010"],
  successor: "E47000014",
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, { headers: { "User-Agent": "StateOfBritain/1.0" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) { get(res.headers.location); return; }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        res.on("error", reject);
      }).on("error", reject);
    };
    get(url);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Step 1: Download CAUTH + GLA boundaries ─────────────────────
async function fetchBoundaries() {
  console.log("Fetching CAUTH boundaries from ONS...");
  const cauthUrl = `${CAUTH_BASE}?where=1%3D1&outFields=CAUTH25CD,CAUTH25NM&outSR=4326&f=geojson`;
  const raw = await fetchUrl(cauthUrl);
  const geojson = JSON.parse(raw);
  console.log(`  CAUTH features: ${geojson.features.length}`);

  // Normalise property names
  const features = geojson.features.map(f => ({
    type: "Feature",
    properties: { code: f.properties.CAUTH25CD, name: f.properties.CAUTH25NM },
    geometry: f.geometry,
  }));

  // Fetch London region boundary for GLA
  console.log("Fetching London region boundary for GLA...");
  await delay(2000);
  const londonUrl = `${REGION_BASE}?where=RGN24CD%3D%27E12000007%27&outFields=RGN24CD,RGN24NM&outSR=4326&f=geojson`;
  const londonRaw = await fetchUrl(londonUrl);
  const londonGeo = JSON.parse(londonRaw);
  if (londonGeo.features?.length > 0) {
    const f = londonGeo.features[0];
    features.push({
      type: "Feature",
      properties: { code: "E12000007", name: "Greater London Authority" },
      geometry: f.geometry,
    });
    console.log("  Added GLA boundary from London region");
  } else {
    console.log("  WARNING: Could not fetch London region boundary");
  }

  console.log(`  Total features: ${features.length}`);

  const fc = { type: "FeatureCollection", features };
  let topo = topology({ authorities: fc });
  topo = presimplify(topo);
  topo = simplify(topo, 0.0001);
  const simplified = feature(topo, topo.objects.authorities);
  topo = topology({ authorities: simplified }, 1e5);

  const json = JSON.stringify(topo);
  fs.mkdirSync(path.dirname(GEO_OUT), { recursive: true });
  fs.writeFileSync(GEO_OUT, json);
  const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log(`  Wrote ${GEO_OUT} (${sizeKB} KB)`);

  return features.map(f => f.properties.code);
}

// ── Step 2: Download and parse MHCLG spending CSV ────────────────
async function fetchSpending(boundaryCodes) {
  console.log("Fetching MHCLG Revenue Outturn CSV...");
  const csv = await fetchUrl(MHCLG_CSV);
  const lines = csv.split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/"/g, ""));

  const col = (name) => headers.indexOf(name);
  const YR = col("year_ending");
  const ONS = col("ONS_code");
  const NAME = col("LA_name");
  const EDU = col("RS_edu_net_exp");
  const TRANS = col("RS_trans_net_exp");
  const CSC = col("RS_csc_net_exp");
  const ASC = col("RS_asc_net_exp");
  const PHS = col("RS_phs_net_exp");
  const HOUS = col("RS_hous_net_exp");
  const CUL = col("RS_cul_net_exp");
  const ENV = col("RS_env_net_exp");
  const PLAN = col("RS_plan_net_exp");
  const POL = col("RS_pol_net_exp");
  const FRS = col("RS_frs_net_exp");
  const CEN = col("RS_cen_net_exp");
  const TOTSX = col("RS_totsx_net_exp");
  // Funding/revenue columns
  const GRANT_AEF = col("RS_grantinaef_net_exp");   // government grants (AEF, negative = income)
  const GRANT_POL = col("RS_grantpol_net_exp");      // police grant (negative)
  const CTR_TOT = col("RS_ctrtot_net_exp");           // council tax / mayoral precept (positive)
  const LEVY_ITA = col("RS_levyita_net_exp");         // transport levy (negative)
  const LEVY_WASTE = col("RS_levywaste_net_exp");     // waste levy (negative)
  const LEVY_OTHER = col("RS_levyother_net_exp");     // other levies (negative)
  const LEVY_CIL = col("RS_levycil_net_exp");         // CIL levy (negative)
  const INC_TMA = col("RS_inctma_net_exp");           // TMA earned income (negative)
  const INC_NONTMA = col("RS_incnontma_net_exp");     // non-TMA income (negative)
  const REV_TOT = col("RS_revenuetot_net_exp");       // total revenue

  // Valid combined authority / GLA codes
  const caSet = new Set(["E12000007"]);
  for (let i = 1; i <= 18; i++) caSet.add(`E4700000${i}`);
  for (let i = 10; i <= 18; i++) caSet.add(`E470000${i}`);

  const authorities = {};

  for (let r = 1; r < lines.length; r++) {
    if (!lines[r].trim()) continue;
    const vals = lines[r].split(",").map(v => v.replace(/"/g, ""));
    const ons = vals[ONS];
    if (!caSet.has(ons)) continue;

    const yearRaw = vals[YR];
    const endYear = parseInt(yearRaw.slice(0, 4));
    const yearLabel = `${endYear - 1}-${String(endYear).slice(2)}`;

    const num = (i) => { const v = parseFloat(vals[i]); return isNaN(v) ? 0 : v; };

    // Clean name: strip "The " prefix
    let name = vals[NAME].replace(/^The /, "");

    if (!authorities[ons]) {
      authorities[ons] = { code: ons, name, years: {} };
    }

    const services = {
      education: Math.round(num(EDU)),
      transport: Math.round(num(TRANS)),
      childrenSocialCare: Math.round(num(CSC)),
      adultSocialCare: Math.round(num(ASC)),
      publicHealth: Math.round(num(PHS)),
      housing: Math.round(num(HOUS)),
      cultural: Math.round(num(CUL)),
      environment: Math.round(num(ENV)),
      planning: Math.round(num(PLAN)),
      police: Math.round(num(POL)),
      fire: Math.round(num(FRS)),
      central: Math.round(num(CEN)),
    };
    let total = Math.round(num(TOTSX));
    if (total === 0) {
      const sum = Object.values(services).reduce((s, v) => s + v, 0);
      if (sum > 0) total = sum;
    }
    // Funding sources (negative values = income, convert to positive)
    const funding = {
      govGrants: Math.round(Math.abs(num(GRANT_AEF)) + Math.abs(num(GRANT_POL))),
      councilTax: Math.round(num(CTR_TOT)),
      levies: Math.round(Math.abs(num(LEVY_ITA)) + Math.abs(num(LEVY_WASTE)) + Math.abs(num(LEVY_OTHER)) + Math.abs(num(LEVY_CIL))),
      earnedIncome: Math.round(Math.abs(num(INC_TMA)) + Math.abs(num(INC_NONTMA))),
      totalRevenue: Math.round(num(REV_TOT)),
    };
    authorities[ons].years[yearLabel] = { ...services, totalService: total, ...funding };
  }

  console.log(`  Parsed ${Object.keys(authorities).length} combined/mayoral authorities`);

  // Chain North East time series: E47000005 → E47000010 → E47000014
  const neSuccessor = authorities[NE_CHAIN.successor] || { code: NE_CHAIN.successor, name: "North East Mayoral Combined Authority", years: {} };
  for (const predCode of NE_CHAIN.predecessors) {
    const pred = authorities[predCode];
    if (!pred) continue;
    for (const [yr, data] of Object.entries(pred.years)) {
      if (!neSuccessor.years[yr]) {
        neSuccessor.years[yr] = { ...data };
      }
    }
    delete authorities[predCode];
    console.log(`  Chained ${predCode} → ${NE_CHAIN.successor} (${Object.keys(pred.years).length} years)`);
  }
  authorities[NE_CHAIN.successor] = neSuccessor;

  // Also remove E47000011 (North of Tyne) — merged into North East MCA, had £0 spending
  delete authorities["E47000011"];

  // Attach population
  for (const auth of Object.values(authorities)) {
    if (CA_POPULATIONS[auth.code]) auth.population = CA_POPULATIONS[auth.code];
  }

  // Filter to only authorities with boundary data
  const withBoundaries = {};
  let noBoundary = 0;
  for (const [code, auth] of Object.entries(authorities)) {
    if (boundaryCodes.includes(code)) {
      withBoundaries[code] = auth;
    } else {
      noBoundary++;
      console.log(`  No boundary for ${code} ${auth.name} — excluding`);
    }
  }

  console.log(`  Final authorities: ${Object.keys(withBoundaries).length} (${noBoundary} excluded, no boundary)`);

  // Build sob-dataset-v1 output
  const authList = Object.values(withBoundaries);
  const latestYear = "2024-25";
  const latestAuths = authList.filter(a => a.years[latestYear]);
  const totalSpend = latestAuths.reduce((s, a) => s + (a.years[latestYear]?.totalService || 0), 0);

  const sorted = latestAuths
    .map(a => ({ name: a.name, code: a.code, total: a.years[latestYear]?.totalService || 0 }))
    .sort((a, b) => b.total - a.total);

  const dataset = {
    $schema: "sob-dataset-v1",
    id: "mayoral-spending",
    pillar: "spending",
    topic: "local-government",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "mhclg-ro",
        name: "MHCLG Revenue Outturn Time Series",
        url: "https://www.gov.uk/government/collections/local-authority-revenue-expenditure-and-financing",
        publisher: "MHCLG",
        note: "Combined authority and GLA net current expenditure by service, £ thousands, 2017-18 to 2024-25",
      },
      {
        id: "ons-mye",
        name: "ONS Mid-Year Population Estimates",
        url: "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates",
        publisher: "ONS",
        note: "Mid-2024 estimates, summed across constituent local authorities",
      },
    ],
    snapshot: {
      latestYear,
      authorityCount: latestAuths.length,
      totalSpendM: Math.round(totalSpend / 1000),
      largestSpender: sorted[0]?.name,
      largestSpendM: Math.round((sorted[0]?.total || 0) / 1000),
    },
    series: {
      authorities: {
        sourceId: "mhclg-ro",
        timeField: "code",
        note: "Per-authority net current expenditure by service, £ thousands. Includes combined/mayoral authorities and the Greater London Authority. The GLA figure includes Metropolitan Police, TfL, London Fire Brigade, and other functional bodies.",
        data: authList,
      },
    },
  };

  fs.writeFileSync(DATA_OUT, JSON.stringify(dataset, null, 2));
  const sizeKB = (Buffer.byteLength(JSON.stringify(dataset)) / 1024).toFixed(1);
  console.log(`  Wrote ${DATA_OUT} (${sizeKB} KB)`);
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const boundaryCodes = await fetchBoundaries();
  await delay(2000);
  await fetchSpending(boundaryCodes);
  console.log(`\nDone. Boundary codes: ${boundaryCodes.length} | Spending file written.`);
}

main().catch(err => { console.error(err); process.exit(1); });
