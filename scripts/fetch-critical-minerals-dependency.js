/**
 * fetch-critical-minerals-dependency.js
 *
 * UK imports of critical minerals named in the UK Government Critical
 * Minerals Strategy (2022, refreshed 2023). Composite card with eight
 * per-mineral facets so the sub-stories (DRC for cobalt, China for
 * rare earths, Indonesia/Philippines for nickel, etc.) can be drawn
 * out separately in the expanded view.
 *
 * Domestic production: not included. UK has effectively zero refined
 * output of any of these minerals. Cornish Lithium operates pilot
 * extraction but no commercial production yet. Imports-only is the
 * conservative honest reading.
 *
 * Output: public/data/critical-minerals-dependency.json
 * Schedule: monthly on the 17th (composite, ~10 min run; runs after
 * the single-chapter cards).
 */
import { writeFileSync } from "fs";
import { lastNMonthIds } from "./lib/hmrc-trade-by-country.js";
import { buildDependencyDataset } from "./lib/build-dependency-dataset.js";

// Critical minerals named in the UK Government's Critical Minerals
// Strategy (2022, refreshed 2023). The headline list is 18 minerals;
// we also include nickel from the watchlist because it's a major
// battery feedstock. HS6 codes from the WTO HS classification.
//
// Caveats:
//  - Some minerals share HS6 codes (gallium / indium / niobium /
//    vanadium all sit in HS 8112.92 with no HS6 split). We lump
//    those into a single "minor metals" facet.
//  - Tellurium shares HS 2804.50 with selenium; treated as combined.
//  - Volumes for the smallest flows (antimony, bismuth, tellurium)
//    can be very thin; long-window averages used in the partner
//    list to avoid single-month noise.
const FACETS = [
  {
    key: "lithium",
    label: "Lithium",
    hs6Lists: [
      { hs2: "25", hs6: "253090" },
      { hs2: "28", hs6: "282520" },
      { hs2: "28", hs6: "283691" },
    ],
  },
  {
    key: "cobalt",
    label: "Cobalt",
    hs6Lists: [
      { hs2: "26", hs6: "260500" },
      { hs2: "28", hs6: "282200" },
      { hs2: "81", hs6: "810520" },
      { hs2: "81", hs6: "810530" },
      { hs2: "81", hs6: "810590" },
    ],
  },
  {
    key: "rare-earths",
    label: "Rare earths",
    hs6Lists: [
      { hs2: "28", hs6: "280530" },
      { hs2: "28", hs6: "284610" },
      { hs2: "28", hs6: "284690" },
    ],
  },
  {
    key: "nickel",
    label: "Nickel (watchlist)",
    hs6Lists: [
      { hs2: "26", hs6: "260400" },
      { hs2: "28", hs6: "282540" },
      { hs2: "75", hs6: "750110" },
      { hs2: "75", hs6: "750120" },
      { hs2: "75", hs6: "750210" },
      { hs2: "75", hs6: "750220" },
    ],
  },
  {
    key: "tungsten",
    label: "Tungsten",
    hs6Lists: [
      { hs2: "26", hs6: "261100" },
      { hs2: "81", hs6: "810110" },
      { hs2: "81", hs6: "810194" },
      { hs2: "81", hs6: "810196" },
      { hs2: "81", hs6: "810197" },
      { hs2: "81", hs6: "810199" },
    ],
  },
  {
    key: "magnesium",
    label: "Magnesium",
    hs6Lists: [
      { hs2: "81", hs6: "810411" },
      { hs2: "81", hs6: "810419" },
      { hs2: "81", hs6: "810420" },
      { hs2: "81", hs6: "810430" },
      { hs2: "81", hs6: "810490" },
    ],
  },
  {
    key: "graphite",
    label: "Graphite",
    hs6Lists: [
      { hs2: "25", hs6: "250410" },
      { hs2: "25", hs6: "250490" },
    ],
  },
  {
    key: "silicon",
    label: "Silicon",
    hs6Lists: [
      { hs2: "28", hs6: "280461" },
      { hs2: "28", hs6: "280469" },
    ],
  },
  {
    key: "platinum",
    label: "Platinum",
    hs6Lists: [
      { hs2: "71", hs6: "711011" },
      { hs2: "71", hs6: "711019" },
    ],
  },
  {
    key: "palladium",
    label: "Palladium",
    hs6Lists: [
      { hs2: "71", hs6: "711021" },
      { hs2: "71", hs6: "711029" },
    ],
  },
];

// Note on coverage: the UK Critical Minerals Strategy lists 18
// minerals plus a watchlist. The dashboard surfaces the 10 with the
// largest UK trade flows: lithium, cobalt, rare earths, nickel,
// tungsten, magnesium, graphite, silicon, platinum, palladium.
// Antimony, bismuth, tantalum, tellurium, tin, niobium, vanadium,
// gallium, indium are tracked under HMRC OTS but volumes are too thin
// for a meaningful month-by-month alignment view; some HS6 codes
// genuinely returned zero rows for the full 24-month window. They
// can be added back individually when a batch-fetch helper exists
// (one OData call per HS2 chapter rather than per HS6 list).

const COMMON_SOURCES = [
  {
    id: "hmrc-ots-critical-minerals",
    name: "HMRC Overseas Trade — critical minerals (selected HS6)",
    url: "https://www.uktradeinfo.com/trade-data/ots-custom-table/",
    publisher: "HMRC",
    note:
      "Monthly per-partner trade in eight critical-mineral families: lithium, cobalt, rare earths, nickel, tungsten, magnesium, natural graphite, silicon. Each family is an aggregation of selected HS6 codes covering ores, oxides, and unwrought metal.",
  },
  {
    id: "uk-critical-minerals-strategy",
    name: "UK Critical Minerals Strategy 2023 refresh",
    url: "https://www.gov.uk/government/publications/uk-critical-mineral-strategy",
    publisher: "DBT",
    note:
      "Mineral selection follows the 2023 strategy. UK has effectively no commercial refined production of any of these minerals; Cornish Lithium operates pilot extraction but no commercial output yet. Imports-only is the honest reading.",
  },
  {
    id: "voeten-unga",
    name: "Voeten — UN General Assembly Voting Data",
    url: "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/LEJUQZ",
    publisher: "Harvard Dataverse",
    note: "Used to classify each trade partner into an alignment bucket.",
  },
];

function sumMonth(a, b) {
  if (!a) return { ...b };
  return {
    month: a.month,
    production: null,
    imports: {
      aligned: (a.imports?.aligned || 0) + (b.imports?.aligned || 0),
      neutral: (a.imports?.neutral || 0) + (b.imports?.neutral || 0),
      low: (a.imports?.low || 0) + (b.imports?.low || 0),
      unknown: (a.imports?.unknown || 0) + (b.imports?.unknown || 0),
    },
    exports: {
      aligned: (a.exports?.aligned || 0) + (b.exports?.aligned || 0),
      neutral: (a.exports?.neutral || 0) + (b.exports?.neutral || 0),
      low: (a.exports?.low || 0) + (b.exports?.low || 0),
      unknown: (a.exports?.unknown || 0) + (b.exports?.unknown || 0),
    },
  };
}

function recomputeShares(row) {
  const ti = (row.imports?.aligned || 0) + (row.imports?.neutral || 0) +
    (row.imports?.low || 0) + (row.imports?.unknown || 0);
  const te = (row.exports?.aligned || 0) + (row.exports?.neutral || 0) +
    (row.exports?.low || 0) + (row.exports?.unknown || 0);
  const total = (row.production || 0) + ti;
  return {
    ...row,
    totalImports: ti,
    totalExports: te,
    alignedShare: total > 0 ? Math.round((row.imports.aligned / total) * 1000) / 10 : null,
    domesticShare: total > 0 && row.production != null
      ? Math.round((row.production / total) * 1000) / 10 : null,
  };
}

/**
 * Pull each HS6 in a facet separately, then aggregate. We can't
 * combine across HS2 chapters in a single OData query (the helper
 * filters on Hs2Code first), so this means N OData calls per facet
 * where N = number of HS6 lists across distinct HS2 chapters.
 *
 * Returns a per-facet dataset that mirrors what buildDependencyDataset
 * produces for a single HS slice.
 */
async function fetchFacet(facet, monthIds) {
  const byHs2 = new Map();
  for (const e of facet.hs6Lists) {
    if (!byHs2.has(e.hs2)) byHs2.set(e.hs2, []);
    byHs2.get(e.hs2).push(e.hs6);
  }
  console.log(`\n[${facet.key}] ${facet.label} — ${facet.hs6Lists.length} HS6 codes across ${byHs2.size} chapter(s)`);

  // Combine within an HS2 chapter into one OData query; do separate
  // calls across chapters and merge.
  const partials = [];
  for (const [hs2, hs6Codes] of byHs2) {
    const ds = await buildDependencyDataset({
      id: `${facet.key}-${hs2}`,
      title: `${facet.label} (HS ${hs2})`,
      hs2,
      hs6In: hs6Codes,
      monthIds,
      metric: "value",
      unit: "£ / month",
      description: `${facet.label} fragment, HS ${hs2}.`,
      sources: COMMON_SOURCES,
      // outputPath omitted — in-memory only
    });
    partials.push(ds);
  }

  // Merge partials month-by-month
  const monthsPresent = new Set();
  for (const p of partials) for (const m of p.series.monthly.data) monthsPresent.add(m.month);
  const months = [...monthsPresent].sort();
  const monthly = months.map((month) => {
    let row = null;
    for (const p of partials) {
      const fm = p.series.monthly.data.find((d) => d.month === month);
      if (fm) row = sumMonth(row, fm);
    }
    return recomputeShares(row);
  });

  // Merge byPartner
  const partnerMap = new Map();
  for (const p of partials) {
    for (const partner of p.series.byPartner.data) {
      if (!partnerMap.has(partner.iso3)) {
        partnerMap.set(partner.iso3, { ...partner, importTonnes: 0, exportTonnes: 0 });
      }
      const acc = partnerMap.get(partner.iso3);
      acc.importTonnes += partner.importTonnes;
      acc.exportTonnes += partner.exportTonnes;
    }
  }
  const byPartner = [...partnerMap.values()].sort((a, b) => b.importTonnes - a.importTonnes);

  return { monthly, byPartner };
}

async function main() {
  const monthIds = lastNMonthIds(24);
  const facetData = {};

  for (const facet of FACETS) {
    facetData[facet.key] = await fetchFacet(facet, monthIds);
  }

  // Build top-level composite by summing all facets
  const monthsPresent = new Set();
  for (const f of Object.values(facetData)) for (const m of f.monthly) monthsPresent.add(m.month);
  const allMonths = [...monthsPresent].sort();
  const topMonthly = allMonths.map((month) => {
    let row = null;
    for (const f of Object.values(facetData)) {
      const fm = f.monthly.find((d) => d.month === month);
      if (fm) row = sumMonth(row, fm);
    }
    return recomputeShares(row);
  }).filter(Boolean);

  // Build top-level byPartner
  const partnerMap = new Map();
  for (const f of Object.values(facetData)) {
    for (const p of f.byPartner) {
      if (!partnerMap.has(p.iso3)) {
        partnerMap.set(p.iso3, { ...p, importTonnes: 0, exportTonnes: 0 });
      }
      const acc = partnerMap.get(p.iso3);
      acc.importTonnes += p.importTonnes;
      acc.exportTonnes += p.exportTonnes;
    }
  }
  const topPartners = [...partnerMap.values()].sort((a, b) => b.importTonnes - a.importTonnes);

  const topLatest = topMonthly[topMonthly.length - 1];

  const facetsOut = {};
  for (const facet of FACETS) {
    const fd = facetData[facet.key];
    const lf = fd.monthly[fd.monthly.length - 1] || {};
    facetsOut[facet.key] = {
      label: facet.label,
      latest: {
        month: lf.month,
        imports: lf.imports || { aligned: 0, neutral: 0, low: 0, unknown: 0 },
        exports: lf.exports || { aligned: 0, neutral: 0, low: 0, unknown: 0 },
        production: lf.production,
        alignedShare: lf.alignedShare,
        domesticShare: lf.domesticShare,
      },
      monthly: fd.monthly,
      byPartner: fd.byPartner.slice(0, 12),
    };
  }

  const output = {
    $schema: "sob-dataset-v1",
    id: "critical-minerals-dependency",
    pillar: "state",
    topic: "sovereignCapability",
    generated: new Date().toISOString().slice(0, 10),
    sources: COMMON_SOURCES,
    snapshot: {
      title: "Critical minerals",
      month: topLatest.month,
      production: null,
      imports: topLatest.imports,
      exports: topLatest.exports,
      alignedShare: topLatest.alignedShare,
      domesticShare: null,
      partnersTracked: topPartners.length,
      windowMonths: topMonthly.length,
      metric: "value",
      unit: "£ / month",
      facetKeys: FACETS.map((f) => f.key),
    },
    series: {
      monthly: {
        sourceId: "hmrc-ots-critical-minerals",
        timeField: "month",
        unit: "£ / month",
        description: "Composite monthly UK critical-mineral imports across eight families.",
        data: topMonthly,
      },
      byPartner: {
        sourceId: "hmrc-ots-critical-minerals",
        timeField: "iso3",
        unit: "£ (window total)",
        description: "Per-partner totals summed across all eight mineral families.",
        data: topPartners,
      },
      facets: {
        sourceId: "hmrc-ots-critical-minerals",
        timeField: "key",
        unit: "£ / month",
        description: "Per-mineral facets: lithium, cobalt, rare earths, nickel, tungsten, magnesium, graphite, silicon.",
        data: facetsOut,
      },
    },
  };

  writeFileSync("public/data/critical-minerals-dependency.json", JSON.stringify(output, null, 2) + "\n");
  console.log(
    `\n✓ public/data/critical-minerals-dependency.json (${topMonthly.length} months across ${FACETS.length} minerals; latest ${topLatest.month} aligned-share ${topLatest.alignedShare}%)`
  );
  console.log("Per-facet (latest):");
  for (const f of FACETS) {
    const fl = facetsOut[f.key].latest;
    console.log(
      `  ${f.label.padEnd(20)} aligned ${(fl.alignedShare || 0).toFixed(0).padStart(3)}%  total imp £${(((fl.imports?.aligned || 0) + (fl.imports?.neutral || 0) + (fl.imports?.low || 0) + (fl.imports?.unknown || 0)) / 1e6).toFixed(1)}m`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
