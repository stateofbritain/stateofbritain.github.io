/**
 * fetch-crude-oil-dependency.js
 *
 * UK crude oil imports. HS 2709 (crude petroleum). Distinct from
 * refined petroleum (HS 2710) which has its own card.
 *
 * The UK is both a producer (UKCS) and substantial importer of crude
 * because UK refineries are configured for specific crude grades that
 * differ from local UKCS output. UK produces ~30m tonnes/yr of crude;
 * imports ~50m tonnes; consumes ~50m tonnes through refineries —
 * meaning a chunk of UKCS crude is exported. SS for refinery feedstock
 * purposes is around 35%; we use 0.35.
 *
 * Output: public/data/crude-oil-dependency.json
 */
import { lastNMonthIds } from "./lib/hmrc-bulk-imports.js";
import { buildDependencyDataset } from "./lib/build-dependency-dataset.js";

async function main() {
  await buildDependencyDataset({
    id: "crude-oil-dependency",
    title: "Crude oil",
    hs2: "27",
    hs6In: ["270900"],
    monthIds: lastNMonthIds(24),
    metric: "value",
    selfSufficiency: 0.35,
    unit: "£ / month",
    description:
      "Monthly UK crude oil imports (HS 2709) by alignment, plus an estimated UKCS production component derived from a 35% self-sufficiency ratio.",
    outputPath: "public/data/crude-oil-dependency.json",
    sources: [
      {
        id: "hmrc-bulk-2709",
        name: "HMRC Bulk Imports — crude oil (HS 2709)",
        url: "https://www.uktradeinfo.com/trade-data/latest-bulk-data-sets/",
        publisher: "HMRC",
        note: "Monthly per-origin UK crude oil imports.",
      },
      {
        id: "desnz-oil",
        name: "DESNZ — UK crude oil production",
        url: "https://www.gov.uk/government/statistics/energy-trends-section-3-oil-and-oil-products",
        publisher: "DESNZ",
        note:
          "UKCS produces ~30m tonnes/yr of crude; imports ~50m tonnes; SS for refinery-feedstock purposes is around 35%. Note: UKCS crude is partially exported because UK refineries need specific grades.",
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
main().catch((err) => { console.error(err); process.exit(1); });
