/**
 * fetch-cpi-inflation.js
 *
 * ONS CPI 12-month inflation rate — series D7G7. The Bank of England's
 * 2% target metric (alternative to CPIH).
 *
 * Output: public/data/cpi-inflation.json
 */
import { writeFileSync } from "fs";
import { fetchOnsTimeSeries, buildOnsDataset } from "./lib/ons-fetch.js";

const URL =
  "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g7/mm23/data";

async function main() {
  console.log("Fetching ONS series D7G7 (CPI 12-month rate)…");
  const result = await fetchOnsTimeSeries(URL);
  if (result.months.length === 0) throw new Error("No monthly data");

  const out = buildOnsDataset({
    id: "cpi-inflation",
    pillar: "spending",
    topic: "spending",
    sourceId: "ons-d7g7",
    sourceName: "ONS CPI 12-month inflation rate (D7G7)",
    url: URL,
    unit: "% YoY",
    description: "Monthly UK CPI 12-month inflation rate. Series D7G7.",
    result,
    snapshotKeys: { value: "rate", period: "ratePeriod", unit: "rateUnit" },
  });

  writeFileSync(
    "public/data/cpi-inflation.json",
    JSON.stringify(out, null, 2) + "\n"
  );
  const latest = result.months[result.months.length - 1];
  console.log(
    `✓ public/data/cpi-inflation.json (${result.months.length} months; latest ${latest.value}% for ${latest.period})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
