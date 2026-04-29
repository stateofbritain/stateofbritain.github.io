/**
 * fetch-semiconductor-dependency.js
 *
 * UK semiconductor imports broken down by trade-partner alignment.
 * HS 8541 (diodes, transistors, photovoltaic cells) and HS 8542
 * (electronic integrated circuits — ICs).
 *
 * Domestic production: not included. UK has minimal commercial
 * fabrication capacity; design-stage IP exists but the physical
 * supply chain is overseas. Treating supply as 100% imported is the
 * conservative honest reading.
 *
 * Output: public/data/semiconductor-dependency.json
 * Schedule: monthly on the 16th.
 */
import { lastNMonthIds } from "./lib/hmrc-trade-by-country.js";
import { buildDependencyDataset } from "./lib/build-dependency-dataset.js";

async function main() {
  await buildDependencyDataset({
    id: "semiconductor-dependency",
    title: "Semiconductors",
    hs2: "85",
    hs4Range: [8541, 8542],
    monthIds: lastNMonthIds(24),
    metric: "value",
    unit: "£ / month",
    description:
      "Monthly UK semiconductor imports by trade-partner alignment bucket. HS 8541 (diodes, transistors, photovoltaic cells) and 8542 (integrated circuits).",
    outputPath: "public/data/semiconductor-dependency.json",
    sources: [
      {
        id: "hmrc-ots-8541-8542",
        name: "HMRC Overseas Trade — semiconductors (HS 8541, 8542)",
        url: "https://www.uktradeinfo.com/trade-data/ots-custom-table/",
        publisher: "HMRC",
        note:
          "Monthly per-partner trade in semiconductor devices and integrated circuits. UK has minimal domestic fabrication; treating supply as fully imported.",
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
