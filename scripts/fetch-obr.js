/**
 * fetch-obr.js
 *
 * Downloads and parses:
 *  1. OBR Public Finances Databank (XLSX)
 *     - Aggregates (£bn): receipts, TME, borrowing, debt interest, debt, GDP
 *     - Aggregates (% of GDP): same as above as shares
 *     - Receipts (£bn): breakdown by tax type
 *
 *  2. PESA 2025 Chapter 1 Tables (XLSX)
 *     - Table 1.12: TME by departmental group, 2020-21 to 2025-26
 *
 * Outputs: public/data/spending.json
 */
import { writeFileSync } from "fs";
import { Buffer } from "buffer";
import https from "https";
import http from "http";
import XLSX from "xlsx";

const OBR_URL =
  "https://obr.uk/download/public-finances-databank-february-2026/?tmstv=1772810375";

const PESA_CH1_URL =
  "https://assets.publishing.service.gov.uk/media/6874fa8f92691289bdb7d394/PESA_2025_CP_Chapter_1_tables.xlsx";

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

// ── OBR Aggregates ──────────────────────────────────────────────
function parseOBR(buf) {
  const wb = XLSX.read(buf);

  // --- £bn sheet ---
  const bnRows = XLSX.utils.sheet_to_json(wb.Sheets["Aggregates (£bn)"], { header: 1 });
  const aggregates = [];
  for (let r = 7; r < bnRows.length; r++) {
    const row = bnRows[r];
    const fyStr = row?.[1];
    if (typeof fyStr !== "string" || !/^\d{4}-\d{2}$/.test(fyStr)) continue;
    const year = parseInt(fyStr.slice(0, 4), 10);
    if (year < 1978) continue;

    const entry = {
      fy: fyStr,
      year,
      receipts: typeof row[2] === "number" ? Math.round(row[2] * 10) / 10 : null,
      tme: typeof row[3] === "number" ? Math.round(row[3] * 10) / 10 : null,
      borrowing: typeof row[14] === "number" ? Math.round(row[14] * 10) / 10 : null,
      debtInterest: typeof row[21] === "number" ? Math.round(row[21] * 10) / 10 : null,
      debt: typeof row[23] === "number" ? Math.round(row[23] * 10) / 10 : null,
      gdp: typeof row[30] === "number" ? Math.round(row[30] * 10) / 10 : null,
    };
    entry.forecast = year >= 2025;
    aggregates.push(entry);
  }

  // --- % of GDP sheet ---
  const pctRows = XLSX.utils.sheet_to_json(wb.Sheets["Aggregates (per cent of GDP)"], { header: 1 });
  const pctGDP = [];
  for (let r = 7; r < pctRows.length; r++) {
    const row = pctRows[r];
    const fyStr = row?.[1];
    if (typeof fyStr !== "string" || !/^\d{4}-\d{2}$/.test(fyStr)) continue;
    const year = parseInt(fyStr.slice(0, 4), 10);
    if (year < 1978) continue;

    pctGDP.push({
      fy: fyStr,
      year,
      receipts: typeof row[2] === "number" ? Math.round(row[2] * 10) / 10 : null,
      tme: typeof row[3] === "number" ? Math.round(row[3] * 10) / 10 : null,
      borrowing: typeof row[14] === "number" ? Math.round(row[14] * 10) / 10 : null,
      debtInterest: typeof row[21] === "number" ? Math.round(row[21] * 10) / 10 : null,
      debt: typeof row[23] === "number" ? Math.round(row[23] * 10) / 10 : null,
      forecast: year >= 2025,
    });
  }

  // --- Receipts breakdown ---
  const recRows = XLSX.utils.sheet_to_json(wb.Sheets["Receipts (£bn)"], { header: 1 });
  const receiptTypes = [];
  for (let r = 6; r < recRows.length; r++) {
    const row = recRows[r];
    if (row?.[1] === "2024-25") {
      const taxes = [
        { name: "Income tax (PAYE)", col: 16 },
        { name: "Income tax (SA)", col: 17 },
        { name: "National Insurance", col: 27 },
        { name: "VAT", col: 2 },
        { name: "Corporation tax", col: 20 },
        { name: "Council tax", col: 28 },
        { name: "Capital gains tax", col: 19 },
        { name: "Stamp duty (land)", col: 5 },
        { name: "Fuel duty", col: 4 },
        { name: "Alcohol duty", col: 8 },
        { name: "Tobacco duty", col: 7 },
        { name: "Vehicle excise duty", col: 9 },
        { name: "Air passenger duty", col: 10 },
        { name: "Insurance premium tax", col: 11 },
        { name: "Inheritance tax", col: 26 },
      ];
      for (const t of taxes) {
        const val = row[t.col];
        if (typeof val === "number" && val > 0) {
          receiptTypes.push({ name: t.name, value: Math.round(val * 10) / 10 });
        }
      }
      break;
    }
  }
  receiptTypes.sort((a, b) => b.value - a.value);

  return { aggregates, pctGDP, receiptTypes };
}

// ── Sub-departmental breakdowns (curated, £m, FY 2024-25) ──────
// Sources: departmental Annual Reports, Estimates, Budget documents
const DEPT_BREAKDOWNS = {
  "Work and Pensions": [
    { name: "State Pension", value: 137000 },
    { name: "Universal Credit", value: 53000 },
    { name: "Personal Independence Payment", value: 23000 },
    { name: "Housing Benefit", value: 16000 },
    { name: "Disability (DLA + AA)", value: 14000 },
    { name: "Employment & Support Allowance", value: 13000 },
    { name: "Other benefits & admin", value: 41468 },
  ],
  "Health and Social Care": [
    { name: "Acute hospital services", value: 85000 },
    { name: "Specialised commissioning", value: 20000 },
    { name: "Primary care (GP, dental, pharmacy)", value: 18500 },
    { name: "Mental health services", value: 16000 },
    { name: "Community health services", value: 14000 },
    { name: "Capital investment", value: 12000 },
    { name: "UKHSA, NICE, CQC & ALBs", value: 10000 },
    { name: "Prescribing & medicines", value: 9000 },
    { name: "Social care grants", value: 8000 },
    { name: "NHSE running costs & other", value: 6000 },
    { name: "Health Education / workforce", value: 5000 },
    { name: "Continuing healthcare", value: 5000 },
    { name: "Ambulance services", value: 3500 },
    { name: "DHSC admin & other", value: 11199 },
  ],
  "Education": [
    { name: "Schools (core DSG)", value: 62000 },
    { name: "Higher education (student loans)", value: 34000 },
    { name: "Children's social care", value: 11000 },
    { name: "16-19 & apprenticeships", value: 8000 },
    { name: "Early years", value: 8000 },
    { name: "DfE admin & other", value: 9915 },
  ],
  "Defence": [
    { name: "Equipment & support", value: 16000 },
    { name: "Personnel", value: 14000 },
    { name: "Equipment procurement", value: 10400 },
    { name: "Defence Nuclear Enterprise", value: 8000 },
    { name: "Infrastructure", value: 5300 },
    { name: "Operations & peacekeeping", value: 1800 },
    { name: "Other (DE&S, admin)", value: 16034 },
  ],
  "Scottish Government": [
    { name: "Health & Social Care", value: 20300 },
    { name: "Local government", value: 13000 },
    { name: "Social Security & benefits", value: 6400 },
    { name: "Education & Skills", value: 5000 },
    { name: "Transport", value: 4500 },
    { name: "Justice", value: 3200 },
    { name: "Other portfolios", value: 18586 },
  ],
  "HM Treasury": [
    { name: "BoE Asset Purchase Facility", value: 35000 },
    { name: "Fiscal items & reserves", value: 12000 },
    { name: "EU settlement contribution", value: 5500 },
    { name: "Debt Management Office", value: 2500 },
    { name: "UKGI & other ALBs", value: 2000 },
    { name: "HMT admin & other", value: 8140 },
  ],
  "MHCLG - Local Government": [
    { name: "Revenue support & business rates", value: 15000 },
    { name: "Social care grants", value: 5500 },
    { name: "Housing Benefit (local admin)", value: 5000 },
    { name: "New Homes Bonus & grants", value: 4000 },
    { name: "Other", value: 4935 },
  ],
  "HM Revenue and Customs": [
    { name: "Tax credits (legacy)", value: 18000 },
    { name: "Child Benefit", value: 12000 },
    { name: "HMRC running costs", value: 3500 },
    { name: "Other", value: 612 },
  ],
  "Northern Ireland Executive": [
    { name: "Health", value: 8200 },
    { name: "Communities", value: 5800 },
    { name: "Finance & economy", value: 3500 },
    { name: "Education", value: 3000 },
    { name: "Infrastructure", value: 2200 },
    { name: "Justice", value: 1900 },
    { name: "Other departments", value: 7017 },
  ],
  "Transport": [
    { name: "Network Rail", value: 18000 },
    { name: "HS2", value: 7000 },
    { name: "National Highways", value: 2500 },
    { name: "Local transport grants", value: 1500 },
    { name: "Other (admin, buses, maritime)", value: 1458 },
  ],
  "Cabinet Office": [
    { name: "Civil Service Pensions (AME)", value: 15000 },
    { name: "Government Property Agency", value: 3500 },
    { name: "Digital & data", value: 2500 },
    { name: "National security & resilience", value: 2000 },
    { name: "Other", value: 3813 },
  ],
  "Welsh Government": [
    { name: "Health & Social Services", value: 10200 },
    { name: "Local government settlement", value: 5700 },
    { name: "Education & Welsh Language", value: 3000 },
    { name: "Climate Change (transport, housing)", value: 2800 },
    { name: "Economy", value: 1000 },
    { name: "Other portfolios", value: 2670 },
  ],
  "Home Office": [
    { name: "Police & counter-terrorism", value: 8000 },
    { name: "Immigration & asylum", value: 7000 },
    { name: "Border Force", value: 3000 },
    { name: "Fire & rescue", value: 1500 },
    { name: "Other (passports, admin)", value: 3008 },
  ],
  "Justice": [
    { name: "HM Prison & Probation Service", value: 5000 },
    { name: "HM Courts & Tribunals Service", value: 2200 },
    { name: "Legal Aid Agency", value: 2000 },
    { name: "Youth Justice Board", value: 400 },
    { name: "Other (admin, judicial)", value: 3976 },
  ],
  "Foreign, Commonwealth and Development Office": [
    { name: "Official Development Assistance", value: 6000 },
    { name: "Diplomatic network & estates", value: 2500 },
    { name: "Conflict, stability & security", value: 1500 },
    { name: "Multilateral subscriptions", value: 1200 },
    { name: "Other (admin, consular)", value: 899 },
  ],
  "Energy Security and Net Zero": [
    { name: "Energy bills support & subsidies", value: 6000 },
    { name: "Clean energy & net zero", value: 3500 },
    { name: "Nuclear decommissioning (NDA)", value: 3000 },
    { name: "Energy efficiency (homes)", value: 1500 },
    { name: "Other (admin)", value: 1017 },
  ],
  "Science, Innovation and Technology": [
    { name: "UKRI research councils", value: 7500 },
    { name: "Digital & telecoms", value: 1500 },
    { name: "AI & technology", value: 1200 },
    { name: "UK Space Agency", value: 500 },
    { name: "Other (admin, innovation)", value: 3199 },
  ],
  "MHCLG - Housing and Communities": [
    { name: "Affordable Homes Programme", value: 4000 },
    { name: "Building safety & remediation", value: 3000 },
    { name: "Levelling Up / Towns Fund", value: 2000 },
    { name: "Homelessness & rough sleeping", value: 1500 },
    { name: "Other (planning, communities)", value: 2407 },
  ],
  "Culture, Media and Sport": [
    { name: "BBC (licence fee)", value: 3800 },
    { name: "Digital infrastructure", value: 1200 },
    { name: "Arts Council England", value: 1000 },
    { name: "Heritage & libraries", value: 600 },
    { name: "Sport England", value: 500 },
    { name: "Other (gambling, tourism, admin)", value: 1949 },
  ],
  "Environment, Food and Rural Affairs": [
    { name: "Environmental land management", value: 2500 },
    { name: "Environment Agency", value: 1200 },
    { name: "Flood defence", value: 800 },
    { name: "Natural England", value: 300 },
    { name: "Animal & Plant Health Agency", value: 200 },
    { name: "Other (admin, rural)", value: 1012 },
  ],
  "Business and Trade": [
    { name: "Trade promotion & UKEF", value: 600 },
    { name: "Business support & regulation", value: 500 },
    { name: "Competition & Markets Authority", value: 200 },
    { name: "Other (admin, investment)", value: 562 },
  ],
  "Law Officers' Departments": [
    { name: "Crown Prosecution Service", value: 700 },
    { name: "Serious Fraud Office", value: 70 },
    { name: "Government Legal Dept & other", value: 176 },
  ],
  "Small and Independent Bodies": [
    { name: "UK Statistics Authority (ONS)", value: 600 },
    { name: "Electoral Commission", value: 200 },
    { name: "Food Standards Agency", value: 150 },
    { name: "National Audit Office", value: 100 },
    { name: "Other small bodies", value: 1871 },
  ],
};

function cleanDeptName(name) {
  return name.replace(/\s*\(\d+\)\s*$/, "").replace(/\s+$/, "");
}

// ── PESA Chapter 1 — Departmental TME ───────────────────────────
function parsePESA_Ch1(buf) {
  const wb = XLSX.read(buf);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["Table_1_12"], { header: 1 });

  // Row 3 = fiscal year headers, Row 4 = outturn/plans labels
  // Rows 6-29 = departments, Row 30 = total departmental, Row 43 = TME total
  const fys = [];
  const fyTypes = [];
  const headerRow = rows[3] || [];
  const typeRow = rows[4] || [];
  for (let c = 1; c <= 6; c++) {
    const fy = headerRow[c];
    if (typeof fy === "string" && /^\d{4}-\d{2}$/.test(fy)) {
      fys.push(fy);
      fyTypes.push(typeRow[c] || "");
    }
  }

  const parseVal = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = parseFloat(v.replace(/,/g, ""));
      return isNaN(n) ? null : n;
    }
    return null;
  };

  const departments = [];
  // Rows 6-29 are individual departments
  for (let r = 6; r <= 29; r++) {
    const row = rows[r];
    if (!row || !row[0]) continue;
    const name = String(row[0]).trim();
    const values = {};
    for (let c = 0; c < fys.length; c++) {
      values[fys[c]] = parseVal(row[c + 1]);
    }
    departments.push({ name, values });
  }

  // Non-departmental items (rows 31-41) — grouped as "Other expenditure"
  const otherItems = [];
  for (let r = 31; r <= 41; r++) {
    const row = rows[r];
    if (!row || !row[0]) continue;
    const name = String(row[0]).trim();
    const values = {};
    for (let c = 0; c < fys.length; c++) {
      values[fys[c]] = parseVal(row[c + 1]);
    }
    otherItems.push({ name, values });
  }

  // TME total from row 43
  const tmeRow = rows[43];
  const tmeTotal = {};
  if (tmeRow) {
    for (let c = 0; c < fys.length; c++) {
      tmeTotal[fys[c]] = parseVal(tmeRow[c + 1]);
    }
  }

  // Total departmental from row 30
  const deptTotalRow = rows[30];
  const deptTotal = {};
  if (deptTotalRow) {
    for (let c = 0; c < fys.length; c++) {
      deptTotal[fys[c]] = parseVal(deptTotalRow[c + 1]);
    }
  }

  // Attach sub-departmental breakdowns
  for (const dept of departments) {
    const cleaned = cleanDeptName(dept.name);
    dept.breakdown = DEPT_BREAKDOWNS[cleaned] || null;
  }

  return { departments, otherItems, tmeTotal, deptTotal, fys, fyTypes };
}

async function main() {
  console.log("Downloading OBR Public Finances Databank...");
  const obrBuf = await download(OBR_URL);
  const { aggregates, pctGDP, receiptTypes } = parseOBR(obrBuf);
  console.log(`  → ${aggregates.length} fiscal years of aggregates`);
  console.log(`  → ${receiptTypes.length} receipt types`);

  console.log("\nDownloading PESA 2025 Chapter 1...");
  const pesaBuf = await download(PESA_CH1_URL);
  const { departments, otherItems, tmeTotal, deptTotal, fys, fyTypes } = parsePESA_Ch1(pesaBuf);
  console.log(`  → ${departments.length} departments`);
  console.log(`  → ${fys.length} fiscal years: ${fys.join(", ")}`);
  console.log(`  → Latest FY column type: ${fyTypes[fyTypes.length - 1]}`);

  // Use 2024-25 (outturn) as the primary display year
  const latestFy = "2024-25";
  console.log(`\nDepartment totals for ${latestFy}:`);
  for (const d of departments) {
    const v = d.values[latestFy];
    console.log(`  ${d.name}: £${v != null ? v.toLocaleString() : "n/a"}m`);
  }

  const output = {
    meta: {
      sources: [
        {
          name: "OBR Public Finances Databank, February 2026",
          url: "https://obr.uk/data/",
          note: "Fiscal aggregates in £bn and % of GDP. Forecast years from 2025-26 consistent with OBR EFO November 2025.",
        },
        {
          name: "HM Treasury PESA 2025 — Chapter 1, Table 1.12",
          url: "https://www.gov.uk/government/statistics/public-expenditure-statistical-analyses-2025",
          note: "Total managed expenditure by departmental group, £ million. 2024-25 outturn. Includes DEL and AME.",
        },
      ],
      generated: new Date().toISOString().slice(0, 10),
    },
    aggregates,
    pctGDP,
    receiptTypes,
    departments: {
      fys,
      fyTypes,
      latestFy,
      items: departments,
      otherItems,
      deptTotal,
      tmeTotal,
    },
  };

  writeFileSync("public/data/spending.json", JSON.stringify(output, null, 2));
  console.log("\n✓ Written public/data/spending.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
