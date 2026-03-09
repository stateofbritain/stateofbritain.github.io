import { useState, useEffect } from "react";
import P from "../theme/palette";
import useIsMobile from "../hooks/useIsMobile";

const BASE = import.meta.env.BASE_URL || "/";

export default function DataPage() {
  const isMobile = useIsMobile();
  const [catalog, setCatalog] = useState(null);

  useEffect(() => {
    fetch(`${BASE}api/index.json`)
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => {});
  }, []);

  if (!catalog) return null;

  const pillars = { foundations: "Foundations", growth: "Growth Engine", state: "State Performance" };
  const grouped = {};
  for (const ds of catalog.datasets) {
    const key = ds.pillar;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ds);
  }

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(24px, 4vw, 34px)",
          fontWeight: 600,
          color: P.text,
          margin: "0 0 8px",
        }}
      >
        Data & API
      </h2>
      <p
        style={{
          fontSize: "13px",
          color: P.textMuted,
          lineHeight: 1.6,
          fontFamily: "'DM Mono', monospace",
          fontWeight: 300,
          margin: "0 0 12px",
          ...(isMobile ? {} : { maxWidth: 620 }),
        }}
      >
        All datasets are free to use under the Open Government Licence.
        Data is served as static JSON — no authentication required.
      </p>

      <div
        style={{
          background: P.bgCard,
          border: `1px solid ${P.border}`,
          borderLeft: `3px solid ${P.teal}`,
          borderRadius: 3,
          padding: isMobile ? "14px 14px" : "16px 20px",
          marginBottom: 32,
          fontSize: "12px",
          fontFamily: "'DM Mono', monospace",
          color: P.textMuted,
          lineHeight: 1.7,
        }}
      >
        <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: P.teal, fontWeight: 500, marginBottom: 8 }}>
          For AI agents & developers
        </div>
        <div>
          Fetch the full catalog:
        </div>
        <code
          style={{
            display: "block",
            background: "rgba(28,43,69,0.04)",
            padding: "8px 12px",
            borderRadius: 3,
            margin: "6px 0",
            fontSize: "11px",
            overflowX: "auto",
            whiteSpace: "nowrap",
          }}
        >
          GET {catalog.homepage}/api/index.json
        </code>
        <div style={{ marginTop: 4 }}>
          Then fetch any dataset by its <code style={{ background: "rgba(28,43,69,0.04)", padding: "1px 4px", borderRadius: 2 }}>url</code> field. All URLs are relative to the site root. No API key needed. CORS enabled.
        </div>
      </div>

      {Object.entries(pillars).map(([key, label]) => {
        const datasets = grouped[key];
        if (!datasets?.length) return null;
        return (
          <section key={key} style={{ marginBottom: 32 }}>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "18px",
                fontWeight: 600,
                color: P.text,
                margin: "0 0 12px",
              }}
            >
              {label}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {datasets.map((ds) => (
                <div
                  key={ds.id}
                  style={{
                    background: P.bgCard,
                    border: `1px solid ${P.border}`,
                    borderRadius: 3,
                    padding: isMobile ? "14px 14px" : "16px 20px",
                    boxShadow: "0 1px 4px rgba(28,43,69,0.04)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: P.text, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>
                        {ds.name}
                      </div>
                      <div style={{ fontSize: "11px", color: P.textMuted, fontFamily: "'DM Mono', monospace", lineHeight: 1.5, marginBottom: 6 }}>
                        {ds.description}
                      </div>
                      <div style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
                        {ds.source} · {ds.coverage} · {ds.frequency}
                      </div>
                    </div>
                    <a
                      href={`${BASE}${ds.url.replace(/^\//, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: "10px",
                        fontFamily: "'DM Mono', monospace",
                        color: P.teal,
                        textDecoration: "none",
                        border: `1px solid ${P.teal}`,
                        borderRadius: 3,
                        padding: "5px 12px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        alignSelf: "center",
                      }}
                    >
                      JSON ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <div style={{ fontSize: "11px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8, marginTop: 16 }}>
        <strong>Licence:</strong> Data derived from official UK government statistics published under the{" "}
        <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
          Open Government Licence v3.0
        </a>
        . See individual dataset sources for full attribution.
      </div>
    </div>
  );
}
