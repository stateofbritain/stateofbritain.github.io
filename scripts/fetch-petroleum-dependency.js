/**
 * fetch-petroleum-dependency.js
 *
 * UK refined petroleum imports + estimated UK refinery production,
 * broken down by trade-partner alignment with the UK at the UN.
 * HS 2710.12 (light oils — motor gasoline) and 2710.19 (other oils —
 * diesel, jet, heating oil, gas oil). Excludes crude oil (HS 2709)
 * and waste oils.
 *
 * Domestic production is derived from a published self-sufficiency
 * ratio. UK refinery output ~50m tonnes/yr against ~70m tonnes
 * consumption — about 70% self-sufficient. Petroineos Grangemouth
 * shut in 2025; output trending lower year-on-year.
 *
 * Output: public/data/petroleum-dependency.json
 * Schedule: monthly on the 18th.
 */
import { lastNMonthIds } from "./lib/hmrc-bulk-imports.js";
import { buildDependencyDataset } from "./lib/build-dependency-dataset.js";

async function main() {
  await buildDependencyDataset({
    id: "petroleum-dependency",
    title: "Refined petroleum",
    hs2: "27",
    hs6In: ["271012", "271019"],
    monthIds: lastNMonthIds(24),
    metric: "value",
    selfSufficiency: 0.70,
    unit: "£ / month",
    description:
      "Monthly UK refined petroleum supply: HS 2710.12 (gasoline) + 2710.19 (diesel/jet/heating) imports by alignment bucket, plus an estimated UK refinery production component derived from a 70% self-sufficiency ratio.",
    outputPath: "public/data/petroleum-dependency.json",
    sources: [
      {
        id: "hmrc-bulk-2710",
        name: "HMRC Bulk Imports — refined petroleum (HS 2710.12 + 2710.19)",
        url: "https://www.uktradeinfo.com/trade-data/latest-bulk-data-sets/",
        publisher: "HMRC",
        note:
          "Monthly per-origin UK imports of motor gasoline (2710.12) and middle distillates/diesel/jet/heating oil (2710.19). Country of Origin from bdsimp{YYMM} fixed-width files.",
      },
      {
        id: "desnz-refinery-output",
        name: "DESNZ — UK refinery production self-sufficiency",
        url: "https://www.gov.uk/government/statistics/energy-trends-section-3-oil-and-oil-products",
        publisher: "DESNZ",
        note:
          "UK refinery output runs at approximately 70% of total petroleum-product demand (DESNZ Energy Trends 2024 provisional). Used to derive monthly £-denominated production via production = SS/(1-SS) × net imports. Petroineos Grangemouth refinery closed in 2025; the SS ratio has been trending lower year-on-year.",
      },
      {
        id: "voeten-unga",
        name: "Voeten — UN General Assembly Voting Data",
        url: "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/LEJUQZ",
        publisher: "Harvard Dataverse",
        note: "Used to classify each trade partner into an alignment bucket.",
      },
    ],
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
