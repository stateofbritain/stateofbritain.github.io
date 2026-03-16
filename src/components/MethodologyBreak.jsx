import { ReferenceLine } from "recharts";
import P from "../theme/palette";

/**
 * Renders Recharts <ReferenceLine> elements for methodology breaks.
 *
 * @param {{ breaks: Array<{ at: number|string, label: string, severity?: string }>, axis?: "x"|"y" }} props
 * @returns {React.ReactElement[]} Array of ReferenceLine elements (render inside a Recharts chart)
 */
export default function MethodologyBreak({ breaks, axis = "x" }) {
  if (!breaks?.length) return null;

  return breaks.map((b, i) => {
    const isMajor = b.severity === "major";
    const color = isMajor ? P.red : P.grey;
    const props =
      axis === "x" ? { x: b.at } : { y: b.at };

    return (
      <ReferenceLine
        key={`mb-${i}`}
        {...props}
        stroke={color}
        strokeDasharray="4 4"
        strokeWidth={isMajor ? 1.5 : 1}
        label={{
          value: b.label,
          fontSize: 10,
          fill: color,
          position: "top",
          fontFamily: "'DM Mono', monospace",
        }}
      />
    );
  });
}

/**
 * Helper to extract methodology breaks for a given series from v1 dataset.
 * @param {object} rawData - The full v1 dataset object
 * @param {string} seriesId - The series key
 * @returns {Array} methodologyBreaks array or empty array
 */
export function getMethodologyBreaks(rawData, seriesId) {
  return rawData?.series?.[seriesId]?.methodologyBreaks ?? [];
}
