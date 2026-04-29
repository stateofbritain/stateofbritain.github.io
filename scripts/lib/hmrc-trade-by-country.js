/**
 * HMRC Overseas Trade in Goods (OTS) — fetch UK trade per partner
 * country for a given HS chapter or HS4 range, by month.
 *
 * Endpoint: https://api.uktradeinfo.com/OTS (OData v4)
 * FlowTypeIds:  1 = EU imports,  2 = EU exports
 *               3 = Non-EU imports, 4 = Non-EU exports
 *
 * Each OTS row carries CountryId; Country lookup is fetched once and
 * cached in-process. CountryCodeAlpha (ISO alpha-2) is mapped to ISO
 * alpha-3 via scripts/lib/iso-alpha2-to-alpha3.js so callers can join
 * directly to the UNGA alignment dataset.
 *
 * HMRC's Country count is 263; the OTS volume per month is ~3000 rows
 * for chapter 72 alone. Pagination uses $top=10000 (one page handles
 * any single month + flow combination at HS2 granularity).
 */
import https from "https";
import { alpha2ToAlpha3 } from "./iso-alpha2-to-alpha3.js";

const OTS_BASE = "https://api.uktradeinfo.com/OTS";
const COUNTRY_BASE = "https://api.uktradeinfo.com/Country";

const REQUEST_DELAY_MS = 750;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    https
      .get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: {
            Accept: "application/json",
            "User-Agent": "StateOfBritain/1.0 (+dashboard)",
          },
        },
        (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
            res.resume();
            return fetchJson(res.headers.location).then(resolve, reject);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
            } catch (e) {
              reject(e);
            }
          });
          res.on("error", reject);
        }
      )
      .on("error", reject);
  });
}

let countryCache = null;

/**
 * Fetch the full HMRC Country lookup once and cache it.
 * Returns Map<CountryId, { alpha2, alpha3, name }>.
 */
export async function getCountryLookup() {
  if (countryCache) return countryCache;
  const lookup = new Map();
  // 263 countries; pull in pages of 100.
  for (let skip = 0; skip < 400; skip += 100) {
    const url = `${COUNTRY_BASE}?${new URLSearchParams({
      $top: "100",
      $skip: String(skip),
    })}`;
    const json = await fetchJson(url);
    const rows = json.value || [];
    if (rows.length === 0) break;
    for (const r of rows) {
      const alpha2 = r.CountryCodeAlpha?.trim();
      lookup.set(r.CountryId, {
        alpha2: alpha2 || null,
        alpha3: alpha2ToAlpha3(alpha2),
        name: r.CountryName?.trim() || `CountryId ${r.CountryId}`,
      });
    }
    if (rows.length < 100) break;
    await sleep(REQUEST_DELAY_MS);
  }
  countryCache = lookup;
  return lookup;
}

/**
 * Build the OData $filter clause for an HS slice. Supports either:
 *   - hs2 + optional hs4Range (e.g. chapter 72, codes 7208-7229)
 *   - hs2 + hs6In (explicit list of HS6 codes, e.g. ['271111', '271121'])
 *
 * @param {string} hs2  two-digit HS chapter, e.g. "72"
 * @param {?[number, number]} hs4Range inclusive HS4 bounds
 * @param {?string[]} hs6In  array of explicit HS6 codes
 */
function hsFilter(hs2, hs4Range, hs6In) {
  const base = `Commodity/Hs2Code eq '${hs2}'`;
  if (hs6In && hs6In.length > 0) {
    const inClause = hs6In.map((c) => `Commodity/Hs6Code eq '${c}'`).join(" or ");
    return `${base} and (${inClause})`;
  }
  if (!hs4Range) return base;
  const [lo, hi] = hs4Range;
  return `${base} and Commodity/Hs4Code ge '${lo}' and Commodity/Hs4Code le '${hi}'`;
}

/**
 * Fetch all OTS rows for one (HS slice, flow type, month) combination.
 * Returns an array of raw rows.
 */
async function fetchSliceRows(hs2, hs4Range, hs6In, flowTypeId, monthId) {
  const filter = `${hsFilter(hs2, hs4Range, hs6In)} and FlowTypeId eq ${flowTypeId} and MonthId eq ${monthId}`;
  const url = `${OTS_BASE}?${new URLSearchParams({ $filter: filter, $top: "10000" })}`;
  const json = await fetchJson(url);
  return json.value || [];
}

/**
 * Sum NetMass (kg) and Value (£) across an array of OTS rows, grouped
 * by CountryId.
 */
function aggregateByCountry(rows) {
  const acc = new Map();
  for (const r of rows) {
    const cid = r.CountryId;
    if (cid == null) continue;
    if (!acc.has(cid)) acc.set(cid, { kg: 0, gbp: 0 });
    const entry = acc.get(cid);
    entry.kg += r.NetMass || 0;
    entry.gbp += r.Value || 0;
  }
  return acc;
}

/**
 * Fetch a single month's HMRC trade for an HS slice, both directions,
 * grouped by partner country.
 *
 * @returns {Promise<Array<{
 *   month: string,         // "YYYY-MM"
 *   countryId: number,
 *   alpha2: string|null,
 *   alpha3: string|null,
 *   name: string,
 *   importTonnes: number,
 *   exportTonnes: number,
 *   importGbp: number,
 *   exportGbp: number,
 * }>>}
 */
export async function fetchTradeByCountry({ hs2, hs4Range, hs6In, monthId }) {
  const lookup = await getCountryLookup();

  const importRows = await fetchSliceRows(hs2, hs4Range, hs6In, 1, monthId);
  await sleep(REQUEST_DELAY_MS);
  const importNonEuRows = await fetchSliceRows(hs2, hs4Range, hs6In, 3, monthId);
  await sleep(REQUEST_DELAY_MS);
  const exportRows = await fetchSliceRows(hs2, hs4Range, hs6In, 2, monthId);
  await sleep(REQUEST_DELAY_MS);
  const exportNonEuRows = await fetchSliceRows(hs2, hs4Range, hs6In, 4, monthId);

  const imports = aggregateByCountry([...importRows, ...importNonEuRows]);
  const exports = aggregateByCountry([...exportRows, ...exportNonEuRows]);

  const allCids = new Set([...imports.keys(), ...exports.keys()]);
  const month = monthIdToPeriod(monthId);
  const out = [];
  for (const cid of allCids) {
    const meta = lookup.get(cid) || { alpha2: null, alpha3: null, name: `CountryId ${cid}` };
    const i = imports.get(cid) || { kg: 0, gbp: 0 };
    const e = exports.get(cid) || { kg: 0, gbp: 0 };
    out.push({
      month,
      countryId: cid,
      alpha2: meta.alpha2,
      alpha3: meta.alpha3,
      name: meta.name,
      importTonnes: Math.round(i.kg / 1000),
      exportTonnes: Math.round(e.kg / 1000),
      importGbp: Math.round(i.gbp),
      exportGbp: Math.round(e.gbp),
    });
  }
  return out;
}

export function monthIdToPeriod(id) {
  const s = String(id);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}`;
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
