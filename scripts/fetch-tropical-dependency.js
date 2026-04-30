/**
 * fetch-tropical-dependency.js
 *
 * UK imports of tropical commodities that cannot be grown domestically:
 * coffee (HS 0901), tea (HS 0902), cocoa (HS 1801-1806). Composite card
 * with three facets so the geography of each commodity (cocoa from
 * Côte d'Ivoire / Ghana, coffee from Brazil / Vietnam, tea from India /
 * China / Kenya) can be drawn out separately.
 *
 * Domestic production: zero. Climatically not possible at scale in the
 * UK. Imports-only is the honest reading.
 *
 * Output: public/data/tropical-dependency.json
 */
import { writeFileSync } from "fs";
import { lastNMonthIds } from "./lib/hmrc-bulk-imports.js";
import { buildDependencyDataset } from "./lib/build-dependency-dataset.js";

const FACETS = [
  { key: "coffee", label: "Coffee", hs2: "09", hs6In: ["090111","090112","090121","090122","090190"] },
  { key: "tea",    label: "Tea",    hs2: "09", hs6In: ["090210","090220","090230","090240"] },
  { key: "cocoa",  label: "Cocoa",  hs2: "18", hs6In: ["180100","180200","180310","180320","180400","180500","180610","180620","180631","180632","180690"] },
];
const MONTHS = 24;

const COMMON_SOURCES = [
  { id: "hmrc-bulk-tropical", name: "HMRC Bulk Imports — coffee, tea, cocoa",
    url: "https://www.uktradeinfo.com/trade-data/latest-bulk-data-sets/",
    publisher: "HMRC",
    note: "Monthly per-origin imports of coffee (HS 0901), tea (HS 0902), and cocoa products (HS 18). UK has no domestic production at scale." },
  { id: "voeten-unga", name: "Voeten — UN General Assembly Voting Data",
    url: "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/LEJUQZ",
    publisher: "Harvard Dataverse",
    note: "Used to classify each trade partner into an alignment bucket." },
];

function sumMonth(a, b) {
  if (!a) return { ...b };
  return {
    month: a.month, production: null,
    imports: { aligned: (a.imports?.aligned||0)+(b.imports?.aligned||0), neutral: (a.imports?.neutral||0)+(b.imports?.neutral||0), low: (a.imports?.low||0)+(b.imports?.low||0), unknown: (a.imports?.unknown||0)+(b.imports?.unknown||0) },
    exports: { aligned: (a.exports?.aligned||0)+(b.exports?.aligned||0), neutral: (a.exports?.neutral||0)+(b.exports?.neutral||0), low: (a.exports?.low||0)+(b.exports?.low||0), unknown: (a.exports?.unknown||0)+(b.exports?.unknown||0) },
  };
}
function recomputeShares(row) {
  const ti = (row.imports?.aligned||0)+(row.imports?.neutral||0)+(row.imports?.low||0)+(row.imports?.unknown||0);
  const te = (row.exports?.aligned||0)+(row.exports?.neutral||0)+(row.exports?.low||0)+(row.exports?.unknown||0);
  const total = (row.production||0)+ti;
  return { ...row, totalImports: ti, totalExports: te,
    alignedShare: total>0 ? Math.round((row.imports.aligned/total)*1000)/10 : null,
    domesticShare: total>0 && row.production!=null ? Math.round((row.production/total)*1000)/10 : null };
}

async function main() {
  const monthIds = lastNMonthIds(MONTHS);
  const facetData = {};
  for (const facet of FACETS) {
    console.log(`\n[${facet.key}] ${facet.label}`);
    facetData[facet.key] = await buildDependencyDataset({
      id: `tropical-${facet.key}`, title: facet.label,
      hs2: facet.hs2, hs6In: facet.hs6In,
      monthIds, metric: "value", unit: "£ / month",
      description: `Monthly UK ${facet.label.toLowerCase()} imports.`,
      sources: COMMON_SOURCES,
    });
  }

  const monthsPresent = new Set();
  for (const f of Object.values(facetData)) for (const m of f.series.monthly.data) monthsPresent.add(m.month);
  const allMonths = [...monthsPresent].sort();
  const topMonthly = allMonths.map((month) => {
    let row = null;
    for (const f of Object.values(facetData)) {
      const fm = f.series.monthly.data.find((d) => d.month === month);
      if (fm) row = sumMonth(row, fm);
    }
    return row && recomputeShares(row);
  }).filter(Boolean);

  const partnerMap = new Map();
  for (const f of Object.values(facetData)) {
    for (const p of f.series.byPartner.data) {
      if (!partnerMap.has(p.iso3)) partnerMap.set(p.iso3, { ...p, importTonnes: 0, exportTonnes: 0 });
      const acc = partnerMap.get(p.iso3);
      acc.importTonnes += p.importTonnes; acc.exportTonnes += p.exportTonnes;
    }
  }
  const topPartners = [...partnerMap.values()].sort((a,b) => b.importTonnes - a.importTonnes);
  const topLatest = topMonthly[topMonthly.length - 1];

  const facetsOut = {};
  for (const facet of FACETS) {
    const d = facetData[facet.key];
    const lf = d.series.monthly.data[d.series.monthly.data.length - 1] || {};
    facetsOut[facet.key] = {
      label: facet.label,
      latest: { month: lf.month, imports: lf.imports || { aligned:0,neutral:0,low:0,unknown:0 }, exports: lf.exports || { aligned:0,neutral:0,low:0,unknown:0 }, alignedShare: lf.alignedShare, production: null, domesticShare: null },
      monthly: d.series.monthly.data,
      byPartner: d.series.byPartner.data.slice(0, 12),
    };
  }

  const output = {
    $schema: "sob-dataset-v1", id: "tropical-dependency",
    pillar: "state", topic: "sovereignCapability",
    generated: new Date().toISOString().slice(0, 10),
    sources: COMMON_SOURCES,
    snapshot: {
      title: "Coffee, tea & cocoa", month: topLatest.month,
      production: null, imports: topLatest.imports, exports: topLatest.exports,
      alignedShare: topLatest.alignedShare, domesticShare: null,
      partnersTracked: topPartners.length, windowMonths: topMonthly.length,
      metric: "value", unit: "£ / month",
      facetKeys: FACETS.map((f) => f.key),
    },
    series: {
      monthly: { sourceId: "hmrc-bulk-tropical", timeField: "month", unit: "£ / month",
        description: "Composite monthly UK imports of coffee, tea, and cocoa.", data: topMonthly },
      byPartner: { sourceId: "hmrc-bulk-tropical", timeField: "iso3", unit: "£ (window total)",
        description: "Per-origin totals across all three commodities.", data: topPartners },
      facets: { sourceId: "hmrc-bulk-tropical", timeField: "key", unit: "£ / month",
        description: "Per-commodity facets: coffee, tea, cocoa.", data: facetsOut },
    },
  };

  writeFileSync("public/data/tropical-dependency.json", JSON.stringify(output, null, 2) + "\n");
  console.log(`\n✓ public/data/tropical-dependency.json (${topMonthly.length} months × 3 commodities)`);
  for (const f of FACETS) {
    const fl = facetsOut[f.key].latest;
    console.log(`  ${f.label.padEnd(10)} aligned ${(fl.alignedShare||0).toFixed(0)}% (${fl.month})`);
  }
}
main().catch((err) => { console.error(err); process.exit(1); });
