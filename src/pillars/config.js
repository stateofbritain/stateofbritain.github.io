import P from "../theme/palette";

/**
 * Central registry of pillars and their sub-topics.
 * Each topic's `component` is lazy — set to null here, resolved in App.jsx.
 * This keeps the config free of React imports.
 */
const PILLARS = {
  spending: {
    label: "Finances",
    description: "Public spending, taxation, debt, personal finance, local government",
    color: P.red,
    topics: {
      spending: {
        label: "Public Spending",
        icon: "◎",
        subtopics: {
          overview:    { label: "Overview" },
          borrowing:   { label: "Borrowing & Debt" },
          taxation:    { label: "Taxation" },
          moneySupply: { label: "Money & Inflation" },
          welfare:     { label: "Welfare" },
          gdp:         { label: "GDP" },
        },
      },
      personalFinance: { label: "Personal Finance", icon: "£" },
      localGov: {
        label: "Local Government",
        icon: "◈",
        subtopics: {
          overview: { label: "Council Spending" },
          mayoral:  { label: "Mayoral Authorities" },
        },
      },
    },
  },
  foundations: {
    label: "Foundations",
    description: "Housing, energy, water, food, health, safety",
    color: P.teal,
    topics: {
      housing: {
        label: "Housing",
        icon: "⌂",
        subtopics: {
          prices:  { label: "Prices & Affordability" },
          supply:  { label: "Housebuilding" },
          stock:   { label: "Housing Stock" },
          density: { label: "Density & Geography" },
        },
      },
      energy: {
        label: "Energy",
        icon: "⚡",
        subtopics: {
          overview:     { label: "Overview" },
          electricity:  { label: "Electricity" },
        },
      },
      water: {
        label: "Water",
        icon: "~",
        subtopics: {
          performance: { label: "Quality & Performance" },
          reservoirs:  { label: "Reservoirs" },
        },
      },
      food:       { label: "Food & Cost of Living", icon: "£" },
      healthcare: {
        label: "Healthcare",
        icon: "+",
        subtopics: {
          outcomes:  { label: "Health Outcomes" },
          mental:    { label: "Mental Health" },
          gp:        { label: "General Practice" },
          waiting:   { label: "Waiting Lists" },
          workforce: { label: "NHS Workforce" },
          capacity:  { label: "Hospital Capacity" },
          funding:   { label: "NHS Funding" },
        },
      },
      safety:     { label: "Safety",               icon: "⚖" },
      environment:{ label: "Environment",          icon: "◉" },
      family:     { label: "Family",               icon: "♥" },
      culture:    { label: "Culture & Religion",  icon: "◈" },
      socialCare: {
        label: "Social Care",
        icon: "♡",
        subtopics: {
          children: { label: "Children's" },
          adults:   { label: "Adults" },
        },
      },
    },
  },
  growth: {
    label: "Growth Engine",
    description: "Jobs, startups, R&D, productivity, investment, education",
    color: P.sienna,
    topics: {
      jobs: {
        label: "Jobs & Employment",
        icon: "◉",
        subtopics: {
          overview:      { label: "Overview" },
          nature:        { label: "Nature of Work" },
          skills:        { label: "Skills & Training" },
          sectors:       { label: "Sectors" },
          earnings:      { label: "Earnings" },
          unemployment:  { label: "Unemployment" },
        },
      },
      education:      { label: "Education",            icon: "▲" },
      industrial:     { label: "Industrial Production", icon: "⚙" },
      transport: {
        label: "Transport",
        icon: "≡",
        subtopics: {
          roads:    { label: "Roads" },
          rail:     { label: "Rail" },
          buses:    { label: "Buses" },
          airports: { label: "Airports" },
        },
      },
      digital: {
        label: "Digital Infrastructure",
        icon: "◎",
        subtopics: {
          broadband: { label: "Broadband" },
        },
      },
      investment:     { label: "Investment & Capital",  icon: "£" },
      productivity:   { label: "Productivity",         icon: "→" },
      pq:             { label: "Frontline Ratio",  icon: "◑" },
      startups:       { label: "Startups & VC",       icon: "▲" },
      research:       { label: "Research Funding",     icon: "△" },
      spinouts:       { label: "University Spinouts",  icon: "◎" },
    },
  },
  state: {
    label: "State Performance",
    description: "Justice, defence, immigration & demographics",
    color: P.navy,
    topics: {
      justice:     { label: "Justice & Policing",  icon: "⚖" },
      defence: {
        label: "Defence",
        icon: "■",
        subtopics: {
          spending:    { label: "Spending & Budget" },
          personnel:   { label: "Personnel" },
          equipment:   { label: "Equipment & Capability" },
          procurement: { label: "Procurement" },
        },
      },
      immigration:    { label: "Immigration",       icon: "→" },
      foreignAffairs: { label: "Foreign Affairs",   icon: "◯" },
    },
  },
  challenges: {
    label: "Policy",
    description: "Adversarial analysis of policy debates, grounded in verifiable evidence and official data",
    color: "#7B4B8A",
    topics: {
      overview:    { label: "Overview",              icon: "◈" },
      asylum:      { label: "Asylum & Immigration",  icon: "⊘", status: "archive" },
      university:  { label: "University Funding",    icon: "△", status: "archive" },
      hs2:         { label: "HS2",                   icon: "▬", status: "archive" },
      energy:      { label: "Energy Security",       icon: "⚡", status: "archive" },
    },
  },
};

export const PILLAR_KEYS = Object.keys(PILLARS);
export default PILLARS;
