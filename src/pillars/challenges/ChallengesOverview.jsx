import P from "../../theme/palette";
import PILLARS from "../config";
import useIsMobile from "../../hooks/useIsMobile";

const CHALLENGE_TOPICS = () => {
  const topics = PILLARS.challenges.topics;
  return Object.entries(topics).filter(([key]) => key !== "overview");
};

const TOPIC_DESCRIPTIONS = {
  asylum: "The international treaties, domestic statutes, and case law that constrain government action on Channel crossings, asylum processing, and the deportation of foreign national offenders.",
  university: "How universities are funded, the structural gap between research costs and grant income, and the cross-subsidy from international student fees that covers it.",
  hs2: "The engineering, cost escalation, and delivery timeline of Britain's high-speed rail project, from the original £37.5bn estimate to the current £66bn for Phase 1 alone.",
};

export default function ChallengesOverview({ navigate }) {
  const isMobile = useIsMobile();
  const topics = CHALLENGE_TOPICS();

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "28px",
        fontWeight: 600,
        color: P.text,
        margin: "0 0 6px",
      }}>
        Policy Challenges
      </h2>
      <p style={{
        fontSize: "14px",
        lineHeight: 1.7,
        color: P.textMuted,
        fontFamily: "'Playfair Display', serif",
        margin: "0 0 10px",
        maxWidth: 720,
      }}>
        Some policy problems persist across successive governments not because of a lack
        of political will, but because of layered legal obligations, treaty dependencies,
        and operational constraints that limit the available options. These pages map the
        legal and regulatory frameworks around issues with significant public interest,
        showing what the rules are, how they connect, and what the trade-offs of changing
        them would be.
      </p>
      <p style={{
        fontSize: "14px",
        lineHeight: 1.7,
        color: P.textMuted,
        fontFamily: "'Playfair Display', serif",
        margin: "0 0 32px",
        maxWidth: 720,
      }}>
        Each page presents the instruments, their key provisions, the dependency chains
        between them, and structured scenarios for what would happen if they were changed.
        The aim is not to argue for or against any position, but to make the constraints
        visible so that the debate can be grounded in what the law actually says.
        These are working documents; suggestions and clarifications to improve their
        accuracy are welcome.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 20,
      }}>
        {topics.map(([key, topic], i) => {
          const isComingSoon = TOPIC_DESCRIPTIONS[key] === "Coming soon.";
          return (
            <div
              key={key}
              onClick={() => navigate("challenges", key)}
              style={{
                background: P.bgCard,
                border: `1px solid ${P.border}`,
                borderTop: `3px solid ${isComingSoon ? P.textLight : "#7B4B8A"}`,
                borderRadius: 3,
                padding: isMobile ? "16px 16px 14px" : "24px 24px 20px",
                cursor: "pointer",
                transition: "box-shadow 0.2s, transform 0.2s",
                boxShadow: "0 1px 6px rgba(28,43,69,0.05)",
                opacity: isComingSoon ? 0.6 : 1,
                animation: `fadeSlideIn 0.5s ease ${0.1 + i * 0.1}s both`,
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
                  fontSize: "20px",
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
                {TOPIC_DESCRIPTIONS[key] || ""}
              </p>
              {isComingSoon && (
                <span style={{
                  display: "inline-block",
                  marginTop: 10,
                  fontSize: "10px",
                  color: P.textLight,
                  fontFamily: "'DM Mono', monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}>
                  Coming soon
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
