import { useState, useEffect } from "react";
import P from "./theme/palette";
import PILLARS from "./pillars/config";
import useHashRoute from "./hooks/useHashRoute";
import useIsMobile from "./hooks/useIsMobile";
import Header from "./components/Header";
import TopNav from "./components/TopNav";
import PillarNav from "./components/PillarNav";
import TopicSidebar from "./components/TopicSidebar";
import Footer from "./components/Footer";
import AskPanel from "./components/AskPanel";
import Dashboard from "./pillars/Dashboard";
import Landing from "./pillars/Landing";
import DataPage from "./pillars/DataPage";
import About from "./pillars/About";
import Contribute from "./pillars/Contribute";
import Placeholder from "./pillars/Placeholder";
import SpendingOverview from "./pillars/state/SpendingOverview";
import HousingPrices from "./pillars/foundations/HousingPrices";
import HousingSupply from "./pillars/foundations/HousingSupply";
import HousingStock from "./pillars/foundations/HousingStock";
import HousingDensity from "./pillars/foundations/HousingDensity";
import Safety from "./pillars/foundations/Safety";
import FoodCostOfLiving from "./pillars/foundations/FoodCostOfLiving";
import Energy from "./pillars/foundations/Energy";
import Electricity from "./pillars/foundations/Electricity";
import GridSimulator from "./pillars/foundations/GridSimulator";
import WaitingLists from "./pillars/foundations/WaitingLists";
import HealthOutcomes from "./pillars/foundations/HealthOutcomes";
import GPAccess from "./pillars/foundations/GPAccess";
import HospitalCapacity from "./pillars/foundations/HospitalCapacity";
import MentalHealth from "./pillars/foundations/MentalHealth";
import NHSWorkforce from "./pillars/foundations/NHSWorkforce";
import NHSFunding from "./pillars/foundations/NHSFunding";
import Water from "./pillars/foundations/Water";
import Reservoirs from "./pillars/foundations/Reservoirs";
import Environment from "./pillars/foundations/Environment";
import Family from "./pillars/foundations/Family";
import Culture from "./pillars/foundations/Culture";
import ChildrensSocialCare from "./pillars/foundations/ChildrensSocialCare";
import AdultSocialCare from "./pillars/foundations/AdultSocialCare";
import Startups from "./pillars/growth/Startups";
import Spinouts from "./pillars/growth/Spinouts";
import ResearchFunding from "./pillars/growth/ResearchFunding";
import Productivity from "./pillars/growth/Productivity";
import ProductiveQuotient from "./pillars/growth/ProductiveQuotient";
import Investment from "./pillars/growth/Investment";
import Roads from "./pillars/growth/Roads";
import Rail from "./pillars/growth/Rail";
import Buses from "./pillars/growth/Buses";
import Airports from "./pillars/growth/Airports";
import Broadband from "./pillars/growth/Broadband";
import IndustrialProduction from "./pillars/growth/IndustrialProduction";
import Education from "./pillars/growth/Education";
import JobsOverview from "./pillars/growth/JobsOverview";
import JobsNature from "./pillars/growth/JobsNature";
import JobsSkills from "./pillars/growth/JobsSkills";
import JobsSectors from "./pillars/growth/JobsSectors";
import JobsEarnings from "./pillars/growth/JobsEarnings";
import Unemployment from "./pillars/growth/Unemployment";
import Justice from "./pillars/state/Justice";
import DefenceSpending from "./pillars/state/DefenceSpending";
import DefencePersonnel from "./pillars/state/DefencePersonnel";
import DefenceEquipment from "./pillars/state/DefenceEquipment";
import DefenceProcurement from "./pillars/state/DefenceProcurement";
import Immigration from "./pillars/state/Immigration";
import Taxation from "./pillars/state/Taxation";
import Borrowing from "./pillars/state/Borrowing";
import MoneySupply from "./pillars/state/MoneySupply";
import Welfare from "./pillars/state/Welfare";
import GDP from "./pillars/state/GDP";
import PersonalFinance from "./pillars/state/PersonalFinance";
import LocalGovernment from "./pillars/state/LocalGovernment";
import MayoralAuthorities from "./pillars/state/MayoralAuthorities";
import ChallengesOverview from "./pillars/challenges/ChallengesOverview";
import AsylumImmigration from "./pillars/challenges/AsylumImmigration";
import UniversityFunding from "./pillars/challenges/UniversityFunding";
import HS2 from "./pillars/challenges/HS2";

// Map pillar/topic/subtopic keys to React components.
const TOPIC_COMPONENTS = {
  "spending/spending/overview": SpendingOverview,
  "spending/spending/borrowing": Borrowing,
  "spending/spending/taxation": Taxation,
  "spending/spending/moneySupply": MoneySupply,
  "spending/spending/welfare": Welfare,
  "spending/spending/gdp": GDP,
  "spending/personalFinance": PersonalFinance,
  "spending/localGov/overview": LocalGovernment,
  "spending/localGov/mayoral": MayoralAuthorities,
  "foundations/housing/prices": HousingPrices,
  "foundations/housing/supply": HousingSupply,
  "foundations/housing/stock": HousingStock,
  "foundations/housing/density": HousingDensity,
  "foundations/safety": Safety,
  "foundations/food": FoodCostOfLiving,
  "foundations/energy/overview": Energy,
  "foundations/energy/electricity": Electricity,
  "foundations/healthcare/waiting": WaitingLists,
  "foundations/healthcare/capacity": HospitalCapacity,
  "foundations/healthcare/workforce": NHSWorkforce,
  "foundations/healthcare/outcomes": HealthOutcomes,
  "foundations/healthcare/gp": GPAccess,
  "foundations/healthcare/mental": MentalHealth,
  "foundations/healthcare/funding": NHSFunding,
  "foundations/water/performance": Water,
  "foundations/water/reservoirs": Reservoirs,
  "foundations/environment": Environment,
  "foundations/family": Family,
  "foundations/culture": Culture,
  "foundations/socialCare/children": ChildrensSocialCare,
  "foundations/socialCare/adults": AdultSocialCare,
  "growth/jobs/overview": JobsOverview,
  "growth/jobs/unemployment": Unemployment,
  "growth/jobs/nature": JobsNature,
  "growth/jobs/skills": JobsSkills,
  "growth/jobs/sectors": JobsSectors,
  "growth/jobs/earnings": JobsEarnings,
  "growth/startups": Startups,
  "growth/spinouts": Spinouts,
  "growth/research": ResearchFunding,
  "growth/productivity": Productivity,
  "growth/pq": ProductiveQuotient,
  "growth/investment": Investment,
  "growth/transport/roads": Roads,
  "growth/transport/rail": Rail,
  "growth/transport/buses": Buses,
  "growth/transport/airports": Airports,
  "growth/digital/broadband": Broadband,
  "growth/industrial": IndustrialProduction,
  "growth/education": Education,
  "state/justice": Justice,
  "state/defence/spending": DefenceSpending,
  "state/defence/personnel": DefencePersonnel,
  "state/defence/equipment": DefenceEquipment,
  "state/defence/procurement": DefenceProcurement,
  "state/immigration": Immigration,
  "challenges/overview": ChallengesOverview,
  "challenges/asylum": AsylumImmigration,
  "challenges/university": UniversityFunding,
  "challenges/hs2": HS2,
  "challenges/energy": GridSimulator,
};

function getTopicComponent(pillarKey, topicKey, subtopicKey) {
  if (subtopicKey) {
    return TOPIC_COMPONENTS[`${pillarKey}/${topicKey}/${subtopicKey}`] ?? null;
  }
  return TOPIC_COMPONENTS[`${pillarKey}/${topicKey}`] ?? null;
}

// Pillars that live under the Data tab.
const DATA_PILLARS = ["foundations", "spending", "growth", "state"];
const OLD_DATA_PILLAR_SET = new Set(DATA_PILLARS);
// Pillar key in PILLARS config that powers the Policy tab.
const POLICY_PILLAR_KEY = "challenges";

export default function App() {
  const { segments, section, navigate, replace } = useHashRoute();
  const isMobile = useIsMobile();
  const [askOpen, setAskOpen] = useState(false);

  // ── Old-URL redirects ─────────────────────────────────────────────
  // /<old-data-pillar>/...  → /data/<old-data-pillar>/...
  // /challenges/...         → /policy/...
  // /data                   → first data pillar's first topic
  // /policy                 → policy "overview" topic (or first available)
  useEffect(() => {
    if (segments.length === 0) return;
    const first = segments[0];
    if (OLD_DATA_PILLAR_SET.has(first)) {
      replace("data", ...segments);
      return;
    }
    if (first === "challenges") {
      replace("policy", ...segments.slice(1));
      return;
    }
    if (first === "data" && segments.length === 1) {
      const firstPillar = DATA_PILLARS[0];
      const cfg = PILLARS[firstPillar];
      const firstTopic = Object.keys(cfg.topics)[0];
      const topicDef = cfg.topics[firstTopic];
      const firstSub = topicDef?.subtopics ? Object.keys(topicDef.subtopics)[0] : null;
      replace("data", firstPillar, firstTopic, firstSub);
      return;
    }
    if (first === "policy" && segments.length === 1) {
      const cfg = PILLARS[POLICY_PILLAR_KEY];
      const firstTopic = Object.keys(cfg.topics)[0];
      replace("policy", firstTopic);
      return;
    }
  }, [segments, replace]);

  // ── Section / page resolution ─────────────────────────────────────
  const isDashboard = !section || section === "dashboard";
  const isData = section === "data";
  const isPolicy = section === "policy";
  const isAbout = section === "about";
  const isContribute = section === "contribute";

  // Data section: derive pillar / topic / subtopic from segments[1..3]
  const dataPillarKey = isData && segments[1] && PILLARS[segments[1]] ? segments[1] : null;
  const dataPillarConfig = dataPillarKey ? PILLARS[dataPillarKey] : null;
  const dataTopic = dataPillarConfig
    ? (segments[2] && dataPillarConfig.topics[segments[2]]
        ? segments[2]
        : Object.keys(dataPillarConfig.topics)[0])
    : null;
  const dataTopicConfig = dataTopic ? dataPillarConfig.topics[dataTopic] : null;
  const dataSubtopic = dataTopicConfig?.subtopics
    ? (segments[3] && dataTopicConfig.subtopics[segments[3]]
        ? segments[3]
        : Object.keys(dataTopicConfig.subtopics)[0])
    : null;
  const dataSubtopicConfig = dataSubtopic ? dataTopicConfig.subtopics[dataSubtopic] : null;

  // Auto-canonicalise: if URL is missing implicit defaults, replace it
  useEffect(() => {
    if (!isData || !dataPillarKey) return;
    if (segments[1] === "api" || segments[1] === "overview") return;
    const expectedParts = ["data", dataPillarKey, dataTopic];
    if (dataSubtopic) expectedParts.push(dataSubtopic);
    const expected = "/" + expectedParts.filter(Boolean).join("/");
    if (window.location.pathname !== expected) {
      window.history.replaceState(null, "", expected);
    }
  }, [isData, dataPillarKey, dataTopic, dataSubtopic, segments]);

  // Policy section: derive topic from segments[1]
  const policyPillarConfig = PILLARS[POLICY_PILLAR_KEY];
  const policyTopicKey = isPolicy
    ? (segments[1] && policyPillarConfig.topics[segments[1]]
        ? segments[1]
        : Object.keys(policyPillarConfig.topics)[0])
    : null;
  const policyTopicConfig = policyTopicKey ? policyPillarConfig.topics[policyTopicKey] : null;

  // Resolve dynamic page components
  const DataTopicComp = isData && dataPillarKey
    ? getTopicComponent(dataPillarKey, dataTopic, dataSubtopic)
    : null;
  const PolicyTopicComp = isPolicy && policyTopicKey
    ? getTopicComponent(POLICY_PILLAR_KEY, policyTopicKey, null)
    : null;

  // Document title
  useEffect(() => {
    const base = "State of Britain";
    if (isDashboard) {
      const sub = segments[1];
      const map = {
        "service-delivery": "Service Delivery",
        "sovereign-capability": "Sovereign Capability",
        construction: "Construction",
        "quality-of-life": "Quality of Life",
      };
      document.title = sub && map[sub]
        ? `Dashboard — ${map[sub]} — ${base}`
        : `Dashboard — ${base}`;
    } else if (isData) {
      if (segments[1] === "api") document.title = `Data & API — ${base}`;
      else if (segments[1] === "overview") document.title = `Data Overview — ${base}`;
      else if (dataSubtopicConfig && dataTopicConfig) document.title = `${dataSubtopicConfig.label} — ${dataTopicConfig.label} — ${base}`;
      else if (dataTopicConfig) document.title = `${dataTopicConfig.label} — ${base}`;
      else if (dataPillarConfig) document.title = `${dataPillarConfig.label} — ${base}`;
      else document.title = `Data — ${base}`;
    } else if (isPolicy) {
      document.title = policyTopicConfig
        ? `${policyTopicConfig.label} — Policy — ${base}`
        : `Policy — ${base}`;
    } else if (isAbout) {
      document.title = `About — ${base}`;
    } else if (isContribute) {
      document.title = `Contribute — ${base}`;
    } else {
      document.title = base;
    }
  }, [
    segments, isDashboard, isData, isPolicy, isAbout, isContribute,
    dataPillarConfig, dataTopicConfig, dataSubtopicConfig, policyTopicConfig,
  ]);

  // ── Section-aware navigation helpers ──────────────────────────────
  // Used by sub-tree components that still call the old (pillar, topic, sub) signature.
  const dataNavigate = (p, t, s) => navigate("data", p, t, s);
  const policyNavigate = (t) => navigate("policy", t);

  // Search uses the pillar key embedded in its index. Translate to current routing.
  const searchNavigate = (pillar, topic, subtopic) => {
    if (!pillar) { navigate("dashboard"); return; }
    if (pillar === "about")      { navigate("about"); return; }
    if (pillar === "contribute") { navigate("contribute"); return; }
    if (pillar === "data")       { navigate("data", "api"); return; }
    if (pillar === POLICY_PILLAR_KEY) { navigate("policy", topic); return; }
    if (OLD_DATA_PILLAR_SET.has(pillar)) {
      navigate("data", pillar, topic, subtopic);
      return;
    }
    navigate(pillar, topic, subtopic);
  };

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
        <Header
          onHome={() => navigate("dashboard")}
          onNavigate={searchNavigate}
          onAskOpen={() => setAskOpen(true)}
          isMobile={isMobile}
        />
        <AskPanel open={askOpen} onClose={() => setAskOpen(false)} isMobile={isMobile} />
        <TopNav section={section} onNavigate={(...parts) => navigate(...parts)} isMobile={isMobile} />

        {/* Dashboard */}
        {isDashboard && (
          <Dashboard subtab={segments[1]} navigate={navigate} isMobile={isMobile} />
        )}

        {/* Data — API page */}
        {isData && segments[1] === "api" && <DataPage />}

        {/* Data — parked overview (deprecated Landing) */}
        {isData && segments[1] === "overview" && (
          <Landing onNavigate={(k) => {
            if (!k || !PILLARS[k]) { navigate("data"); return; }
            const cfg = PILLARS[k];
            const firstTopic = Object.keys(cfg.topics)[0];
            const topicDef = cfg.topics[firstTopic];
            const firstSub = topicDef?.subtopics ? Object.keys(topicDef.subtopics)[0] : null;
            if (k === POLICY_PILLAR_KEY) navigate("policy", firstTopic);
            else navigate("data", k, firstTopic, firstSub);
          }} />
        )}

        {/* Data — pillar content */}
        {isData && segments[1] !== "api" && segments[1] !== "overview" && dataPillarConfig && (
          <>
            <PillarNav
              activePillar={dataPillarKey}
              onSelect={(p, t, s) => navigate("data", p, t, s)}
              pillarKeys={DATA_PILLARS}
              isMobile={isMobile}
            />
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: 0,
                marginTop: isMobile ? 10 : 20,
                minHeight: isMobile ? "auto" : 500,
              }}
            >
              {(Object.keys(dataPillarConfig.topics).length > 1 || dataTopicConfig?.subtopics) && (
                <TopicSidebar
                  pillar={dataPillarConfig}
                  topics={dataPillarConfig.topics}
                  activeTopic={dataTopic}
                  activeSubtopic={dataSubtopic}
                  onSelect={(t, s) => navigate("data", dataPillarKey, t, s)}
                  isMobile={isMobile}
                />
              )}
              <main
                style={{
                  flex: 1,
                  paddingLeft: isMobile
                    ? 0
                    : ((Object.keys(dataPillarConfig.topics).length > 1 || dataTopicConfig?.subtopics) ? 24 : 0),
                }}
              >
                {DataTopicComp ? (
                  <DataTopicComp navigate={dataNavigate} />
                ) : (
                  <Placeholder
                    pillarColor={dataPillarConfig.color}
                    topicLabel={dataSubtopicConfig?.label ?? dataTopicConfig?.label ?? ""}
                  />
                )}
              </main>
            </div>
          </>
        )}

        {/* Policy */}
        {isPolicy && policyPillarConfig && (
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: 0,
              marginTop: isMobile ? 10 : 20,
              minHeight: isMobile ? "auto" : 500,
            }}
          >
            <TopicSidebar
              pillar={policyPillarConfig}
              topics={policyPillarConfig.topics}
              activeTopic={policyTopicKey}
              activeSubtopic={null}
              onSelect={(t) => navigate("policy", t)}
              isMobile={isMobile}
            />
            <main style={{ flex: 1, paddingLeft: isMobile ? 0 : 24 }}>
              {PolicyTopicComp ? (
                <PolicyTopicComp navigate={policyNavigate} />
              ) : (
                <Placeholder
                  pillarColor={policyPillarConfig.color}
                  topicLabel={policyTopicConfig?.label ?? ""}
                />
              )}
            </main>
          </div>
        )}

        {/* Static pages */}
        {isAbout && <About />}
        {isContribute && <Contribute />}

        <Footer />
      </div>
    </div>
  );
}
