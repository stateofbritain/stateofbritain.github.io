import { useState, useEffect, useCallback } from "react";

/**
 * Minimal hash-based router.
 * URL format: #/pillar/topic  (e.g. #/foundations/housing)
 *
 * @returns {{ pillar: string|null, topic: string|null, navigate: (pillar, topic) => void }}
 */
export default function useHashRoute() {
  const parse = () => {
    const hash = window.location.hash.replace(/^#\/?/, "");
    const [pillar = null, topic = null] = hash.split("/");
    return { pillar: pillar || null, topic: topic || null };
  };

  const [route, setRoute] = useState(parse);

  useEffect(() => {
    const onHash = () => setRoute(parse());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((pillar, topic) => {
    if (pillar && topic) {
      window.location.hash = `#/${pillar}/${topic}`;
    } else if (pillar) {
      window.location.hash = `#/${pillar}`;
    } else {
      window.location.hash = "";
    }
  }, []);

  return { ...route, navigate };
}
