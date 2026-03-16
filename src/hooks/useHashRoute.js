import { useState, useEffect, useCallback } from "react";

/**
 * Minimal path-based router using History API.
 * URL format: /pillar/topic  or  /pillar/topic/subtopic
 *
 * Works on GitHub Pages via a 404.html redirect trick.
 *
 * @returns {{ pillar: string|null, topic: string|null, subtopic: string|null, navigate: (pillar, topic, subtopic?) => void }}
 */
export default function useHashRoute() {
  const parse = () => {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
    const [pillar = null, topic = null, subtopic = null] = path.split("/");
    return { pillar: pillar || null, topic: topic || null, subtopic: subtopic || null };
  };

  const [route, setRoute] = useState(parse);

  useEffect(() => {
    const onPop = () => setRoute(parse());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((pillar, topic, subtopic) => {
    let path = "/";
    if (pillar && topic && subtopic) {
      path = `/${pillar}/${topic}/${subtopic}`;
    } else if (pillar && topic) {
      path = `/${pillar}/${topic}`;
    } else if (pillar) {
      path = `/${pillar}`;
    }
    window.history.pushState(null, "", path);
    setRoute({ pillar: pillar || null, topic: topic || null, subtopic: subtopic || null });
  }, []);

  return { ...route, navigate };
}
