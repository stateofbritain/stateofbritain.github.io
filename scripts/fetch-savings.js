/**
 * fetch-savings.js
 *
 * Fetches Bank of England data for:
 *  - Mortgage approvals for house purchase (series LPMVTVX, monthly, seasonally adjusted)
 *  - Cash ISA deposits outstanding (series LPMB4F6, monthly, seasonally adjusted, £millions)
 *
 * Merges the two new series into the existing money-supply.json dataset.
 *
 * Outputs: public/data/money-supply.json (updated in-place)
 */
import { writeFileSync, readFileSync } from "fs";

const BOE_URL =
  "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?" +
  "csv.x=yes&Datefrom=01/Jan/2000&Dateto=31/Dec/2026" +
  "&SeriesCodes=LPMVTVX,LPMB4F6&CSVF=TN&UsingCodes=Y";

// ── Parse BoE date "DD MMM YYYY" → "YYYY-MM" ──────────────────────────
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

// ── Fetch and parse ────────────────────────────────────────────────────
async function main() {
  console.log("Fetching BoE series LPMVTVX (mortgage approvals) and LPMB4F6 (cash ISA deposits)...");
  const res = await fetch(BOE_URL);
  if (!res.ok) throw new Error(`BoE API returned ${res.status}: ${res.statusText}`);
  const csv = await res.text();

  const lines = csv.split("\n").map(l => l.trim()).filter(Boolean);

  // Find the header row (contains "DATE")
  const headerIdx = lines.findIndex(l => l.toUpperCase().startsWith("DATE"));
  if (headerIdx === -1) throw new Error("Could not find header row in BoE CSV");

  const header = lines[headerIdx].split(",").map(h => h.trim());
  const approvalCol = header.indexOf("LPMVTVX");
  const isaCol = header.indexOf("LPMB4F6");
  if (approvalCol === -1) throw new Error("LPMVTVX column not found in CSV header");
  if (isaCol === -1) throw new Error("LPMB4F6 column not found in CSV header");

  const mortgageData = [];
  const isaData = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    const month = parseDate(cols[0]);
    if (!month) continue;

    const approvalVal = cols[approvalCol];
    const isaVal = cols[isaCol];

    // Mortgage approvals (number of approvals)
    if (approvalVal && approvalVal !== "" && approvalVal !== "..") {
      const approvals = parseInt(approvalVal, 10);
      if (!isNaN(approvals)) {
        mortgageData.push({ month, approvals });
      }
    }

    // Cash ISA deposits outstanding (£millions)
    if (isaVal && isaVal !== "" && isaVal !== "..") {
      const balance = parseInt(isaVal, 10);
      if (!isNaN(balance)) {
        isaData.push({ month, balance });
      }
    }
  }

  console.log(`  Parsed ${mortgageData.length} mortgage approval data points`);
  console.log(`  Parsed ${isaData.length} cash ISA deposit data points`);

  if (mortgageData.length === 0) throw new Error("No mortgage approval data parsed");
  if (isaData.length === 0) throw new Error("No cash ISA data parsed");

  // ── Read existing money-supply.json ──────────────────────────────────
  const dataPath = new URL("../public/data/money-supply.json", import.meta.url).pathname;
  const existing = JSON.parse(readFileSync(dataPath, "utf-8"));

  // ── Add new sources if not already present ───────────────────────────
  const sourceIds = new Set(existing.sources.map(s => s.id));

  if (!sourceIds.has("boe-mortgage-approvals")) {
    existing.sources.push({
      id: "boe-mortgage-approvals",
      name: "Bank of England Mortgage Approvals Statistics",
      url: "https://www.bankofengland.co.uk/statistics/money-and-credit/2024/november",
      publisher: "Bank of England",
      note: "Mortgage approvals for house purchase, seasonally adjusted (LPMVTVX series)",
    });
  }

  if (!sourceIds.has("boe-cash-isa")) {
    existing.sources.push({
      id: "boe-cash-isa",
      name: "Bank of England Individual Savings Accounts Statistics",
      url: "https://www.bankofengland.co.uk/statistics/money-and-credit/2024/november",
      publisher: "Bank of England",
      note: "Cash ISA deposits outstanding, seasonally adjusted (LPMB4F6 series), £millions",
    });
  }

  // ── Add new series ───────────────────────────────────────────────────
  existing.series.mortgageApprovals = {
    sourceId: "boe-mortgage-approvals",
    label: "Mortgage Approvals for House Purchase",
    unit: "number",
    timeField: "month",
    data: mortgageData,
  };

  existing.series.cashIsaDeposits = {
    sourceId: "boe-cash-isa",
    label: "Cash ISA Deposits Outstanding",
    unit: "£m",
    timeField: "month",
    data: isaData,
  };

  // ── Update snapshot values ───────────────────────────────────────────
  const latestMortgage = mortgageData[mortgageData.length - 1];
  const latestIsa = isaData[isaData.length - 1];

  existing.snapshot.mortgageApprovalsLatest = latestMortgage.approvals;
  existing.snapshot.mortgageApprovalsLatestMonth = latestMortgage.month;
  existing.snapshot.cashIsaDepositsLatest = latestIsa.balance;
  existing.snapshot.cashIsaDepositsLatestMonth = latestIsa.month;

  // ── Update generated date ────────────────────────────────────────────
  existing.generated = new Date().toISOString().slice(0, 10);

  // ── Write back ───────────────────────────────────────────────────────
  writeFileSync(dataPath, JSON.stringify(existing, null, 2));
  console.log(`\nWrote ${dataPath}`);
  console.log(`  Mortgage approvals: ${mortgageData[0].month} to ${latestMortgage.month}`);
  console.log(`  Cash ISA deposits:  ${isaData[0].month} to ${latestIsa.month}`);
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
