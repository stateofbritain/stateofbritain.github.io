import { useMemo } from "react";
import {
  BarChart, Bar, AreaChart, Area, Cell,
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

export default function HousingStock() {
  const isMobile = useIsMobile();
  const { data, loading, error } = useJsonDataset("housing-stock.json");

  // Hooks must run before any early returns
  const stockTypeSorted = useMemo(() => {
    if (!data?.stockByType) return [];
    return [...data.stockByType].sort((a, b) => b.pct - a.pct);
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Housing Stock</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading housing stock data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Housing Stock</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const snap = data.snapshot || {};

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Housing Stock</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          England &middot; English Housing Survey
        </span>
      </div>

      {/* ═══ METRICS ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Total Stock"
          value={`${snap.totalStock}${snap.totalStockUnit}`}
          change="dwellings in England"
          up={false}
          color={P.teal}
          delay={0.1}
        />
        <MetricCard
          label="Pre-1919"
          value={`${snap.pre1919Pct}%`}
          change="of all dwellings"
          up={false}
          color={P.sienna}
          delay={0.18}
        />
        <MetricCard
          label="Private Rented"
          value={`${snap.privateRentedPct}%`}
          change={snap.privateRentedPctYear}
          up={false}
          color={P.navy}
          delay={0.26}
        />
        <MetricCard
          label="Social Rented"
          value={`${snap.socialRentedPct}%`}
          change={snap.privateRentedPctYear}
          up={false}
          color={P.red}
          delay={0.34}
        />
      </div>

      {/* ═══ SECTION 1 — STOCK BY AGE ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Stock by Period Built</h3>
        <p style={SECTION_NOTE}>
          England has one of the oldest housing stocks in Europe. One in five homes was built before 1919,
          including much of the Georgian and Victorian architecture that defines British cities and towns.
          The age profile of the stock also presents a retrofit challenge, as older homes are typically
          harder and more expensive to insulate to modern energy standards.
        </p>

        <ChartCard title="Housing Stock by Period Built" subtitle="England, % of stock" source={<>SOURCE: <a href="https://www.gov.uk/government/collections/english-housing-survey" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>English Housing Survey (DLUHC)</a></>}>
          <ResponsiveContainer width="100%" height={Math.max(260, data.stockByAge?.length * 42)}>
            <BarChart data={data.stockByAge} layout="vertical" margin={{ top: 5, right: 30, left: isMobile ? 10 : 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <YAxis
                type="category"
                dataKey="period"
                tick={{ fontSize: isMobile ? 10 : 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 75 : 90}
              />
              <Tooltip content={<CustomTooltip formatter={v => `${v}%`} />} />
              <Bar dataKey="pct" name="% of stock" radius={[0, 3, 3, 0]}>
                {data.stockByAge.map((entry, i) => (
                  <Cell key={entry.period} fill={i === 0 ? P.sienna : P.navy} opacity={i === 0 ? 1 : 0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ═══ SECTION 2 — DWELLING TYPES ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Dwelling Types</h3>
        <p style={SECTION_NOTE}>
          Semi-detached and terraced houses together account for half of all English homes.
          Purpose-built flats make up about 17% of stock, a proportion that is growing as
          new developments increasingly favour higher-density schemes.
        </p>

        <ChartCard title="Dwelling Type Breakdown" subtitle="England, % of stock" source={<>SOURCE: <a href="https://www.gov.uk/government/collections/english-housing-survey" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>English Housing Survey (DLUHC)</a></>}>
          <ResponsiveContainer width="100%" height={Math.max(260, stockTypeSorted.length * 40)}>
            <BarChart data={stockTypeSorted} layout="vertical" margin={{ top: 5, right: 30, left: isMobile ? 10 : 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <YAxis
                type="category"
                dataKey="type"
                tick={{ fontSize: isMobile ? 10 : 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 100 : 130}
              />
              <Tooltip content={<CustomTooltip formatter={v => `${v}%`} />} />
              <Bar dataKey="pct" name="% of stock" fill={P.teal} opacity={0.7} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ═══ SECTION 3 — TENURE TREND ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Tenure Over Time</h3>
        <p style={SECTION_NOTE}>
          Private renting has risen from around 10% in 1990 to nearly 19% today, while social renting
          has fallen from 32% in 1980 to under 17%. Owner-occupation peaked at about 71% in the
          early 2000s and has since settled at around 65%.
        </p>

        <ChartCard title="Tenure Split" subtitle="England, % of households, 1980–2023-24" source={<>SOURCE: <a href="https://www.gov.uk/government/statistical-data-sets/live-tables-on-dwelling-stock-including-vacants" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>DLUHC Tenure Trends (Table FA1201)</a> &middot; <a href="https://www.gov.uk/government/collections/english-housing-survey" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>EHS</a></>}>
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={data.tenureTrend} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 5 : 3} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 100]} label={yAxisLabel("% of households")} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip formatter={v => `${v}%`} />} />
              <Area type="monotone" dataKey="ownerOccupied" name="Owner-occupied" stackId="tenure" fill={P.navy} stroke={P.navy} fillOpacity={0.6} />
              <Area type="monotone" dataKey="privateRented" name="Private rented" stackId="tenure" fill={P.sienna} stroke={P.sienna} fillOpacity={0.6} />
              <Area type="monotone" dataKey="socialRented" name="Social rented" stackId="tenure" fill={P.teal} stroke={P.teal} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <Legend items={[
          { key: "oo", label: "Owner-occupied", color: P.navy },
          { key: "pr", label: "Private rented", color: P.sienna },
          { key: "sr", label: "Social rented", color: P.teal },
        ]} />
      </div>

      {/* ═══ SECTION 4 — EPC BY AGE ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Energy Performance by Age</h3>
        <p style={SECTION_NOTE}>
          Dwelling age is the strongest predictor of energy performance. Only 2% of pre-1919
          homes achieve an EPC rating of A or B, compared with 55% of homes built after 2002. Nearly half
          of pre-1919 homes are rated E or below.
        </p>

        <ChartCard title="EPC Rating by Dwelling Age" subtitle="England, % of dwellings" source={<>SOURCE: <a href="https://www.gov.uk/government/collections/english-housing-survey" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>English Housing Survey (DLUHC)</a></>}>
          <ResponsiveContainer width="100%" height={Math.max(280, data.epcByAge?.length * 48)}>
            <BarChart data={data.epcByAge} layout="vertical" margin={{ top: 5, right: 30, left: isMobile ? 10 : 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <YAxis
                type="category"
                dataKey="period"
                tick={{ fontSize: isMobile ? 10 : 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 75 : 90}
              />
              <Tooltip content={<CustomTooltip formatter={v => `${v}%`} />} />
              <Bar dataKey="a_b" name="A–B" stackId="epc" fill={P.teal} />
              <Bar dataKey="c" name="C" stackId="epc" fill={P.navy} />
              <Bar dataKey="d" name="D" stackId="epc" fill={P.yellow} />
              <Bar dataKey="e_below" name="E or below" stackId="epc" fill={P.red} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <Legend items={[
          { key: "ab", label: "A–B", color: P.teal },
          { key: "c", label: "C", color: P.navy },
          { key: "d", label: "D", color: P.yellow },
          { key: "e", label: "E or below", color: P.red },
        ]} />
      </div>

      <AnalysisBox color={P.sienna} label="Context">
        England's housing stock totals ~{snap.totalStock}{snap.totalStockUnit} dwellings,
        with {snap.pre1919Pct}% built before 1919. Owner-occupation stands at {snap.ownerOccupiedPct}%,
        private renting at {snap.privateRentedPct}%, and social renting at {snap.socialRentedPct}%.
        {" "}Private renting has grown from ~10% in 1990, while social rented stock has declined
        steadily over the same period.
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
