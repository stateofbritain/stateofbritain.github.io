/**
 * fetch-gas-imports.js
 *
 * UK gas-import country concentration (Herfindahl-Hirschman Index).
 * Computed monthly from HMRC bulk Country-of-Origin import records
 * for HS 2711.11 (LNG) + 2711.21 (pipeline natural gas), the same
 * slice used by gas-dependency.json. Higher HHI = more concentrated
 * supply = greater single-supplier risk.
 *
 * HHI = sum(share^2) × 10000, where share is each partner-country's
 * share of total UK gas imports for the month. Range 0–10000.
 *
 * Previous implementation tried to scrape DESNZ Energy Trends Section
 * 4 XLSX/ODS files; that source kept moving (URL renames, sheet-layout
 * changes), so we now compute HHI directly from HMRC bulk data which
 * is the authoritative customs source anyway.
 *
 * Source: HMRC bulk imports (bdsimp{YYMM}.zip; same archive as the
 * dependency cards).
 *
 * Output: public/data/gas-imports.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import { fetchImportsByOrigin } from "./lib/hmrc-bulk-imports.js";
import { lastNMonthIds } from "./lib/hmrc-trade-by-country.js";

const HS6 = ["271111", "271121"];
const WINDOW_MONTHS = 24;

function computeHHI(values) {
  const total = values.reduce((s, v) => s + v, 0);
  if (total <= 0) return null;
  let sumSq = 0;
  for (const v of values) {
    const share = v / total;
    sumSq += share * share;
  }
  return Math.round(sumSq * 10000);
}

async function main() {
  const monthIds = lastNMonthIds(WINDOW_MONTHS);
  const series = [];
  for (const id of monthIds) {
    let rows;
    try {
      rows = await fetchImportsByOrigin({ hs2: "27", hs6In: HS6, monthId: id });
    } catch (err) {
      console.warn(`  ${id}: failed (${err.message})`);
      continue;
    }
    if (!rows || rows.length === 0) {
      console.warn(`  ${id}: no rows`);
      continue;
    }
    // One row per partner; computeHHI uses £ value for stable comparability.
    const month = rows[0].month;
    const values = rows.map((r) => r.importGbp || 0).filter((v) => v > 0);
    const hhi = computeHHI(values);
    if (hhi != null) {
      series.push({ month, hhi, partners: values.length });
      console.log(`  ${month}: HHI ${hhi} across ${values.length} partners`);
    }
  }

  series.sort((a, b) => a.month.localeCompare(b.month));
  const latest = series[series.length - 1] || null;

  const output = {
    $schema: "sob-dataset-v1",
    id: "gas-imports",
    pillar: "foundations",
    topic: "energy",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "hmrc-bulk-gas",
        name: "HMRC bulk imports — natural gas (HS 2711.11 + 2711.21)",
        url: "https://www.uktradeinfo.com/trade-data/latest-bulk-data-sets/",
        publisher: "HMRC",
        note: "Monthly Herfindahl-Hirschman Index of UK gas-import country concentration, computed from HMRC bulk Country-of-Origin records. £-value shares per partner-country across HS 2711.11 (LNG) + 2711.21 (pipeline gas). Higher = more concentrated supply.",
      },
    ],
    snapshot: {
      hhi: latest?.hhi ?? null,
      hhiMonth: latest?.month ?? null,
      hhiUnit: "Herfindahl-Hirschman Index (×10000)",
      partners: latest?.partners ?? null,
    },
    series: {
      monthly: {
        sourceId: "hmrc-bulk-gas",
        timeField: "month",
        unit: "HHI (×10000)",
        description:
          "Monthly Herfindahl-Hirschman Index of UK gas-import country concentration, derived from HMRC bulk-COO import records for HS 2711.11 + 2711.21.",
        data: series,
      },
    },
  };

  writeFileSync(
    "public/data/gas-imports.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `\n✓ public/data/gas-imports.json (${series.length} months; latest HHI ${latest?.hhi ?? "—"} for ${latest?.month ?? "—"})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
