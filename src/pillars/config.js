import P from "../theme/palette";

/**
 * Central registry of pillars and their sub-topics.
 * Each topic's `component` is lazy — set to null here, resolved in App.jsx.
 * This keeps the config free of React imports.
 */
const PILLARS = {
  spending: {
    label: "Public Spending",
    description: "Where the money goes — departmental breakdowns, trends, debt",
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
          localGov:    { label: "Local Government" },
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
      energy:     { label: "Energy",               icon: "⚡" },
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
    description: "Startups, R&D, productivity, investment, education",
    color: P.sienna,
    topics: {
      education:      { label: "Education",            icon: "▲" },
      industrial:     { label: "Industrial Production", icon: "⚙" },
      infrastructure: { label: "Infrastructure",     icon: "≡" },
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
      immigration: { label: "Immigration",         icon: "→" },
    },
  },
  challenges: {
    label: "Policy Challenges",
    description: "Legal and regulatory frameworks on issues with significant public interest",
    color: "#7B4B8A",
    topics: {
      overview:    { label: "Overview",              icon: "◈" },
      asylum:      { label: "Asylum & Immigration",  icon: "⊘" },
      university:  { label: "University Funding",    icon: "△" },
      hs2:         { label: "HS2",                   icon: "▬" },
    },
  },
};

export const PILLAR_KEYS = Object.keys(PILLARS);
export default PILLARS;
