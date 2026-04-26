/**
 * fetch-steel-consumption.js
 *
 * UK monthly apparent steel consumption (production + imports - exports),
 * in tonnes. This is the standard "apparent steel use" methodology used
 * by World Steel Association, EUROFER, and UK Steel.
 *
 * Derives from two upstream datasets (no live API call):
 *   - public/data/steel-trade.json — monthly HMRC HS-72 trade, with a
 *     finished-steel subset (HS4 7208-7229) to align with the
 *     apparent-consumption convention (excludes scrap, pig iron,
 *     ferro-alloys, semi-finished).
 *   - public/data/iop-steel.json — ONS K23I monthly index of basic iron
 *     and steel production (2022 = 100, CVMSA).
 *
 * Production tonnage is derived by scaling K23I against a published
 * baseline: UK 2022 crude steel production was 6.1m tonnes (UK Steel
 * Statistical Yearbook 2023), giving 508,333 tonnes/month at K23I = 100.
 *
 * apparent_consumption = production_tonnes
 *                      + finishedImports
 *                      - finishedExports
 *
 * Output: public/data/steel-consumption.json (sob-dataset-v1)
 *
 * Run order: this script depends on steel-trade.json and iop-steel.json
 * being current. Run after both upstream fetches complete.
 */
import { readFileSync, writeFileSync } from "fs";

const TRADE_PATH = "public/data/steel-trade.json";
const PROD_PATH = "public/data/iop-steel.json";

// UK 2022 crude steel production: 6.1 million tonnes (UK Steel Statistical
// Yearbook 2023). Divided by 12 = 508,333 tonnes/month at K23I = 100.
const UK_2022_BASELINE_MONTHLY_TONNES = 508_333;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function main() {
  const trade = readJson(TRADE_PATH);
  const prod = readJson(PROD_PATH);

  const tradeRows = trade.series?.monthly?.data || [];
  const prodRows = prod.series?.monthly?.data || [];
  if (tradeRows.length === 0 || prodRows.length === 0) {
    throw new Error("Upstream datasets empty; run fetch-steel-trade and fetch-iop-steel first");
  }

  const k23i = new Map();
  for (const r of prodRows) k23i.set(r.period, r.value);

  const data = [];
  for (const t of tradeRows) {
    const idx = k23i.get(t.month);
    if (idx == null) continue; // Trade month with no production-index match — skip.
    if (t.finishedImports == null || t.finishedExports == null) continue;

    const productionTonnes = Math.round((idx / 100) * UK_2022_BASELINE_MONTHLY_TONNES);
    const apparentConsumption =
      productionTonnes + t.finishedImports - t.finishedExports;
    data.push({
      month: t.month,
      productionTonnes,
      productionIndex: idx,
      finishedImports: t.finishedImports,
      finishedExports: t.finishedExports,
      apparentConsumption,
    });
  }

  if (data.length === 0) {
    throw new Error("No overlapping months between trade and production data");
  }

  data.sort((a, b) => a.month.localeCompare(b.month));
  const latest = data[data.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "steel-consumption",
    pillar: "foundations",
    topic: "housing",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "hmrc-ots-72-finished",
        name: "HMRC Overseas Trade in Goods — finished steel (HS 7208-7229)",
        url: "https://www.uktradeinfo.com/trade-data/ots-custom-table/",
        publisher: "HMRC",
        note:
          "Imports/exports of finished steel products only — flat-rolled, bars, rods, sections, alloy. Excludes scrap (7204), pig iron, ferro-alloys, semi-finished.",
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
        name: "UK Steel Statistical Yearbook 2023 — 2022 production baseline",
        url: "https://www.uksteel.org/uk-steel-publications-1",
        publisher: "UK Steel",
        note:
          "2022 UK crude steel production: 6.1 million tonnes ÷ 12 = 508,333 tonnes/month at K23I = 100. Used to scale the production index back to absolute monthly tonnage.",
      },
    ],
    snapshot: {
      apparentConsumption: latest.apparentConsumption,
      productionTonnes: latest.productionTonnes,
      finishedImports: latest.finishedImports,
      finishedExports: latest.finishedExports,
      consumptionMonth: latest.month,
      consumptionUnit: "tonnes / month",
    },
    series: {
      monthly: {
        sourceId: "hmrc-ots-72-finished",
        timeField: "month",
        unit: "tonnes / month",
        description:
          "Apparent UK steel consumption: production (K23I × 2022 baseline) + finished imports - finished exports. Tracks the World Steel Association apparent-steel-use methodology at monthly cadence.",
        data,
      },
    },
  };

  writeFileSync(
    "public/data/steel-consumption.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `✓ public/data/steel-consumption.json (${data.length} months; latest ${latest.apparentConsumption.toLocaleString()}t for ${latest.month}: prod ${latest.productionTonnes.toLocaleString()} + imp ${latest.finishedImports.toLocaleString()} - exp ${latest.finishedExports.toLocaleString()})`
  );
}

main();
