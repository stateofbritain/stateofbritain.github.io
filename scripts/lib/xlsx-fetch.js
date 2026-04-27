/**
 * Shared helpers for fetching and parsing UK government XLSX/ODS releases.
 *
 * Most gov.uk statistical releases publish files at URLs of the form
 *   https://assets.publishing.service.gov.uk/media/{UUID}/{filename}.{xlsx,ods}
 * where the UUID changes per release. The discovery pattern is to scrape
 * the discovery / collection page for the latest matching file URL, then
 * download and parse.
 *
 * Usage example (inside a fetch script):
 *
 *   import { fetchBuffer, discoverGovUkAsset, readXlsx, sheetToRows } from "./lib/xlsx-fetch.js";
 *
 *   const url = await discoverGovUkAsset({
 *     collectionUrl: "https://www.gov.uk/government/collections/criminal-court-statistics",
 *     filenamePattern: /cc_rdos_tool\.xlsx$/i,
 *   });
 *   const buf = await fetchBuffer(url);
 *   const wb  = readXlsx(buf);
 *   const rows = sheetToRows(wb.Sheets["Open cases"]);
 */
import https from "https";
import xlsx from "xlsx";

export function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      const parsed = new URL(u);
      https.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-GB,en;q=0.9",
          },
        },
        (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            res.resume();
            return get(res.headers.location);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
          res.on("error", reject);
        }
      ).on("error", reject);
    };
    get(url);
  });
}

export async function fetchHtml(url) {
  const buf = await fetchBuffer(url);
  return buf.toString("utf-8");
}

/**
 * Find candidate gov.uk asset URLs matching a filename pattern in HTML.
 * Returns an array of unique absolute URLs in document order.
 */
export function findGovUkAssets(html, filenamePattern) {
  const re = new RegExp(
    `https://assets\\.publishing\\.service\\.gov\\.uk/media/[a-f0-9-]+/[^"'\\s]+`,
    "gi"
  );
  const seen = new Set();
  const out = [];
  for (const match of html.match(re) || []) {
    if (seen.has(match)) continue;
    if (!filenamePattern.test(match)) continue;
    seen.add(match);
    out.push(match);
  }
  return out;
}

/**
 * Discover the latest gov.uk asset matching a filename pattern by scraping
 * a discovery page (e.g. a "/government/collections/..." index).
 * Returns the first matching URL, or null if none found.
 */
export async function discoverGovUkAsset({ collectionUrl, filenamePattern }) {
  const html = await fetchHtml(collectionUrl);
  const matches = findGovUkAssets(html, filenamePattern);
  return matches[0] ?? null;
}

export function readXlsx(buffer) {
  return xlsx.read(buffer, { type: "buffer" });
}

export function sheetToRows(sheet, opts = { header: 1 }) {
  return xlsx.utils.sheet_to_json(sheet, opts);
}

export function sheetToObjects(sheet) {
  return xlsx.utils.sheet_to_json(sheet);
}
