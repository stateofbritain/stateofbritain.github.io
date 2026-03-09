import { useState, useEffect, useCallback } from "react";

/**
 * Minimal path-based router using History API.
 * URL format: /pillar/topic  (e.g. /foundations/housing)
 *
 * Works on GitHub Pages via a 404.html redirect trick.
 *
 * @returns {{ pillar: string|null, topic: string|null, navigate: (pillar, topic) => void }}
 */
export default function useHashRoute() {
  const parse = () => {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
    const [pillar = null, topic = null] = path.split("/");
    return { pillar: pillar || null, topic: topic || null };
  };

  const [route, setRoute] = useState(parse);

  useEffect(() => {
    const onPop = () => setRoute(parse());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((pillar, topic) => {
    let path = "/";
    if (pillar && topic) {
      path = `/${pillar}/${topic}`;
    } else if (pillar) {
      path = `/${pillar}`;
    }
    window.history.pushState(null, "", path);
    setRoute({ pillar: pillar || null, topic: topic || null });
  }, []);

  return { ...route, navigate };
}
