import P from "../theme/palette";

export default function Placeholder({ pillarColor, topicLabel }) {
  return (
    <div
      style={{
        animation: "fadeSlideIn 0.4s ease both",
        padding: "40px 0",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "28px",
          fontWeight: 600,
          color: P.text,
          margin: "0 0 12px",
        }}
      >
        {topicLabel}
      </h2>
      <div
        style={{
          width: 40,
          height: 3,
          background: pillarColor,
          margin: "0 auto 20px",
          borderRadius: 2,
        }}
      />
      <p
        style={{
          fontSize: "13px",
          color: P.textMuted,
          fontFamily: "'DM Mono', monospace",
          fontWeight: 300,
          maxWidth: 400,
          margin: "0 auto",
          lineHeight: 1.6,
        }}
      >
        Data pipeline in progress. This page will show live data from official
        UK government sources.
      </p>
    </div>
  );
}
