/** Lightweight GA4 event helper. No-ops if gtag isn't loaded. */
export function track(event, params) {
  if (typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }
}
