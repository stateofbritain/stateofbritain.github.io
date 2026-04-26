/**
 * fetch-construction-output.js
 *
 * ONS Construction output — all work index, current prices. Series KFAP.
 * Monthly.
 */
import { writeFileSync } from "fs";
import { fetchOnsTimeSeries, buildOnsDataset } from "./lib/ons-fetch.js";

const URL =
  "https://www.ons.gov.uk/businessindustryandtrade/constructionindustry/timeseries/kfap/conout/data";

async function main() {
  console.log("Fetching ONS series KFAP (construction output, current prices)…");
  const result = await fetchOnsTimeSeries(URL);
  if (result.months.length === 0) throw new Error("No monthly data");
  const out = buildOnsDataset({
    id: "construction-output",
    pillar: "foundations",
    topic: "housing",
    sourceId: "ons-kfap",
    sourceName: "ONS Construction Output — all work (KFAP)",
    url: URL,
    unit: "£m / month (current prices)",
    description: "Monthly UK construction output, current prices. Series KFAP.",
    result,
    snapshotKeys: { value: "value", period: "valuePeriod", unit: "valueUnit" },
  });
  writeFileSync(
    "public/data/construction-output.json",
    JSON.stringify(out, null, 2) + "\n"
  );
  const latest = result.months[result.months.length - 1];
  console.log(
    `✓ public/data/construction-output.json (${result.months.length} months; latest £${latest.value}m for ${latest.period})`
  );
}
main().catch((err) => { console.error(err); process.exit(1); });
