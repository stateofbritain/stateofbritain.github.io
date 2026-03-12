import { useEffect, useRef } from "react";
import { track } from "../analytics";

/**
 * Fires a GA4 'section_view' event once when a section scrolls into view.
 * Returns a ref to attach to the section element.
 */
export default function useSectionView(sectionName) {
  const ref = useRef(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || fired.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true;
          track("section_view", { section: sectionName });
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [sectionName]);

  return ref;
}
