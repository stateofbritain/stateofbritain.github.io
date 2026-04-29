/**
 * fetch-steel-dependency.js
 *
 * UK steel supply broken down by trade-partner alignment with the UK
 * at the UN General Assembly. Domestic production is estimated from
 * the ONS K23I index scaled against the UK Steel 2022 baseline.
 *
 * Output: public/data/steel-dependency.json (sob-dataset-v1).
 * Schedule: monthly on the 16th (HMRC OTS publishes ~13th for M-2).
 */
import { readFileSync } from "fs";
import { lastNMonthIds } from "./lib/hmrc-trade-by-country.js";
import { buildDependencyDataset } from "./lib/build-dependency-dataset.js";

const PROD_PATH = "public/data/iop-steel.json";
// UK 2022 crude steel production: 6.1m tonnes/yr ÷ 12 = 508,333
// tonnes/month at K23I = 100. Scales the production index back to
// absolute monthly tonnage. UK Steel Statistical Yearbook 2023.
const UK_2022_BASELINE_MONTHLY_TONNES = 508_333;

function readK23iLookup() {
  const raw = JSON.parse(readFileSync(PROD_PATH, "utf-8"));
  const byPeriod = new Map();
  for (const r of raw.series?.monthly?.data || []) {
    if (r.period && Number.isFinite(r.value)) byPeriod.set(r.period, r.value);
  }
  return byPeriod;
}

async function main() {
  const k23i = readK23iLookup();

  await buildDependencyDataset({
    id: "steel-dependency",
    title: "Steel",
    hs2: "72",
    hs4Range: [7208, 7229],
    monthIds: lastNMonthIds(24),
    metric: "tonnes",
    productionFor: (period) => {
      const idx = k23i.get(period);
      if (idx == null) return null;
      return Math.round((idx / 100) * UK_2022_BASELINE_MONTHLY_TONNES);
    },
    unit: "tonnes / month",
    description:
      "Monthly UK supply of finished steel: production estimate plus imports broken down by trade partner alignment bucket.",
    outputPath: "public/data/steel-dependency.json",
    sources: [
      {
        id: "hmrc-ots-72-finished",
        name: "HMRC Overseas Trade — finished steel (HS 7208-7229)",
        url: "https://www.uktradeinfo.com/trade-data/ots-custom-table/",
        publisher: "HMRC",
        note: "Monthly per-partner trade in finished steel products.",
      },
      {
        id: "ons-iop-k23i",
        name: "ONS Index of Production — Basic iron and steel (K23I)",
        url: "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/K23I/data",
        publisher: "ONS",
        note: "Monthly production index, 2022 = 100, CVMSA.",
      },
      {
        id: "uksteel-2022-baseline",
        name: "UK Steel Statistical Yearbook 2023 — 2022 baseline",
        url: "https://www.uksteel.org/uk-steel-publications-1",
        publisher: "UK Steel",
        note:
          "2022 UK crude steel production: 6.1 million tonnes ÷ 12 = 508,333 tonnes/month at K23I = 100.",
      },
      {
        id: "voeten-unga",
        name: "Voeten — UN General Assembly Voting Data",
        url: "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/LEJUQZ",
        publisher: "Harvard Dataverse (Erik Voeten)",
        note: "Used to classify each trade partner into an alignment bucket.",
      },
    ],
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
