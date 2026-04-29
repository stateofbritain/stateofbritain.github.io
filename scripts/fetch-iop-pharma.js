/**
 * fetch-iop-pharma.js
 *
 * ONS Index of Production — pharmaceutical preparations (SIC 21).
 * Series K23A. Monthly, 2022 = 100, CVMSA.
 *
 * Output: public/data/iop-pharma.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import { fetchOnsTimeSeries, buildOnsDataset } from "./lib/ons-fetch.js";

const URL =
  "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/K23A/data";

async function main() {
  console.log("Fetching ONS series K23A (IoP — pharmaceutical preparations)…");
  const result = await fetchOnsTimeSeries(URL);
  if (result.months.length === 0) throw new Error("No monthly data");

  const out = buildOnsDataset({
    id: "iop-pharma",
    pillar: "growth",
    topic: "industrial",
    sourceId: "ons-k23a",
    sourceName: "ONS Index of Production — Pharmaceutical preparations (K23A)",
    url: URL,
    unit: "index (2022=100)",
    description:
      "Monthly Index of Production for SIC 21 — manufacture of basic pharmaceutical products and preparations.",
    result,
    snapshotKeys: { value: "indexValue", period: "indexPeriod", unit: "indexUnit" },
  });

  writeFileSync("public/data/iop-pharma.json", JSON.stringify(out, null, 2) + "\n");
  const latest = result.months[result.months.length - 1];
  console.log(
    `✓ public/data/iop-pharma.json (${result.months.length} monthly; latest=${latest.value} for ${latest.period})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
