/**
 * fetch-services-output.js
 *
 * ONS Index of Services. Series S2KU (all services, chained volume measures).
 * Monthly. Headline services-sector activity (~80% of UK GDP).
 */
import { writeFileSync } from "fs";
import { fetchOnsTimeSeries, buildOnsDataset } from "./lib/ons-fetch.js";

const URL =
  "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/s2ku/ios1/data";

async function main() {
  console.log("Fetching ONS series S2KU (services output index)…");
  const result = await fetchOnsTimeSeries(URL);
  if (result.months.length === 0) throw new Error("No monthly data");
  const out = buildOnsDataset({
    id: "services-output",
    pillar: "growth",
    topic: "industrial",
    sourceId: "ons-s2ku",
    sourceName: "ONS Index of Services (S2KU)",
    url: URL,
    unit: "index (2022=100)",
    description: "Monthly UK services output index, chained volume measures.",
    result,
    snapshotKeys: { value: "index", period: "indexPeriod", unit: "indexUnit" },
  });
  writeFileSync(
    "public/data/services-output.json",
    JSON.stringify(out, null, 2) + "\n"
  );
  const latest = result.months[result.months.length - 1];
  console.log(
    `✓ public/data/services-output.json (${result.months.length} months; latest=${latest.value} for ${latest.period})`
  );
}
main().catch((err) => { console.error(err); process.exit(1); });
