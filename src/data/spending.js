import P from "../theme/palette";

const SPENDING_DATA = {
  name: "Total Public Spending",
  value: 1324,
  children: [
    {
      name: "Social Protection", value: 341, color: P.red,
      children: [
        { name: "State Pension", value: 124, color: "#A83428" },
        { name: "Universal Credit", value: 83, color: "#C04A3E" },
        { name: "Disability Benefits", value: 35, color: "#D46858" },
        { name: "Housing Benefit", value: 22, color: "#E08878" },
        { name: "Child Benefit", value: 12, color: "#ECA898" },
        { name: "Other Social Protection", value: 65, color: "#F0C0B2" },
      ],
    },
    {
      name: "Health", value: 232, color: P.teal,
      children: [
        { name: "Hospital Services", value: 98, color: "#1E6B5E" },
        { name: "Primary Care (GPs)", value: 42, color: "#2E8B7A" },
        { name: "Mental Health", value: 23, color: "#45A896" },
        { name: "Prescriptions & Pharma", value: 22, color: "#6BC0B0" },
        { name: "Public Health", value: 12, color: "#92D4C8" },
        { name: "Other Health", value: 35, color: "#B8E6DE" },
      ],
    },
    {
      name: "Education", value: 119, color: P.navy,
      children: [
        { name: "Schools", value: 58, color: "#1C2B45" },
        { name: "Higher Education", value: 18, color: "#2E4468" },
        { name: "Early Years", value: 10, color: "#45608A" },
        { name: "Further Education", value: 14, color: "#607DAA" },
        { name: "Other Education", value: 19, color: "#8B9BB0" },
      ],
    },
    {
      name: "Debt Interest", value: 104, color: P.sienna,
      children: [
        { name: "Gilt Interest", value: 72, color: "#C94B1A" },
        { name: "Index-linked Gilts", value: 24, color: "#D97040" },
        { name: "Other Debt Costs", value: 8, color: "#E89568" },
      ],
    },
    {
      name: "Defence", value: 74, color: P.grey,
      children: [
        { name: "Military Personnel", value: 16, color: "#6B7B90" },
        { name: "Equipment & Support", value: 22, color: "#7D8DA2" },
        { name: "Operations", value: 8, color: "#8B9BB0" },
        { name: "Infrastructure", value: 12, color: "#A0AEBF" },
        { name: "Foreign Aid & Diplomacy", value: 16, color: "#B5C1CE" },
      ],
    },
    {
      name: "Transport", value: 52, color: P.yellow,
      children: [
        { name: "Roads", value: 18, color: "#D4A620" },
        { name: "Railways", value: 22, color: "#E8B830" },
        { name: "Local Transport", value: 8, color: "#F0CC60" },
        { name: "Other Transport", value: 4, color: "#F5DD90" },
      ],
    },
    {
      name: "Public Order & Safety", value: 48, color: "#6B5B4E",
      children: [
        { name: "Police", value: 22, color: "#6B5B4E" },
        { name: "Courts & Prisons", value: 14, color: "#8A7868" },
        { name: "Fire Services", value: 5, color: "#A89888" },
        { name: "Other", value: 7, color: "#C4B8A8" },
      ],
    },
    {
      name: "Housing & Environment", value: 38, color: "#4A7A58",
      children: [
        { name: "Housing", value: 16, color: "#4A7A58" },
        { name: "Environment Protection", value: 12, color: "#6A9A78" },
        { name: "Planning & Development", value: 10, color: "#8ABA98" },
      ],
    },
    {
      name: "Other Spending", value: 316, color: "#B0A898",
      children: [
        { name: "Science & Technology", value: 22, color: "#908878" },
        { name: "Industry & Agriculture", value: 28, color: "#A09888" },
        { name: "Culture & Recreation", value: 14, color: "#B0A898" },
        { name: "General Admin", value: 18, color: "#C0B8A8" },
        { name: "Devolved Govts (net)", value: 78, color: "#CCC4B4" },
        { name: "Other & Accounting", value: 156, color: "#D8D0C4" },
      ],
    },
  ],
};

export default SPENDING_DATA;
