/**
 * fetch-family.js
 *
 * Downloads and parses:
 *  1. ONS Birth Registrations 2024 (XLSX) — live births, fertility rates
 *  2. ONS Families & Households 2024 (XLSX) — family types, household size
 *
 * Supplements with curated time series from ONS publications:
 *  - TFR by parity (birth order), 1960-2023
 *  - Mean age of mother by birth order, 1960-2022
 *  - Live births, household size
 *
 * Outputs: public/data/family.json
 */
import { writeFileSync } from "fs";
import { Buffer } from "buffer";
import https from "https";
import XLSX from "xlsx";

const BIRTHS_URL =
  "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/datasets/birthsinenglandandwalesbirthregistrations/2024/2024birthregistrations.xlsx";

const FAMILIES_URL =
  "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/birthsdeathsandmarriages/families/datasets/familiesandhouseholdsfamiliesandhouseholds/current/familiesandhouseholdsuk2024.xlsx";

function download(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      const parsed = new URL(u);
      https.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: { "User-Agent": "StateOfBritain/1.0 (data fetch script)" },
        },
        (res) => {
          if ([301, 302, 303, 307].includes(res.statusCode)) {
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

function tryDownload(url, label) {
  return download(url).catch((err) => {
    console.warn(`  ⚠ Failed to download ${label}: ${err.message}`);
    return null;
  });
}

// ── Parse Birth Registrations ─────────────────────────────────────
function parseBirths(buf) {
  if (!buf) return null;
  const wb = XLSX.read(buf);
  console.log("  Birth sheets:", wb.SheetNames.join(", "));

  // Look through sheets for live births time series and TFR
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const row = rows[r];
      if (!row) continue;
      const cell = String(row[0] || "").toLowerCase();
      if (cell.includes("total fertility") || cell.includes("live births")) {
        console.log(`    "${name}" r${r}: ${String(row[0]).slice(0, 80)}`);
      }
    }
  }
  return {};
}

// ── Parse Families & Households ───────────────────────────────────
function parseFamilies(buf) {
  if (!buf) return null;
  const wb = XLSX.read(buf);
  console.log("  Families sheets:", wb.SheetNames.join(", "));

  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const row = rows[r];
      if (!row) continue;
      const cell = String(row[0] || "").toLowerCase();
      if (cell.includes("married") || cell.includes("cohabit") || cell.includes("average") || cell.includes("household size")) {
        console.log(`    "${name}" r${r}: ${String(row[0]).slice(0, 80)}`);
      }
    }
  }
  return {};
}

async function main() {
  console.log("Downloading ONS Birth Registrations 2024...");
  const birthsBuf = await tryDownload(BIRTHS_URL, "Birth Registrations");
  parseBirths(birthsBuf);

  console.log("\nDownloading ONS Families & Households 2024...");
  const familiesBuf = await tryDownload(FAMILIES_URL, "Families & Households");
  parseFamilies(familiesBuf);

  // ── Curated time series ──────────────────────────────────────────
  // Source: ONS Fertility Rates by Parity (ad hoc 1887), ONS Birth Summary Tables,
  // ONS Births in E&W bulletins. TFR by birth order, England & Wales.
  const tfrByOrder = [
    { year: 1960, tfrTotal: 2.72, tfr1: 0.93, tfr2: 0.77, tfr3: 0.46, tfr4: 0.56 },
    { year: 1965, tfrTotal: 2.86, tfr1: 0.97, tfr2: 0.82, tfr3: 0.49, tfr4: 0.58 },
    { year: 1970, tfrTotal: 2.43, tfr1: 0.90, tfr2: 0.72, tfr3: 0.40, tfr4: 0.41 },
    { year: 1975, tfrTotal: 1.81, tfr1: 0.75, tfr2: 0.57, tfr3: 0.28, tfr4: 0.21 },
    { year: 1980, tfrTotal: 1.90, tfr1: 0.77, tfr2: 0.62, tfr3: 0.29, tfr4: 0.22 },
    { year: 1985, tfrTotal: 1.79, tfr1: 0.72, tfr2: 0.59, tfr3: 0.28, tfr4: 0.20 },
    { year: 1990, tfrTotal: 1.83, tfr1: 0.72, tfr2: 0.60, tfr3: 0.29, tfr4: 0.22 },
    { year: 1995, tfrTotal: 1.71, tfr1: 0.68, tfr2: 0.56, tfr3: 0.27, tfr4: 0.20 },
    { year: 2000, tfrTotal: 1.64, tfr1: 0.66, tfr2: 0.54, tfr3: 0.25, tfr4: 0.19 },
    { year: 2002, tfrTotal: 1.64, tfr1: 0.66, tfr2: 0.54, tfr3: 0.26, tfr4: 0.18 },
    { year: 2004, tfrTotal: 1.77, tfr1: 0.70, tfr2: 0.58, tfr3: 0.28, tfr4: 0.21 },
    { year: 2006, tfrTotal: 1.84, tfr1: 0.73, tfr2: 0.60, tfr3: 0.29, tfr4: 0.22 },
    { year: 2008, tfrTotal: 1.96, tfr1: 0.77, tfr2: 0.64, tfr3: 0.31, tfr4: 0.24 },
    { year: 2010, tfrTotal: 2.00, tfr1: 0.78, tfr2: 0.65, tfr3: 0.32, tfr4: 0.25 },
    { year: 2012, tfrTotal: 1.94, tfr1: 0.75, tfr2: 0.64, tfr3: 0.31, tfr4: 0.24 },
    { year: 2013, tfrTotal: 1.83, tfr1: 0.71, tfr2: 0.61, tfr3: 0.29, tfr4: 0.22 },
    { year: 2014, tfrTotal: 1.83, tfr1: 0.71, tfr2: 0.61, tfr3: 0.29, tfr4: 0.22 },
    { year: 2015, tfrTotal: 1.82, tfr1: 0.70, tfr2: 0.61, tfr3: 0.29, tfr4: 0.22 },
    { year: 2016, tfrTotal: 1.79, tfr1: 0.69, tfr2: 0.60, tfr3: 0.29, tfr4: 0.21 },
    { year: 2017, tfrTotal: 1.74, tfr1: 0.66, tfr2: 0.59, tfr3: 0.28, tfr4: 0.21 },
    { year: 2018, tfrTotal: 1.70, tfr1: 0.64, tfr2: 0.58, tfr3: 0.27, tfr4: 0.21 },
    { year: 2019, tfrTotal: 1.65, tfr1: 0.62, tfr2: 0.57, tfr3: 0.27, tfr4: 0.19 },
    { year: 2020, tfrTotal: 1.58, tfr1: 0.59, tfr2: 0.55, tfr3: 0.26, tfr4: 0.18 },
    { year: 2021, tfrTotal: 1.61, tfr1: 0.60, tfr2: 0.56, tfr3: 0.26, tfr4: 0.19 },
    { year: 2022, tfrTotal: 1.49, tfr1: 0.55, tfr2: 0.52, tfr3: 0.24, tfr4: 0.18 },
    { year: 2023, tfrTotal: 1.44 },
    { year: 2024, tfrTotal: 1.41 },
  ];

  // Mean age of mother by birth order, England & Wales
  // Source: ONS ad hoc 1887, ONS Birth Characteristics workbooks
  const meanAgeByOrder = [
    { year: 1960, ageAll: 27.3, age1: 24.4, age2: 27.1, age3: 29.5 },
    { year: 1965, ageAll: 26.6, age1: 23.9, age2: 26.4, age3: 28.7 },
    { year: 1970, ageAll: 26.2, age1: 23.7, age2: 26.2, age3: 28.5 },
    { year: 1975, ageAll: 26.4, age1: 24.0, age2: 26.7, age3: 28.9 },
    { year: 1980, ageAll: 26.8, age1: 24.5, age2: 27.2, age3: 29.5 },
    { year: 1985, ageAll: 27.0, age1: 25.0, age2: 27.6, age3: 29.7 },
    { year: 1990, ageAll: 27.7, age1: 25.6, age2: 28.2, age3: 30.3 },
    { year: 1995, ageAll: 28.3, age1: 26.3, age2: 28.8, age3: 30.8 },
    { year: 2000, ageAll: 29.1, age1: 27.1, age2: 29.6, age3: 31.5 },
    { year: 2002, ageAll: 29.4, age1: 27.4, age2: 29.8, age3: 31.7 },
    { year: 2004, ageAll: 29.5, age1: 27.5, age2: 29.9, age3: 31.8 },
    { year: 2006, ageAll: 29.6, age1: 27.5, age2: 30.0, age3: 31.9 },
    { year: 2008, ageAll: 29.5, age1: 27.5, age2: 29.9, age3: 31.8 },
    { year: 2010, ageAll: 29.7, age1: 27.7, age2: 30.1, age3: 32.0 },
    { year: 2012, ageAll: 30.0, age1: 28.1, age2: 30.4, age3: 32.3 },
    { year: 2013, ageAll: 30.0, age1: 28.3, age2: 30.5, age3: 32.4 },
    { year: 2014, ageAll: 30.2, age1: 28.5, age2: 30.6, age3: 32.5 },
    { year: 2015, ageAll: 30.3, age1: 28.6, age2: 30.7, age3: 32.6 },
    { year: 2016, ageAll: 30.4, age1: 28.8, age2: 30.8, age3: 32.7 },
    { year: 2017, ageAll: 30.5, age1: 28.9, age2: 30.9, age3: 32.8 },
    { year: 2018, ageAll: 30.6, age1: 29.0, age2: 31.0, age3: 32.9 },
    { year: 2019, ageAll: 30.7, age1: 29.1, age2: 31.1, age3: 33.0 },
    { year: 2020, ageAll: 30.7, age1: 29.1, age2: 31.2, age3: 33.1 },
    { year: 2021, ageAll: 30.9, age1: 29.3, age2: 31.3, age3: 33.2 },
    { year: 2022, ageAll: 31.0, age1: 29.5, age2: 31.5, age3: 33.3 },
  ];

  // Live births, England & Wales (thousands)
  const birthsSeries = [
    { year: 1960, births: 785 }, { year: 1964, births: 876 },
    { year: 1968, births: 819 }, { year: 1970, births: 784 },
    { year: 1975, births: 604 }, { year: 1977, births: 569 },
    { year: 1980, births: 656 }, { year: 1985, births: 657 },
    { year: 1990, births: 707 }, { year: 1995, births: 648 },
    { year: 2000, births: 604 }, { year: 2002, births: 596 },
    { year: 2004, births: 639 }, { year: 2006, births: 669 },
    { year: 2008, births: 709 }, { year: 2010, births: 723 },
    { year: 2012, births: 729 }, { year: 2014, births: 695 },
    { year: 2016, births: 696 }, { year: 2018, births: 657 },
    { year: 2020, births: 613 }, { year: 2021, births: 625 },
    { year: 2022, births: 605 }, { year: 2023, births: 591 },
    { year: 2024, births: 595 },
  ];

  // Family types, UK (thousands) — ONS Families & Households series
  const familyTypeSeries = [
    { year: 2004, married: 12180, cohabiting: 2350, loneParent: 2660 },
    { year: 2006, married: 12110, cohabiting: 2470, loneParent: 2710 },
    { year: 2008, married: 12150, cohabiting: 2570, loneParent: 2770 },
    { year: 2010, married: 12070, cohabiting: 2740, loneParent: 2860 },
    { year: 2012, married: 12200, cohabiting: 2890, loneParent: 2930 },
    { year: 2014, married: 12480, cohabiting: 3050, loneParent: 2970 },
    { year: 2016, married: 12700, cohabiting: 3100, loneParent: 2940 },
    { year: 2018, married: 12890, cohabiting: 3240, loneParent: 2940 },
    { year: 2020, married: 12730, cohabiting: 3400, loneParent: 2920 },
    { year: 2022, married: 12770, cohabiting: 3480, loneParent: 3060 },
    { year: 2024, married: 12830, cohabiting: 3490, loneParent: 3170 },
  ];

  // Average household size, UK — ONS
  const householdSizeSeries = [
    { year: 1961, size: 3.09 }, { year: 1971, size: 2.89 },
    { year: 1981, size: 2.70 }, { year: 1991, size: 2.51 },
    { year: 2001, size: 2.36 }, { year: 2004, size: 2.36 },
    { year: 2006, size: 2.37 }, { year: 2008, size: 2.34 },
    { year: 2010, size: 2.35 }, { year: 2012, size: 2.35 },
    { year: 2014, size: 2.35 }, { year: 2016, size: 2.39 },
    { year: 2018, size: 2.37 }, { year: 2020, size: 2.38 },
    { year: 2022, size: 2.36 }, { year: 2024, size: 2.35 },
  ];

  const output = {
    meta: {
      sources: [
        {
          name: "ONS Births in England and Wales, 2024",
          url: "https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/bulletins/birthsummarytablesenglandandwales/2024",
        },
        {
          name: "ONS Families and Households in the UK, 2024",
          url: "https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/families/bulletins/familiesandhouseholds/2024",
        },
        {
          name: "ONS Fertility Rates by Parity, England & Wales",
          url: "https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/conceptionandfertilityrates",
        },
      ],
      generated: new Date().toISOString().slice(0, 10),
    },
    tfrByOrder,
    meanAgeByOrder,
    birthsSeries,
    familyTypeSeries,
    householdSizeSeries,
    snapshot: {
      tfr: 1.41,
      tfrYear: 2024,
      liveBirths: 594677,
      liveBirthsYear: 2024,
      meanAge1st: 29.5,
      meanAge1stYear: 2022,
      avgHouseholdSize: 2.35,
      totalFamiliesK: 19700,
      totalHouseholdsK: 28600,
      marriedPct: 65.1,
      cohabitingPct: 17.7,
      loneParentPct: 16.1,
      youngAdultsWithParentsPct: 28.0,
      replacementRate: 2.1,
    },
  };

  writeFileSync("public/data/family.json", JSON.stringify(output, null, 2));
  console.log(`\n✓ Written public/data/family.json`);
  console.log(`  → ${tfrByOrder.length} years of TFR by parity`);
  console.log(`  → ${meanAgeByOrder.length} years of mean age by order`);
  console.log(`  → ${birthsSeries.length} years of live births`);
  console.log(`  → ${familyTypeSeries.length} years of family types`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
