import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { geoTransverseMercator, geoPath as d3GeoPath } from "d3-geo";
import { feature } from "topojson-client";
import P from "../theme/palette";

const DEFAULT_H = 720;
const PAD = 14;

/**
 * UK basemap with one circle per Nationally Significant Infrastructure
 * Project. Coloured by category (energy / transport / water / waste /
 * industrial), sized by an `radiusKey` attribute on each project (default
 * is `yearsInSystem` so older projects read larger). Click a circle to
 * fire `onSelect`; the selected project gets a navy ring.
 *
 * Projection: Transverse Mercator rotated for the UK, fitted to the
 * outline geometry. Same projection logic as UKChoroplethMap so both
 * maps look at home in the same dashboard.
 *
 * @param {Object} props
 * @param {Array<{ref,lat,lon,category,...}>} props.projects
 * @param {string} [props.radiusKey="yearsInSystem"] — numeric field
 *   on each project to drive circle size.
 * @param {[number,number]} [props.radiusRange=[3, 14]] — min/max px.
 * @param {string} [props.selectedRef] — ref of currently-selected project.
 * @param {(project) => void} [props.onSelect] — click callback.
 * @param {number} [props.height=720]
 */
export default function UKNSIPsMap({
  projects = [],
  radiusKey = "yearsInSystem",
  radiusRange = [3, 14],
  selectedRef = null,
  onSelect,
  height = DEFAULT_H,
}) {
  const containerRef = useRef(null);
  const [topo, setTopo] = useState(null);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    fetch("/data/geo/uk-outline.topo.json")
      .then((r) => r.json())
      .then(setTopo)
      .catch((err) => console.error("UKNSIPsMap: failed to load outline", err));
  }, []);

  // Fit Transverse Mercator projection to UK outline bounds, deriving width
  // from aspect ratio. Same shape as UKChoroplethMap.
  const { projection, viewW, viewH, outlineFeatures } = useMemo(() => {
    if (!topo) return { projection: null, viewW: 300, viewH: height, outlineFeatures: [] };
    const objKey = Object.keys(topo.objects)[0];
    const geojson = feature(topo, topo.objects[objKey]);
    const proj = geoTransverseMercator().rotate([2, 0]);
    const tempPath = d3GeoPath(proj.fitSize([2000, 2000], geojson));
    const [[bx0, by0], [bx1, by1]] = tempPath.bounds(geojson);
    const bW = bx1 - bx0;
    const bH = by1 - by0;
    const scale = (height - 2 * PAD) / bH;
    const finalW = Math.ceil(bW * scale + 2 * PAD);
    proj.fitSize([finalW, height], geojson);
    return { projection: proj, viewW: finalW, viewH: height, outlineFeatures: geojson.features };
  }, [topo, height]);

  const pathGen = useMemo(() => projection ? d3GeoPath(projection) : null, [projection]);

  // Project each NSIP to SVG coordinates and compute its radius.
  const points = useMemo(() => {
    if (!projection) return [];
    const vals = projects
      .map((p) => Number(p[radiusKey]))
      .filter((v) => Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);
    const lo = vals[Math.floor(vals.length * 0.05)] ?? 0;
    const hi = vals[Math.ceil(vals.length * 0.95) - 1] ?? Math.max(...vals, 1);
    const range = Math.max(0.0001, hi - lo);
    const [rMin, rMax] = radiusRange;
    return projects
      .map((p) => {
        if (p.lat == null || p.lon == null) return null;
        const xy = projection([p.lon, p.lat]);
        if (!xy) return null;
        const v = Number(p[radiusKey]);
        const t = Number.isFinite(v) ? Math.max(0, Math.min(1, (v - lo) / range)) : 0;
        const r = rMin + (rMax - rMin) * t;
        return { project: p, x: xy[0], y: xy[1], r };
      })
      .filter(Boolean);
  }, [projection, projects, radiusKey, radiusRange]);

  const handleEnter = useCallback((e, point) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHovered({
      project: point.project,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHovered((h) => h ? { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
  }, []);

  const handleLeave = useCallback(() => setHovered(null), []);

  // On touch devices the tooltip latches open since `mouseleave` never
  // fires. Dismiss on any window scroll so it doesn't linger over the
  // map after the panel auto-scrolls into view (or when the user scrolls
  // back up).
  useEffect(() => {
    if (!hovered) return;
    const dismiss = () => setHovered(null);
    window.addEventListener("scroll", dismiss, { passive: true });
    return () => window.removeEventListener("scroll", dismiss);
  }, [hovered]);

  if (!topo || !pathGen) {
    return (
      <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>
          Loading map…
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        width="100%"
        style={{ maxHeight: height, aspectRatio: `${viewW} / ${viewH}`, display: "block", margin: "0 auto" }}
        onMouseMove={handleMove}
      >
        {outlineFeatures.map((f, i) => (
          <path
            key={i}
            d={pathGen(f)}
            fill="#f0e9d9"
            stroke="#cbc1a8"
            strokeWidth={0.6}
          />
        ))}
        {points.map(({ project, x, y, r }) => {
          const isSelected = project.ref === selectedRef;
          const isHovered = hovered?.project?.ref === project.ref;
          const fill = CATEGORY_COLOR[project.category] || P.grey;
          return (
            <circle
              key={project.ref}
              cx={x}
              cy={y}
              r={isSelected ? r + 1.5 : isHovered ? r + 0.5 : r}
              fill={fill}
              fillOpacity={isSelected ? 0.95 : isHovered ? 0.85 : 0.7}
              stroke={isSelected ? P.navy : "#fff"}
              strokeWidth={isSelected ? 2 : 0.6}
              style={{ cursor: "pointer", transition: "r 0.12s, fill-opacity 0.12s" }}
              onMouseEnter={(e) => handleEnter(e, { project })}
              onMouseLeave={handleLeave}
              onClick={() => onSelect?.(project)}
            />
          );
        })}
      </svg>

      <Legend />

      {hovered && (
        <div style={{
          position: "absolute",
          left: Math.min(hovered.x + 14, viewW - 240),
          top: Math.max(0, hovered.y - 10),
          maxWidth: 260,
          background: P.text,
          color: P.bgCard,
          padding: "8px 10px",
          borderRadius: 3,
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          zIndex: 20,
        }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            {hovered.project.name}
          </div>
          <div style={{ opacity: 0.8 }}>
            {hovered.project.subtype} · {hovered.project.stage}
          </div>
          {hovered.project.yearsInSystem != null && (
            <div style={{ opacity: 0.7, marginTop: 2 }}>
              {hovered.project.yearsInSystem} yrs in the system
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const CATEGORY_COLOR = {
  energy:     P.teal,
  transport:  P.sienna,
  water:      P.navy,
  waste:      P.yellow,
  industrial: P.red,
  other:      P.grey,
};

export const CATEGORY_LABEL = {
  energy:     "Energy",
  transport:  "Transport",
  water:      "Water",
  waste:      "Waste",
  industrial: "Industrial",
  other:      "Other",
};

function Legend() {
  const items = ["energy", "transport", "water", "waste", "industrial"];
  return (
    <div style={{
      display: "flex",
      gap: 14,
      flexWrap: "wrap",
      justifyContent: "center",
      marginTop: 10,
      fontSize: 11,
      fontFamily: "'DM Mono', monospace",
      color: P.textMuted,
    }}>
      {items.map((k) => (
        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: CATEGORY_COLOR[k] }} />
          {CATEGORY_LABEL[k]}
        </span>
      ))}
    </div>
  );
}
