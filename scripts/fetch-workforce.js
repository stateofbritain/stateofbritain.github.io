/**
 * fetch-workforce.js
 *
 * Downloads and parses workforce composition data for the Productive Quotient page:
 *
 *  1. NHS Digital HCHS Workforce Statistics (XLSX)
 *     - Table 1: Staff by group, monthly time series, Sep 2009 - Dec 2025
 *     - Clinical = Professionally qualified + Support to clinical
 *     - Non-clinical = NHS infrastructure support
 *
 *  2. DfE School Workforce Census (CSV via ZIP)
 *     - National totals: teachers vs support staff, 2011/12 - 2024/25
 *
 *  3. Home Office Police Workforce Open Data (ODS)
 *     - Officers vs police staff vs PCSOs, 2007-2025
 *
 *  4. HESA Staff Statistics (curated from published bulletins — data behind paywall)
 *     - Academic vs professional/support staff, 2014/15 - 2022/23
 *
 * Outputs: public/data/workforce.json
 */
import { writeFileSync } from "fs";
import { Buffer } from "buffer";
import https from "https";
import http from "http";
import { execSync } from "child_process";
import XLSX from "xlsx";

const NHS_URL =
  "https://files.digital.nhs.uk/C0/81A655/NHS%20HCHS%20Workforce%20Statistics%2C%20Trusts%20and%20core%20organisations%20-%20data%20tables%2C%20December%202025.xlsx";

const DFE_URL =
  "https://content.explore-education-statistics.service.gov.uk/api/releases/ba5318f9-2f18-4ef5-8c71-a4db8546758c/files?fromPage=ReleaseDownloads";

const POLICE_URL =
  "https://assets.publishing.service.gov.uk/media/697255b5a1311bdcfa0ed8f3/open-data-table-police-workforce-280126.ods";

function download(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      const parsed = new URL(u);
      const mod = parsed.protocol === "http:" ? http : https;
      mod.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: { "User-Agent": "StateOfBritain/1.0 (data fetch script)" },
        },
        (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            res.resume();
            return get(res.headers.location);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} from ${u}`));
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
          res.on("error", reject);
        }
      );
    };
    get(url);
  });
}

function xlDate(serial) {
  const d = new Date((serial - 25569) * 86400000);
  return d.toISOString().slice(0, 7);
}

// ── NHS ──────────────────────────────────────────────────────────
function parseNHS(buf) {
  const wb = XLSX.read(buf);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["1"], { header: 1 });
  const hdr = rows[4];

  // Find last date column
  let lastDateCol = 3;
  for (let c = 3; c < hdr.length; c++) {
    if (typeof hdr[c] === "number" && hdr[c] > 30000 && hdr[c] < 50000) {
      lastDateCol = c;
    }
  }

  // Key rows (0-indexed from row 5):
  // Row 5:  FTE All staff groups
  // Row 6:  FTE Professionally qualified clinical
  // Row 22: FTE Support to clinical staff
  // Row 26: FTE NHS infrastructure support
  const series = [];
  for (let c = 3; c <= lastDateCol; c++) {
    if (typeof hdr[c] !== "number" || hdr[c] < 30000) continue;
    const dateStr = xlDate(hdr[c]);
    const month = parseInt(dateStr.slice(5, 7));
    if (month !== 12 && month !== 3) continue; // Dec or March snapshots
    if (month !== 12) continue; // Use December for annual

    const year = parseInt(dateStr.slice(0, 4));
    const total = rows[5][c];
    const qualClin = rows[6][c];
    const supportClin = rows[22][c];
    const infra = rows[26][c];
    if (typeof total !== "number") continue;

    const clinical = qualClin + supportClin;
    series.push({
      year,
      total: Math.round(total),
      frontline: Math.round(clinical),
      backOffice: Math.round(infra),
      frontlinePct: +(clinical / total * 100).toFixed(1),
    });
  }
  return series;
}

// ── DfE ──────────────────────────────────────────────────────────
function parseDfE(csvText) {
  const lines = csvText.split("\n");
  const header = lines[0].split(",");
  const colIdx = (name) => header.indexOf(name);

  const series = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols[colIdx("geographic_level")] !== "National") continue;
    if (cols[colIdx("school_type")] !== "Total state-funded schools") continue;

    const yearStr = cols[colIdx("time_period")]; // e.g. "202425"
    const endYear = parseInt(yearStr.slice(0, 4)) + 1; // academic year ending

    const teachers = parseFloat(cols[colIdx("fte_all_teachers")]);
    const support = parseFloat(cols[colIdx("fte_all_support_staff")]);
    const total = parseFloat(cols[colIdx("fte_workforce")]);
    const ta = parseFloat(cols[colIdx("fte_teaching_assistants")]);
    const admin = parseFloat(cols[colIdx("fte_administrative_staff")]);

    if (isNaN(total) || total === 0) continue;

    // "Frontline" in education = teachers + teaching assistants
    // "Back office" = admin + auxiliary + other non-teaching support
    const frontline = teachers + ta;
    series.push({
      year: endYear,
      total: Math.round(total),
      teachers: Math.round(teachers),
      teachingAssistants: Math.round(ta),
      frontline: Math.round(frontline),
      backOffice: Math.round(total - frontline),
      frontlinePct: +(frontline / total * 100).toFixed(1),
    });
  }
  return series.sort((a, b) => a.year - b.year);
}

// ── Police ───────────────────────────────────────────────────────
function parsePolice(buf) {
  const wb = XLSX.read(buf);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["Data"], { header: 1 });

  // Aggregate by year and worker type
  const agg = {};
  for (let i = 1; i < rows.length; i++) {
    const year = rows[i][0];
    const wtype = rows[i][6]; // Worker type
    const fte = rows[i][8]; // Total FTE
    if (!year || !wtype || typeof fte !== "number") continue;
    if (!agg[year]) agg[year] = {};
    if (!agg[year][wtype]) agg[year][wtype] = 0;
    agg[year][wtype] += fte;
  }

  const series = [];
  for (const year of Object.keys(agg).sort()) {
    const d = agg[year];
    const officers = d["Police Officer"] || 0;
    const pcso = d["Police Community Support Officer"] || 0;
    const staff = d["Police Staff"] || 0;
    const desig = d["Designated Officer"] || 0;
    const total = officers + staff + pcso + desig;

    // "Frontline" = officers + PCSOs (operational policing)
    const frontline = officers + pcso;
    series.push({
      year: parseInt(year),
      total: Math.round(total),
      officers: Math.round(officers),
      pcso: Math.round(pcso),
      frontline: Math.round(frontline),
      backOffice: Math.round(staff + desig),
      frontlinePct: +(frontline / total * 100).toFixed(1),
    });
  }
  return series;
}

// ── HESA (curated) ───────────────────────────────────────────────
// Source: HESA Statistical Bulletins SB261, SB265 and earlier
// Academic = teaching-only + research-only + teaching & research
// Professional = management, professional, technical, clerical, manual
// UK HE providers
const HESA = [
  { year: 2015, academic: 198970, professional: 209150, total: 408120 },
  { year: 2016, academic: 201380, professional: 213215, total: 414595 },
  { year: 2017, academic: 210175, professional: 218020, total: 428195 },
  { year: 2018, academic: 212815, professional: 222670, total: 435485 },
  { year: 2019, academic: 217065, professional: 227535, total: 444600 },
  { year: 2020, academic: 222835, professional: 230470, total: 453305 },
  { year: 2021, academic: 225570, professional: 229660, total: 455230 },
  { year: 2022, academic: 229980, professional: 235005, total: 464985 },
  { year: 2023, academic: 231500, professional: 240485, total: 471985 },
].map((d) => ({
  ...d,
  frontline: d.academic,
  backOffice: d.professional,
  frontlinePct: +(d.academic / d.total * 100).toFixed(1),
}));

async function main() {
  console.log("Downloading NHS HCHS Workforce Statistics...");
  const nhsBuf = await download(NHS_URL);
  const nhs = parseNHS(nhsBuf);
  console.log(`  → ${nhs.length} years of NHS data`);

  console.log("\nDownloading DfE School Workforce Census...");
  const dfeBuf = await download(DFE_URL);
  // Write zip, extract CSV
  const tmpZip = "/tmp/_dfe_wf.zip";
  writeFileSync(tmpZip, dfeBuf);
  execSync(`cd /tmp && unzip -o ${tmpZip} data/workforce_2010_2024_fte_hc_nat_reg_la.csv`, {
    stdio: "pipe",
  });
  const { readFileSync } = await import("fs");
  const dfeCsv = readFileSync("/tmp/data/workforce_2010_2024_fte_hc_nat_reg_la.csv", "utf8");
  const education = parseDfE(dfeCsv);
  console.log(`  → ${education.length} years of education data`);

  console.log("\nDownloading Police Workforce Open Data...");
  const policeBuf = await download(POLICE_URL);
  const police = parsePolice(policeBuf);
  console.log(`  → ${police.length} years of police data`);

  console.log(`\nHESA data: ${HESA.length} years (curated)`);

  const output = {
    meta: {
      sources: [
        {
          name: "NHS Digital HCHS Workforce Statistics, December 2025",
          url: "https://digital.nhs.uk/data-and-information/publications/statistical/nhs-workforce-statistics",
          table: "1 (staff by group, FTE, monthly time series)",
          published: "26 February 2026",
          note: "Clinical = Professionally qualified + Support to clinical staff. Non-clinical = NHS infrastructure support.",
        },
        {
          name: "DfE School Workforce Census 2024/25",
          url: "https://explore-education-statistics.service.gov.uk/find-statistics/school-workforce-in-england",
          published: "2025",
          note: "Frontline = teachers + teaching assistants. Back office = admin, technicians, auxiliary, leadership non-teachers.",
        },
        {
          name: "Home Office Police Workforce Open Data, March 2025",
          url: "https://www.gov.uk/government/statistics/police-workforce-open-data-tables",
          published: "28 January 2026",
          note: "Frontline = police officers + PCSOs. Back office = police staff + designated officers.",
        },
        {
          name: "HESA Staff Statistics (SB265 and earlier bulletins)",
          url: "https://www.hesa.ac.uk/data-and-analysis/staff",
          note: "Academic = teaching-only + research-only + teaching & research. Professional = all non-academic staff. Curated from published summaries (data behind paywall).",
        },
      ],
      generated: new Date().toISOString().slice(0, 10),
    },
    nhs,
    education,
    police,
    universities: HESA,
  };

  writeFileSync("public/data/workforce.json", JSON.stringify(output, null, 2));
  console.log("\n✓ Written public/data/workforce.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
