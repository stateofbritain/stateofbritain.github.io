/**
 * fetch-aluminium-dependency.js
 *
 * UK aluminium imports + estimated UK smelter production. HS 7601
 * (unwrought aluminium) plus rolled / extruded / wire (7604-7616).
 *
 * UK has one operating primary smelter — Lochaber — at ~40kt/yr;
 * UK consumption ~600kt/yr; SS roughly 0.07-0.10. Most UK
 * "aluminium production" by tonnage is downstream rolling/extrusion
 * of imported metal. We use SS=0.10 to capture both primary and
 * secondary (recycled) supply.
 *
 * Output: public/data/aluminium-dependency.json
 */
import { lastNMonthIds } from "./lib/hmrc-bulk-imports.js";
import { buildDependencyDataset } from "./lib/build-dependency-dataset.js";

async function main() {
  await buildDependencyDataset({
    id: "aluminium-dependency",
    title: "Aluminium",
    hs2: "76",
    monthIds: lastNMonthIds(24),
    metric: "value",
    selfSufficiency: 0.10,
    unit: "£ / month",
    description:
      "Monthly UK aluminium supply: HS 76 (raw metal + rolled/extruded/wire) imports by alignment bucket, plus an estimated UK smelter and recycler production component (SS=10%; UK has one primary smelter at Lochaber).",
    outputPath: "public/data/aluminium-dependency.json",
    sources: [
      {
        id: "hmrc-bulk-76",
        name: "HMRC Bulk Imports — aluminium (HS 76)",
        url: "https://www.uktradeinfo.com/trade-data/latest-bulk-data-sets/",
        publisher: "HMRC",
        note: "Monthly per-origin UK aluminium imports across HS chapter 76.",
      },
      {
        id: "uk-aluminium-baseline",
        name: "UK aluminium self-sufficiency estimate",
        url: "https://www.alfed.org.uk/",
        publisher: "ALFED — Aluminium Federation",
        note:
          "Lochaber smelter ~40kt/yr; total UK demand ~600kt/yr; SS ~0.07-0.10. Used to derive monthly £ production via SS/(1-SS) × net imports.",
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
