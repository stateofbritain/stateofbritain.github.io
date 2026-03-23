import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import PILLARS from "../pillars/config";
import P from "../theme/palette";
import { track } from "../analytics";

/**
 * Build a flat search index from the pillar config.
 * Each entry: { label, breadcrumb, pillar, topic, subtopic }
 */
function buildIndex() {
  const entries = [];
  for (const [pillarKey, pillar] of Object.entries(PILLARS)) {
    for (const [topicKey, topic] of Object.entries(pillar.topics)) {
      if (topic.subtopics) {
        for (const [subKey, sub] of Object.entries(topic.subtopics)) {
          entries.push({
            label: sub.label,
            breadcrumb: `${pillar.label} → ${topic.label} → ${sub.label}`,
            search: `${pillar.label} ${topic.label} ${sub.label}`.toLowerCase(),
            pillar: pillarKey,
            topic: topicKey,
            subtopic: subKey,
            color: pillar.color,
          });
        }
      } else {
        entries.push({
          label: topic.label,
          breadcrumb: `${pillar.label} → ${topic.label}`,
          search: `${pillar.label} ${topic.label}`.toLowerCase(),
          pillar: pillarKey,
          topic: topicKey,
          subtopic: null,
          color: pillar.color,
        });
      }
    }
  }
  // Add static pages
  entries.push({ label: "Data & API", breadcrumb: "Data & API", search: "data api download json", pillar: "data", topic: null, subtopic: null, color: P.textMuted });
  entries.push({ label: "About", breadcrumb: "About", search: "about methodology sources", pillar: "about", topic: null, subtopic: null, color: P.textMuted });
  return entries;
}

export default function Search({ onNavigate, isMobile }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const index = useMemo(buildIndex, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const words = q.split(/\s+/);
    return index
      .filter(entry => words.every(w => entry.search.includes(w)))
      .slice(0, 8);
  }, [query, index]);

  const handleSelect = useCallback((entry) => {
    track("search_select", { query, result: entry.label });
    onNavigate(entry.pillar, entry.topic, entry.subtopic);
    setOpen(false);
    setQuery("");
  }, [onNavigate, query]);

  // Track no-results searches after user stops typing (1s debounce)
  useEffect(() => {
    if (!query.trim() || results.length > 0) return;
    const timer = setTimeout(() => {
      track("search_no_results", { query: query.trim() });
    }, 1000);
    return () => clearTimeout(timer);
  }, [query, results.length]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Keyboard shortcut: / to open
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "none",
          border: `1px solid ${P.border}`,
          borderRadius: 3,
          padding: isMobile ? "6px 10px" : "5px 12px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: P.textLight,
          fontFamily: "'DM Mono', monospace",
          fontSize: "12px",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = P.borderStrong}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = P.border}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        {!isMobile && <span>Search</span>}
        {!isMobile && <span style={{ fontSize: "10px", color: P.textLight, border: `1px solid ${P.border}`, borderRadius: 2, padding: "1px 4px", marginLeft: 4 }}>/</span>}
      </button>
    );
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results.length > 0) handleSelect(results[0]);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search topics..."
        style={{
          width: isMobile ? "100%" : 260,
          padding: "6px 12px",
          border: `1px solid ${P.borderStrong}`,
          borderRadius: 3,
          fontFamily: "'DM Mono', monospace",
          fontSize: "12px",
          color: P.text,
          background: P.bgCard,
          outline: "none",
        }}
      />
      {results.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: 0,
          left: isMobile ? 0 : "auto",
          width: isMobile ? "100%" : 320,
          marginTop: 4,
          background: P.bgCard,
          border: `1px solid ${P.borderStrong}`,
          borderRadius: 3,
          boxShadow: "0 8px 24px rgba(28,43,69,0.15)",
          zIndex: 100,
          maxHeight: 360,
          overflowY: "auto",
        }}>
          {results.map((entry, i) => (
            <button
              key={i}
              onClick={() => handleSelect(entry)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                border: "none",
                borderBottom: i < results.length - 1 ? `1px solid ${P.border}` : "none",
                background: "none",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(28,43,69,0.03)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "none"}
            >
              <div style={{ fontSize: "13px", fontWeight: 500, color: P.text, fontFamily: "'Playfair Display', serif" }}>
                {entry.label}
              </div>
              <div style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
                {entry.breadcrumb}
              </div>
            </button>
          ))}
        </div>
      )}
      {query.trim() && results.length === 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: 0,
          left: isMobile ? 0 : "auto",
          width: isMobile ? "100%" : 320,
          marginTop: 4,
          background: P.bgCard,
          border: `1px solid ${P.borderStrong}`,
          borderRadius: 3,
          boxShadow: "0 8px 24px rgba(28,43,69,0.15)",
          zIndex: 100,
          padding: "14px",
          fontSize: "12px",
          color: P.textLight,
          fontFamily: "'DM Mono', monospace",
        }}>
          No results for "{query}"
        </div>
      )}
    </div>
  );
}
