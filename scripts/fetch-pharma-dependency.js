/**
 * fetch-pharma-dependency.js
 *
 * UK pharmaceutical supply (HS chapter 30) broken down by trade-partner
 * alignment with the UK at the UN General Assembly.
 *
 * Pharma is a dual-flow story: the UK is a substantial pharmaceutical
 * MANUFACTURER (mostly fill-and-finish) and a substantial IMPORTER. The
 * "% domestic" figure overstates self-sufficiency for the strategic
 * question — most active pharmaceutical ingredients (APIs) are made in
 * China, India, and the EU, then formulated and packaged in the UK.
 * Caveat in the source note.
 *
 * Output: public/data/pharma-dependency.json (sob-dataset-v1).
 * Schedule: monthly on the 16th.
 */
import { readFileSync } from "fs";
import { lastNMonthIds } from "./lib/hmrc-trade-by-country.js";
import { buildDependencyDataset } from "./lib/build-dependency-dataset.js";

const PROD_PATH = "public/data/iop-pharma.json";
// UK 2022 pharmaceutical manufacturing turnover ~ £25bn / yr (ABPI
// Statistical Review 2023; ONS ABS SIC 21). Divided by 12 = £2.083bn
// / month at K23A = 100. Used to scale the production index back to
// absolute monthly £-output.
const UK_2022_BASELINE_MONTHLY_GBP = 2_083_000_000;

function readPharmaIndexLookup() {
  const raw = JSON.parse(readFileSync(PROD_PATH, "utf-8"));
  const byPeriod = new Map();
  for (const r of raw.series?.monthly?.data || []) {
    if (r.period && Number.isFinite(r.value)) byPeriod.set(r.period, r.value);
  }
  return byPeriod;
}

async function main() {
  const k23a = readPharmaIndexLookup();

  await buildDependencyDataset({
    id: "pharma-dependency",
    title: "Pharmaceuticals",
    hs2: "30",
    monthIds: lastNMonthIds(24),
    metric: "value",
    productionFor: (period) => {
      const idx = k23a.get(period);
      if (idx == null) return null;
      return Math.round((idx / 100) * UK_2022_BASELINE_MONTHLY_GBP);
    },
    unit: "£ / month",
    description:
      "Monthly UK pharma supply: production estimate (K23A index × 2022 baseline) plus imports broken down by trade partner alignment.",
    outputPath: "public/data/pharma-dependency.json",
    sources: [
      {
        id: "hmrc-ots-30",
        name: "HMRC Overseas Trade — pharmaceutical products (HS 30)",
        url: "https://www.uktradeinfo.com/trade-data/ots-custom-table/",
        publisher: "HMRC",
        note:
          "Monthly per-partner trade in HS chapter 30 (medicines, vaccines, blood products, surgical sutures, dressings).",
      },
      {
        id: "ons-iop-k23a",
        name: "ONS Index of Production — Pharmaceutical preparations (K23A)",
        url: "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/K23A/data",
        publisher: "ONS",
        note: "Monthly production index, 2022 = 100, CVMSA. Covers SIC 21.",
      },
      {
        id: "abpi-2022-baseline",
        name: "UK pharma manufacturing turnover, 2022 baseline",
        url: "https://www.abpi.org.uk/facts-and-figures/",
        publisher: "ABPI / ONS Annual Business Survey",
        note:
          "UK pharmaceutical manufacturing turnover in 2022 ≈ £25bn (≈ £2.08bn/month at K23A = 100). Used to scale the index. Most UK pharma 'production' is fill-and-finish of imported active ingredients, so the domestic share overstates self-sufficiency on a strategic-resilience reading.",
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
