/**
 * fetch-savings.js
 *
 * Fetches Bank of England data for:
 *  - Mortgage approvals for house purchase (series LPMVTVX, monthly, seasonally adjusted)
 *  - Cash ISA deposits outstanding (series LPMB4F6, monthly, seasonally adjusted, £millions)
 *  - Consumer credit outstanding (series LPMVVYI, monthly, seasonally adjusted, £millions)
 *  - Credit card lending outstanding (series LPMVZRJ, monthly, seasonally adjusted, £millions)
 *  - Effective interest rate on new mortgage lending (series IUMBV34, monthly, %)
 *
 * Merges the series into the existing money-supply.json dataset.
 *
 * Outputs: public/data/money-supply.json (updated in-place)
 */
import { writeFileSync, readFileSync } from "fs";

// BoE API only reliably handles ~2 series per call, so we split into batches
const BOE_BASE =
  "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?" +
  "csv.x=yes&Datefrom=01/Jan/2000&Dateto=31/Dec/2026&CSVF=TN&UsingCodes=Y";

const BATCH_1_URL = `${BOE_BASE}&SeriesCodes=LPMVTVX,LPMB4F6`;
const BATCH_2_URL = `${BOE_BASE}&SeriesCodes=LPMVVYI,LPMVZRJ`;
const BATCH_3_URL = `${BOE_BASE}&SeriesCodes=IUMBV34`;

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

// ── Fetch and parse ────────────────────────────────────────────────────
async function main() {
  console.log("Fetching BoE personal finance series...");

  // Fetch all batches in parallel
  const [res1, res2, res3] = await Promise.all([
    fetch(BATCH_1_URL),
    fetch(BATCH_2_URL),
    fetch(BATCH_3_URL),
  ]);
  for (const r of [res1, res2, res3]) {
    if (!r.ok) throw new Error(`BoE API returned ${r.status}: ${r.statusText}`);
  }

  const rows1 = parseBoeCSV(await res1.text());
  const rows2 = parseBoeCSV(await res2.text());
  const rows3 = parseBoeCSV(await res3.text());

  // Extract each series
  const mortgageData = rows1.filter(r => r.LPMVTVX != null).map(r => ({ month: r.month, approvals: Math.round(r.LPMVTVX) }));
  const isaData = rows1.filter(r => r.LPMB4F6 != null).map(r => ({ month: r.month, balance: Math.round(r.LPMB4F6) }));
  const consumerCreditData = rows2.filter(r => r.LPMVVYI != null).map(r => ({ month: r.month, outstanding: Math.round(r.LPMVVYI) }));
  const creditCardData = rows2.filter(r => r.LPMVZRJ != null).map(r => ({ month: r.month, outstanding: Math.round(r.LPMVZRJ) }));
  const mortgageRateData = rows3.filter(r => r.IUMBV34 != null).map(r => ({ month: r.month, rate: r.IUMBV34 }));

  console.log(`  Mortgage approvals: ${mortgageData.length} points`);
  console.log(`  Cash ISA deposits:  ${isaData.length} points`);
  console.log(`  Consumer credit:    ${consumerCreditData.length} points`);
  console.log(`  Credit card lending: ${creditCardData.length} points`);
  console.log(`  Mortgage rate:      ${mortgageRateData.length} points`);

  if (mortgageData.length === 0) throw new Error("No mortgage approval data parsed");
  if (isaData.length === 0) throw new Error("No cash ISA data parsed");
  if (consumerCreditData.length === 0) throw new Error("No consumer credit data parsed");
  if (creditCardData.length === 0) throw new Error("No credit card data parsed");
  if (mortgageRateData.length === 0) throw new Error("No mortgage rate data parsed");

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

  if (!sourceIds.has("boe-consumer-credit")) {
    existing.sources.push({
      id: "boe-consumer-credit",
      name: "Bank of England Consumer Credit Statistics",
      url: "https://www.bankofengland.co.uk/statistics/money-and-credit/2024/november",
      publisher: "Bank of England",
      note: "Consumer credit and credit card lending outstanding, seasonally adjusted, £millions",
    });
  }

  if (!sourceIds.has("boe-effective-rates")) {
    existing.sources.push({
      id: "boe-effective-rates",
      name: "Bank of England Effective Interest Rates",
      url: "https://www.bankofengland.co.uk/statistics/interest-rate-statistics",
      publisher: "Bank of England",
      note: "Effective interest rate on new mortgage lending (IUMBV34 series), %",
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

  existing.series.consumerCredit = {
    sourceId: "boe-consumer-credit",
    label: "Consumer Credit Outstanding",
    unit: "£m",
    timeField: "month",
    data: consumerCreditData,
  };

  existing.series.creditCardLending = {
    sourceId: "boe-consumer-credit",
    label: "Credit Card Lending Outstanding",
    unit: "£m",
    timeField: "month",
    data: creditCardData,
  };

  existing.series.mortgageRate = {
    sourceId: "boe-effective-rates",
    label: "Effective Interest Rate on New Mortgage Lending",
    unit: "%",
    timeField: "month",
    data: mortgageRateData,
  };

  // ── Update snapshot values ───────────────────────────────────────────
  const latestMortgage = mortgageData[mortgageData.length - 1];
  const latestIsa = isaData[isaData.length - 1];
  const latestConsumerCredit = consumerCreditData[consumerCreditData.length - 1];
  const latestCreditCard = creditCardData[creditCardData.length - 1];
  const latestRate = mortgageRateData[mortgageRateData.length - 1];

  existing.snapshot.mortgageApprovalsLatest = latestMortgage.approvals;
  existing.snapshot.mortgageApprovalsLatestMonth = latestMortgage.month;
  existing.snapshot.cashIsaDepositsLatest = latestIsa.balance;
  existing.snapshot.cashIsaDepositsLatestMonth = latestIsa.month;
  existing.snapshot.consumerCreditLatest = latestConsumerCredit.outstanding;
  existing.snapshot.consumerCreditLatestMonth = latestConsumerCredit.month;
  existing.snapshot.creditCardLendingLatest = latestCreditCard.outstanding;
  existing.snapshot.creditCardLendingLatestMonth = latestCreditCard.month;
  existing.snapshot.mortgageRateLatest = latestRate.rate;
  existing.snapshot.mortgageRateLatestMonth = latestRate.month;

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
