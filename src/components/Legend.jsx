import P from "../theme/palette";

/**
 * Standard chart legend rendered as coloured swatches with labels.
 *
 * @param {{ items: Array<{ key: string, label: string, color: string }> }} props
 */
export default function Legend({ items }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      {items.map((item) => (
        <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 14, height: 8, background: item.color, display: "inline-block", borderRadius: 1 }} />
          <span style={{ fontSize: "11px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
