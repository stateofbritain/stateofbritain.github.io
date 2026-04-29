/**
 * fetch-gas-dependency.js
 *
 * UK natural gas imports broken down by trade-partner alignment.
 * HS 2711.11 (liquefied natural gas) + 2711.21 (natural gas in
 * gaseous state, ie pipeline gas). Excludes LPG (HS 2711.12-19) which
 * is a separate strategic story.
 *
 * Domestic production: not yet wired. UK Continental Shelf gas output
 * is published monthly by DESNZ Energy Trends 4.1 but reading the
 * spreadsheet is brittle. Imports-only for v1; production component
 * is a planned follow-up using the same DESNZ source the existing
 * fetch-gas-imports.js script discovers for the HHI calculation.
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
    unit: "£ / month",
    description:
      "Monthly UK natural gas imports by trade-partner alignment bucket. HS 2711.11 (LNG) + HS 2711.21 (pipeline). Domestic production not yet included.",
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
