const BASE = "https://landregistry.data.gov.uk/data/ukhpi";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function cacheKey(url) {
  return `sob:lr:${url}`;
}

function getCache(url) {
  try {
    const raw = localStorage.getItem(cacheKey(url));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(cacheKey(url));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(url, data) {
  try {
    localStorage.setItem(cacheKey(url), JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Storage full
  }
}

/**
 * Fetch UK House Price Index data for a region.
 *
 * @param {string} region - e.g. "united-kingdom", "england", "london", "north-west"
 * @param {object} opts
 * @param {number} opts.pageSize - results per page (max ~200 seems safe)
 * @param {string} opts.minMonth - e.g. "2010-01" — filter client-side
 * @returns {Promise<Array>} - array of { month, averagePrice, housePriceIndex, ... }
 */
export async function fetchHousePrices(region = "united-kingdom", opts = {}) {
  const { pageSize = 200, minMonth = "2010-01" } = opts;

  const url = `${BASE}/region/${region}.json?_pageSize=${pageSize}&_view=all&_sort=refMonth`;
  const cached = getCache(url);
  if (cached) return cached;

  // May need multiple pages for full history
  let allItems = [];
  let pageUrl = url;

  while (pageUrl) {
    const res = await fetch(pageUrl);
    if (!res.ok) throw new Error(`Land Registry ${res.status}: ${res.statusText}`);
    const json = await res.json();
    const items = json.result?.items ?? [];
    allItems = allItems.concat(items);

    // Check for next page
    const next = json.result?.next;
    if (next && items.length > 0) {
      pageUrl = next;
    } else {
      pageUrl = null;
    }
  }

  // Normalize and filter
  const data = allItems
    .filter((item) => item.refMonth && item.refMonth >= minMonth)
    .map((item) => ({
      month: item.refMonth,
      averagePrice: item.averagePrice,
      averagePriceDetached: item.averagePriceDetached,
      averagePriceSemiDetached: item.averagePriceSemiDetached,
      averagePriceTerraced: item.averagePriceTerraced,
      averagePriceFlat: item.averagePriceFlatMaisonette,
      averagePriceNewBuild: item.averagePriceNewBuild,
      averagePriceExisting: item.averagePriceExistingProperty,
      housePriceIndex: item.housePriceIndex,
      annualChange: item.percentageAnnualChange,
      monthlyChange: item.percentageChange,
      salesVolume: item.salesVolume,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  setCache(url, data);
  return data;
}

/**
 * Get just January data points for a cleaner annual chart.
 */
export function toAnnual(monthlyData) {
  return monthlyData.filter((d) => d.month.endsWith("-01"));
}
