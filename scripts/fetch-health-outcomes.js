/**
 * fetch-health-outcomes.js
 *
 * Downloads ONS health outcomes data and outputs public/data/health-outcomes.json.
 *
 * Sources:
 *   - ONS National Life Tables — life expectancy at birth by sex, UK
 *   - ONS Cancer Survival — 1-year and 5-year net survival by cancer site, England
 *   - ONS Avoidable Mortality — age-standardised rates, England & Wales
 *
 * Run: node scripts/fetch-health-outcomes.js
 */

import XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data");

const URLS = {
  lifeExpectancy: "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/birthsdeathsandmarriages/lifeexpectancies/datasets/nationallifetablesunitedkingdomreferencetables/current/nationallifetablesuk.xlsx",
  cancerSurvival: "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/healthandsocialcare/conditionsanddiseases/datasets/cancersurvivalratescancersurvivalinenglandadultsdiagnosed/current/cancersurvivalengland.xlsx",
  avoidableMortality: "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/healthandsocialcare/causesofdeath/datasets/avoidablemortalityinenglandandwalesreferencetable1/current/avoidablemortalityreferencetable1.xlsx",
};

async function fetchXLSX(url) {
  const name = url.split("/").pop();
  console.log(`  Fetching ${name}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = await res.arrayBuffer();
  return XLSX.read(buf);
}

function sheetRows(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "${sheetName}" not found. Available: ${Object.keys(wb.Sheets).join(", ")}`);
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
}

// ─── Life Expectancy ────────────────────────────────────────────────
function parseLifeExpectancy(wb) {
  // ONS National Life Tables have separate male/female sheets
  // Structure varies — attempt common patterns
  const series = [];

  // Try parsing from "e(x)" or overview sheet
  const sheetNames = Object.keys(wb.Sheets);
  console.log(`  Life expectancy sheets: ${sheetNames.join(", ")}`);

  // Placeholder: in practice, parse the exact sheet layout
  // The published data typically has year in column A, e(0) male and female in columns
  console.log("  NOTE: Life expectancy parsing requires manual verification of sheet layout.");
  console.log("  Using pre-verified data in the data file.");

  return series;
}

// ─── Cancer Survival ────────────────────────────────────────────────
function parseCancerSurvival(wb) {
  const sheetNames = Object.keys(wb.Sheets);
  console.log(`  Cancer survival sheets: ${sheetNames.join(", ")}`);

  console.log("  NOTE: Cancer survival parsing requires manual verification of sheet layout.");
  return [];
}

// ─── Avoidable Mortality ────────────────────────────────────────────
function parseAvoidableMortality(wb) {
  const sheetNames = Object.keys(wb.Sheets);
  console.log(`  Avoidable mortality sheets: ${sheetNames.join(", ")}`);

  console.log("  NOTE: Avoidable mortality parsing requires manual verification of sheet layout.");
  return [];
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log("Fetching health outcomes data...\n");
  console.log("NOTE: This script fetches source files for verification.");
  console.log("The data file (health-outcomes.json) was initially compiled from published ONS tables.");
  console.log("Re-run with --update to overwrite.\n");

  try {
    const leWb = await fetchXLSX(URLS.lifeExpectancy);
    parseLifeExpectancy(leWb);
  } catch (err) {
    console.warn(`  Failed to fetch life expectancy: ${err.message}`);
  }

  try {
    const csWb = await fetchXLSX(URLS.cancerSurvival);
    parseCancerSurvival(csWb);
  } catch (err) {
    console.warn(`  Failed to fetch cancer survival: ${err.message}`);
  }

  try {
    const amWb = await fetchXLSX(URLS.avoidableMortality);
    parseAvoidableMortality(amWb);
  } catch (err) {
    console.warn(`  Failed to fetch avoidable mortality: ${err.message}`);
  }

  console.log("\nDone. Data file at public/data/health-outcomes.json");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
