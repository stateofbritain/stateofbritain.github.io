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
      spending: { label: "Public Spending", icon: "◎" },
    },
  },
  foundations: {
    label: "Foundations",
    description: "Housing, energy, water, food, health, safety",
    color: P.teal,
    topics: {
      housing:    { label: "Housing",              icon: "⌂" },
      energy:     { label: "Energy",               icon: "⚡" },
      water:      { label: "Water",                icon: "~" },
      food:       { label: "Food & Cost of Living", icon: "£" },
      healthcare: { label: "Healthcare Access",    icon: "+" },
      safety:     { label: "Safety",               icon: "⚖" },
      environment:{ label: "Environment",          icon: "◉" },
      family:     { label: "Family",               icon: "♥" },
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
      defence:     { label: "Defence",             icon: "■" },
      immigration: { label: "Immigration",         icon: "→" },
    },
  },
};

export const PILLAR_KEYS = Object.keys(PILLARS);
export default PILLARS;
