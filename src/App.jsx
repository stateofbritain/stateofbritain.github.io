import P from "./theme/palette";
import PILLARS from "./pillars/config";
import useHashRoute from "./hooks/useHashRoute";
import Header from "./components/Header";
import PillarNav from "./components/PillarNav";
import TopicSidebar from "./components/TopicSidebar";
import Footer from "./components/Footer";
import Landing from "./pillars/Landing";
import Placeholder from "./pillars/Placeholder";
import Spending from "./pillars/state/Spending";
import Housing from "./pillars/foundations/Housing";
import Safety from "./pillars/foundations/Safety";
import FoodCostOfLiving from "./pillars/foundations/FoodCostOfLiving";
import Energy from "./pillars/foundations/Energy";
import HealthcareAccess from "./pillars/foundations/HealthcareAccess";
import Water from "./pillars/foundations/Water";
import Environment from "./pillars/foundations/Environment";
import Startups from "./pillars/growth/Startups";
import Spinouts from "./pillars/growth/Spinouts";
import ResearchFunding from "./pillars/growth/ResearchFunding";
import Productivity from "./pillars/growth/Productivity";

// Map of pillar/topic keys to their React components.
// As pages are built, import and register them here.
const TOPIC_COMPONENTS = {
  "state/spending": Spending,
  "foundations/housing": Housing,
  "foundations/safety": Safety,
  "foundations/food": FoodCostOfLiving,
  "foundations/energy": Energy,
  "foundations/healthcare": HealthcareAccess,
  "foundations/water": Water,
  "foundations/environment": Environment,
  "growth/startups": Startups,
  "growth/spinouts": Spinouts,
  "growth/research": ResearchFunding,
  "growth/productivity": Productivity,
};

function getTopicComponent(pillarKey, topicKey) {
  return TOPIC_COMPONENTS[`${pillarKey}/${topicKey}`] ?? null;
}

export default function App() {
  const { pillar, topic, navigate } = useHashRoute();

  const activePillar = pillar && PILLARS[pillar] ? pillar : null;
  const pillarConfig = activePillar ? PILLARS[activePillar] : null;

  // Default to first topic if pillar selected but no topic
  const activeTopic =
    pillarConfig && topic && pillarConfig.topics[topic]
      ? topic
      : pillarConfig
        ? Object.keys(pillarConfig.topics)[0]
        : null;

  // Resolve component
  const TopicComponent = activePillar && activeTopic
    ? getTopicComponent(activePillar, activeTopic)
    : null;

  const topicConfig = pillarConfig?.topics[activeTopic];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: P.bg,
        color: P.text,
        fontFamily: "'DM Mono', monospace",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px" }}>
        <Header onHome={() => navigate(null)} />
        <PillarNav
          activePillar={activePillar}
          onSelect={(p) => navigate(p, p ? Object.keys(PILLARS[p].topics)[0] : null)}
        />

        {!activePillar ? (
          <Landing
            onNavigate={(p) =>
              navigate(p, Object.keys(PILLARS[p].topics)[0])
            }
          />
        ) : (
          <div
            style={{
              display: "flex",
              gap: 0,
              marginTop: 20,
              minHeight: 500,
            }}
          >
            <TopicSidebar
              pillar={pillarConfig}
              topics={pillarConfig.topics}
              activeTopic={activeTopic}
              onSelect={(t) => navigate(activePillar, t)}
            />
            <main style={{ flex: 1, paddingLeft: 24 }}>
              {TopicComponent ? (
                <TopicComponent />
              ) : (
                <Placeholder
                  pillarColor={pillarConfig.color}
                  topicLabel={topicConfig?.label ?? ""}
                />
              )}
            </main>
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}
