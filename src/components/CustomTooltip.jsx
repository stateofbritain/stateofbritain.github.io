import P from "../theme/palette";

export default function CustomTooltip({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div
      style={{
        background: P.navy,
        border: "1px solid rgba(255,255,255,0.1)",
        padding: "10px 14px",
        fontFamily: "'DM Mono', monospace",
        fontSize: "12px",
        color: "#e0ddd6",
        borderRadius: 3,
        boxShadow: "0 4px 16px rgba(28,43,69,0.25)",
      }}
    >
      <div
        style={{
          fontWeight: 500,
          marginBottom: 4,
          color: P.parchment,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      {payload.map((p, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 3,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: p.color,
              display: "inline-block",
            }}
          />
          <span style={{ opacity: 0.65 }}>{p.name}:</span>
          <span style={{ fontWeight: 500, color: "#fff" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}
