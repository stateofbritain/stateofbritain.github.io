import { useState, useEffect, useMemo } from "react";

/**
 * Generic data-fetching hook.
 *
 * @param {Function} fetchFn - async function that returns data
 * @param {Array} deps - dependency array (re-fetch when these change)
 * @returns {{ data: any, loading: boolean, error: string|null }}
 */
export default function useDataset(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchFn()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? "Failed to fetch data");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error };
}

// ─── v1 schema helpers ──────────────────────────────────────────────

/**
 * Detect whether a parsed JSON object uses the v1 dataset schema.
 */
function isV1(json) {
  return json?.$schema === "sob-dataset-v1";
}

/**
 * Unwrap a v1 dataset into the flat shape components expect:
 *  - series.*.data → top-level keys  (e.g. data.tfrByOrder)
 *  - snapshot values from { value, year } → bare numbers
 *  - meta stays as-is (sources → meta.sources)
 *
 * Also attaches a hidden __v1 reference so helpers can reach series metadata.
 */
function unwrapV1(raw) {
  const out = {};

  // Keep meta in the shape components already expect
  if (raw.sources) {
    out.meta = {
      sources: raw.sources.map((s) => ({
        name: s.name,
        url: s.url,
        note: s.note,
      })),
      generated: raw.generated,
    };
  }

  // Unwrap snapshot: { tfr: { value: 1.41, year: 2024 } } → { tfr: 1.41, tfrYear: 2024 }
  if (raw.snapshot) {
    const snap = {};
    for (const [key, entry] of Object.entries(raw.snapshot)) {
      if (entry && typeof entry === "object" && "value" in entry) {
        snap[key] = entry.value;
        if (entry.year != null) snap[`${key}Year`] = entry.year;
        if (entry.peak != null) snap[`${key}Peak`] = entry.peak;
        if (entry.peakYear != null) snap[`${key}PeakYear`] = entry.peakYear;
        if (entry.change != null) snap[`${key}Change`] = entry.change;
        if (entry.unit != null) snap[`${key}Unit`] = entry.unit;
      } else {
        snap[key] = entry;
      }
    }
    out.snapshot = snap;
  }

  // Unwrap series: series.tfrByOrder.data → out.tfrByOrder
  // Dot-notation keys (e.g. "broadband.fttp") become nested: out.broadband.fttp
  if (raw.series) {
    for (const [seriesId, seriesDef] of Object.entries(raw.series)) {
      const parts = seriesId.split(".");
      if (parts.length === 1) {
        out[seriesId] = seriesDef.data;
      } else {
        // Reconstruct nested path: "broadband.fttp" → out.broadband.fttp
        let target = out;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!target[parts[i]] || typeof target[parts[i]] !== "object") {
            target[parts[i]] = {};
          }
          target = target[parts[i]];
        }
        target[parts[parts.length - 1]] = seriesDef.data;
      }
    }
  }

  // Attach raw v1 reference for helpers (non-enumerable so it doesn't interfere)
  Object.defineProperty(out, "__v1", { value: raw, enumerable: false });

  return out;
}

/**
 * Fetch a JSON data file and auto-detect v1 format.
 * Returns the backward-compatible flat shape either way.
 *
 * Can be used as a drop-in replacement for fetch("/data/...").then(r => r.json()):
 *   fetchDataset("spending.json").then(setData).catch(...)
 */
export async function fetchDataset(filename) {
  const resp = await fetch(`/data/${filename}`);
  if (!resp.ok) throw new Error(`Failed to fetch /data/${filename}: ${resp.status}`);
  const json = await resp.json();
  return isV1(json) ? unwrapV1(json) : json;
}

/**
 * Hook that fetches a JSON data file from /data/ and unwraps v1 format
 * for backward compatibility.
 *
 * @param {string} filename - e.g. "family.json"
 * @returns {{ data: object|null, loading: boolean, error: string|null, raw: object|null }}
 */
export function useJsonDataset(filename) {
  const { data, loading, error } = useDataset(
    () => fetchDataset(filename),
    [filename],
  );

  // Expose the raw v1 object (for methodologyBreaks etc.)
  const raw = useMemo(() => data?.__v1 ?? null, [data]);

  return { data, loading, error, raw };
}

/**
 * Get methodology breaks for a series from the raw v1 object.
 *
 * @param {object|null} raw - The raw v1 dataset (from useJsonDataset().raw)
 * @param {string} seriesId - Series key, e.g. "tfrByOrder"
 * @returns {Array} methodology breaks or empty array
 */
export function getBreaks(raw, seriesId) {
  return raw?.series?.[seriesId]?.methodologyBreaks ?? [];
}
