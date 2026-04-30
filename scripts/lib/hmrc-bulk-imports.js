/**
 * HMRC Bulk Imports parser — Country of Origin edition.
 *
 * The OData API at api.uktradeinfo.com only exposes a single "partner
 * country" per OTS row. By HMRC methodology that's Country of Origin
 * for non-EU imports but Country of Dispatch for EU imports. Goods
 * made in China but shipped via Rotterdam (or Antwerp, Hamburg,
 * Vienna...) get attributed to the EU dispatch point — the Rotterdam
 * effect.
 *
 * The bulk-data files at uktradeinfo.com/trade-data/latest-bulk-data-sets
 * give us BOTH fields per row. This helper parses bdsimp{YYMM}.zip and
 * exposes country totals using COO-ALPHA (Country of Origin), so
 * Chinese magnesium routed through Rotterdam shows as China.
 *
 * Each bdsimp file is ~5MB compressed / ~37MB uncompressed / ~1.6M
 * rows / one month of UK imports (combined non-EU + EU arrivals).
 *
 * File layout (positions are 1-indexed):
 *   1-6    PERIOD-REFERENCE     YYYYMM (statistical month)
 *   7      TYPE                  flow type indicator
 *   8-13   ACCOUNT               YYYYMM (publication month)
 *   14-21  COMCODE               8-digit CN commodity code
 *   22-26  SITC                  5-digit
 *   27-29  COD-SEQ               numeric Country of Dispatch
 *   30-31  COD-ALPHA             alpha-2 Country of Dispatch
 *   32-34  PORT-SEQ
 *   35-37  PORT-ALPHA            (eg "DOV" for Dover)
 *   38-40  COO-SEQ               numeric Country of Origin
 *   41-42  COO-ALPHA             alpha-2 Country of Origin  ← canonical
 *   43-44  MODE                  mode of transport
 *   45-56  STAT-VALUE            12-digit £ (no decimal)
 *   57-68  NET-MASS              12-digit kg (× 100? not used here; £ used)
 *   69-80  SUPP-UNIT
 *   81     SUPPRESSION
 *   82-84  FLOW                  "imp" or "exp"
 *   85     REC-TYPE
 *
 * Schema source: uktradeinfo.com / trade-data / latest-bulk-data-sets
 *                / bulk-data-set-export-and-import-technical-specifications.
 */
import https from "https";
import { createWriteStream, existsSync, statSync, mkdirSync, readFileSync } from "fs";
import path from "path";
import { execSync } from "child_process";
import { alpha2ToAlpha3 } from "./iso-alpha2-to-alpha3.js";

const CACHE_DIR = "data/manual-uploads/hmrc-bulk";
const ARCHIVE_INDEX_URL = "https://www.uktradeinfo.com/trade-data/latest-bulk-data-sets/bulk-data-sets-archive/";
const LATEST_INDEX_URL = "https://www.uktradeinfo.com/trade-data/latest-bulk-datasets/";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      const parsed = new URL(u);
      https.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: { "User-Agent": UA, Accept: "text/html" },
          timeout: 30_000,
        },
        (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
            res.resume();
            const next = res.headers.location.startsWith("http")
              ? res.headers.location
              : new URL(res.headers.location, u).toString();
            return get(next);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
          res.on("error", reject);
        }
      ).on("error", reject);
    };
    get(url);
  });
}

function downloadTo(url, dest) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      const parsed = new URL(u);
      https.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: { "User-Agent": UA },
          timeout: 60_000,
        },
        (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
            res.resume();
            const next = res.headers.location.startsWith("http")
              ? res.headers.location
              : new URL(res.headers.location, u).toString();
            return get(next);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          }
          const out = createWriteStream(dest);
          res.pipe(out);
          out.on("finish", () => out.close(resolve));
          out.on("error", reject);
        }
      ).on("error", reject);
    };
    get(url);
  });
}

let archiveUrlCache = null;
let latestUrlCache = null;

/**
 * Resolve the public ZIP URL for a given month-id (YYYYMM).
 *
 * Latest 1-2 months are on /latest-bulk-datasets/ as bdsimp{YYMM}.zip.
 * Older months are bundled into half-year archives like
 * bdsimp_jan-jun26archive.zip on /latest-bulk-data-sets/bulk-data-sets-archive/.
 *
 * Returns { url, archive: bool } or throws if not found.
 */
async function resolveZipUrl(monthId) {
  const yymm = monthId.slice(2);
  const yy = monthId.slice(2, 4);
  const m = parseInt(monthId.slice(4, 6), 10);
  const half = m <= 6 ? "jan-jun" : "jul-dec";

  // 1) Try latest first (no archive bundle).
  if (!latestUrlCache) {
    try {
      const html = await fetchHtml(LATEST_INDEX_URL);
      const m = html.match(/href="(\/media\/[a-z0-9]+\/bdsimp(\d{4})\.zip)"/);
      latestUrlCache = m ? { url: `https://www.uktradeinfo.com${m[1]}`, yymm: m[2] } : null;
    } catch (err) {
      console.warn(`  latest-index fetch failed: ${err.message}`);
      latestUrlCache = null;
    }
  }
  if (latestUrlCache && latestUrlCache.yymm === yymm) {
    return { url: latestUrlCache.url, archive: false, monthId };
  }

  // 2) Look up the archive bundle for this half-year.
  if (!archiveUrlCache) {
    archiveUrlCache = new Map();
    const html = await fetchHtml(ARCHIVE_INDEX_URL);
    const re = /href="(\/media\/[a-z0-9]+\/bdsimp[-_a-z0-9]+archive\.zip)"/g;
    for (const match of html.matchAll(re)) {
      const path = match[1];
      // Parse the half + year out of the filename
      const fn = path.match(/bdsimp_(?:(\d{2})|((?:jan-jun|jul-dec))(\d{2}))archive\.zip/);
      if (!fn) continue;
      const halfTag = fn[2] || (parseInt(fn[1] || "00") <= 21 ? "" : "");
      const yearTag = fn[3] || fn[1];
      // Whole-year archives (eg bdsimp_21archive.zip) cover Jan-Dec
      if (!halfTag) {
        archiveUrlCache.set(`${yearTag}-jan-jun`, `https://www.uktradeinfo.com${path}`);
        archiveUrlCache.set(`${yearTag}-jul-dec`, `https://www.uktradeinfo.com${path}`);
      } else {
        archiveUrlCache.set(`${yearTag}-${halfTag}`, `https://www.uktradeinfo.com${path}`);
      }
    }
  }
  const key = `${yy}-${half}`;
  const archiveUrl = archiveUrlCache.get(key);
  if (!archiveUrl) {
    throw new Error(`No archive ZIP found for ${monthId} (key ${key})`);
  }
  return { url: archiveUrl, archive: true, monthId };
}

/**
 * Ensure the bulk file for the given monthId is on disk and return
 * the path to its uncompressed text file. Caches everything in
 * data/manual-uploads/hmrc-bulk/ — gitignored.
 */
export async function ensureBulkFile(monthId) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const yymm = monthId.slice(2);
  const txtPath = path.join(CACHE_DIR, `BDSimp${yymm}.txt`);
  if (existsSync(txtPath) && statSync(txtPath).size > 1_000_000) return txtPath;

  // Download single-month or archive zip and unpack.
  const { url, archive, monthId: id } = await resolveZipUrl(monthId);
  const zipPath = path.join(CACHE_DIR, archive ? path.basename(url) : `bdsimp${yymm}.zip`);
  if (!existsSync(zipPath) || statSync(zipPath).size < 100_000) {
    console.log(`  downloading ${url} → ${path.basename(zipPath)}`);
    await downloadTo(url, zipPath);
  } else {
    console.log(`  cached zip: ${path.basename(zipPath)}`);
  }
  // Unzip to CACHE_DIR — extracts BDSimp{YYMM}.txt for the wanted month
  // (and other months too if it's an archive bundle).
  console.log(`  unzipping → ${CACHE_DIR}/`);
  execSync(`unzip -o -q "${zipPath}" -d "${CACHE_DIR}"`);
  if (!existsSync(txtPath)) {
    // Try uppercase / case-permutation variants.
    const fs = await import("fs");
    const dir = fs.readdirSync(CACHE_DIR);
    const match = dir.find((f) => f.toLowerCase() === `bdsimp${yymm}.txt`);
    if (!match) throw new Error(`Unzip succeeded but BDSimp${yymm}.txt not found in ${CACHE_DIR}`);
    return path.join(CACHE_DIR, match);
  }
  return txtPath;
}

/**
 * Filter rows from a single bdsimp file by HS chapter / HS6 codes,
 * group by Country of Origin (alpha-2), and return the same shape as
 * fetchTradeByCountry from hmrc-trade-by-country.js.
 *
 * Note: bdsimp covers IMPORTS only. Exports come from bdsexp (not yet
 * wired). For now, exportTonnes / exportGbp are returned as 0 for all
 * partners.
 */
// Per-process cache of parsed lines, keyed by monthId. Each ~37MB file
// is split into lines once and reused across HS-filter calls within one
// script run. Trades ~900MB peak memory for 24-cached-months in
// exchange for not re-reading from disk on every call.
const linesByMonth = new Map();

export async function fetchImportsByOrigin({ hs2, hs4Range, hs6In, monthId }) {
  let lines = linesByMonth.get(monthId);
  if (!lines) {
    const txtPath = await ensureBulkFile(monthId);
    const txt = readFileSync(txtPath, "utf-8");
    lines = txt.split("\n");
    linesByMonth.set(monthId, lines);
  }

  const hs6Set = hs6In ? new Set(hs6In) : null;
  const [hs4Lo, hs4Hi] = hs4Range || [null, null];

  const acc = new Map(); // alpha2 → { kg, gbp }
  for (const line of lines) {
    if (line.length < 85) continue;
    // Position 14-21 is COMCODE (CN8). HS2 = first 2; HS4 = first 4; HS6 = first 6.
    if (line.slice(13, 15) !== hs2) continue;
    const hs4 = line.slice(13, 17);
    if (hs4Lo != null && (parseInt(hs4) < hs4Lo || parseInt(hs4) > hs4Hi)) continue;
    if (hs6Set) {
      const hs6 = line.slice(13, 19);
      if (!hs6Set.has(hs6)) continue;
    }
    const flow = line.slice(81, 84);
    if (flow !== "imp") continue;
    const cooAlpha = line.slice(40, 42).trim();
    if (!cooAlpha) continue;
    const value = parseInt(line.slice(44, 56), 10) || 0;  // £
    const mass = parseInt(line.slice(56, 68), 10) || 0;   // kg (raw integer)
    if (!acc.has(cooAlpha)) acc.set(cooAlpha, { kg: 0, gbp: 0 });
    const a = acc.get(cooAlpha);
    a.kg += mass;
    a.gbp += value;
  }

  const out = [];
  const month = `${monthId.slice(0, 4)}-${monthId.slice(4, 6)}`;
  for (const [alpha2, totals] of acc) {
    out.push({
      month,
      countryId: null,
      alpha2,
      alpha3: alpha2ToAlpha3(alpha2),
      name: null, // names resolved later via UNGA lookup or alpha2 fallback
      importTonnes: Math.round(totals.kg / 1000),
      exportTonnes: 0,
      importGbp: totals.gbp,
      exportGbp: 0,
    });
  }
  return out;
}

export function lastNMonthIds(n, lagMonths = 2) {
  const out = [];
  const now = new Date();
  for (let i = lagMonths; i < lagMonths + n; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    out.push(`${y}${m}`);
  }
  return out.reverse();
}
