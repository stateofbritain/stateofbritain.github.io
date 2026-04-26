/**
 * fetch-retail-sales.js
 *
 * ONS Retail Sales Index — quantity bought, all retailers excl. fuel,
 * seasonally adjusted (series J5EL). Monthly. Volume-based proxy for
 * consumer spending and high-street health.
 *
 * Output: public/data/retail-sales.json
 */
import { writeFileSync } from "fs";
import { fetchOnsTimeSeries, buildOnsDataset } from "./lib/ons-fetch.js";

const URL =
  "https://www.ons.gov.uk/businessindustryandtrade/retailindustry/timeseries/j5el/drsi/data";

async function main() {
  console.log("Fetching ONS series J5EL (retail sales volume index)…");
  const result = await fetchOnsTimeSeries(URL);
  if (result.months.length === 0) throw new Error("No monthly data");

  const out = buildOnsDataset({
    id: "retail-sales",
    pillar: "growth",
    topic: "jobs",
    sourceId: "ons-j5el",
    sourceName:
      "ONS Retail Sales Index — volume excl. automotive fuel, SA (J5EL)",
    url: URL,
    unit: "index (2022=100)",
    description:
      "Monthly retail sales volume index (excl. automotive fuel). Series J5EL.",
    result,
    snapshotKeys: { value: "index", period: "indexPeriod", unit: "indexUnit" },
  });

  writeFileSync(
    "public/data/retail-sales.json",
    JSON.stringify(out, null, 2) + "\n"
  );
  const latest = result.months[result.months.length - 1];
  console.log(
    `✓ public/data/retail-sales.json (${result.months.length} months; latest=${latest.value} for ${latest.period})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
