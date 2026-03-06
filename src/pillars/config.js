import P from "../theme/palette";

/**
 * Central registry of pillars and their sub-topics.
 * Each topic's `component` is lazy — set to null here, resolved in App.jsx.
 * This keeps the config free of React imports.
 */
const PILLARS = {
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
    },
  },
  growth: {
    label: "Growth Engine",
    description: "Startups, R&D, productivity, investment",
    color: P.sienna,
    topics: {
      startups:    { label: "Startups & VC",       icon: "▲" },
      spinouts:    { label: "University Spinouts",  icon: "◎" },
      research:    { label: "Research Funding",     icon: "△" },
      productivity:{ label: "Productivity",         icon: "→" },
      pq:          { label: "Productive Quotient",  icon: "◑" },
      investment:  { label: "Investment & Capital",  icon: "£" },
      infrastructure:{ label: "Infrastructure",     icon: "≡" },
    },
  },
  state: {
    label: "State Performance",
    description: "Spending, NHS, education, justice, defence",
    color: P.navy,
    topics: {
      spending:    { label: "Public Spending",     icon: "◎" },
      nhs:         { label: "NHS Outcomes",        icon: "+" },
      education:   { label: "Education Results",   icon: "▲" },
      justice:     { label: "Justice & Policing",  icon: "⚖" },
      defence:     { label: "Defence",             icon: "■" },
      immigration: { label: "Immigration",         icon: "→" },
      demographics:{ label: "Demographics",        icon: "◑" },
    },
  },
};

export const PILLAR_KEYS = Object.keys(PILLARS);
export default PILLARS;
