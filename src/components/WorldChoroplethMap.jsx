import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { geoNaturalEarth1, geoPath as d3GeoPath } from "d3-geo";
import { feature } from "topojson-client";
import P from "../theme/palette";
import MapTooltip from "./MapTooltip";

const DEFAULT_H = 520;
const PAD = 10;

/**
 * Reusable choropleth map of the world's countries.
 *
 * Mirrors UKChoroplethMap's API but uses a Natural Earth projection and
 * joins data on numeric ISO 3166-1 codes (the `id` field on each
 * country feature in world-atlas TopoJSON files).
 *
 * Colour scale interpolates linearly between colorScale[0] (low) and
 * colorScale[1] (high). Domain defaults to the 2nd-98th percentile of
 * data values to prevent outliers from washing out the scale.
 *
 * @param {Object} props
 * @param {string} [props.topoUrl="/data/geo/world-countries-50m.topo.json"]
 * @param {string} [props.objectKey="countries"]
 * @param {Object} [props.data={}]   { [iso3num]: number } join keyed on numeric ISO code (zero-padded 3-digit string).
 * @param {[string, string]} [props.colorScale=["#e8e4dc", "#1c2b45"]]
 * @param {string} [props.nullColor="#f3f0e7"]
 * @param {[number, number]} [props.domain]  Explicit [min, max] for colour scale.
 * @param {[number, number]} [props.quantile=[0.02, 0.98]]
 * @param {number} [props.height=520]
 * @param {(value: number) => string} [props.formatLegend]
 * @param {string} [props.selectedCode]   numeric iso3num of the selected country.
 * @param {({ code, name }) => void} [props.onClickArea]
 * @param {({ code, name, value }) => ReactNode} [props.renderTooltip]
 */
export default function WorldChoroplethMap({
  topoUrl = "/data/geo/world-countries-50m.topo.json",
  objectKey = "countries",
  data = {},
  colorScale = ["#e8e4dc", "#1c2b45"],
  nullColor = "#f3f0e7",
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
      .then((r) => r.json())
      .then(setTopo)
      .catch((err) => console.error("WorldChoroplethMap: failed to load", err));
  }, [topoUrl]);

  const { projection, viewW, viewH } = useMemo(() => {
    if (!topo) return { projection: null, viewW: 1000, viewH: height };
    const geojson = feature(topo, topo.objects[objectKey]);
    // Hide Antarctica from auto-fit; it dominates the bounding box.
    const filtered = {
      ...geojson,
      features: geojson.features.filter((f) => f.id !== 10 && f.id !== "010"),
    };
    const proj = geoNaturalEarth1();
    const tempPath = d3GeoPath(proj.fitSize([2000, 2000], filtered));
    const [[bx0, by0], [bx1, by1]] = tempPath.bounds(filtered);
    const bW = bx1 - bx0;
    const bH = by1 - by0;
    const aspect = bW / bH;
    const finalW = Math.ceil(height * aspect);
    proj.fitSize([finalW - 2 * PAD, height - 2 * PAD], filtered);
    proj.translate([
      proj.translate()[0] + PAD,
      proj.translate()[1] + PAD,
    ]);
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

  const featureCode = useCallback((feat) => {
    // world-atlas exposes numeric id (e.g. 826 for UK). Pad to 3 digits.
    if (feat.id == null) return null;
    return String(feat.id).padStart(3, "0");
  }, []);

  const featureName = useCallback((feat) => {
    return feat.properties?.name || `ISO ${featureCode(feat)}`;
  }, [featureCode]);

  const { colorFor, minVal, maxVal } = useMemo(() => {
    const vals = Object.values(data).filter((v) => v != null && Number.isFinite(v)).sort((a, b) => a - b);
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
      if (v == null || !Number.isFinite(v)) return nullColor;
      const t = Math.max(0, Math.min(1, (v - lo) / range));
      if (stops.length === 2) return interp(stops[0], stops[1], t);
      // 3-stop: low→mid for t∈[0,0.5], mid→high for t∈[0.5,1]
      if (t <= 0.5) return interp(stops[0], stops[1], t * 2);
      return interp(stops[1], stops[2], (t - 0.5) * 2);
    };

    return { colorFor, minVal: lo, maxVal: hi };
  }, [data, colorScale, nullColor, domain, quantile]);

  const handleMouseEnter = useCallback((e, feat) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const code = featureCode(feat);
    setHovered({
      code,
      name: featureName(feat),
      value: data[code],
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [featureCode, featureName, data]);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current || !hovered) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHovered((prev) => prev ? {
      ...prev,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    } : null);
  }, [hovered]);

  const handleMouseLeave = useCallback(() => setHovered(null), []);

  if (!topo || !pathGen) {
    return (
      <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading map…</span>
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
          const code = featureCode(f);
          if (!code) return null;
          // Skip Antarctica — clutters the view, not relevant data.
          if (code === "010") return null;
          const isHovered = hovered?.code === code;
          const isSelected = selectedCode === code;
          return (
            <path
              key={code}
              d={pathGen(f)}
              fill={colorFor(code)}
              fillOpacity={isSelected || isHovered ? 1 : 0.9}
              stroke={isSelected ? P.navy : isHovered ? P.navy : "#fff"}
              strokeWidth={isSelected ? 1.4 : 0.4}
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => handleMouseEnter(e, f)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={() => onClickArea?.({ code, name: featureName(f) })}
            />
          );
        })}
      </svg>

      {hovered && (
        <MapTooltip x={hovered.x} y={hovered.y}>
          {renderTooltip
            ? renderTooltip({ code: hovered.code, name: hovered.name, value: hovered.value })
            : (
              <div>
                <div style={{ fontWeight: 600 }}>{hovered.name}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, opacity: 0.85 }}>
                  {hovered.value != null ? hovered.value : "no data"}
                </div>
              </div>
            )}
        </MapTooltip>
      )}

      {/* Legend */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 10,
        fontFamily: "'DM Mono', monospace",
        fontSize: 10,
        color: P.textLight,
        letterSpacing: "0.04em",
      }}>
        <span>{formatLegend ? formatLegend(minVal) : Math.round(minVal)}</span>
        <div style={{
          flex: 1,
          maxWidth: 220,
          height: 8,
          borderRadius: 2,
          background: `linear-gradient(to right, ${colorScale.join(", ")})`,
        }} />
        <span>{formatLegend ? formatLegend(maxVal) : Math.round(maxVal)}</span>
      </div>
    </div>
  );
}
