/**
 * fetch-gas-dependency.js
 *
 * UK natural gas imports + estimated UK Continental Shelf production,
 * broken down by trade-partner alignment.
 * HS 2711.11 (liquefied natural gas) + 2711.21 (natural gas in
 * gaseous state, ie pipeline gas). Excludes LPG (HS 2711.12-19).
 *
 * Domestic production is derived from a published self-sufficiency
 * ratio. UK consumed ~73 bcm of gas in 2023 against UKCS production of
 * ~32 bcm — about 44% self-sufficient. The ratio has been falling 2-3
 * percentage points per year as North Sea fields decline. We use 0.40
 * as a current-year estimate (DESNZ Energy Trends, 2024 provisional).
 *
 * Output: public/data/gas-dependency.json (sob-dataset-v1)
 * Schedule: monthly on the 16th.
 */
import { lastNMonthIds } from "./lib/hmrc-trade-by-country.js";
import { buildDependencyDataset } from "./lib/build-dependency-dataset.js";

async function main() {
  await buildDependencyDataset({
    id: "gas-dependency",
    title: "Natural gas",
    hs2: "27",
    hs6In: ["271111", "271121"],
    monthIds: lastNMonthIds(24),
    metric: "value",
    selfSufficiency: 0.40,
    unit: "£ / month",
    description:
      "Monthly UK natural gas supply: HS 2711.11 (LNG) + HS 2711.21 (pipeline) imports by alignment bucket, plus an estimated UKCS production component derived from a 40% self-sufficiency ratio.",
    outputPath: "public/data/gas-dependency.json",
    sources: [
      {
        id: "hmrc-ots-2711",
        name: "HMRC Overseas Trade — natural gas (HS 2711.11 + 2711.21)",
        url: "https://www.uktradeinfo.com/trade-data/ots-custom-table/",
        publisher: "HMRC",
        note:
          "Monthly per-partner trade in liquefied and gaseous natural gas. Excludes LPG (propane/butane) and other hydrocarbon gases.",
      },
      {
        id: "desnz-energy-trends",
        name: "DESNZ — UK natural gas self-sufficiency",
        url: "https://www.gov.uk/government/statistics/energy-trends-section-4-gas",
        publisher: "DESNZ",
        note:
          "UK Continental Shelf gas production runs at ~40% of total demand (DESNZ Energy Trends 2024 provisional). Used to derive monthly £-denominated production via production = SS/(1-SS) × net imports. Approximation; the SS ratio is falling 2-3pp/yr as North Sea fields decline.",
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
