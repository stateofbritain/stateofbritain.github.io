/**
 * fetch-polymers-dependency.js
 *
 * UK plastics and polymer imports. HS chapter 39 covers polymer
 * resins (3901-3914) plus downstream products (3915-3926). Major
 * manufacturing input across packaging, automotive, construction,
 * electronics.
 *
 * UK petrochemicals industry (Sabic, Ineos, Petrochem) produces a
 * substantial share of demand. Aggregate SS ~40-50%; we use 0.45.
 *
 * Output: public/data/polymers-dependency.json
 */
import { lastNMonthIds } from "./lib/hmrc-bulk-imports.js";
import { buildDependencyDataset } from "./lib/build-dependency-dataset.js";

async function main() {
  await buildDependencyDataset({
    id: "polymers-dependency",
    title: "Polymers",
    hs2: "39",
    monthIds: lastNMonthIds(24),
    metric: "value",
    selfSufficiency: 0.45,
    unit: "£ / month",
    description:
      "Monthly UK polymer imports (HS 39: resins + downstream products) by alignment, plus an estimated UK petrochemical production component (SS=45%).",
    outputPath: "public/data/polymers-dependency.json",
    sources: [
      {
        id: "hmrc-bulk-39",
        name: "HMRC Bulk Imports — plastics & polymers (HS 39)",
        url: "https://www.uktradeinfo.com/trade-data/latest-bulk-data-sets/",
        publisher: "HMRC",
        note: "Monthly per-origin UK polymer and plastics imports across HS chapter 39.",
      },
      {
        id: "uk-petrochem-baseline",
        name: "UK polymer industry self-sufficiency",
        url: "https://www.bpf.co.uk/",
        publisher: "British Plastics Federation",
        note:
          "UK petrochemical and plastics industry covers ~40-50% of total polymer demand. Used to derive monthly £ production via SS/(1-SS) × net imports.",
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
