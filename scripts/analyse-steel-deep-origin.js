/**
 * analyse-steel-deep-origin.js
 *
 * One-shot analysis: for each major UK steel-import partner, compare
 * their finished-steel exports (HS 7208-7229) with their semi-finished
 * steel imports (HS 7206-7207, billets/blooms/slabs) from likely
 * upstream-origin countries. The ratio gives a back-of-envelope estimate
 * of how much "X-origin" steel arriving in the UK is actually re-rolled
 * material from elsewhere.
 *
 * Source: UN Comtrade public preview API. No key required for this
 * level of querying.
 *
 * Limitations:
 *   - Annual data only (latest = 2023 typically)
 *   - Excludes 2024 / 2025 which are visible in HMRC OData but not yet
 *     in Comtrade's free preview
 *   - "Re-rolling fraction" is an upper bound: it assumes all imported
 *     semis are processed and exported, when some are domestically
 *     consumed
 *   - WCO origin rule treats re-rolling as substantial transformation;
 *     this analysis attempts to look behind that
 */
import https from "https";

const API = "https://comtradeapi.un.org/public/v1/preview/C/A/HS";

// ISO numeric country codes used by Comtrade
const PARTNER_CODES = {
  NLD: 528, FRA: 250, ESP: 724, DEU: 276, BEL: 56,
  ITA: 380, IND: 356, KOR: 410, TUR: 792, VNM: 704,
  CHN: 156, RUS: 643, JPN: 392, GBR: 826, PRT: 620,
};
const UK = 826;

// Likely upstream origins for semi-finished steel
const UPSTREAM = ["CHN", "RUS", "IND", "TUR", "BRA"];

// HS6 codes — we sum across all relevant slices
const FINISHED_HS = ["72"]; // full HS72 (covers 7208-7229 + others; close enough)
const SEMIFINISHED_HS = ["72"]; // we'll filter by HS6 in the response

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30_000 }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8"))); }
        catch (e) { reject(e); }
      });
      res.on("error", reject);
    }).on("error", reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function comtrade({ reporterCode, partnerCode, period = "2023", flowCode, cmdCodes }) {
  // Pass multiple HS6 codes via comma-separated cmdCode
  const cmd = Array.isArray(cmdCodes) ? cmdCodes.join(",") : cmdCodes;
  const url = `${API}?reporterCode=${reporterCode}&partnerCode=${partnerCode}&period=${period}&cmdCode=${cmd}&flowCode=${flowCode}`;
  await sleep(800);
  const json = await fetchJson(url);
  const rows = json?.data || [];
  const total = rows.reduce((s, r) => s + (r.primaryValue || 0), 0);
  return { total, rows: rows.length };
}

// Finished steel HS6 codes (matches our HMRC card)
const FINISHED = ["7208","7209","7210","7211","7212","7213","7214","7215","7216","7217","7218","7219","7220","7221","7222","7223","7224","7225","7226","7227","7228","7229"];
// Semi-finished steel HS6 codes (the "re-rolling input")
const SEMIFINISHED = ["7206","7207"];

// Top UK steel-import partners from our HMRC dataset (24-month total tonnes)
const TOP_PARTNERS = ["IND", "NLD", "FRA", "ESP", "DEU", "KOR", "TUR", "BEL", "VNM", "PRT"];

async function main() {
  console.log("\n=== UK Steel deep-origin analysis (UN Comtrade, 2023) ===\n");

  // 1) Each partner's reported FINISHED steel exports to UK (HS 7208-7229)
  console.log("Mirror check — partner's reported FINISHED steel exports to UK (2022 fallback if 2023 missing):");
  console.log("  partner | reported X-finished | period");
  console.log("  ------------------------------------");
  const mirrorExports = {};
  for (const iso3 of TOP_PARTNERS) {
    let result = { total: 0, rows: 0, period: "2023" };
    for (const period of ["2023", "2022"]) {
      try {
        const code = PARTNER_CODES[iso3];
        const x = await comtrade({ reporterCode: code, partnerCode: UK, flowCode: "X", cmdCodes: FINISHED, period });
        if (x.total > 0) {
          result = { ...x, period };
          break;
        }
      } catch (err) {}
    }
    mirrorExports[iso3] = result.total;
    console.log(`  ${iso3.padEnd(8)} $${(result.total / 1e6).toFixed(0).padStart(8)}m   ${result.period}`);
  }

  // 2) Each partner's imports of SEMI-FINISHED steel (HS 7206-7207)
  // from likely upstream-origin countries
  console.log("\n\nRe-rolling input — partner's SEMI-FINISHED imports from upstream:");
  console.log("  partner | semi imports from upstream | breakdown");
  console.log("  ----------------------------------------------");
  const upstreamImports = {};
  for (const iso3 of TOP_PARTNERS) {
    if (UPSTREAM.includes(iso3)) continue;
    let total = 0;
    const breakdown = [];
    for (const upISO of UPSTREAM) {
      let val = 0;
      for (const period of ["2023", "2022"]) {
        try {
          const x = await comtrade({
            reporterCode: PARTNER_CODES[iso3],
            partnerCode: PARTNER_CODES[upISO],
            flowCode: "M",
            cmdCodes: SEMIFINISHED,
            period,
          });
          if (x.total > 0) { val = x.total; break; }
        } catch (err) {}
      }
      if (val > 0) {
        total += val;
        breakdown.push(`${upISO}=$${(val / 1e6).toFixed(0)}m`);
      }
    }
    upstreamImports[iso3] = total;
    console.log(`  ${iso3.padEnd(8)} $${(total / 1e6).toFixed(0).padStart(8)}m   ${breakdown.join(" ")}`);
  }

  // 3) Re-rolling ratio: of partner's finished UK-exports, what
  //    fraction could plausibly be derived from imported semi-finished
  //    upstream-origin steel?
  console.log("\n\nRe-rolling-ratio estimate (upper bound — semi/finished, $:$):");
  console.log("  partner | UK-X-finished | semi-M-upstream | ratio");
  console.log("  ----------------------------------------------------");
  for (const iso3 of TOP_PARTNERS) {
    const xUK = mirrorExports[iso3] || 0;
    const mUp = upstreamImports[iso3] || 0;
    const ratio = xUK > 0 ? Math.min(mUp / xUK, 1) : null;
    console.log(
      `  ${iso3.padEnd(8)} $${(xUK / 1e6).toFixed(0).padStart(6)}m | $${(mUp / 1e6).toFixed(0).padStart(6)}m | ${ratio == null ? "—" : (ratio * 100).toFixed(0) + "%"}`
    );
  }

  console.log(`
Reading the ratio:
  - High ratio (>50%) = partner is plausibly re-rolling a large
    fraction of upstream-origin semi-finished steel (China/Russia/
    India/Turkey/Brazil) and exporting it to the UK as "their" steel.
  - Low ratio (<10%) = partner's UK exports are mostly derived from
    their own primary steel production. Their HMRC COO attribution
    is honest.

Caveats:
  - Comtrade public preview is annual; we use 2023 (2022 fallback)
  - Ratios are upper bounds (some imported semis are domestically used)
  - Ratio doesn't account for country X's exports to other destinations
    (which also draw from imported semis)
  - Different USD valuations: imports CIF, exports FOB — adds ~5% noise
`);
}

main().catch((err) => { console.error(err); process.exit(1); });
