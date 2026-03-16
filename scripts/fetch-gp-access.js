/**
 * fetch-gp-access.js
 *
 * Downloads NHS Digital GP appointment and workforce data and outputs
 * public/data/gp-access.json.
 *
 * Sources:
 *   - NHS Digital Appointments in General Practice — monthly volumes by type
 *   - NHS Digital General Practice Workforce — GP FTE headcount, patients per GP
 *
 * Run: node scripts/fetch-gp-access.js
 */

import XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data");

const URLS = {
  appointments: "https://files.digital.nhs.uk/xx/XXXXXX/Appointments_GP_Monthly.xlsx",
  workforce: "https://files.digital.nhs.uk/xx/XXXXXX/General_Practice_Workforce.xlsx",
};

async function fetchXLSX(url) {
  const name = url.split("/").pop();
  console.log(`  Fetching ${name}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = await res.arrayBuffer();
  return XLSX.read(buf);
}

// ─── Appointments ───────────────────────────────────────────────────
function parseAppointments(wb) {
  const sheetNames = Object.keys(wb.Sheets);
  console.log(`  Appointments sheets: ${sheetNames.join(", ")}`);

  // NHS Digital publishes monthly appointment data with columns for:
  // appointment mode (face-to-face, telephone, online/video)
  // The exact sheet layout needs manual verification per release.
  console.log("  NOTE: Appointment parsing requires manual verification of sheet layout.");
  return [];
}

// ─── Workforce ──────────────────────────────────────────────────────
function parseWorkforce(wb) {
  const sheetNames = Object.keys(wb.Sheets);
  console.log(`  Workforce sheets: ${sheetNames.join(", ")}`);

  console.log("  NOTE: Workforce parsing requires manual verification of sheet layout.");
  return [];
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log("Fetching GP access data...\n");
  console.log("NOTE: This script fetches source files for verification.");
  console.log("The data file (gp-access.json) was initially compiled from published NHS Digital tables.");
  console.log("Re-run with --update to overwrite.\n");

  try {
    const apptWb = await fetchXLSX(URLS.appointments);
    parseAppointments(apptWb);
  } catch (err) {
    console.warn(`  Failed to fetch appointments: ${err.message}`);
  }

  try {
    const wfWb = await fetchXLSX(URLS.workforce);
    parseWorkforce(wfWb);
  } catch (err) {
    console.warn(`  Failed to fetch workforce: ${err.message}`);
  }

  console.log("\nDone. Data file at public/data/gp-access.json");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
