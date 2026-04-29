const P = {
  teal: "#1E6B5E",
  navy: "#1C2B45",
  sienna: "#C94B1A",
  parchment: "#EDE3C8",
  red: "#A83428",
  grey: "#8B9BB0",
  yellow: "#E8B830",
  bg: "#F5F0E8",
  bgCard: "#FFFDF8",
  text: "#1C2B45",
  textMuted: "#6B6458",
  textLight: "#9B9285",
  border: "rgba(28,43,69,0.1)",
  borderStrong: "rgba(28,43,69,0.18)",
};

/**
 * Reusable colour scales for choropleths and other gradients.
 * Reach for these instead of hand-rolling stops per chart.
 *
 *   diverging      sienna → grey → teal — bipolar metrics where a
 *                  midpoint reads as neutral (e.g. UNGA alignment,
 *                  trade balance, polling lead).
 *   sequentialTeal pale teal → deep teal — monotonic positive metrics.
 *   sequentialWarm parchment → sienna  — monotonic warm metrics.
 *   nullFill       value to use for "no data" cells alongside the above.
 */
export const SCALES = {
  diverging: [P.sienna, P.parchment, P.teal],
  sequentialTeal: ["#d4ede8", P.teal],
  sequentialWarm: ["#f0e8d6", P.sienna],
  nullFill: "#e6e6e6",
};

export default P;
