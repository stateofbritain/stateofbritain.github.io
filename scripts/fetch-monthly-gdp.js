/**
 * fetch-monthly-gdp.js
 *
 * ONS Monthly GDP index (chained volume measures) — series ECY2.
 * Headline real-terms GDP at monthly cadence.
 *
 * Output: public/data/monthly-gdp.json
 */
import { writeFileSync } from "fs";
import { fetchOnsTimeSeries, buildOnsDataset } from "./lib/ons-fetch.js";

const URL =
  "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ecy2/qna/data";

async function main() {
  console.log("Fetching ONS series ECY2 (monthly GDP index)…");
  const result = await fetchOnsTimeSeries(URL);
  if (result.months.length === 0) throw new Error("No monthly data");

  const out = buildOnsDataset({
    id: "monthly-gdp",
    pillar: "spending",
    topic: "spending",
    sourceId: "ons-ecy2",
    sourceName: "ONS Monthly GDP, chained volume measures (ECY2)",
    url: URL,
    unit: "index (2022=100)",
    description: "Monthly UK GDP, chained volume measures. Series ECY2.",
    result,
    snapshotKeys: {
      value: "gdpIndex",
      period: "gdpPeriod",
      unit: "gdpUnit",
    },
  });

  writeFileSync(
    "public/data/monthly-gdp.json",
    JSON.stringify(out, null, 2) + "\n"
  );
  const latest = result.months[result.months.length - 1];
  console.log(
    `✓ public/data/monthly-gdp.json (${result.months.length} months; latest=${latest.value} for ${latest.period})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
