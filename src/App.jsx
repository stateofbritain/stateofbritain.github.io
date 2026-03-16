import { useEffect } from "react";
import P from "./theme/palette";
import PILLARS from "./pillars/config";
import useHashRoute from "./hooks/useHashRoute";
import useIsMobile from "./hooks/useIsMobile";
import Header from "./components/Header";
import PillarNav from "./components/PillarNav";
import TopicSidebar from "./components/TopicSidebar";
import Footer from "./components/Footer";
import Landing from "./pillars/Landing";
import DataPage from "./pillars/DataPage";
import About from "./pillars/About";
import Placeholder from "./pillars/Placeholder";
import Spending from "./pillars/state/Spending";
import Housing from "./pillars/foundations/Housing";
import Safety from "./pillars/foundations/Safety";
import FoodCostOfLiving from "./pillars/foundations/FoodCostOfLiving";
import Energy from "./pillars/foundations/Energy";
import WaitingLists from "./pillars/foundations/WaitingLists";
import HealthOutcomes from "./pillars/foundations/HealthOutcomes";
import GPAccess from "./pillars/foundations/GPAccess";
import HospitalCapacity from "./pillars/foundations/HospitalCapacity";
import NHSWorkforce from "./pillars/foundations/NHSWorkforce";
import Water from "./pillars/foundations/Water";
import Environment from "./pillars/foundations/Environment";
import Family from "./pillars/foundations/Family";
import Startups from "./pillars/growth/Startups";
import Spinouts from "./pillars/growth/Spinouts";
import ResearchFunding from "./pillars/growth/ResearchFunding";
import Productivity from "./pillars/growth/Productivity";
import ProductiveQuotient from "./pillars/growth/ProductiveQuotient";
import Investment from "./pillars/growth/Investment";
import Infrastructure from "./pillars/growth/Infrastructure";
import IndustrialProduction from "./pillars/growth/IndustrialProduction";
import Education from "./pillars/growth/Education";
import Justice from "./pillars/state/Justice";
import Defence from "./pillars/state/Defence";
import Immigration from "./pillars/state/Immigration";
import ChallengesOverview from "./pillars/challenges/ChallengesOverview";
import AsylumImmigration from "./pillars/challenges/AsylumImmigration";

// Map of pillar/topic keys to their React components.
// Topics with subtopics use 3-part keys: "pillar/topic/subtopic"
const TOPIC_COMPONENTS = {
  "spending/spending": Spending,
  "foundations/housing": Housing,
  "foundations/safety": Safety,
  "foundations/food": FoodCostOfLiving,
  "foundations/energy": Energy,
  "foundations/healthcare/waiting": WaitingLists,
  "foundations/healthcare/capacity": HospitalCapacity,
  "foundations/healthcare/workforce": NHSWorkforce,
  "foundations/healthcare/outcomes": HealthOutcomes,
  "foundations/healthcare/gp": GPAccess,
  "foundations/water": Water,
  "foundations/environment": Environment,
  "foundations/family": Family,
  "growth/startups": Startups,
  "growth/spinouts": Spinouts,
  "growth/research": ResearchFunding,
  "growth/productivity": Productivity,
  "growth/pq": ProductiveQuotient,
  "growth/investment": Investment,
  "growth/infrastructure": Infrastructure,
  "growth/industrial": IndustrialProduction,
  "growth/education": Education,
  "state/justice": Justice,
  "state/defence": Defence,
  "state/immigration": Immigration,
  "challenges/overview": ChallengesOverview,
  "challenges/asylum": AsylumImmigration,
};

function getTopicComponent(pillarKey, topicKey, subtopicKey) {
  if (subtopicKey) {
    return TOPIC_COMPONENTS[`${pillarKey}/${topicKey}/${subtopicKey}`] ?? null;
  }
  return TOPIC_COMPONENTS[`${pillarKey}/${topicKey}`] ?? null;
}

export default function App() {
  const { pillar, topic, subtopic, navigate } = useHashRoute();
  const isMobile = useIsMobile();

  const activePillar = pillar && PILLARS[pillar] ? pillar : null;
  const pillarConfig = activePillar ? PILLARS[activePillar] : null;

  // Default to first topic if pillar selected but no topic
  const activeTopic =
    pillarConfig && topic && pillarConfig.topics[topic]
      ? topic
      : pillarConfig
        ? Object.keys(pillarConfig.topics)[0]
        : null;

  const topicConfig = pillarConfig?.topics[activeTopic];

  // Resolve subtopic: if topic has subtopics, default to first one
  const activeSubtopic =
    topicConfig?.subtopics
      ? (subtopic && topicConfig.subtopics[subtopic] ? subtopic : Object.keys(topicConfig.subtopics)[0])
      : null;

  // Auto-redirect: if topic has subtopics but URL doesn't include one, fix the URL
  useEffect(() => {
    if (activePillar && activeTopic && activeSubtopic) {
      const currentPath = window.location.pathname.replace(/^\/+|\/+$/g, "");
      const expectedPath = `${activePillar}/${activeTopic}/${activeSubtopic}`;
      if (currentPath !== expectedPath) {
        window.history.replaceState(null, "", `/${expectedPath}`);
      }
    }
  }, [activePillar, activeTopic, activeSubtopic]);

  // Resolve component
  const TopicComponent = activePillar && activeTopic
    ? getTopicComponent(activePillar, activeTopic, activeSubtopic)
    : null;

  const subtopicConfig = topicConfig?.subtopics?.[activeSubtopic];

  useEffect(() => {
    const base = "State of Britain";
    if (pillar === "data") document.title = `Data & API — ${base}`;
    else if (pillar === "about") document.title = `About — ${base}`;
    else if (subtopicConfig && topicConfig) document.title = `${subtopicConfig.label} — ${topicConfig.label} — ${base}`;
    else if (topicConfig) document.title = `${topicConfig.label} — ${base}`;
    else if (pillarConfig) document.title = `${pillarConfig.label} — ${base}`;
    else document.title = base;
  }, [pillar, pillarConfig, topicConfig, subtopicConfig]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: P.bg,
        color: P.text,
        fontFamily: "'DM Mono', monospace",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 12px" : "0 28px" }}>
        <Header onHome={() => navigate(null)} isMobile={isMobile} />
        <PillarNav
          activePillar={activePillar}
          onSelect={(p, t, s) => navigate(p, t, s)}
          isMobile={isMobile}
        />

        {pillar === "data" ? (
          <DataPage />
        ) : pillar === "about" ? (
          <About />
        ) : !activePillar ? (
          <Landing
            onNavigate={(p) => {
              const firstTopic = Object.keys(PILLARS[p].topics)[0];
              const topicDef = PILLARS[p].topics[firstTopic];
              const firstSub = topicDef?.subtopics ? Object.keys(topicDef.subtopics)[0] : null;
              navigate(p, firstTopic, firstSub);
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: 0,
              marginTop: isMobile ? 10 : 20,
              minHeight: isMobile ? "auto" : 500,
            }}
          >
            {Object.keys(pillarConfig.topics).length > 1 && (
              <TopicSidebar
                pillar={pillarConfig}
                topics={pillarConfig.topics}
                activeTopic={activeTopic}
                activeSubtopic={activeSubtopic}
                onSelect={(t, s) => navigate(activePillar, t, s)}
                isMobile={isMobile}
              />
            )}
            <main style={{ flex: 1, paddingLeft: isMobile ? 0 : (Object.keys(pillarConfig.topics).length > 1 ? 24 : 0) }}>
              {TopicComponent ? (
                <TopicComponent navigate={navigate} />
              ) : (
                <Placeholder
                  pillarColor={pillarConfig.color}
                  topicLabel={subtopicConfig?.label ?? topicConfig?.label ?? ""}
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
