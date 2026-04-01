/**
 * fetch-exchange-rates.js
 *
 * Fetches sterling exchange rate data from the Bank of England Statistical Database:
 *  - XUMAUSS: GBP/USD monthly average spot rate
 *  - XUMAERS: GBP/EUR monthly average spot rate
 *  - XUMABK67: Sterling Effective Exchange Rate Index (trade-weighted, Jan 2005 = 100)
 *
 * Outputs: public/data/exchange-rates.json
 */
import { writeFileSync } from "fs";

const BOE_URL =
  "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?" +
  "csv.x=yes&Datefrom=01/Jan/2000&Dateto=01/Apr/2026" +
  "&SeriesCodes=XUMAUSS,XUMAERS,XUMABK67&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N";

// ── Parse BoE date "01 Jan 2000" → "2000-01" ─────────────────────────
const MONTHS = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function parseDate(raw) {
  const parts = raw.trim().split(" ");
  if (parts.length !== 3) return null;
  const [, mon, year] = parts;
  const mm = MONTHS[mon];
  if (!mm) return null;
  return `${year}-${mm}`;
}

// ── Generic CSV parser for BoE data ───────────────────────────────────
function parseBoeCSV(csv) {
  const lines = csv.split("\n").map(l => l.trim()).filter(Boolean);
  const headerIdx = lines.findIndex(l => l.toUpperCase().startsWith("DATE"));
  if (headerIdx === -1) throw new Error("Could not find header row in BoE CSV");
  const header = lines[headerIdx].split(",").map(h => h.trim());
  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    const month = parseDate(cols[0]);
    if (!month) continue;
    const row = { month };
    for (let j = 1; j < header.length; j++) {
      const v = cols[j];
      if (v && v !== "" && v !== "..") {
        const num = parseFloat(v);
        if (!isNaN(num)) row[header[j]] = num;
      }
    }
    rows.push(row);
  }
  return rows;
}

// ── Round helpers ─────────────────────────────────────────────────────
function round2(v) { return Math.round(v * 100) / 100; }
function round1(v) { return Math.round(v * 10) / 10; }

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log("Fetching BoE exchange rate series...");

  const res = await fetch(BOE_URL);
  if (!res.ok) throw new Error(`BoE API returned ${res.status}: ${res.statusText}`);

  const csv = await res.text();
  const rawRows = parseBoeCSV(csv);

  console.log(`  Parsed ${rawRows.length} rows from BoE CSV`);
  if (rawRows.length === 0) throw new Error("No data rows parsed from BoE CSV");

  // Build monthly series data
  const monthlyData = rawRows.map(r => {
    const entry = { month: r.month };
    if (r.XUMAUSS != null) entry.gbpUsd = round2(r.XUMAUSS);
    if (r.XUMAERS != null) entry.gbpEur = round2(r.XUMAERS);
    if (r.XUMABK67 != null) entry.sterlingIndex = round1(r.XUMABK67);
    return entry;
  }).filter(e => e.gbpUsd != null || e.gbpEur != null || e.sterlingIndex != null);

  console.log(`  Monthly data points: ${monthlyData.length}`);
  if (monthlyData.length === 0) throw new Error("No valid exchange rate data after filtering");

  // Latest data point for snapshot
  const latest = monthlyData[monthlyData.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "exchange-rates",
    pillar: "growth",
    topic: "economy",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "boe-exchange-rates",
        name: "Bank of England Statistical Database",
        url: "https://www.bankofengland.co.uk/boeapps/database/",
        publisher: "Bank of England",
        note: "Monthly average spot rates and Sterling Effective Exchange Rate Index.",
      },
    ],
    snapshot: {
      latestMonth: latest.month,
      gbpUsd: latest.gbpUsd,
      gbpEur: latest.gbpEur,
      sterlingIndex: latest.sterlingIndex,
    },
    series: {
      monthly: {
        sourceId: "boe-exchange-rates",
        label: "Sterling Exchange Rates (Monthly Average)",
        unit: "rate",
        timeField: "month",
        description:
          "Monthly average GBP/USD, GBP/EUR spot rates and Sterling Effective Exchange Rate Index (trade-weighted, Jan 2005 = 100).",
        data: monthlyData,
      },
    },
  };

  const outPath = new URL("../public/data/exchange-rates.json", import.meta.url).pathname;
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(`  Date range: ${monthlyData[0].month} to ${latest.month}`);
  console.log(`  Latest GBP/USD: ${latest.gbpUsd}`);
  console.log(`  Latest GBP/EUR: ${latest.gbpEur}`);
  console.log(`  Latest Sterling Index: ${latest.sterlingIndex}`);
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
