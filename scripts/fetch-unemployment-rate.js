/**
 * fetch-unemployment-rate.js
 *
 * ONS unemployment rate (16+, seasonally adjusted) — series MGSX.
 * Monthly. Headline UK labour-market metric.
 *
 * NOTE: ONS LFS-derived statistics are flagged as "in development" since
 * Feb 2024; treat the absolute value with caution but the trend is still
 * informative.
 *
 * Output: public/data/unemployment-rate.json
 */
import { writeFileSync } from "fs";
import { fetchOnsTimeSeries, buildOnsDataset } from "./lib/ons-fetch.js";

const URL =
  "https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgsx/lms/data";

async function main() {
  console.log("Fetching ONS series MGSX (unemployment rate)…");
  const result = await fetchOnsTimeSeries(URL);
  if (result.months.length === 0) throw new Error("No monthly data");

  const out = buildOnsDataset({
    id: "unemployment-rate",
    pillar: "growth",
    topic: "jobs",
    sourceId: "ons-mgsx",
    sourceName: "ONS Unemployment rate (aged 16+, seasonally adjusted)",
    url: URL,
    unit: "%",
    description:
      "Monthly UK unemployment rate. Series MGSX. Note: LFS-derived statistics flagged as 'in development' since Feb 2024.",
    result,
    snapshotKeys: { value: "rate", period: "ratePeriod", unit: "rateUnit" },
  });

  writeFileSync(
    "public/data/unemployment-rate.json",
    JSON.stringify(out, null, 2) + "\n"
  );
  const latest = result.months[result.months.length - 1];
  console.log(
    `✓ public/data/unemployment-rate.json (${result.months.length} months; latest ${latest.value}% for ${latest.period})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
