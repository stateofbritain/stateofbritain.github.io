#!/usr/bin/env node
/**
 * fetch-welfare.js
 *
 * Downloads DWP Benefit Expenditure and Caseload Tables (ODS) and parses them
 * via a Python helper to extract welfare spending time series.
 *
 * Source: DWP / OBR Autumn Budget 2025 outturn and forecast tables
 * https://www.gov.uk/government/publications/benefit-expenditure-and-caseload-tables-2025
 *
 * Outputs: public/data/welfare.json
 */
import { writeFileSync } from "fs";
import https from "https";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ODS_URL = "https://assets.publishing.service.gov.uk/media/694931a672075a1d4a5089d9/outturn-and-forecast-tables-autumn-budget-2025.ods";
const TMP_ODS = "/tmp/dwp-outturn-welfare.ods";
const OUT_PATH = join(__dirname, "..", "public", "data", "welfare.json");

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, { headers: { "User-Agent": "StateOfBritain/1.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(new URL(res.headers.location, u).href); return;
        }
        if (res.statusCode !== 200) { reject(new Error("HTTP " + res.statusCode)); return; }
        const chunks = [];
        res.on("data", c => chunks.push(c));
        res.on("end", () => { writeFileSync(dest, Buffer.concat(chunks)); resolve(); });
        res.on("error", reject);
      }).on("error", reject);
    };
    get(url);
  });
}

async function main() {
  console.log("Downloading DWP benefit expenditure tables...");
  await download(ODS_URL, TMP_ODS);

  console.log("Parsing ODS...");
  const pyScript = join(__dirname, "parse-dwp-ods.py");
  const raw = execSync("python3 " + JSON.stringify(pyScript) + " " + JSON.stringify(TMP_ODS), {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const parsed = JSON.parse(raw);

  console.log("  " + parsed.byCategory.length + " years in byCategory");
  console.log("  " + parsed.byBenefit.length + " years in byBenefit");
  console.log("  Latest outturn: " + parsed.latestYear + " (£" + parsed.latestTotal + "bn)");

  const latestBenefits = parsed.byBenefit.filter(b => b.year === parsed.latestYear)[0] || {};

  const dataset = {
    $schema: "sob-dataset-v1",
    id: "welfare",
    pillar: "state",
    topic: "spending",
    generated: new Date().toISOString().slice(0, 10),

    sources: [
      {
        id: "dwp-benefit-expenditure",
        name: "DWP Benefit Expenditure and Caseload Tables (Autumn Budget 2025)",
        url: "https://www.gov.uk/government/publications/benefit-expenditure-and-caseload-tables-2025",
        publisher: "Department for Work and Pensions",
        note: "Outturn and forecast benefit expenditure consistent with current DWP coverage, £ billion nominal. GB data uprated to UK.",
      },
    ],

    snapshot: {
      latestYear: parsed.latestYear,
      totalBn: parsed.latestTotal,
      pensionersBn: parsed.latestPensioners,
      workingAgeBn: parsed.latestWorkingAge,
      statePensionBn: latestBenefits.statePension,
      pensionShare: Math.round(parsed.latestPensioners / parsed.latestTotal * 100),
    },

    series: {
      byCategory: {
        sourceId: "dwp-benefit-expenditure",
        label: "Welfare Spending by Category",
        unit: "£ billion (nominal)",
        timeField: "year",
        description: "DWP benefit expenditure by recipient category: children, working age, pensioners. Includes outturn and OBR forecast years.",
        data: parsed.byCategory,
      },
      byBenefit: {
        sourceId: "dwp-benefit-expenditure",
        label: "Welfare Spending by Benefit Type",
        unit: "£ billion (nominal)",
        timeField: "year",
        description: "Expenditure on individual benefits: State Pension, housing benefits, disability, incapacity, unemployment, Pension Credit, Carer's Allowance.",
        data: parsed.byBenefit,
      },
    },
  };

  writeFileSync(OUT_PATH, JSON.stringify(dataset, null, 2));
  console.log("\nWrote " + OUT_PATH);
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
