import { useState, useEffect, useCallback } from "react";

/**
 * Path-based router using the History API.
 *
 * Returns:
 *   segments[]   — the path split on "/", with empty entries dropped
 *                  e.g. /data/foundations/housing/prices → ["data","foundations","housing","prices"]
 *   section      — segments[0] (the top-level area: "dashboard", "data", "policy", etc.)
 *   navigate(...parts)  — pushState; parts are joined with "/" (null/undefined/"" are dropped)
 *   replace(...parts)   — replaceState; same arg semantics. Used for soft redirects.
 *
 * Example:
 *   navigate("data", "foundations", "housing", "prices")  → /data/foundations/housing/prices
 *   navigate()                                            → /
 */
export default function useHashRoute() {
  const parse = () => {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
    return path === "" ? [] : path.split("/");
  };

  const [segments, setSegments] = useState(parse);

  useEffect(() => {
    const onPop = () => setSegments(parse());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((...parts) => {
    const filtered = parts.filter((p) => p !== null && p !== undefined && p !== "");
    const path = filtered.length === 0 ? "/" : "/" + filtered.join("/");
    if (window.location.pathname === path) return;
    window.history.pushState(null, "", path);
    setSegments(filtered);
  }, []);

  const replace = useCallback((...parts) => {
    const filtered = parts.filter((p) => p !== null && p !== undefined && p !== "");
    const path = filtered.length === 0 ? "/" : "/" + filtered.join("/");
    if (window.location.pathname === path) return;
    window.history.replaceState(null, "", path);
    setSegments(filtered);
  }, []);

  return {
    segments,
    section: segments[0] || null,
    navigate,
    replace,
  };
}
