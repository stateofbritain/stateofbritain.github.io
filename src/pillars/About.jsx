import P from "../theme/palette";
import useIsMobile from "../hooks/useIsMobile";

export default function About() {
  const isMobile = useIsMobile();

  const h3Style = {
    fontFamily: "'Playfair Display', serif",
    fontSize: "18px",
    fontWeight: 600,
    color: P.text,
    margin: "0 0 8px",
  };

  const pStyle = {
    fontSize: "12px",
    color: P.textMuted,
    lineHeight: 1.7,
    fontFamily: "'DM Mono', monospace",
    fontWeight: 300,
    margin: "0 0 20px",
  };

  const sources = [
    { category: "Foundations", items: [
      "ONS — Consumer Prices (CPIH), births, families, migration, business demography, productivity, investment, R&D",
      "NHS England — RTT waiting times, A&E statistics",
      "DESNZ — Energy statistics (DUKES), GHG emissions",
      "DEFRA — Air quality statistics",
      "Ofwat — Water company performance",
      "Environment Agency — Pollution incidents, storm overflow data",
      "DfT — Vehicle licensing, road traffic, road length & condition",
      "Police API (data.police.uk) — Crime by category",
    ]},
    { category: "Growth Engine", items: [
      "ONS — PRODCOM manufacturing output, Index of Production",
      "BGS — Mineral production statistics",
      "Ofcom — Connected Nations broadband data",
      "ORR — Rail performance, journeys, network statistics",
      "OECD — Productivity, investment, PISA scores (CC BY 4.0)",
      "World Bank — R&D expenditure comparisons (CC BY 4.0)",
      "HESA — Higher education staff statistics (CC BY 4.0)",
      "DfE — School workforce, education attainment & spending",
      "British Business Bank — Equity tracker (displayed only, not in API)",
      "World Steel Association — Steel production (displayed only, not in API)",
    ]},
    { category: "State Performance", items: [
      "OBR — Public Finances Databank",
      "HM Treasury — PESA departmental spending",
      "MOD — Annual report, armed forces personnel, equipment plan",
      "Home Office — Immigration statistics, police workforce",
      "MOJ / HMCTS — Justice statistics, court backlog",
      "NATO — International defence comparison (displayed only, not in API)",
    ]},
  ];

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
        About
      </h2>
      <p style={{ ...pStyle, fontSize: "13px", ...(isMobile ? {} : { maxWidth: 620 }) }}>
        State of Britain is a personal project by Jack Aspinall. It presents
        objective data on Britain's public services, economy, and society —
        sourced from official UK government statistics.
      </p>

      <section style={{ marginBottom: 32 }}>
        <h3 style={h3Style}>Approach</h3>
        <p style={pStyle}>
          Every number is traceable to a primary government or institutional source.
          No editorial judgement is applied — trends are presented without characterising
          them as good or bad. The site shows the complete picture on each topic, not a
          cherry-picked subset.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={h3Style}>Data sources</h3>
        <p style={pStyle}>
          All UK government data is published under the Open Government Licence v3.0.
          International comparisons use OECD and World Bank data (CC BY 4.0).
        </p>
        {sources.map((group) => (
          <div key={group.category} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: P.sienna, fontWeight: 500, fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>
              {group.category}
            </div>
            {group.items.map((item) => (
              <div
                key={item}
                style={{
                  fontSize: "11px",
                  color: P.textMuted,
                  fontFamily: "'DM Mono', monospace",
                  lineHeight: 1.6,
                  paddingLeft: 12,
                  borderLeft: `2px solid ${P.border}`,
                  marginBottom: 4,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={h3Style}>API</h3>
        <p style={pStyle}>
          All openly-licensed datasets are available as static JSON at{" "}
          <a
            href="/data"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState(null, "", "/data");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            style={{ color: P.teal }}
          >
            /data
          </a>
          . A machine-readable catalog is served at{" "}
          <code style={{ fontSize: "11px", background: "rgba(28,43,69,0.04)", padding: "1px 4px", borderRadius: 2 }}>
            /api/index.json
          </code>
          . No authentication required.
        </p>
      </section>

      <section>
        <h3 style={h3Style}>Licence</h3>
        <p style={pStyle}>
          Contains public sector information licensed under the{" "}
          <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener noreferrer" style={{ color: P.textMuted }}>
            Open Government Licence v3.0
          </a>
          . OECD data is an adaptation of original OECD works and should not be
          reported as representing the official views of the OECD or its member countries.
          HESA data licensed under CC BY 4.0.
        </p>
      </section>
    </div>
  );
}
