/**
 * fetch-avg-weekly-hours.js
 *
 * ONS Average Actual Weekly Hours of work — total. Series YBUS.
 * Monthly. Captures both intensive margin (hours per worker) and
 * compositional shifts (e.g. growth in part-time / zero-hours).
 */
import { writeFileSync } from "fs";
import { fetchOnsTimeSeries, buildOnsDataset } from "./lib/ons-fetch.js";

const URL =
  "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/ybus/lms/data";

async function main() {
  console.log("Fetching ONS series YBUS (average actual weekly hours)…");
  const result = await fetchOnsTimeSeries(URL);
  if (result.months.length === 0) throw new Error("No monthly data");
  const out = buildOnsDataset({
    id: "avg-weekly-hours",
    pillar: "growth",
    topic: "jobs",
    sourceId: "ons-ybus",
    sourceName: "ONS Average actual weekly hours, total (YBUS)",
    url: URL,
    unit: "hours / week",
    description: "Monthly average actual weekly hours worked, total.",
    result,
    snapshotKeys: { value: "hours", period: "hoursPeriod", unit: "hoursUnit" },
  });
  writeFileSync(
    "public/data/avg-weekly-hours.json",
    JSON.stringify(out, null, 2) + "\n"
  );
  const latest = result.months[result.months.length - 1];
  console.log(
    `✓ public/data/avg-weekly-hours.json (${result.months.length} months; latest ${latest.value}h for ${latest.period})`
  );
}
main().catch((err) => { console.error(err); process.exit(1); });
