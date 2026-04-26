/**
 * fetch-public-sector-debt.js
 *
 * ONS Public sector net debt as % of GDP (excluding public-sector banks)
 * — series HF6X. Monthly.
 *
 * Output: public/data/public-sector-debt.json
 */
import { writeFileSync } from "fs";
import { fetchOnsTimeSeries, buildOnsDataset } from "./lib/ons-fetch.js";

const URL =
  "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/hf6x/pusf/data";

async function main() {
  console.log("Fetching ONS series HF6X (PSND % GDP)…");
  const result = await fetchOnsTimeSeries(URL);
  if (result.months.length === 0) throw new Error("No monthly data");

  const out = buildOnsDataset({
    id: "public-sector-debt",
    pillar: "spending",
    topic: "spending",
    sourceId: "ons-hf6x",
    sourceName:
      "ONS Public sector net debt as % of GDP (excl. public-sector banks, HF6X)",
    url: URL,
    unit: "% of GDP",
    description: "Monthly PSND % of GDP. Series HF6X.",
    result,
    snapshotKeys: {
      value: "debtRatio",
      period: "debtPeriod",
      unit: "debtUnit",
    },
  });

  writeFileSync(
    "public/data/public-sector-debt.json",
    JSON.stringify(out, null, 2) + "\n"
  );
  const latest = result.months[result.months.length - 1];
  console.log(
    `✓ public/data/public-sector-debt.json (${result.months.length} months; latest ${latest.value}% for ${latest.period})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
