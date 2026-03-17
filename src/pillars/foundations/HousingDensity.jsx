import { useMemo } from "react";
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, SOURCE_TEXT, AXIS_TICK_MONO, yAxisLabel,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ShareableChart from "../../components/ShareableChart";
import ChartCard from "../../components/ChartCard";
import { useJsonDataset } from "../../hooks/useDataset";
import useIsMobile from "../../hooks/useIsMobile";

function formatPrice(v) {
  if (v >= 1000000) return `£${(v / 1000000).toFixed(2)}m`;
  if (v >= 1000) return `£${Math.round(v / 1000)}k`;
  return `£${v}`;
}

export default function HousingDensity() {
  const isMobile = useIsMobile();
  const { data, loading, error } = useJsonDataset("housing-density.json");

  // Hooks must run before any early returns
  const intlSorted = useMemo(() => {
    if (!data?.intlCityDensity) return [];
    return [...data.intlCityDensity].sort((a, b) => b.density - a.density);
  }, [data]);

  const regionsSorted = useMemo(() => {
    if (!data?.regionalPrices) return [];
    return [...data.regionalPrices].sort((a, b) => b.avgPrice - a.avgPrice);
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Density &amp; Geography</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading density data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Density &amp; Geography</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const snap = data.snapshot || {};

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Density &amp; Geography</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          UK &middot; ONS / Land Registry
        </span>
      </div>

      {/* ═══ METRICS ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="London Density"
          value={`${snap.londonDensity?.toLocaleString()}/km²`}
          change="persons per km²"
          up={false}
          color={P.navy}
          delay={0.1}
        />
        <MetricCard
          label="England Average"
          value={`${snap.nationalDensity}/km²`}
          change="persons per km²"
          up={false}
          color={P.teal}
          delay={0.18}
        />
        <MetricCard
          label="London Avg Price"
          value={formatPrice(snap.londonAvgPrice)}
          change="highest region"
          up={true}
          color={P.yellow}
          delay={0.26}
        />
        <MetricCard
          label={snap.cheapestRegion}
          value={formatPrice(snap.cheapestRegionPrice)}
          change="lowest region"
          up={false}
          color={P.grey}
          delay={0.34}
        />
      </div>

      {/* ═══ SECTION 1 — UK CITY DENSITY ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>UK City Density</h3>
        <p style={SECTION_NOTE}>
          London is the densest major urban area in the UK at around 5,600 people per km², though
          moderate by international standards. Outside London, English cities range between
          approximately 3,000 and 4,700 people per km².
        </p>

        <ChartCard title="Population Density by UK City" subtitle="Persons per km², ONS mid-year estimates" source={<>SOURCE: <a href="https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>ONS Mid-Year Population Estimates</a></>}>
          <ResponsiveContainer width="100%" height={Math.max(340, data.ukCityDensity?.length * 32)}>
            <BarChart data={data.ukCityDensity} layout="vertical" margin={{ top: 5, right: 30, left: isMobile ? 10 : 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => v.toLocaleString()} />
              <YAxis
                type="category"
                dataKey="city"
                tick={{ fontSize: isMobile ? 10 : 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 80 : 100}
              />
              <Tooltip content={<CustomTooltip formatter={v => `${v?.toLocaleString()} per km²`} />} />
              <Bar dataKey="density" name="Density (per km²)" radius={[0, 3, 3, 0]}>
                {data.ukCityDensity.map(entry => (
                  <Cell
                    key={entry.city}
                    fill={entry.city === "London" ? P.navy : entry.city === "England avg" ? P.teal : P.grey}
                    opacity={entry.city === "England avg" ? 1 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ═══ SECTION 2 — INTERNATIONAL COMPARISON ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>International Comparison</h3>
        <p style={SECTION_NOTE}>
          Internationally, London sits in the middle tier of world-city density.
          Paris achieves over 20,000 people per km², while Barcelona and Tokyo both exceed 14,000.
          Higher-density cities can typically support better public transport and more housing
          per hectare.
        </p>

        <ChartCard title="International City Density" subtitle="Persons per km², latest available" source={<>SOURCE: <a href="http://www.demographia.com/db-worldua.pdf" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>Demographia World Urban Areas</a> &middot; National statistics agencies</>}>
          <ResponsiveContainer width="100%" height={Math.max(300, intlSorted.length * 36)}>
            <BarChart data={intlSorted} layout="vertical" margin={{ top: 5, right: 30, left: isMobile ? 10 : 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis
                type="category"
                dataKey="city"
                tick={{ fontSize: isMobile ? 10 : 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 80 : 100}
              />
              <Tooltip content={<CustomTooltip formatter={v => `${v?.toLocaleString()} per km²`} />} />
              <Bar dataKey="density" name="Density (per km²)" radius={[0, 3, 3, 0]}>
                {intlSorted.map(entry => (
                  <Cell
                    key={entry.city}
                    fill={entry.country === "UK" ? P.red : P.navy}
                    opacity={entry.country === "UK" ? 1 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ═══ SECTION 3 — REGIONAL PRICES ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Regional House Prices</h3>
        <p style={SECTION_NOTE}>
          There is a significant regional variation in house prices. The average London home
          costs {formatPrice(snap.londonAvgPrice)}, more than three times
          the {formatPrice(snap.cheapestRegionPrice)} average in the {snap.cheapestRegion}.
        </p>

        <ChartCard title="Average House Price by Region" subtitle="HM Land Registry, December 2024" source={<>SOURCE: <a href="https://landregistry.data.gov.uk/app/ukhpi" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>HM Land Registry UK House Price Index</a></>}>
          <ResponsiveContainer width="100%" height={Math.max(340, regionsSorted.length * 34)}>
            <BarChart data={regionsSorted} layout="vertical" margin={{ top: 5, right: 30, left: isMobile ? 10 : 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
              <YAxis
                type="category"
                dataKey="region"
                tick={{ fontSize: isMobile ? 10 : 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 100 : 140}
              />
              <Tooltip content={<CustomTooltip formatter={v => formatPrice(v)} />} />
              <Bar dataKey="avgPrice" name="Avg price" radius={[0, 3, 3, 0]}>
                {regionsSorted.map(entry => (
                  <Cell
                    key={entry.region}
                    fill={entry.region === "London" ? P.red : entry.region === "England" ? P.teal : P.navy}
                    opacity={entry.region === "London" ? 1 : entry.region === "England" ? 1 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <Legend items={[
          { key: "london", label: "London", color: P.red },
          { key: "england", label: "England average", color: P.teal },
          { key: "other", label: "Other regions", color: P.navy },
        ]} />
      </div>

      <AnalysisBox color={P.navy} label="Context">
        London's population density ({snap.londonDensity?.toLocaleString()}/km²) is high by UK standards
        but moderate internationally, where Paris achieves 20,700/km². The England average
        is {snap.nationalDensity}/km².
        {" "}London averages {formatPrice(snap.londonAvgPrice)} vs{" "}
        {formatPrice(snap.cheapestRegionPrice)} in the {snap.cheapestRegion}, a ratio of approximately 3:1.
      </AnalysisBox>
    </div>
  );
}


function Legend({ items }) {
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
      {items.map(item => (
        <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 14, height: 8, background: item.color, display: "inline-block", borderRadius: 1 }} />
          <span style={{ fontSize: "11px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
