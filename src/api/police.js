const BASE = "https://data.police.uk/api";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function cacheKey(url) {
  return `sob:police:${url}`;
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
  } catch {}
}

async function fetchJSON(url) {
  const cached = getCache(url);
  if (cached) return cached;
  const res = await fetch(url);
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 2000));
    const retry = await fetch(url);
    if (!retry.ok) throw new Error(`Police API ${retry.status}`);
    const data = await retry.json();
    setCache(url, data);
    return data;
  }
  if (!res.ok) throw new Error(`Police API ${res.status}: ${res.statusText}`);
  const data = await res.json();
  setCache(url, data);
  return data;
}

/**
 * Get available crime data dates.
 * Returns array of { date: "YYYY-MM" } sorted newest first.
 */
export async function getAvailableDates() {
  return fetchJSON(`${BASE}/crimes-street-dates`);
}

/**
 * Get crime categories for a given month.
 */
export async function getCrimeCategories(date) {
  return fetchJSON(`${BASE}/crime-categories?date=${date}`);
}

/**
 * Get all forces.
 */
export async function getForces() {
  return fetchJSON(`${BASE}/forces`);
}

/**
 * Get crimes at a location for a given month.
 * Use lat/lng of a city centre for area-level data.
 */
export async function getCrimesAtLocation(lat, lng, date) {
  return fetchJSON(
    `${BASE}/crimes-street/all-crime?lat=${lat}&lng=${lng}&date=${date}`
  );
}

/**
 * Aggregate crimes across a set of major cities to approximate national picture.
 * Returns { total, byCategory: { category: count } }
 */
export async function getNationalSnapshot(date) {
  // Major city centres — covers ~40% of England & Wales population
  const cities = [
    { name: "London", lat: 51.5074, lng: -0.1278 },
    { name: "Birmingham", lat: 52.4862, lng: -1.8904 },
    { name: "Manchester", lat: 53.4808, lng: -2.2426 },
    { name: "Leeds", lat: 53.8008, lng: -1.5491 },
    { name: "Liverpool", lat: 53.4084, lng: -2.9916 },
    { name: "Bristol", lat: 51.4545, lng: -2.5879 },
    { name: "Sheffield", lat: 53.3811, lng: -1.4701 },
    { name: "Newcastle", lat: 54.9783, lng: -1.6178 },
    { name: "Nottingham", lat: 52.9548, lng: -1.1581 },
    { name: "Cardiff", lat: 51.4816, lng: -3.1791 },
  ];

  const results = await Promise.all(
    cities.map((c) =>
      getCrimesAtLocation(c.lat, c.lng, date).catch(() => [])
    )
  );

  const byCategory = {};
  let total = 0;

  for (const crimes of results) {
    total += crimes.length;
    for (const crime of crimes) {
      const cat = crime.category;
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }
  }

  return { total, byCategory, cityCount: cities.length, date };
}
