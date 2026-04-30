/**
 * fetch-fertilisers-dependency.js
 *
 * UK fertiliser imports. HS chapter 31 covers nitrogen (3102),
 * phosphate (3103), potash (3104), and compound fertilisers (3105).
 * Strategic importance: agricultural input, with supply concentrated
 * in Russia, Belarus (potash) and the Middle East / Morocco (phosphate).
 *
 * UK has CF Industries Billingham (nitrogen) and Cleveland Potash
 * (potash). Aggregate self-sufficiency ~30%; we use 0.30.
 *
 * Output: public/data/fertilisers-dependency.json
 */
import { lastNMonthIds } from "./lib/hmrc-bulk-imports.js";
import { buildDependencyDataset } from "./lib/build-dependency-dataset.js";

async function main() {
  await buildDependencyDataset({
    id: "fertilisers-dependency",
    title: "Fertilisers",
    hs2: "31",
    monthIds: lastNMonthIds(24),
    metric: "value",
    selfSufficiency: 0.30,
    unit: "£ / month",
    description:
      "Monthly UK fertiliser imports (HS 31: nitrogen / phosphate / potash / compounds) by alignment, plus an estimated UK production component (SS=30%).",
    outputPath: "public/data/fertilisers-dependency.json",
    sources: [
      {
        id: "hmrc-bulk-31",
        name: "HMRC Bulk Imports — fertilisers (HS 31)",
        url: "https://www.uktradeinfo.com/trade-data/latest-bulk-data-sets/",
        publisher: "HMRC",
        note: "Monthly per-origin UK fertiliser imports.",
      },
      {
        id: "uk-agri-baseline",
        name: "UK fertiliser self-sufficiency",
        url: "https://www.gov.uk/government/statistics/agriculture-in-the-united-kingdom",
        publisher: "DEFRA",
        note:
          "UK manufactures ~30% of total fertiliser demand (CF Industries Billingham nitrogen; Cleveland Potash). Used to derive monthly £ production via SS/(1-SS) × net imports.",
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
