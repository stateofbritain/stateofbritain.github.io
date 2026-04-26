/**
 * fetch-iop-cement.js
 *
 * ONS Index of Production — cement, lime, plaster + concrete/cement/plaster
 * articles (SIC 23.5-6). Series K23F. Monthly, base 2022 = 100 (CVMSA).
 *
 * Strong leading indicator for whole-economy construction activity:
 * weighted toward commercial buildings, civil engineering, and
 * infrastructure (everywhere concrete is poured), so it complements the
 * residential-weighted brick deliveries series.
 *
 * Source: ONS time series API (no auth, free public).
 * Endpoint: https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/K23F/data
 *
 * Output: public/data/iop-cement.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import { fetchOnsTimeSeries, buildOnsDataset } from "./lib/ons-fetch.js";

const URL =
  "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/K23F/data";

async function main() {
  console.log("Fetching ONS series K23F (IoP — cement, lime, plaster, concrete articles)…");
  const result = await fetchOnsTimeSeries(URL);
  if (result.months.length === 0) throw new Error("No monthly data");

  const out = buildOnsDataset({
    id: "iop-cement",
    pillar: "foundations",
    topic: "housing",
    sourceId: "ons-k23f",
    sourceName: "ONS Index of Production — Cement, lime, plaster, concrete articles (K23F)",
    url: URL,
    unit: "index (2022=100)",
    description:
      "Monthly Index of Production for SIC 23.5-6 — manufacture of cement, lime, plaster, and concrete/cement/plaster articles. Whole-construction proxy.",
    result,
    snapshotKeys: { value: "indexValue", period: "indexPeriod", unit: "indexUnit" },
  });

  writeFileSync("public/data/iop-cement.json", JSON.stringify(out, null, 2) + "\n");
  const latest = result.months[result.months.length - 1];
  console.log(
    `✓ public/data/iop-cement.json (${result.months.length} monthly; latest=${latest.value} for ${latest.period})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
