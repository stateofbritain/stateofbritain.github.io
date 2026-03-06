const BASE = "https://api.beta.ons.gov.uk/v1";
const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

function cacheKey(url) {
  return `sob:ons:${url}`;
}

function getCache(url) {
  try {
    const raw = localStorage.getItem(cacheKey(url));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > DEFAULT_TTL) {
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
    // Storage full — silently fail
  }
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      const wait = res.status === 429
        ? parseInt(res.headers.get("Retry-After") || "5", 10) * 1000
        : 2000;
      await new Promise((r) => setTimeout(r, wait * (i + 1)));
      continue;
    }
    throw new Error(`ONS API ${res.status}: ${res.statusText}`);
  }
  throw new Error("ONS API: max retries exceeded");
}

/**
 * List all available datasets.
 */
export async function listDatasets() {
  const url = `${BASE}/datasets`;
  const cached = getCache(url);
  if (cached) return cached;
  const data = await fetchWithRetry(url);
  setCache(url, data);
  return data;
}

/**
 * Get metadata for a specific dataset.
 */
export async function getDataset(datasetId) {
  const url = `${BASE}/datasets/${datasetId}`;
  const cached = getCache(url);
  if (cached) return cached;
  const data = await fetchWithRetry(url);
  setCache(url, data);
  return data;
}

/**
 * Get the latest version metadata for a dataset.
 * Returns { links, dimensions, ... } with the URL for observations.
 */
export async function getLatestVersion(datasetId, edition = "time-series") {
  const url = `${BASE}/datasets/${datasetId}/editions/${edition}/versions`;
  const cached = getCache(url);
  if (cached) return cached;
  const data = await fetchWithRetry(url);
  setCache(url, data);
  // Items are sorted newest-first by the API
  return data.items?.[0] ?? null;
}

/**
 * Fetch observations from a dataset.
 *
 * @param {string} datasetId - e.g. "cpih01"
 * @param {object} opts
 * @param {string} opts.edition - default "time-series"
 * @param {number|string} opts.version - specific version or "latest"
 * @param {object} opts.params - dimension filters as query params,
 *   e.g. { time: "*", geography: "K02000001", aggregate: "cpih1dim1A0" }
 * @returns {Promise<object>} - { observations: [...], total_observations, ... }
 */
export async function fetchObservations(datasetId, opts = {}) {
  const { edition = "time-series", version, params = {} } = opts;

  // Resolve version
  let ver = version;
  if (!ver) {
    const latest = await getLatestVersion(datasetId, edition);
    if (!latest) throw new Error(`No versions found for ${datasetId}/${edition}`);
    ver = latest.version;
  }

  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}/datasets/${datasetId}/editions/${edition}/versions/${ver}/observations${qs ? `?${qs}` : ""}`;

  const cached = getCache(url);
  if (cached) return cached;

  const data = await fetchWithRetry(url);
  setCache(url, data);
  return data;
}

/**
 * Helper: extract a simple time series from ONS observations.
 * Returns [{ time, value }, ...] sorted by time.
 */
export function toTimeSeries(observations, valueKey = "observation") {
  if (!observations?.observations) return [];
  return observations.observations
    .map((obs) => ({
      time: obs.dimensions?.Time?.id ?? obs.dimensions?.time?.id ?? "",
      value: parseFloat(obs[valueKey]),
    }))
    .filter((d) => !isNaN(d.value))
    .sort((a, b) => a.time.localeCompare(b.time));
}
