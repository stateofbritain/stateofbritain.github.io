import { useState, useEffect } from "react";

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
