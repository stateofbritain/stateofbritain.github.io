/**
 * fetch-employment-rate.js
 *
 * ONS Employment rate, ages 16-64 (seasonally adjusted) — series LF24.
 * Monthly headline labour market metric.
 *
 * Output: public/data/employment-rate.json
 */
import { writeFileSync } from "fs";
import { fetchOnsTimeSeries, buildOnsDataset } from "./lib/ons-fetch.js";

const URL =
  "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/timeseries/lf24/lms/data";

async function main() {
  console.log("Fetching ONS series LF24 (employment rate)…");
  const result = await fetchOnsTimeSeries(URL);
  if (result.months.length === 0) throw new Error("No monthly data");

  const out = buildOnsDataset({
    id: "employment-rate",
    pillar: "growth",
    topic: "jobs",
    sourceId: "ons-lf24",
    sourceName: "ONS Employment rate (16-64, seasonally adjusted)",
    url: URL,
    unit: "%",
    description: "Monthly UK employment rate. Series LF24.",
    result,
    snapshotKeys: { value: "rate", period: "ratePeriod", unit: "rateUnit" },
  });

  writeFileSync(
    "public/data/employment-rate.json",
    JSON.stringify(out, null, 2) + "\n"
  );
  const latest = result.months[result.months.length - 1];
  console.log(
    `✓ public/data/employment-rate.json (${result.months.length} months; latest ${latest.value}% for ${latest.period})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
