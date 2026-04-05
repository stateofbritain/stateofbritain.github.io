import P from "../../theme/palette";
import PILLARS from "../config";
import useIsMobile from "../../hooks/useIsMobile";

const PURPLE = "#7B4B8A";

const TOPIC_META = {
  asylum: {
    description: "The international treaties, domestic statutes, and case law that constrain government action on Channel crossings, asylum processing, and the deportation of foreign national offenders.",
    updated: "March 2025",
  },
  university: {
    description: "How universities are funded, the structural gap between research costs and grant income, and the cross-subsidy from international student fees that covers it.",
    updated: "January 2025",
  },
  hs2: {
    description: "The engineering, cost escalation, and delivery timeline of Britain's high-speed rail project, from the original £37.5bn estimate to the current £66bn for Phase 1 alone.",
    updated: "February 2025",
  },
  energy: {
    description: "The generation mix, storage constraints, and regulatory framework shaping Britain's electricity system and its transition to net zero.",
    updated: "December 2024",
  },
};

export default function ChallengesOverview({ navigate }) {
  const isMobile = useIsMobile();
  const topics = PILLARS.challenges.topics;
  const allTopics = Object.entries(topics).filter(([key]) => key !== "overview");
  const live = allTopics.filter(([, t]) => t.status === "live");
  const archive = allTopics.filter(([, t]) => t.status !== "live");

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "28px",
        fontWeight: 600,
        color: P.text,
        margin: "0 0 6px",
      }}>
        Policy
      </h2>
      <p style={{
        fontSize: "14px",
        lineHeight: 1.7,
        color: P.textMuted,
        fontFamily: "'Playfair Display', serif",
        margin: "0 0 10px",
        maxWidth: 720,
      }}>
        Policy debates persist across successive governments not because politicians
        lack will, but because the constraints are structural: interlocking legal
        obligations, multi-order consequences, and genuine disagreements about values,
        facts, or predictions. These pages present each side's strongest case using
        only verifiable evidence, map the legislative and implementation mechanisms
        involved, and trace consequences through multiple orders of effect.
      </p>
      <p style={{
        fontSize: "14px",
        lineHeight: 1.7,
        color: P.textMuted,
        fontFamily: "'Playfair Display', serif",
        margin: "0 0 36px",
        maxWidth: 720,
      }}>
        The aim is to give every citizen the same analytical depth a cabinet minister
        receives from the civil service. The system steelmans both positions, then
        diagnoses where the disagreement actually lies, whether about values, empirical
        facts, or predicted consequences.
      </p>

      {/* ── Live Debates ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: PURPLE,
            animation: "debatePulse 2s ease-in-out infinite",
          }} />
          <h3 style={{
            fontSize: "12px",
            fontFamily: "'DM Mono', monospace",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: PURPLE,
            fontWeight: 500,
            margin: 0,
          }}>
            Live Debates
          </h3>
        </div>

        {live.length === 0 ? (
          <div style={{
            background: P.bgCard,
            border: `1px solid ${P.border}`,
            borderRadius: 3,
            padding: isMobile ? "20px 16px" : "28px 24px",
            textAlign: "center",
          }}>
            <p style={{
              fontSize: "13px",
              color: P.textLight,
              fontFamily: "'DM Mono', monospace",
              margin: 0,
              fontWeight: 300,
              lineHeight: 1.6,
            }}>
              No live debates currently. When a policy debate is identified as
              trending, it will appear here with full adversarial analysis.
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : live.length === 1 ? "1fr" : "1fr 1fr",
            gap: 20,
          }}>
            {live.map(([key, topic], i) => (
              <TopicCard
                key={key}
                topicKey={key}
                topic={topic}
                meta={TOPIC_META[key]}
                navigate={navigate}
                isLive
                isMobile={isMobile}
                delay={i}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Archive ────────────────────────────────────────────────────── */}
      {archive.length > 0 && (
        <div>
          <h3 style={{
            fontSize: "12px",
            fontFamily: "'DM Mono', monospace",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: P.textLight,
            fontWeight: 500,
            margin: "0 0 14px",
          }}>
            Archive
          </h3>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}>
            {archive.map(([key, topic], i) => (
              <TopicCard
                key={key}
                topicKey={key}
                topic={topic}
                meta={TOPIC_META[key]}
                navigate={navigate}
                isLive={false}
                isMobile={isMobile}
                delay={i}
              />
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes debatePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

function TopicCard({ topicKey, topic, meta, navigate, isLive, isMobile, delay }) {
  return (
    <div
      onClick={() => navigate("challenges", topicKey)}
      style={{
        background: P.bgCard,
        border: `1px solid ${P.border}`,
        borderTop: `3px solid ${isLive ? PURPLE : P.textLight}`,
        borderRadius: 3,
        padding: isMobile ? "16px 16px 14px" : "20px 24px 18px",
        cursor: "pointer",
        transition: "box-shadow 0.2s, transform 0.2s",
        boxShadow: "0 1px 6px rgba(28,43,69,0.05)",
        animation: `fadeSlideIn 0.5s ease ${0.1 + delay * 0.08}s both`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(28,43,69,0.1)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 6px rgba(28,43,69,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: "16px", opacity: 0.6 }}>{topic.icon}</span>
        <h3 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: isLive ? "20px" : "18px",
          fontWeight: 600,
          color: P.text,
          margin: 0,
        }}>
          {topic.label}
        </h3>
      </div>
      <p style={{
        fontSize: "13px",
        color: P.textMuted,
        margin: 0,
        lineHeight: 1.6,
        fontFamily: "'DM Mono', monospace",
        fontWeight: 300,
      }}>
        {meta?.description || ""}
      </p>
      {meta?.updated && (
        <span style={{
          display: "inline-block",
          marginTop: 10,
          fontSize: "10px",
          color: P.textLight,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.05em",
        }}>
          Updated {meta.updated}
        </span>
      )}
    </div>
  );
}
