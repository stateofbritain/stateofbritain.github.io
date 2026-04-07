#!/usr/bin/env node
/**
 * fetch-local-gov-map.js
 *
 * Downloads:
 *  1. CTYUA (Counties & Unitary Authorities) boundaries from ONS Open Geography Portal
 *  2. MHCLG Revenue Outturn time series CSV for per-authority spending
 *
 * Outputs:
 *  - public/data/geo/ctyua.topo.json — boundary TopoJSON for choropleth map
 *  - public/data/local-gov-spending.json — per-authority spending data (sob-dataset-v1)
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

const GEO_OUT = path.join(__dirname, "..", "public", "data", "geo", "ctyua.topo.json");
const DATA_OUT = path.join(__dirname, "..", "public", "data", "local-gov-spending.json");

// ONS Open Geography Portal — CTYUA Dec 2024, Ultra Generalised Clipped (BUC)
const CTYUA_BASE = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Counties_and_Unitary_Authorities_December_2024_Boundaries_UK_BUC/FeatureServer/0/query";

// MHCLG Revenue Outturn time series CSV
const MHCLG_CSV = "https://assets.publishing.service.gov.uk/media/6937fe05e447374889cd8f4b/Revenue_Outturn_time_series_data_v3.1.csv";

// ONS Mid-Year Population Estimates (mid-2024, 2023 local authority boundaries)
const ONS_MYE = "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/estimatesofthepopulationforenglandandwales/mid20242023localauthorityboundaries/mye24tablesew.xlsx";

// NRS Mid-Year Population Estimates (Scotland, mid-2024)
const NRS_MYE = "https://www.nrscotland.gov.uk/media/txvdnee4/data-mid-year-population-estimates-2024.xlsx";

// Scottish Government Local Government Finance Statistics — per-council net revenue expenditure
const SCOT_XLSX = {
  "2018-19": "https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2020/02/scottish-local-government-finance-statistics-slgfs-2018-19/documents/slgfs-2018-19---la-level---3--revenue-expenditure-and-income-by-service-and-type/slgfs-2018-19---la-level---3--revenue-expenditure-and-income-by-service-and-type/govscot%3Adocument/SLGFS%2B2018-19%2B-%2BLA%2BLevel%2B-%2B3.%2BRevenue%2BExpenditure%2Band%2BIncome%2Bby%2BService%2Band%2BType.xlsx",
  "2019-20": "https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2021/04/scottish-local-government-finance-statistics-slgfs-2019-20/documents/slgfs-2019-20-la-level-3-revenue-expenditure-income-service-type/slgfs-2019-20-la-level-3-revenue-expenditure-income-service-type/govscot%3Adocument/slgfs-2019-20-la-level-3-revenue-expenditure-income-service-type.xlsx",
  "2020-21": "https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2022/03/scottish-local-government-finance-statistics-slgfs-2020-21/documents/scottish-local-government-finance-statistics-slgfs-2020-21-la-level-revenue-expenditure-income-service-type/scottish-local-government-finance-statistics-slgfs-2020-21-la-level-revenue-expenditure-income-service-type/govscot%3Adocument/scottish-local-government-finance-statistics-slgfs-2020-21-la-level-revenue-expenditure-income-service-type.xlsx",
  "2021-22": "https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2023/02/scottish-local-government-finance-statistics-2021-22/documents/copy-scottish-local-government-finance-statistics-slgfs-2021-22-la-level-revenue-expenditure-income-service-type/copy-scottish-local-government-finance-statistics-slgfs-2021-22-la-level-revenue-expenditure-income-service-type/govscot%3Adocument/copy-scottish-local-government-finance-statistics-slgfs-2021-22-la-level-revenue-expenditure-income-service-type.xlsx",
  "2022-23": "https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2024/03/scottish-local-government-finance-statistics-2022-23/documents/la-level-net-revenue-expenditure-income-service-type/la-level-net-revenue-expenditure-income-service-type/govscot%3Adocument/la-level-net-revenue-expenditure-income-service-type.xlsx",
  "2023-24": "https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2025/02/scottish-local-government-finance-statistics-2023-24/documents/la-level---net-revenue-expenditure-and-income-by-service-and-type/la-level---net-revenue-expenditure-and-income-by-service-and-type/govscot%3Adocument/Scottish%2BLocal%2BGovernment%2BFinance%2BStatistics%2B%2528SLGFS%2529%2B2023-24%2B-%2BLA%2BLevel%2B-%2BNet%2BRevenue%2BExpenditure%2Band%2BIncome%2Bby%2BService%2Band%2BType.xlsx",
  "2024-25": "https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2026/02/scottish-local-government-finance-statistics-2024-25/documents/la-level---net-revenue-expenditure-and-income-by-service-and-type/la-level---net-revenue-expenditure-and-income-by-service-and-type/govscot%3Adocument/Scottish%2BLocal%2BGovernment%2BFinance%2BStatistics%2B%2528SLGFS%2529%2B2024-25%2B-%2BLA%2BLevel%2B-%2BNet%2BRevenue%2BExpenditure%2Band%2BIncome%2Bby%2BService%2Band%2BType%2B-%2B2026-01-09.xlsx",
};

// StatsWales — per-authority revenue outturn by service (CSV via OData)
const WALES_CSV = "https://stats.gov.wales/en-GB/213aeb99-18eb-42c9-b00e-e4b716e82cdf/download/m9s41tutbasp?format=csv&download_language=en-GB&pivot=false";

// Scottish council name → ONS code mapping
const SCOT_CODES = {
  "Aberdeen City": "S12000033", "Aberdeenshire": "S12000034", "Angus": "S12000041",
  "Argyll & Bute": "S12000035", "City of Edinburgh": "S12000036", "Clackmannanshire": "S12000005",
  "Dumfries & Galloway": "S12000006", "Dundee City": "S12000042", "East Ayrshire": "S12000008",
  "East Dunbartonshire": "S12000045", "East Lothian": "S12000010", "East Renfrewshire": "S12000011",
  "Falkirk": "S12000014", "Fife": "S12000047", "Glasgow City": "S12000049",
  "Highland": "S12000017", "Inverclyde": "S12000018", "Midlothian": "S12000019",
  "Moray": "S12000020", "Na h-Eileanan Siar": "S12000013", "North Ayrshire": "S12000021",
  "North Lanarkshire": "S12000050", "Orkney Islands": "S12000023", "Perth & Kinross": "S12000048",
  "Renfrewshire": "S12000038", "Scottish Borders": "S12000026", "Shetland Islands": "S12000027",
  "South Ayrshire": "S12000028", "South Lanarkshire": "S12000029", "Stirling": "S12000030",
  "West Dunbartonshire": "S12000039", "West Lothian": "S12000040",
};

function fetch(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, { headers: { "User-Agent": "StateOfBritain/1.0" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          get(res.headers.location);
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        res.on("error", reject);
      }).on("error", reject);
    };
    get(url);
  });
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, { headers: { "User-Agent": "StateOfBritain/1.0" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          get(res.headers.location);
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      }).on("error", reject);
    };
    get(url);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Step 1: Download CTYUA boundaries ─────────────────────────────
async function fetchBoundaries() {
  console.log("Fetching CTYUA boundaries from ONS...");
  const allFeatures = [];
  let offset = 0;
  const batchSize = 500;

  while (true) {
    const url = `${CTYUA_BASE}?where=1%3D1&outFields=CTYUA24CD,CTYUA24NM&outSR=4326&f=geojson&resultRecordCount=${batchSize}&resultOffset=${offset}`;
    const raw = await fetch(url);
    const geojson = JSON.parse(raw);
    if (!geojson.features || geojson.features.length === 0) break;
    allFeatures.push(...geojson.features);
    console.log(`  Fetched ${allFeatures.length} features...`);
    if (geojson.features.length < batchSize) break;
    offset += batchSize;
    await delay(2000);
  }

  console.log(`  Total features: ${allFeatures.length}`);

  // Simplify properties for all UK features
  const ukFeatures = allFeatures
    .map(f => ({
      type: "Feature",
      properties: {
        code: f.properties.CTYUA24CD,
        name: f.properties.CTYUA24NM,
      },
      geometry: f.geometry,
    }));

  console.log(`  UK features: ${ukFeatures.length}`);

  const geojson = { type: "FeatureCollection", features: ukFeatures };

  // Convert to TopoJSON and simplify
  let topo = topology({ authorities: geojson });
  topo = presimplify(topo);
  topo = simplify(topo, 0.0001);

  // Re-quantize for smaller file
  const simplified = feature(topo, topo.objects.authorities);
  topo = topology({ authorities: simplified }, 1e5);

  const json = JSON.stringify(topo);
  fs.mkdirSync(path.dirname(GEO_OUT), { recursive: true });
  fs.writeFileSync(GEO_OUT, json);
  const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log(`  Wrote ${GEO_OUT} (${sizeKB} KB)`);

  return ukFeatures.map(f => f.properties.code);
}

// ── Step 2: Download and parse MHCLG spending CSV ─────────────────
async function fetchSpending() {
  console.log("Fetching MHCLG Revenue Outturn CSV...");
  const csv = await fetch(MHCLG_CSV);
  const lines = csv.split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/"/g, ""));

  // Column indices
  const col = (name) => headers.indexOf(name);
  const YR = col("year_ending");
  const ONS = col("ONS_code");
  const NAME = col("LA_name");
  const CLASS = col("LA_class");
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
  const CTR = col("RS_ctrtot_net_exp");

  // Valid upper-tier authority classes
  const upperTier = new Set(["Unitary Authority", "Met District", "London", "Shire County"]);
  // Valid individual LA ONS prefixes
  const validPrefixes = ["E06", "E08", "E09", "E10"];

  const authorities = {};   // ONS code -> { name, class, years: { year: spending } }

  for (let r = 1; r < lines.length; r++) {
    if (!lines[r].trim()) continue;
    const vals = lines[r].split(",").map(v => v.replace(/"/g, ""));
    const ons = vals[ONS];
    const cls = vals[CLASS];

    // Skip summary rows (short codes like "E06") and non-upper-tier
    if (ons.length < 9) continue;
    if (!validPrefixes.some(p => ons.startsWith(p))) continue;
    if (!upperTier.has(cls) && cls !== "submitted") continue;

    const yearRaw = vals[YR]; // e.g. "202503" = year ending March 2025 = FY 2024-25
    const endYear = parseInt(yearRaw.slice(0, 4));
    const yearLabel = `${endYear - 1}-${String(endYear).slice(2)}`;

    const num = (i) => {
      const v = parseFloat(vals[i]);
      return isNaN(v) ? 0 : v;
    };

    if (!authorities[ons]) {
      authorities[ons] = {
        code: ons,
        name: vals[NAME].replace(/ (UA|CC|MBC|LB)$/, ""),
        class: cls,
        years: {},
      };
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
    // If RS total is 0 but component data exists, compute from parts
    if (total === 0) {
      const sum = Object.values(services).reduce((s, v) => s + v, 0);
      if (sum > 0) total = sum;
    }
    authorities[ons].years[yearLabel] = {
      ...services,
      totalService: total,
      councilTaxReq: Math.round(num(CTR)),
    };
  }

  console.log(`  Parsed ${Object.keys(authorities).length} English authorities`);

  // ── Fetch Scotland spending from Scottish Government Excel (multi-year) ──
  console.log("Fetching Scottish Government finance statistics...");
  const XLSX = (await import("xlsx")).default;
  const scotYears = Object.entries(SCOT_XLSX);
  for (const [scotYear, scotUrl] of scotYears) {
    console.log(`  Downloading Scotland ${scotYear}...`);
    await delay(2000);
    let scotBuf;
    try { scotBuf = await fetchBuffer(scotUrl); } catch (e) { console.log(`  WARNING: Failed to fetch ${scotYear}: ${e.message}`); continue; }
    const scotWb = XLSX.read(scotBuf);
    for (const [sheetName, code] of Object.entries(SCOT_CODES)) {
      // Try exact match first, then fuzzy match for name variations across years
      let sheet = scotWb.Sheets[sheetName];
      if (!sheet) {
        const alt = scotWb.SheetNames.find(s => s.replace(/&/g, "and").replace(/,/g, "").toLowerCase().includes(sheetName.replace(/&/g, "and").toLowerCase().slice(0, 10)));
        if (alt) sheet = scotWb.Sheets[alt];
      }
      if (!sheet) continue;
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      // Find "Net Revenue Expenditure" row (last data row, not the title)
      const nreIdx = rows.findIndex(r => String(r[0]).trim() === "Net Revenue Expenditure");
      if (nreIdx < 0) continue;
      const nre = rows[nreIdx];
      // Find service column indices from header row (format varies by year, some have \r\n in cells)
      const norm = (s) => String(s || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
      const hdrIdx = rows.findIndex(r => r && r.some(c => norm(c).includes("education")));
      const hdr = rows[hdrIdx] || [];
      const findCol = (term) => hdr.findIndex(h => norm(h).includes(term.toLowerCase()));
      const eduCol = findCol("Education");
      const culCol = findCol("Culture");
      const swCol = findCol("Social Work");
      const transCol = findCol("Roads");
      const envCol = findCol("Environmental");
      const planCol = findCol("Planning") !== -1 ? findCol("Planning") : findCol("Building");
      const cenCol = findCol("Central");
      const housCol = findCol("Housing");
      const n = (i) => { if (i < 0) return 0; const v = parseFloat(nre[i]); return isNaN(v) ? 0 : Math.round(v); };
      const services = {
        education: n(eduCol), cultural: n(culCol),
        adultSocialCare: n(swCol), childrenSocialCare: 0,
        transport: n(transCol), environment: n(envCol),
        planning: n(planCol), central: n(cenCol), housing: n(housCol),
        publicHealth: 0, police: 0, fire: 0,
      };
      const total = Object.values(services).reduce((s, v) => s + v, 0);
      if (!authorities[code]) {
        authorities[code] = { code, name: sheetName.replace(/ & /g, " and "), class: "Scottish Council", years: {} };
      }
      authorities[code].years[scotYear] = { ...services, totalService: total, councilTaxReq: 0 };
    }
  }
  const scotCount = Object.values(authorities).filter(a => a.code.startsWith("S12")).length;
  console.log(`  Parsed ${scotCount} Scottish councils across ${scotYears.length} years`);

  // ── Fetch Wales spending from StatsWales CSV ───────────────────
  console.log("Fetching StatsWales revenue outturn CSV...");
  await delay(2000);
  const walesCsv = await fetch(WALES_CSV);
  const walesLines = walesCsv.split("\n");
  // Service ref → our field mapping
  const walesServiceMap = {
    ED: "education", PSS: "adultSocialCare", NHRA: "housing",
    ENV: "environment", TRANS: "transport", LIBSPREC: "cultural",
    PLANDEV: "planning", COURT: "central", CBA: "central", OTH: "central",
  };
  // Simple CSV parser that handles quoted fields
  const parseCSVLine = (line) => {
    const fields = []; let field = ""; let inQuote = false;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') { inQuote = !inQuote; }
      else if (c === ',' && !inQuote) { fields.push(field); field = ""; }
      else { field += c; }
    }
    fields.push(field);
    return fields;
  };
  let walesCount = 0;
  for (let i = 1; i < walesLines.length; i++) {
    if (!walesLines[i].trim()) continue;
    const parts = parseCSVLine(walesLines[i]);
    const desc = parts[2];
    if (desc !== "£ thousand") continue;
    const authRef = parts[12];
    if (!authRef?.startsWith("W06")) continue;
    const svcRef = parts[8];
    if (svcRef === "GRE") continue;
    const field = walesServiceMap[svcRef];
    if (!field) continue;
    const year = parts[6];
    const val = Math.round(parseFloat(parts[0]) || 0);
    const authName = parts[11];
    if (!authorities[authRef]) {
      authorities[authRef] = { code: authRef, name: authName, class: "Welsh Council", years: {} };
      walesCount++;
    }
    if (!authorities[authRef].years[year]) {
      authorities[authRef].years[year] = {
        education: 0, transport: 0, childrenSocialCare: 0, adultSocialCare: 0,
        publicHealth: 0, housing: 0, cultural: 0, environment: 0, planning: 0,
        police: 0, fire: 0, central: 0, totalService: 0, councilTaxReq: 0,
      };
    }
    authorities[authRef].years[year][field] += val;
  }
  // Compute totalService for Welsh authorities
  for (const auth of Object.values(authorities)) {
    if (!auth.code.startsWith("W06")) continue;
    for (const [yr, data] of Object.entries(auth.years)) {
      const { totalService, councilTaxReq, ...services } = data;
      data.totalService = Object.values(services).reduce((s, v) => s + v, 0);
    }
  }
  console.log(`  Parsed ${walesCount} Welsh councils`);

  // ── Northern Ireland council spending (hardcoded from NI Audit Office 2025 report) ──
  // Source: Local Government Auditor's Report 2025, Appendix 3
  // Values in £ millions, real terms 2023-24 prices. NI councils have narrower
  // responsibilities than GB councils (no education, social care, housing, health, roads).
  // Categories mapped: waste→environment, recreation/sport+culture/heritage→cultural,
  // economic development+tourism→planning, community+environmental health→central
  console.log("Adding Northern Ireland council data (NI Audit Office)...");
  // NI Audit Office LGA Reports: per-council expenditure by service
  // 2021-22 to 2023-24: 13-category breakdown (real terms, 2023-24 prices, £m) from 2025 report
  // 2019-20, 2020-21: 6-category breakdown (nominal, £m) from 2023 report
  const NI_COUNCILS = [
    { code: "N09000001", name: "Antrim and Newtownabbey" },
    { code: "N09000002", name: "Armagh City, Banbridge and Craigavon" },
    { code: "N09000003", name: "Belfast" },
    { code: "N09000004", name: "Causeway Coast and Glens" },
    { code: "N09000005", name: "Derry City and Strabane" },
    { code: "N09000006", name: "Fermanagh and Omagh" },
    { code: "N09000007", name: "Lisburn and Castlereagh" },
    { code: "N09000008", name: "Mid and East Antrim" },
    { code: "N09000009", name: "Mid Ulster" },
    { code: "N09000010", name: "Newry, Mourne and Down" },
    { code: "N09000011", name: "Ards and North Down" },
  ];
  // 2025 report Appendix 3 (real terms 2023-24 prices, £m): waste=wasteColl+wasteDisp
  const NI_FULL = {
    "2021-22": [
      { waste: 18.9, cleaning: 3.2, recSport: 19.4, cultHeri: 4.1, econDev: 2.0, tourism: 0.8, community: 4.2, envHealth: 3.4, cemetery: 1.3, other: 19.6 },
      { waste: 22.6, cleaning: 2.4, recSport: 27.4, cultHeri: 3.2, econDev: 7.6, tourism: 4.2, community: 2.7, envHealth: 4.7, cemetery: 0.8, other: 48.2 },
      { waste: 44.6, cleaning: 18.3, recSport: 63.1, cultHeri: 21.7, econDev: 18.7, tourism: 9.8, community: 9.5, envHealth: 22.0, cemetery: 5.8, other: 74.2 },
      { waste: 17.4, cleaning: 5.0, recSport: 6.3, cultHeri: 1.8, econDev: 3.9, tourism: 5.6, community: 2.8, envHealth: 0.6, cemetery: 0.5, other: 26.9 },
      { waste: 17.2, cleaning: 5.1, recSport: 12.3, cultHeri: 4.6, econDev: 10.8, tourism: 3.3, community: 6.5, envHealth: 2.5, cemetery: 1.2, other: 38.7 },
      { waste: 13.4, cleaning: 3.0, recSport: 12.6, cultHeri: 3.1, econDev: 8.3, tourism: 2.4, community: 5.7, envHealth: 4.2, cemetery: 0.6, other: 20.8 },
      { waste: 14.3, cleaning: 2.7, recSport: 17.3, cultHeri: 2.5, econDev: 7.0, tourism: 1.1, community: 2.6, envHealth: 2.9, cemetery: 0.6, other: 37.8 },
      { waste: 15.6, cleaning: 2.2, recSport: 12.2, cultHeri: 2.1, econDev: 4.3, tourism: 3.8, community: 2.6, envHealth: 6.4, cemetery: 0.6, other: 39.8 },
      { waste: 19.6, cleaning: 5.0, recSport: 16.6, cultHeri: 3.7, econDev: 5.8, tourism: 4.0, community: 4.2, envHealth: 3.8, cemetery: 0.9, other: 9.8 },
      { waste: 23.3, cleaning: 5.1, recSport: 17.4, cultHeri: 3.2, econDev: 6.9, tourism: 4.6, community: 6.1, envHealth: 4.8, cemetery: 0.9, other: 27.1 },
      { waste: 16.3, cleaning: 2.1, recSport: 7.8, cultHeri: 1.2, econDev: 3.3, tourism: 2.5, community: 4.3, envHealth: 3.8, cemetery: 1.7, other: 40.4 },
    ],
    "2022-23": [
      { waste: 19.7, cleaning: 3.1, recSport: 22.2, cultHeri: 5.5, econDev: 2.9, tourism: 0.8, community: 4.8, envHealth: 3.7, cemetery: 1.0, other: 21.8 },
      { waste: 20.6, cleaning: 2.5, recSport: 28.2, cultHeri: 3.4, econDev: 4.9, tourism: 4.1, community: 2.9, envHealth: 4.7, cemetery: 0.7, other: 50.1 },
      { waste: 48.8, cleaning: 20.4, recSport: 59.0, cultHeri: 19.4, econDev: 20.0, tourism: 9.1, community: 10.2, envHealth: 22.3, cemetery: 6.4, other: 73.5 },
      { waste: 15.3, cleaning: 4.3, recSport: 8.0, cultHeri: 2.0, econDev: 2.4, tourism: 6.3, community: 2.6, envHealth: 0.7, cemetery: 0.4, other: 42.0 },
      { waste: 17.0, cleaning: 5.6, recSport: 14.0, cultHeri: 4.7, econDev: 10.2, tourism: 3.7, community: 6.9, envHealth: 2.7, cemetery: 1.3, other: 31.3 },
      { waste: 12.1, cleaning: 3.0, recSport: 13.9, cultHeri: 3.8, econDev: 9.8, tourism: 2.2, community: 1.4, envHealth: 4.1, cemetery: 0.6, other: 25.4 },
      { waste: 14.0, cleaning: 2.6, recSport: 19.7, cultHeri: 2.4, econDev: 4.0, tourism: 1.0, community: 2.5, envHealth: 2.8, cemetery: 0.5, other: 39.1 },
      { waste: 14.6, cleaning: 2.4, recSport: 9.1, cultHeri: 2.3, econDev: 4.8, tourism: 2.3, community: 3.2, envHealth: 6.0, cemetery: 0.6, other: 38.3 },
      { waste: 19.9, cleaning: 5.2, recSport: 17.5, cultHeri: 4.1, econDev: 3.3, tourism: 4.1, community: 6.5, envHealth: 4.9, cemetery: 0.6, other: 10.1 },
      { waste: 24.2, cleaning: 5.3, recSport: 21.5, cultHeri: 3.9, econDev: 3.3, tourism: 6.3, community: 3.6, envHealth: 4.9, cemetery: 1.0, other: 21.9 },
      { waste: 20.1, cleaning: 2.3, recSport: 11.0, cultHeri: 1.2, econDev: 3.8, tourism: 2.2, community: 4.4, envHealth: 4.4, cemetery: 1.8, other: 39.1 },
    ],
    "2023-24": [
      { waste: 22.7, cleaning: 3.1, recSport: 20.5, cultHeri: 5.3, econDev: 4.9, tourism: 1.6, community: 4.3, envHealth: 3.3, cemetery: 2.9, other: 22.1 },
      { waste: 21.9, cleaning: 2.2, recSport: 24.5, cultHeri: 3.2, econDev: 3.9, tourism: 4.0, community: 2.8, envHealth: 4.1, cemetery: 0.7, other: 53.5 },
      { waste: 47.1, cleaning: 18.8, recSport: 73.7, cultHeri: 20.6, econDev: 21.9, tourism: 11.4, community: 10.4, envHealth: 20.8, cemetery: 5.8, other: 57.4 },
      { waste: 12.1, cleaning: 5.4, recSport: 10.1, cultHeri: 1.4, econDev: 2.6, tourism: 7.0, community: 3.0, envHealth: 0.6, cemetery: 0.4, other: 40.1 },
      { waste: 17.3, cleaning: 5.2, recSport: 16.9, cultHeri: 4.4, econDev: 9.3, tourism: 2.7, community: 6.6, envHealth: 2.4, cemetery: 1.2, other: 33.6 },
      { waste: 13.1, cleaning: 2.6, recSport: 11.5, cultHeri: 3.1, econDev: 4.4, tourism: 1.8, community: 0, envHealth: 3.5, cemetery: 0.6, other: 22.2 },
      { waste: 15.2, cleaning: 3.0, recSport: 19.0, cultHeri: 2.6, econDev: 3.6, tourism: 1.1, community: 2.5, envHealth: 2.6, cemetery: 0.6, other: 33.7 },
      { waste: 16.0, cleaning: 2.5, recSport: 10.7, cultHeri: 2.3, econDev: 5.1, tourism: 3.9, community: 2.9, envHealth: 4.3, cemetery: 0.6, other: 38.8 },
      { waste: 19.9, cleaning: 4.9, recSport: 16.1, cultHeri: 3.7, econDev: 3.9, tourism: 3.7, community: 9.4, envHealth: 3.0, cemetery: 0.6, other: 10.1 },
      { waste: 26.0, cleaning: 5.4, recSport: 21.1, cultHeri: 3.5, econDev: 3.7, tourism: 6.2, community: 5.2, envHealth: 5.4, cemetery: 1.0, other: 14.2 },
      { waste: 18.9, cleaning: 2.0, recSport: 8.9, cultHeri: 1.2, econDev: 3.6, tourism: 1.8, community: 4.0, envHealth: 3.6, cemetery: 1.7, other: 35.5 },
    ],
  };
  // 2023 report Appendix 3 (nominal, £m) — only 6 categories, coarser breakdown
  const NI_COARSE = {
    "2019-20": [
      { econDev: 1.6, waste: 15.1, cleaning: 3.3, community: 2.5, tourism: 0.6, other: 23.9 },
      { econDev: 2.7, waste: 12.0, cleaning: 2.7, community: 1.7, tourism: 3.4, other: 50.1 },
      { econDev: 9.0, waste: 19.2, cleaning: 19.6, community: 6.7, tourism: 5.2, other: 102.0 },
      { econDev: 1.7, waste: 4.8, cleaning: 2.6, community: 1.6, tourism: 1.6, other: 40.3 },
      { econDev: 4.9, waste: 6.8, cleaning: 4.5, community: 2.7, tourism: 3.9, other: 35.9 },
      { econDev: 0.7, waste: 5.4, cleaning: 2.5, community: 1.1, tourism: 1.2, other: 26.4 },
      { econDev: 2.3, waste: 3.7, cleaning: 1.9, community: 1.7, tourism: 1.0, other: 41.0 },
      { econDev: 4.3, waste: 14.1, cleaning: 3.1, community: 3.2, tourism: 4.9, other: 22.2 },
      { econDev: 3.2, waste: 6.9, cleaning: 3.6, community: 2.5, tourism: 2.3, other: 25.1 },
      { econDev: 2.3, waste: 17.3, cleaning: 3.9, community: 3.9, tourism: 4.1, other: 30.4 },
      { econDev: 1.0, waste: 6.5, cleaning: 1.9, community: 1.4, tourism: 2.2, other: 35.9 },
    ],
    "2020-21": [
      { econDev: -0.3, waste: 14.1, cleaning: 2.8, community: 2.1, tourism: 0.5, other: 16.8 },
      { econDev: 2.4, waste: 11.8, cleaning: 2.3, community: 1.5, tourism: 1.9, other: 52.6 },
      { econDev: 8.9, waste: 19.0, cleaning: 16.6, community: 7.0, tourism: 4.0, other: 89.1 },
      { econDev: 1.1, waste: 3.8, cleaning: 2.3, community: 1.0, tourism: 0.8, other: 36.3 },
      { econDev: 5.5, waste: 7.1, cleaning: 4.1, community: 2.1, tourism: 2.8, other: 34.1 },
      { econDev: 1.0, waste: 5.5, cleaning: 2.4, community: 0.9, tourism: 0.9, other: 24.3 },
      { econDev: 2.0, waste: 4.4, cleaning: 2.4, community: 1.9, tourism: 0.8, other: 32.8 },
      { econDev: 3.9, waste: 15.9, cleaning: 3.2, community: 3.3, tourism: 4.5, other: 17.7 },
      { econDev: 3.0, waste: 7.6, cleaning: 3.8, community: 2.1, tourism: 2.2, other: 13.3 },
      { econDev: 4.5, waste: 16.7, cleaning: 3.7, community: 3.4, tourism: 2.6, other: 25.2 },
      { econDev: 0.9, waste: 6.7, cleaning: 1.3, community: 0.8, tourism: 1.3, other: 32.9 },
    ],
  };

  const toK = (v) => Math.round((v || 0) * 1000);
  const buildNIYear = (d) => ({
    education: 0, transport: 0, childrenSocialCare: 0, adultSocialCare: 0,
    publicHealth: 0, housing: 0,
    cultural: toK((d.recSport || 0) + (d.cultHeri || 0)),
    environment: toK((d.waste || 0) + (d.cleaning || 0)),
    planning: toK((d.econDev || 0) + (d.tourism || 0)),
    central: toK((d.community || 0) + (d.envHealth || 0) + (d.cemetery || 0) + (d.other || 0)),
    police: 0, fire: 0,
    totalService: toK(Object.values(d).reduce((s, v) => s + (v || 0), 0)),
    councilTaxReq: 0,
  });

  for (let i = 0; i < NI_COUNCILS.length; i++) {
    const { code, name } = NI_COUNCILS[i];
    authorities[code] = { code, name, class: "NI Council", years: {} };
    for (const [yr, arr] of Object.entries(NI_FULL)) {
      authorities[code].years[yr] = buildNIYear(arr[i]);
    }
    for (const [yr, arr] of Object.entries(NI_COARSE)) {
      authorities[code].years[yr] = buildNIYear(arr[i]);
    }
  }
  // NI population (NISRA mid-2024)
  const NI_POP = {
    N09000001: 148100, N09000002: 222511, N09000003: 352390, N09000004: 141954,
    N09000005: 152383, N09000006: 117687, N09000007: 151669, N09000008: 139913,
    N09000009: 152718, N09000010: 183115, N09000011: 165415,
  };
  for (const ni of NI_COUNCILS) {
    if (NI_POP[ni.code]) authorities[ni.code].population = NI_POP[ni.code];
  }
  console.log(`  Added ${NI_COUNCILS.length} NI councils (2019-20 to 2023-24)`);
  console.log(`  Total authorities: ${Object.keys(authorities).length}`);

  // ── Fetch population from ONS Mid-Year Estimates Excel ──────────
  console.log("Fetching ONS mid-2024 population estimates...");
  await delay(2000);
  const popXlsx = await fetchBuffer(ONS_MYE);
  const wb = XLSX.read(popXlsx);
  const sheet = wb.Sheets["MYE2 - Persons"];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headerIdx = rows.findIndex(r => r[0] === "Code");
  const popByCode = {};
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const code = String(rows[i][0] || "");
    const pop = rows[i][3]; // "All ages" column
    if ((code.startsWith("E") || code.startsWith("W")) && typeof pop === "number") popByCode[code] = pop;
  }
  console.log(`  ONS E&W population records: ${Object.keys(popByCode).length}`);

  // Fetch Scotland population from NRS
  console.log("Fetching NRS mid-2024 population estimates (Scotland)...");
  await delay(2000);
  const nrsXlsx = await fetchBuffer(NRS_MYE);
  const nrsWb = XLSX.read(nrsXlsx);
  const nrsSheet = nrsWb.Sheets["Table 1"] || nrsWb.Sheets[nrsWb.SheetNames.find(s => s.includes("Table 1"))];
  if (nrsSheet) {
    const nrsRows = XLSX.utils.sheet_to_json(nrsSheet, { header: 1 });
    // Find header row with "Area code"
    const nrsHdr = nrsRows.findIndex(r => r.some(c => String(c).includes("Area code") || String(c).includes("area code")));
    if (nrsHdr >= 0) {
      const codeCol = nrsRows[nrsHdr].findIndex(c => String(c).toLowerCase().includes("area code"));
      const allAgesCol = nrsRows[nrsHdr].findIndex(c => String(c).toLowerCase().includes("all ages") || c === "All Ages");
      for (let i = nrsHdr + 1; i < nrsRows.length; i++) {
        const code = String(nrsRows[i]?.[codeCol] || "");
        const pop = nrsRows[i]?.[allAgesCol];
        if (code.startsWith("S12") && typeof pop === "number") popByCode[code] = pop;
      }
    }
  }
  console.log(`  Total population records (E+W+S): ${Object.keys(popByCode).length}`);

  // Attach population to each authority
  let popMatched = 0;
  for (const auth of Object.values(authorities)) {
    if (popByCode[auth.code]) {
      auth.population = popByCode[auth.code];
      popMatched++;
    }
  }
  console.log(`  Population matched: ${popMatched} / ${Object.keys(authorities).length}`);

  // ── Fill time series gaps from predecessor county councils ─────────
  // English local government reorganisations created new unitary authorities
  // that only have data from their creation year. We backfill using predecessor
  // county council data, split by population where a county became multiple UAs.
  console.log("Filling time series gaps from predecessor councils...");

  const splitByPop = (predCode, successors) => {
    const pred = authorities[predCode];
    if (!pred) return;
    const totalPop = successors.reduce((s, sc) => s + (authorities[sc.code]?.population || 0), 0);
    if (totalPop === 0) return;
    const shares = successors.map(sc => ({
      code: sc.code,
      share: (authorities[sc.code]?.population || 0) / totalPop,
    }));
    for (const [yr, data] of Object.entries(pred.years)) {
      for (const { code, share } of shares) {
        if (!authorities[code]) continue;
        if (authorities[code].years[yr]) continue; // don't overwrite real data
        const split = {};
        for (const [k, v] of Object.entries(data)) {
          split[k] = Math.round(v * share);
        }
        authorities[code].years[yr] = split;
      }
    }
    console.log(`  ${pred.name} → ${successors.map(s => s.code).join(" + ")} (${Object.keys(pred.years).length} years)`);
  };

  const copyDirect = (predCode, successorCode) => {
    const pred = authorities[predCode];
    const succ = authorities[successorCode];
    if (!pred || !succ) return;
    for (const [yr, data] of Object.entries(pred.years)) {
      if (succ.years[yr]) continue;
      succ.years[yr] = { ...data };
    }
    console.log(`  ${pred.name} → ${successorCode} (${Object.keys(pred.years).length} years, 1:1)`);
  };

  // April 2023: Cumbria → Cumberland + Westmorland and Furness
  splitByPop("E10000006", [{ code: "E06000063" }, { code: "E06000064" }]);
  // April 2023: North Yorkshire CC → North Yorkshire UA (1:1)
  copyDirect("E10000023", "E06000065");
  // April 2023: Somerset CC → Somerset UA (1:1)
  copyDirect("E10000027", "E06000066");
  // April 2021: Northamptonshire → North + West Northamptonshire
  splitByPop("E10000021", [{ code: "E06000061" }, { code: "E06000062" }]);
  // April 2020: Buckinghamshire CC → Buckinghamshire UA (1:1)
  copyDirect("E10000002", "E06000060");
  // April 2019: Dorset CC → Dorset UA (approximate 1:1, excludes Christchurch)
  copyDirect("E10000009", "E06000059");
  // April 2019: BCP — sum old Bournemouth + Poole UAs for pre-2019 years
  const bournAuth = authorities["E06000028"];
  const pooleAuth = authorities["E06000029"];
  const bcpAuth = authorities["E06000058"];
  if (bournAuth && pooleAuth && bcpAuth) {
    for (const yr of Object.keys(bournAuth.years)) {
      if (bcpAuth.years[yr]) continue;
      const merged = {};
      const bData = bournAuth.years[yr];
      const pData = pooleAuth.years[yr] || {};
      for (const k of Object.keys(bData)) {
        merged[k] = (bData[k] || 0) + (pData[k] || 0);
      }
      bcpAuth.years[yr] = merged;
    }
    console.log(`  Bournemouth + Poole → E06000058 BCP (${Object.keys(bournAuth.years).length} years, summed)`);
  }

  // Remove predecessor county councils that no longer have map boundaries
  const predecessorCodes = ["E10000006", "E10000023", "E10000027", "E10000021", "E10000002", "E10000009", "E06000028", "E06000029"];
  for (const code of predecessorCodes) {
    if (authorities[code]) {
      delete authorities[code];
    }
  }
  console.log(`  Removed ${predecessorCodes.length} predecessor authorities (no map boundaries)`);
  console.log(`  Final authority count: ${Object.keys(authorities).length}`);

  // Build sob-dataset-v1 output
  const dataset = {
    $schema: "sob-dataset-v1",
    id: "local-gov-spending",
    pillar: "state",
    topic: "local-government",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "mhclg-ro",
        name: "MHCLG Revenue Outturn Time Series",
        url: "https://www.gov.uk/government/collections/local-authority-revenue-expenditure-and-financing",
        publisher: "MHCLG",
        note: "England: Revenue Outturn multi-year dataset v3.1, values in £ thousands"
      },
      {
        id: "scot-lgfs",
        name: "Scottish Local Government Finance Statistics",
        url: "https://www.gov.scot/collections/local-government-finance-statistics/",
        publisher: "Scottish Government",
        note: "Scotland: Net revenue expenditure by service and council, 2023-24, £ thousands"
      },
      {
        id: "wales-ro",
        name: "StatsWales Revenue Outturn",
        url: "https://statswales.gov.wales/Catalogue/Local-Government/Finance/Revenue/Revenue-Outturn",
        publisher: "Welsh Government",
        note: "Wales: Revenue outturn expenditure by authority and service, £ thousands"
      },
      {
        id: "ons-mye",
        name: "ONS Mid-Year Population Estimates",
        url: "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates",
        publisher: "ONS",
        note: "Mid-2024 estimates, England and Wales"
      },
      {
        id: "nrs-mye",
        name: "NRS Mid-Year Population Estimates",
        url: "https://www.nrscotland.gov.uk/publications/mid-2024-population-estimates/",
        publisher: "National Records of Scotland",
        note: "Mid-2024 estimates, Scotland"
      },
      {
        id: "ni-lga",
        name: "NI Local Government Auditor's Report 2025",
        url: "https://www.niauditoffice.gov.uk/publications/local-government-auditors-report-2025",
        publisher: "NI Audit Office",
        note: "Northern Ireland: per-council expenditure by service, 2023-24, £ millions real terms. NI councils have narrower service responsibilities than GB (no education, social care, housing, health, roads)."
      },
      {
        id: "nisra-mye",
        name: "NISRA Mid-Year Population Estimates",
        url: "https://www.nisra.gov.uk/statistics/population/mid-year-population-estimates",
        publisher: "NISRA",
        note: "Mid-2024 estimates, Northern Ireland"
      }
    ],
    snapshot: {},
    series: {
      authorities: {
        sourceId: "mhclg-ro",
        timeField: "code",
        note: "Per-authority net current expenditure by service, £ thousands. England: upper-tier authorities (county councils, unitary authorities, metropolitan districts, London boroughs). Scotland: 32 councils. Wales: 22 unitary authorities. Northern Ireland: 11 councils (narrower service responsibilities, no education/social care/housing/health/roads).",
        data: Object.values(authorities),
      }
    }
  };

  // Compute snapshot: latest year summary
  const latestYear = "2024-25";
  const latestAuthorities = Object.values(authorities).filter(a => a.years[latestYear]);
  const totalSpend = latestAuthorities.reduce((s, a) => s + (a.years[latestYear]?.totalService || 0), 0);
  const avgSpend = Math.round(totalSpend / latestAuthorities.length);

  // Find highest and lowest spending authorities
  const sorted = latestAuthorities
    .map(a => ({ name: a.name, code: a.code, total: a.years[latestYear]?.totalService || 0 }))
    .sort((a, b) => b.total - a.total);

  dataset.snapshot = {
    latestYear,
    authorityCount: latestAuthorities.length,
    totalSpendM: Math.round(totalSpend / 1000), // £ millions
    avgSpendM: Math.round(avgSpend / 1000),
    highestSpender: sorted[0]?.name,
    highestSpendM: Math.round((sorted[0]?.total || 0) / 1000),
    lowestSpender: sorted[sorted.length - 1]?.name,
    lowestSpendM: Math.round((sorted[sorted.length - 1]?.total || 0) / 1000),
  };

  fs.writeFileSync(DATA_OUT, JSON.stringify(dataset, null, 2));
  const sizeKB = (Buffer.byteLength(JSON.stringify(dataset)) / 1024).toFixed(1);
  console.log(`  Wrote ${DATA_OUT} (${sizeKB} KB)`);

  return dataset;
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const codes = await fetchBoundaries();
  await delay(2000);
  const data = await fetchSpending();
  console.log("\nDone. Boundary codes:", codes.length, "| Spending authorities:", Object.keys(data.series.authorities.data).length);
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
