/**
 * fetch-economic-inactivity.js
 *
 * ONS economic inactivity rate, ages 16-64 (seasonally adjusted) — series LF22.
 * Monthly. Captures people who are neither employed nor seeking work — long-
 * term sick, students, carers, retired-early. Important counterpart to
 * unemployment because it's where post-COVID labour-supply contraction shows.
 *
 * Output: public/data/economic-inactivity.json
 */
import { writeFileSync } from "fs";
import { fetchOnsTimeSeries, buildOnsDataset } from "./lib/ons-fetch.js";

const URL =
  "https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/economicinactivity/timeseries/lf2s/lms/data";

async function main() {
  console.log("Fetching ONS series LF2S (economic inactivity rate)…");
  const result = await fetchOnsTimeSeries(URL);
  if (result.months.length === 0) throw new Error("No monthly data");

  const out = buildOnsDataset({
    id: "economic-inactivity",
    pillar: "growth",
    topic: "jobs",
    sourceId: "ons-lf2s",
    sourceName: "ONS Economic inactivity rate (16-64, seasonally adjusted, LF2S)",
    url: URL,
    unit: "%",
    description:
      "Monthly UK economic inactivity rate (16-64). Series LF2S.",
    result,
    snapshotKeys: { value: "rate", period: "ratePeriod", unit: "rateUnit" },
  });

  writeFileSync(
    "public/data/economic-inactivity.json",
    JSON.stringify(out, null, 2) + "\n"
  );
  const latest = result.months[result.months.length - 1];
  console.log(
    `✓ public/data/economic-inactivity.json (${result.months.length} months; latest ${latest.value}% for ${latest.period})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
