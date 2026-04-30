/**
 * fetch-pgms-dependency.js
 *
 * Platinum-group metals — split out of the critical-minerals card
 * because PGMs are a fundamentally different supply story:
 *   - High £-value flow (£600m+/month) that drowned the headline
 *     "domestic share" of the broader critical-minerals composite
 *   - Domestic supply is recycled autocatalyst scrap, not primary
 *     mining: Johnson Matthey (Royston), BASF (Cinderford), Heraeus
 *     (Royston) collect spent catalytic converters and re-refine.
 *   - The strategic concern is end-use (catalytic converters,
 *     hydrogen electrolysers, jewellery) and concentration of
 *     primary supply (South Africa + Russia ≈ 80% global mine output),
 *     not raw scarcity.
 *
 * Facets: platinum, palladium, rhodium. Iridium/osmium/ruthenium
 * (HS 7110.41/49) are out-of-scope; volumes too small to merit a
 * separate facet.
 *
 * Output: public/data/pgms-dependency.json
 * Schedule: monthly on the 18th (alongside the other bulk-COO fetches).
 */
import { writeFileSync } from "fs";
import { lastNMonthIds } from "./lib/hmrc-trade-by-country.js";
import { buildDependencyDataset } from "./lib/build-dependency-dataset.js";

const FACETS = [
  {
    key: "platinum",
    label: "Platinum",
    selfSufficiency: 0.30,
    hs6Lists: [
      { hs2: "71", hs6: "711011" },
      { hs2: "71", hs6: "711019" },
    ],
  },
  {
    key: "palladium",
    label: "Palladium",
    selfSufficiency: 0.30,
    hs6Lists: [
      { hs2: "71", hs6: "711021" },
      { hs2: "71", hs6: "711029" },
    ],
  },
  {
    key: "rhodium",
    label: "Rhodium",
    // Same UK PGM recyclers as platinum/palladium; rhodium is the
    // pricier sibling and shares the same autocatalyst-derived
    // secondary-supply chain.
    selfSufficiency: 0.30,
    hs6Lists: [
      { hs2: "71", hs6: "711031" },
      { hs2: "71", hs6: "711039" },
    ],
  },
];

const COMMON_SOURCES = [
  {
    id: "hmrc-ots-pgms",
    name: "HMRC Overseas Trade — platinum group metals (HS 7110.1x–3x)",
    url: "https://www.uktradeinfo.com/trade-data/latest-bulk-data-sets/",
    publisher: "HMRC",
    note:
      "Monthly per-partner trade in platinum, palladium, and rhodium (unwrought + semi-manufactured forms). Country of Origin from HMRC bulk import files (bdsimp).",
  },
  {
    id: "uk-pgm-recycling",
    name: "UK PGM secondary-supply assumption",
    url: "https://matthey.com",
    publisher: "Johnson Matthey / BASF / Heraeus",
    note:
      "Domestic supply is modelled at ~30% of demand for each PGM. Three UK refiners — Johnson Matthey (Royston), BASF (Cinderford), Heraeus (Royston) — recycle spent autocatalysts. The 30% figure follows industry estimates of UK secondary recovery vs. demand. There is no UK primary mining of PGMs; primary mine supply globally is ~80% concentrated in South Africa and Russia.",
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
  const aProd = a.production;
  const bProd = b.production;
  const production = (aProd != null || bProd != null)
    ? (aProd || 0) + (bProd || 0)
    : null;
  return {
    month: a.month,
    production,
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

function applySelfSufficiency(monthly, ss) {
  if (!ss || ss <= 0) return monthly;
  const factor = ss / (1 - ss);
  return monthly.map((row) => {
    const ti = (row.imports?.aligned || 0) + (row.imports?.neutral || 0) +
      (row.imports?.low || 0) + (row.imports?.unknown || 0);
    const te = (row.exports?.aligned || 0) + (row.exports?.neutral || 0) +
      (row.exports?.low || 0) + (row.exports?.unknown || 0);
    const netImports = Math.max(0, ti - te);
    const production = Math.round(netImports * factor);
    return recomputeShares({ ...row, production });
  });
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

async function fetchFacet(facet, monthIds) {
  const byHs2 = new Map();
  for (const e of facet.hs6Lists) {
    if (!byHs2.has(e.hs2)) byHs2.set(e.hs2, []);
    byHs2.get(e.hs2).push(e.hs6);
  }
  console.log(`\n[${facet.key}] ${facet.label} — ${facet.hs6Lists.length} HS6 codes across ${byHs2.size} chapter(s)`);

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
    });
    partials.push(ds);
  }

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
    const ds = await fetchFacet(facet, monthIds);
    if (facet.selfSufficiency) {
      ds.monthly = applySelfSufficiency(ds.monthly, facet.selfSufficiency);
      console.log(`  → applied SS=${facet.selfSufficiency} for ${facet.key}`);
    }
    facetData[facet.key] = ds;
  }

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
    id: "pgms-dependency",
    pillar: "state",
    topic: "sovereignCapability",
    generated: new Date().toISOString().slice(0, 10),
    sources: COMMON_SOURCES,
    snapshot: {
      title: "Platinum-group metals",
      month: topLatest.month,
      production: topLatest.production,
      imports: topLatest.imports,
      exports: topLatest.exports,
      alignedShare: topLatest.alignedShare,
      domesticShare: topLatest.domesticShare,
      partnersTracked: topPartners.length,
      windowMonths: topMonthly.length,
      metric: "value",
      unit: "£ / month",
      facetKeys: FACETS.map((f) => f.key),
    },
    series: {
      monthly: {
        sourceId: "hmrc-ots-pgms",
        timeField: "month",
        unit: "£ / month",
        description: "Composite monthly UK PGM imports across platinum, palladium, rhodium.",
        data: topMonthly,
      },
      byPartner: {
        sourceId: "hmrc-ots-pgms",
        timeField: "iso3",
        unit: "£ (window total)",
        description: "Per-partner totals summed across platinum, palladium, rhodium.",
        data: topPartners,
      },
      facets: {
        sourceId: "hmrc-ots-pgms",
        timeField: "key",
        unit: "£ / month",
        description: "Per-PGM facets: platinum, palladium, rhodium.",
        data: facetsOut,
      },
    },
  };

  writeFileSync("public/data/pgms-dependency.json", JSON.stringify(output, null, 2) + "\n");
  console.log(
    `\n✓ public/data/pgms-dependency.json (${topMonthly.length} months across ${FACETS.length} PGMs; latest ${topLatest.month} aligned-share ${topLatest.alignedShare}%, domestic-share ${topLatest.domesticShare}%)`
  );
  console.log("Per-facet (latest):");
  for (const f of FACETS) {
    const fl = facetsOut[f.key].latest;
    const tot = ((fl.imports?.aligned || 0) + (fl.imports?.neutral || 0) + (fl.imports?.low || 0) + (fl.imports?.unknown || 0));
    console.log(
      `  ${f.label.padEnd(12)} aligned ${(fl.alignedShare || 0).toFixed(0).padStart(3)}%  domestic ${(fl.domesticShare || 0).toFixed(0).padStart(3)}%  total imp £${(tot / 1e6).toFixed(1)}m`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
