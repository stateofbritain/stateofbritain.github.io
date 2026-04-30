/**
 * fetch-copper-dependency.js
 *
 * UK copper imports. HS 74 covers all copper products (refined,
 * tubes, wire, foil). UK has near-zero primary copper production —
 * we treat this as imports-only with no production component.
 *
 * Output: public/data/copper-dependency.json
 */
import { lastNMonthIds } from "./lib/hmrc-bulk-imports.js";
import { buildDependencyDataset } from "./lib/build-dependency-dataset.js";

async function main() {
  await buildDependencyDataset({
    id: "copper-dependency",
    title: "Copper",
    hs2: "74",
    monthIds: lastNMonthIds(24),
    metric: "value",
    unit: "£ / month",
    description:
      "Monthly UK copper imports across HS chapter 74 (raw + downstream products), broken down by alignment. UK has effectively no domestic primary copper production.",
    outputPath: "public/data/copper-dependency.json",
    sources: [
      {
        id: "hmrc-bulk-74",
        name: "HMRC Bulk Imports — copper (HS 74)",
        url: "https://www.uktradeinfo.com/trade-data/latest-bulk-data-sets/",
        publisher: "HMRC",
        note: "Monthly per-origin UK copper imports.",
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
