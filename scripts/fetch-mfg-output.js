/**
 * fetch-mfg-output.js
 *
 * ONS Index of Production — manufacturing output (Sections C). Series K222.
 * Monthly. Headline manufacturing-sector activity.
 */
import { writeFileSync } from "fs";
import { fetchOnsTimeSeries, buildOnsDataset } from "./lib/ons-fetch.js";

const URL =
  "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/k222/data";

async function main() {
  console.log("Fetching ONS series K222 (manufacturing output)…");
  const result = await fetchOnsTimeSeries(URL);
  if (result.months.length === 0) throw new Error("No monthly data");
  const out = buildOnsDataset({
    id: "mfg-output",
    pillar: "growth",
    topic: "industrial",
    sourceId: "ons-k222",
    sourceName: "ONS Index of Production — Manufacturing (K222)",
    url: URL,
    unit: "index (2022=100)",
    description: "Monthly UK manufacturing output index. Series K222.",
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
