/**
 * fetch-iop-steel.js
 *
 * ONS Index of Production — basic iron and steel (SIC 24.1-3). Series K23I.
 * Monthly, base 2022 = 100 (CVMSA).
 *
 * Construction proxy: structural steel + rebar feed commercial buildings,
 * infrastructure, and large residential schemes. Together with cement
 * (K23F) and bricks, triangulates residential, commercial, and civil
 * construction activity at monthly cadence.
 *
 * Also a useful sovereign-capability indicator: UK basic-metals output
 * has been declining for two decades and the index reflects that.
 *
 * Source: ONS time series API (no auth, free public).
 * Endpoint: https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/K23I/data
 *
 * Output: public/data/iop-steel.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import { fetchOnsTimeSeries, buildOnsDataset } from "./lib/ons-fetch.js";

const URL =
  "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/K23I/data";

async function main() {
  console.log("Fetching ONS series K23I (IoP — basic iron and steel)…");
  const result = await fetchOnsTimeSeries(URL);
  if (result.months.length === 0) throw new Error("No monthly data");

  const out = buildOnsDataset({
    id: "iop-steel",
    pillar: "foundations",
    topic: "housing",
    sourceId: "ons-k23i",
    sourceName: "ONS Index of Production — Basic iron and steel (K23I)",
    url: URL,
    unit: "index (2022=100)",
    description:
      "Monthly Index of Production for SIC 24.1-3 — manufacture of basic iron and steel. Construction-and-industry proxy.",
    result,
    snapshotKeys: { value: "indexValue", period: "indexPeriod", unit: "indexUnit" },
  });

  writeFileSync("public/data/iop-steel.json", JSON.stringify(out, null, 2) + "\n");
  const latest = result.months[result.months.length - 1];
  console.log(
    `✓ public/data/iop-steel.json (${result.months.length} monthly; latest=${latest.value} for ${latest.period})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
