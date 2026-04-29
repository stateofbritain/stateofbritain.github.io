import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { geoTransverseMercator, geoPath as d3GeoPath } from "d3-geo";
import { feature } from "topojson-client";
import P, { SCALES } from "../theme/palette";
import MapTooltip from "./MapTooltip";

const DEFAULT_H = 620;
const PAD = 10;

/**
 * Reusable choropleth map of UK geographic areas.
 *
 * Renders any TopoJSON boundary file as a filled choropleth with hover tooltips,
 * click selection, and an auto-scaled colour legend. Designed for local authority,
 * constituency, or region-level data.
 *
 * The projection uses Transverse Mercator rotated for the UK, auto-fitted to the
 * bounding box of the loaded geometry so that any subset of the UK (e.g. England
 * only, or a single region) fills the available space correctly.
 *
 * Colour scale: interpolates linearly between colorScale[0] (low) and
 * colorScale[1] (high). By default, the domain is set to the 2nd-98th percentile
 * of data values to prevent outliers from washing out the scale.
 *
 * @param {Object} props
 * @param {string} [props.topoUrl="/data/geo/ctyua.topo.json"]
 *   Path to TopoJSON file.
 * @param {string} [props.objectKey="authorities"]
 *   Key in topo.objects to extract features from.
 * @param {string} [props.codeField="code"]
 *   Property name on each feature used for matching data keys.
 * @param {Object} [props.data={}]
 *   { [code]: number } - values to colour by. Areas with no entry or null/0
 *   values render in nullColor.
 * @param {[string, string]} [props.colorScale=["#d4ede8", "#0d4a3e"]]
 *   [low, high] hex colours for the sequential gradient.
 * @param {string} [props.nullColor="#e8e4dc"]
 *   Fill colour for areas with no data.
 * @param {[number, number]} [props.domain]
 *   Explicit [min, max] for the colour scale. Overrides auto percentile.
 * @param {[number, number]} [props.quantile=[0.02, 0.98]]
 *   Percentile range for auto-computing colour domain. Ignored if domain is set.
 * @param {number} [props.height=620]
 *   Target SVG height in pixels.
 * @param {(value: number) => string} [props.formatLegend]
 *   Custom formatter for legend min/max labels. Defaults to "£Xm".
 * @param {string} [props.selectedCode]
 *   ONS code of the currently selected area (highlighted border).
 * @param {({ code, name }) => void} [props.onClickArea]
 *   Called when an area is clicked.
 * @param {({ code, name, value }) => ReactNode} [props.renderTooltip]
 *   Render function for hover tooltip content.
 */
export default function UKChoroplethMap({
  topoUrl = "/data/geo/ctyua.topo.json",
  objectKey = "authorities",
  codeField = "code",
  data = {},
  colorScale = SCALES.sequentialTeal,
  nullColor = SCALES.nullFill,
  domain,
  quantile = [0.02, 0.98],
  height = DEFAULT_H,
  formatLegend,
  selectedCode,
  onClickArea,
  renderTooltip,
}) {
  const containerRef = useRef(null);
  const [topo, setTopo] = useState(null);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    fetch(topoUrl)
      .then(r => r.json())
      .then(setTopo)
      .catch(err => console.error("UKChoroplethMap: failed to load", err));
  }, [topoUrl]);

  // Fit projection to geometry bounds, deriving width from aspect ratio
  const { projection, viewW, viewH } = useMemo(() => {
    if (!topo) return { projection: null, viewW: 300, viewH: height };
    const geojson = feature(topo, topo.objects[objectKey]);
    const proj = geoTransverseMercator().rotate([2, 0]);
    // Fit to large square first, then measure actual bounds to crop
    const tempPath = d3GeoPath(proj.fitSize([2000, 2000], geojson));
    const [[bx0, by0], [bx1, by1]] = tempPath.bounds(geojson);
    const bW = bx1 - bx0;
    const bH = by1 - by0;
    const scale = (height - 2 * PAD) / bH;
    const finalW = Math.ceil(bW * scale + 2 * PAD);
    proj.fitSize([finalW, height], geojson);
    return { projection: proj, viewW: finalW, viewH: height };
  }, [topo, objectKey, height]);

  const geoFeatures = useMemo(() => {
    if (!topo) return [];
    return feature(topo, topo.objects[objectKey]).features;
  }, [topo, objectKey]);

  const pathGen = useMemo(() => {
    if (!projection) return null;
    return d3GeoPath(projection);
  }, [projection]);

  // Colour mapping: sequential interpolation with percentile-clipped domain
  const { colorFor, minVal, maxVal } = useMemo(() => {
    const vals = Object.values(data).filter(v => v != null && v > 0).sort((a, b) => a - b);
    if (vals.length === 0) return { colorFor: () => nullColor, minVal: 0, maxVal: 1 };

    let lo, hi;
    if (domain) {
      [lo, hi] = domain;
    } else {
      lo = vals[Math.floor(vals.length * quantile[0])] ?? vals[0];
      hi = vals[Math.ceil(vals.length * quantile[1]) - 1] ?? vals[vals.length - 1];
    }
    const range = hi - lo || 1;

    const parse = (hex) => {
      const h = hex.replace("#", "");
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    };
    const stops = colorScale.map(parse);
    const lerp = (a, b, t) => Math.round(a + (b - a) * t);
    const interp = (s1, s2, t) => `rgb(${lerp(s1[0], s2[0], t)},${lerp(s1[1], s2[1], t)},${lerp(s1[2], s2[2], t)})`;

    // Support 2- or 3-stop scales. With 3 stops, mid is anchored at t=0.5.
    const colorFor = (code) => {
      const v = data[code];
      if (v == null || v <= 0) return nullColor;
      const t = Math.max(0, Math.min(1, (v - lo) / range));
      if (stops.length === 2) return interp(stops[0], stops[1], t);
      if (t <= 0.5) return interp(stops[0], stops[1], t * 2);
      return interp(stops[1], stops[2], (t - 0.5) * 2);
    };

    return { colorFor, minVal: lo, maxVal: hi };
  }, [data, colorScale, nullColor, domain, quantile]);

  const handleMouseEnter = useCallback((e, feat) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHovered({
      code: feat.properties[codeField],
      name: feat.properties.name,
      value: data[feat.properties[codeField]],
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [codeField, data]);

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
        viewBox={`0 0 ${viewW} ${viewH}`}
        width="100%"
        style={{ maxHeight: height, aspectRatio: `${viewW} / ${viewH}`, display: "block", margin: "0 auto" }}
      >
        {geoFeatures.map((f) => {
          const code = f.properties[codeField];
          const isHovered = hovered?.code === code;
          const isSelected = selectedCode === code;
          return (
            <path
              key={code}
              d={pathGen(f)}
              fill={colorFor(code)}
              fillOpacity={isSelected ? 1 : isHovered ? 0.95 : 0.85}
              stroke={isSelected ? P.navy : isHovered ? P.navy : "#fff"}
              strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.5}
              style={{ cursor: "pointer", transition: "fill-opacity 0.15s, stroke-width 0.15s" }}
              onMouseEnter={(e) => handleMouseEnter(e, f)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={() => onClickArea?.({ code, name: f.properties.name })}
            />
          );
        })}
      </svg>

      {/* Colour scale legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, justifyContent: "center" }}>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: P.textMuted }}>
          {formatLegend ? formatLegend(minVal) : `£${Math.round(minVal / 1000)}m`}
        </span>
        <div style={{
          width: 120,
          height: 10,
          borderRadius: 2,
          background: `linear-gradient(to right, ${colorScale.join(", ")})`,
        }} />
        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: P.textMuted }}>
          {formatLegend ? formatLegend(maxVal) : `£${Math.round(maxVal / 1000)}m`}
        </span>
      </div>

      {hovered && renderTooltip && (
        <MapTooltip x={hovered.x} y={hovered.y} containerRef={containerRef}>
          {renderTooltip(hovered)}
        </MapTooltip>
      )}
    </div>
  );
}
