/**
 * Second-order origin attribution for Strategic Dependencies cards.
 *
 * Layer 1 (HMRC COO): "where was the good last substantially transformed?"
 * Layer 2 (this module): "where did THAT country get its feedstock from?"
 *
 * For each top-N partner X of UK imports for a commodity, we look up
 * X's annual reported imports of upstream-feedstock HS codes from
 * "probable upstream-origin" countries (e.g. China, Russia, India, Brazil).
 * We compare to X's reported finished exports to the UK to compute a
 * re-rolling fraction:
 *
 *   re_rolling[X] = min(1, X_feedstock_M_from_upstream / X_finished_X_to_UK)
 *
 * The upstream-source mix tells us where re-rolled material came from:
 *
 *   upstream_share[X][U] = X_feedstock_M_from_U / total_X_feedstock_M
 *
 * Applied to each month's UK imports from partner X:
 *
 *   genuine_X     = (1 - re_rolling) × import_value
 *   reattributed  = re_rolling × import_value × upstream_share[X][U]
 *
 * Source: UN Comtrade public preview API (annual, 2023 default with
 * 2022 fallback). Free; rate-limited.
 *
 * Caveats:
 *   - 2nd-order is a model, not a measurement. Real flows are messier.
 *   - Comtrade mirror has bilateral reporting differences (CIF vs FOB)
 *   - Re-rolling fraction is an upper bound — some feedstock is
 *     domestically consumed rather than re-exported
 *   - For some commodities the "feedstock" HS list is genuinely
 *     fuzzy (e.g. a country can re-roll HS 7208 hot-coil into HS 7209
 *     cold-rolled; both are technically "finished" by HS classification)
 */
import https from "https";

const API = "https://comtradeapi.un.org/public/v1/preview/C/A/HS";
const REQUEST_DELAY_MS = 800;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ISO numeric country codes (subset — extend as needed)
export const ISO3_TO_ISONUM = {
  AUS: 36, AUT: 40, BEL: 56, BRA: 76, CAN: 124, CHE: 756, CHN: 156,
  CIV: 384, COD: 180, CRC: 188, CZE: 203, DEU: 276, DNK: 208, EGY: 818,
  ESP: 724, FRA: 250, GBR: 826, GHA: 288, IDN: 360, IND: 356, IRL: 372,
  ISR: 376, ITA: 380, JPN: 392, KAZ: 398, KOR: 410, LUX: 442, MAR: 504,
  MEX: 484, MYS: 458, NGA: 566, NLD: 528, NOR: 578, PAK: 586, PHL: 608,
  POL: 616, PRT: 620, QAT: 634, ROU: 642, RUS: 643, SAU: 682, SGP: 702,
  SRB: 688, SWE: 752, THA: 764, TUR: 792, TWN: 158, UKR: 804, USA: 842,
  VNM: 704, ZAF: 710, COL: 170, CHL: 152, NZL: 554, BGD: 50, KEN: 404,
  ETH: 231, TZA: 834, ZMB: 894, GIN: 324, MMR: 104, AGO: 24, GAB: 266,
  IRN: 364, IRQ: 368, KWT: 414, LBY: 434, OMN: 512, ARE: 784, VEN: 862,
  BLR: 112, ECU: 218, PER: 604,
};
const UK_NUM = 826;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30_000 }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8"))); }
        catch (e) { reject(e); }
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Comtrade timeout")));
  });
}

async function comtrade({ reporterCode, partnerCode, period, flowCode, cmdCodes }) {
  const cmd = Array.isArray(cmdCodes) ? cmdCodes.join(",") : cmdCodes;
  const url = `${API}?reporterCode=${reporterCode}&partnerCode=${partnerCode}&period=${period}&cmdCode=${cmd}&flowCode=${flowCode}`;
  await sleep(REQUEST_DELAY_MS);
  const json = await fetchJson(url);
  const rows = json?.data || [];
  return rows.reduce((s, r) => s + (r.primaryValue || 0), 0);
}

/**
 * For each partner, fetch their reported finished-X to UK and their
 * feedstock-M from each upstream source. Returns a coefficient table.
 *
 * @param {Object} opts
 * @param {string[]} opts.partners            ISO3 codes of UK import partners to attribute
 * @param {string[]} opts.finishedHs          HS6 codes of the commodity's finished forms
 * @param {string[]} opts.feedstockHs         HS6 codes of upstream feedstock forms
 * @param {string[]} opts.upstreamSources     ISO3 codes of probable feedstock origins
 * @param {string} [opts.period="2023"]
 *
 * @returns {Promise<Map<iso3, {
 *   reRollingFraction: number,
 *   upstreamShares: Map<iso3, share>,
 *   ukExportsUsd: number,
 *   upstreamImportsUsd: number,
 * }>>}
 */
export async function compute2ndOrderCoefficients(opts) {
  const {
    partners, finishedHs, feedstockHs, upstreamSources,
    period = "2023",
  } = opts;
  const coeffs = new Map();

  for (const iso3 of partners) {
    const reporterCode = ISO3_TO_ISONUM[iso3];
    if (!reporterCode) {
      console.warn(`  ${iso3}: no ISO numeric mapping; skipping`);
      continue;
    }
    if (upstreamSources.includes(iso3)) {
      // The partner is itself an upstream source — by definition no
      // 2nd-order re-attribution. Skip.
      coeffs.set(iso3, {
        reRollingFraction: 0,
        upstreamShares: new Map(),
        ukExportsUsd: 0,
        upstreamImportsUsd: 0,
      });
      continue;
    }

    let ukExportsUsd = 0;
    for (const tryPeriod of [period, String(parseInt(period) - 1)]) {
      try {
        const v = await comtrade({
          reporterCode, partnerCode: UK_NUM,
          flowCode: "X", cmdCodes: finishedHs, period: tryPeriod,
        });
        if (v > 0) { ukExportsUsd = v; break; }
      } catch (_) {}
    }

    const upstreamShares = new Map();
    let upstreamImportsUsd = 0;
    for (const upISO of upstreamSources) {
      const upCode = ISO3_TO_ISONUM[upISO];
      if (!upCode) continue;
      let val = 0;
      for (const tryPeriod of [period, String(parseInt(period) - 1)]) {
        try {
          const v = await comtrade({
            reporterCode, partnerCode: upCode,
            flowCode: "M", cmdCodes: feedstockHs, period: tryPeriod,
          });
          if (v > 0) { val = v; break; }
        } catch (_) {}
      }
      if (val > 0) {
        upstreamImportsUsd += val;
        upstreamShares.set(upISO, val);
      }
    }
    // Normalise upstreamShares to fractions
    for (const [k, v] of upstreamShares) {
      upstreamShares.set(k, v / upstreamImportsUsd);
    }
    const reRollingFraction = ukExportsUsd > 0
      ? Math.min(1, upstreamImportsUsd / ukExportsUsd)
      : 0;

    coeffs.set(iso3, {
      reRollingFraction,
      upstreamShares,
      ukExportsUsd,
      upstreamImportsUsd,
    });
    console.log(
      `  ${iso3}: re-rolling ${(reRollingFraction * 100).toFixed(0)}% (X→UK $${(ukExportsUsd/1e6).toFixed(0)}m, upstream M $${(upstreamImportsUsd/1e6).toFixed(0)}m)`
    );
  }
  return coeffs;
}

/**
 * For each partner, compute their feedstock-origin breakdown by
 * alignment bucket. Used to render an extra column in the partner
 * table on the dashboard:
 *
 *   "Belgium  92% aligned   £720m   ↻ RUS 99% (low)"
 *
 * Each entry contains the dominant upstream-origin source and a
 * bucketised breakdown for the full set.
 *
 * @returns Map<iso3, {
 *   reRollingFraction: number,         // 0-1
 *   feedstockBuckets: { aligned, neutral, low, unknown },
 *   feedstockTopOrigins: [{ iso3, country, alignmentPct, bucket, share }],
 * }>
 */
export function partnerFeedstockSummary({ coefficients, bucketFor, alignmentLookup }) {
  const out = new Map();
  for (const [iso3, coef] of coefficients) {
    const buckets = { aligned: 0, neutral: 0, low: 0, unknown: 0 };
    const tops = [];
    for (const [upISO, share] of coef.upstreamShares) {
      const info = alignmentLookup.get(upISO);
      const bucket = info?.bucket || (info ? bucketFor(info.alignmentPct) : "unknown");
      buckets[bucket] = (buckets[bucket] || 0) + share;
      tops.push({
        iso3: upISO,
        country: info?.name || upISO,
        alignmentPct: info?.alignmentPct ?? null,
        bucket,
        share,
      });
    }
    tops.sort((a, b) => b.share - a.share);
    out.set(iso3, {
      reRollingFraction: coef.reRollingFraction,
      feedstockBuckets: buckets,
      feedstockTopOrigins: tops.slice(0, 3),
    });
  }
  return out;
}

/**
 * Re-bucket monthly imports using 2nd-order coefficients and the
 * existing alignment lookup. For each partner X:
 *   - retain (1 - re_rolling) × value as X-origin
 *   - distribute re_rolling × value to upstream sources by share
 *
 * Returns:
 *   - byPartner2ndOrder: re-aggregated per-country totals
 *   - bucketsPerMonth: { month → { aligned, neutral, low, unknown } }
 *
 * @param {Object} opts
 * @param {Array} opts.partnersFlat    rows from the v1 dataset, see schema
 * @param {Map} opts.coefficients      from compute2ndOrderCoefficients
 * @param {function} opts.bucketFor    (alignmentPct) → "aligned"|"neutral"|"low"
 * @param {Map} opts.alignmentLookup   iso3 → { alignmentPct, name, bucket?, source }
 */
export function reattributeMonthlyByCountry({ partnersFlat, coefficients, bucketFor, alignmentLookup }) {
  // partnersFlat is a flat array of { month, iso3, country, alignmentPct, bucket, importValue }
  // We aggregate by month → 2nd-order recipient → value.

  const monthMap = new Map(); // month → Map<recipientIso3, value>
  const partnerTotals2 = new Map(); // recipientIso3 → totalImports2ndOrder

  for (const row of partnersFlat) {
    const { month, iso3, importValue } = row;
    if (!month || !iso3 || !importValue) continue;
    const coef = coefficients.get(iso3);

    if (!monthMap.has(month)) monthMap.set(month, new Map());
    const monthRecipients = monthMap.get(month);

    if (!coef || coef.reRollingFraction === 0) {
      // No 2nd-order shift — full attribution stays with X
      monthRecipients.set(iso3, (monthRecipients.get(iso3) || 0) + importValue);
      partnerTotals2.set(iso3, (partnerTotals2.get(iso3) || 0) + importValue);
      continue;
    }
    const genuine = (1 - coef.reRollingFraction) * importValue;
    const reAlloc = coef.reRollingFraction * importValue;

    monthRecipients.set(iso3, (monthRecipients.get(iso3) || 0) + genuine);
    partnerTotals2.set(iso3, (partnerTotals2.get(iso3) || 0) + genuine);

    for (const [upISO, share] of coef.upstreamShares) {
      const v = reAlloc * share;
      monthRecipients.set(upISO, (monthRecipients.get(upISO) || 0) + v);
      partnerTotals2.set(upISO, (partnerTotals2.get(upISO) || 0) + v);
    }
  }

  // Build per-month bucket totals
  const monthlyBuckets = new Map();
  for (const [month, recipients] of monthMap) {
    const buckets = { aligned: 0, neutral: 0, low: 0, unknown: 0 };
    for (const [recipient, value] of recipients) {
      const info = alignmentLookup.get(recipient);
      const bucket = info?.bucket || (info ? bucketFor(info.alignmentPct) : "unknown");
      buckets[bucket] = (buckets[bucket] || 0) + value;
    }
    monthlyBuckets.set(month, buckets);
  }

  // Build sorted partner list
  const byPartner = [...partnerTotals2.entries()]
    .map(([iso3, value]) => {
      const info = alignmentLookup.get(iso3);
      return {
        iso3,
        country: info?.name || iso3,
        alignmentPct: info?.alignmentPct ?? null,
        bucket: info?.bucket || (info ? bucketFor(info.alignmentPct) : "unknown"),
        importTonnes: Math.round(value), // legacy field name; this is value
        exportTonnes: 0,
      };
    })
    .sort((a, b) => b.importTonnes - a.importTonnes);

  return { byPartner2ndOrder: byPartner, monthlyBuckets };
}
