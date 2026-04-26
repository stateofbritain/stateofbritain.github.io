/**
 * fetch-mfg-output.js
 *
 * ONS Index of Production — manufacturing output (SIC C). Series K22A.
 * Monthly, base 2022 = 100 (CVMSA). Headline manufacturing-sector
 * activity.
 *
 * (Earlier version of this script used K222 by mistake — K222 is the
 * broader B-E "Production" index, including mining and utilities.
 * K22A is manufacturing alone.)
 */
import { writeFileSync } from "fs";
import { fetchOnsTimeSeries, buildOnsDataset } from "./lib/ons-fetch.js";

const URL =
  "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/K22A/data";

async function main() {
  console.log("Fetching ONS series K22A (manufacturing output)…");
  const result = await fetchOnsTimeSeries(URL);
  if (result.months.length === 0) throw new Error("No monthly data");
  const out = buildOnsDataset({
    id: "mfg-output",
    pillar: "growth",
    topic: "industrial",
    sourceId: "ons-k22a",
    sourceName: "ONS Index of Production — Manufacturing (K22A)",
    url: URL,
    unit: "index (2022=100)",
    description: "Monthly UK manufacturing output index. Series K22A.",
    result,
    snapshotKeys: { value: "index", period: "indexPeriod", unit: "indexUnit" },
  });
  writeFileSync(
    "public/data/mfg-output.json",
    JSON.stringify(out, null, 2) + "\n"
  );
  const latest = result.months[result.months.length - 1];
  console.log(
    `✓ public/data/mfg-output.json (${result.months.length} months; latest=${latest.value} for ${latest.period})`
  );
}
main().catch((err) => { console.error(err); process.exit(1); });
