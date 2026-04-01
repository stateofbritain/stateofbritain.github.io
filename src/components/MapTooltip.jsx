import { useEffect, useRef, useState } from "react";
import P from "../theme/palette";

/**
 * Positioned tooltip for the UKMap component.
 * Matches CustomTooltip's dark-navy styling but uses absolute positioning
 * relative to a container element rather than Recharts' built-in placement.
 */
export default function MapTooltip({ x, y, containerRef, children }) {
  const tipRef = useRef(null);
  const [offset, setOffset] = useState({ dx: 12, dy: -12 });

  useEffect(() => {
    if (!tipRef.current || !containerRef?.current) return;
    const tip = tipRef.current.getBoundingClientRect();
    const box = containerRef.current.getBoundingClientRect();
    let dx = 12, dy = -12;
    if (x + dx + tip.width > box.width) dx = -tip.width - 12;
    if (y + dy < 0) dy = 12;
    if (y + dy + tip.height > box.height) dy = -tip.height - 12;
    setOffset({ dx, dy });
  }, [x, y, containerRef]);

  return (
    <div
      ref={tipRef}
      style={{
        position: "absolute",
        left: x + offset.dx,
        top: y + offset.dy,
        background: P.navy,
        border: "1px solid rgba(255,255,255,0.1)",
        padding: "10px 14px",
        fontFamily: "'DM Mono', monospace",
        fontSize: "12px",
        color: "#e0ddd6",
        borderRadius: 3,
        boxShadow: "0 4px 16px rgba(28,43,69,0.25)",
        pointerEvents: "none",
        zIndex: 10,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}
