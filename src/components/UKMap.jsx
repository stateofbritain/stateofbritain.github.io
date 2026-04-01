import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { geoTransverseMercator, geoPath as d3GeoPath } from "d3-geo";
import { feature } from "topojson-client";
import P from "../theme/palette";
import MapTooltip from "./MapTooltip";

const VIEW_W = 400;
const PADDING = 24;

/**
 * Reusable UK map with proportionally scaled circles at geographic locations.
 *
 * Props:
 *  - locations: [{ id, name|airport, lat, lng, [valueKey]: number, ...extra }]
 *  - valueKey:  field to scale circles by (default "value")
 *  - color:     circle fill (default P.teal)
 *  - minRadius: smallest circle in SVG units (default 3)
 *  - maxRadius: largest circle in SVG units (default 28)
 *  - opacity:   circle fill opacity (default 0.7)
 *  - showCountryBorders: render England/Scotland/Wales/NI borders (default true)
 *  - renderTooltip: ({ location }) => ReactNode
 */
export default function UKMap({
  locations = [],
  valueKey = "value",
  color = P.teal,
  colorFn,
  minRadius = 3,
  maxRadius = 28,
  opacity = 0.7,
  showCountryBorders = true,
  renderTooltip,
}) {
  const containerRef = useRef(null);
  const [topo, setTopo] = useState(null);
  const [hovered, setHovered] = useState(null); // { location, x, y }

  // Load TopoJSON on mount
  useEffect(() => {
    fetch("/data/geo/uk-outline.topo.json")
      .then(r => r.json())
      .then(setTopo)
      .catch(err => console.error("UKMap: failed to load outline", err));
  }, []);

  // Set up projection fitted to the UK bounding box, computing viewBox height dynamically
  const { projection, viewH } = useMemo(() => {
    if (!topo) return { projection: null, viewH: 700 };
    const geojson = feature(topo, topo.objects.countries);

    // Initial projection to measure bounds
    const proj0 = geoTransverseMercator().rotate([2, 0]).center([0, 55.5]);
    const path0 = d3GeoPath(proj0);
    const [[x0, y0], [x1, y1]] = path0.bounds(geojson);
    const rawW = x1 - x0;
    const rawH = y1 - y0;

    // Scale to fit the available width, then derive height from aspect ratio
    const usableW = VIEW_W - 2 * PADDING;
    const scaleFactor = usableW / rawW;
    const fittedH = rawH * scaleFactor + 2 * PADDING;
    const newScale = scaleFactor * proj0.scale();

    const center = proj0.invert([(x0 + x1) / 2, (y0 + y1) / 2]);
    const projection = geoTransverseMercator()
      .rotate([2, 0])
      .center(center)
      .scale(newScale)
      .translate([VIEW_W / 2 - 150, fittedH / 2]);

    return { projection, viewH: Math.ceil(fittedH) };
  }, [topo]);

  // Build GeoJSON features for rendering
  const geoFeatures = useMemo(() => {
    if (!topo) return [];
    return feature(topo, topo.objects.countries).features;
  }, [topo]);

  // Build the d3 path generator
  const pathGen = useMemo(() => {
    if (!projection) return null;
    return d3GeoPath(projection);
  }, [projection]);

  // Project locations and compute radii
  const circles = useMemo(() => {
    if (!projection || !locations.length) return [];
    const maxVal = Math.max(...locations.map(l => l[valueKey] || 0));
    return locations
      .map(loc => {
        const val = loc[valueKey] || 0;
        const [cx, cy] = projection([loc.lng, loc.lat]);
        const r = val > 0 && maxVal > 0
          ? minRadius + (maxRadius - minRadius) * Math.sqrt(val / maxVal)
          : minRadius;
        return { loc, cx, cy, r, val };
      })
      .sort((a, b) => b.r - a.r); // largest first so small circles render on top
  }, [projection, locations, valueKey, minRadius, maxRadius]);

  const handleMouseEnter = useCallback((e, circle) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHovered({
      location: circle.loc,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current || !hovered) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHovered(prev => prev ? {
      ...prev,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    } : null);
  }, [hovered]);

  const handleMouseLeave = useCallback(() => setHovered(null), []);

  if (!topo || !pathGen) {
    return (
      <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading map...</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${viewH}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height={580}
      >
        {/* Country fills */}
        {geoFeatures.map((f, i) => (
          <path
            key={"fill-" + i}
            d={pathGen(f)}
            fill={P.bg}
            stroke="none"
          />
        ))}
        {/* Country borders */}
        {showCountryBorders && geoFeatures.map((f, i) => (
          <path
            key={"border-" + i}
            d={pathGen(f)}
            fill="none"
            stroke={P.borderStrong}
            strokeWidth={0.5}
          />
        ))}
        {/* Coastline outline */}
        {geoFeatures.map((f, i) => (
          <path
            key={"coast-" + i}
            d={pathGen(f)}
            fill="none"
            stroke={P.grey}
            strokeWidth={1}
          />
        ))}
        {/* Circles (largest first, smallest on top) */}
        {circles.map((c) => (
          <circle
            key={c.loc.id}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill={colorFn ? colorFn(c.loc) : color}
            fillOpacity={c.loc === hovered?.location ? Math.min(opacity + 0.2, 1) : opacity}
            stroke="#fff"
            strokeWidth={c.loc === hovered?.location ? 1.5 : 0.8}
            style={{ cursor: "pointer", transition: "fill-opacity 0.15s, stroke-width 0.15s" }}
            onMouseEnter={(e) => handleMouseEnter(e, c)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        ))}
      </svg>
      {hovered && renderTooltip && (
        <MapTooltip x={hovered.x} y={hovered.y} containerRef={containerRef}>
          {renderTooltip({ location: hovered.location })}
        </MapTooltip>
      )}
    </div>
  );
}
