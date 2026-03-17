import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, ComposedChart, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
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

export default function HousingSupply() {
  const isMobile = useIsMobile();
  const { data, loading, error } = useJsonDataset("housing-supply.json");

  // Hooks must run before any early returns
  const completionsK = useMemo(() => {
    if (!data?.completionsByTenure) return [];
    return data.completionsByTenure.map(d => ({
      ...d,
      privateK: Math.round(d.private / 1000),
      haK: Math.round(d.housingAssociation / 1000),
      laK: Math.round(d.localAuthority / 1000),
      totalK: Math.round(d.total / 1000),
    }));
  }, [data]);

  const sizeIntlSorted = useMemo(() => {
    if (!data?.sizeIntl) return [];
    return [...data.sizeIntl].sort((a, b) => b.avgSqm - a.avgSqm);
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Housebuilding</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading housebuilding data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Housebuilding</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const snap = data.snapshot || {};

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Housebuilding</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          England &middot; {snap.netAdditionsYear}
        </span>
      </div>

      {/* ═══ SECTION 1 — NET ADDITIONS ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Net Additional Dwellings</h3>
        <p style={SECTION_NOTE}>
          Net additions measure the total increase in housing stock each year, including new builds,
          conversions, and change of use minus demolitions. The government's target is 300,000 net
          additions per year, a level England has not yet reached. The peak was{" "}
          {snap.netAdditionsPeak?.toLocaleString()} in {snap.netAdditionsPeakYear}.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="Net Additions"
            value={snap.netAdditions?.toLocaleString()}
            change={snap.netAdditionsYear}
            up={false}
            color={P.teal}
            delay={0.1}
          />
          <MetricCard
            label="Peak"
            value={snap.netAdditionsPeak?.toLocaleString()}
            change={snap.netAdditionsPeakYear}
            up={false}
            color={P.navy}
            delay={0.18}
          />
          <MetricCard
            label="Completions"
            value={snap.completionTotal?.toLocaleString()}
            change={snap.completionTotalYear}
            up={false}
            color={P.sienna}
            delay={0.26}
          />
          <MetricCard
            label="Avg New Build"
            value={`${snap.avgNewBuildSqm} sqm`}
            change={snap.avgNewBuildSqmYear?.toString()}
            up={false}
            color={P.yellow}
            delay={0.34}
          />
        </div>

        <ChartCard title="Net Additional Dwellings" subtitle="England, 2001-02 to 2024-25" source={<>SOURCE: <a href="https://www.gov.uk/government/statistical-data-sets/live-tables-on-net-supply-of-housing" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>DLUHC Live Table 120</a></>}>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={data.netAdditions} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 4 : 2} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} label={yAxisLabel("Net dwellings")} />
              <Tooltip content={<CustomTooltip formatter={v => v?.toLocaleString()} />} />
              <ReferenceLine y={300000} stroke={P.red} strokeDasharray="6 3" strokeWidth={1.5} label={{ value: "300k target", position: "right", fill: P.red, fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
              <Bar dataKey="dwellings" name="Net additions" fill={P.teal} opacity={0.7} radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <Legend items={[
          { key: "net", label: "Net additional dwellings", color: P.teal },
          { key: "target", label: "300k target", color: P.red },
        ]} />
      </div>

      {/* ═══ SECTION 2 — COMPLETIONS BY TENURE ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Completions by Tenure</h3>
        <p style={SECTION_NOTE}>
          The private sector accounts for over 80% of completions. Local authority housebuilding
          has fallen from hundreds of thousands per year in the post-war era to around 3,000 today.
          Housing association output peaked around 2007-08 and has remained broadly flat since.
        </p>

        <ChartCard title="New Build Completions by Tenure" subtitle="England, thousands, 2001-02 to 2024-25" source={<>SOURCE: <a href="https://www.gov.uk/government/statistical-data-sets/live-tables-on-house-building" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>DLUHC Live Table 213</a></>}>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={completionsK} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 4 : 2} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Completions (thousands)")} />
              <Tooltip content={<CustomTooltip formatter={v => `${v}k`} />} />
              <Bar dataKey="privateK" name="Private" stackId="tenure" fill={P.navy} opacity={0.8} />
              <Bar dataKey="haK" name="Housing Association" stackId="tenure" fill={P.teal} opacity={0.8} />
              <Bar dataKey="laK" name="Local Authority" stackId="tenure" fill={P.sienna} opacity={0.8} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <Legend items={[
          { key: "private", label: "Private", color: P.navy },
          { key: "ha", label: "Housing Association", color: P.teal },
          { key: "la", label: "Local Authority", color: P.sienna },
        ]} />
      </div>

      {/* ═══ SECTION 3 — NEW BUILD SIZES ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>New Build Sizes</h3>
        <p style={SECTION_NOTE}>
          The average floor area of new build homes has declined over the past two decades to
          around 76 sqm, among the smallest in the developed world. For comparison, the Australian
          average is around 229 sqm and the US average is 201 sqm.
        </p>

        <ChartCard title="Average New Build Floor Area" subtitle="UK, sqm, 2003–2023" source={<>SOURCE: <a href="https://www.nhbc.co.uk/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>NHBC / LABC</a> &middot; Industry data, not official statistics</>}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data.newBuildSize} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
              <YAxis yAxisId="sqm" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[60, 90]} label={yAxisLabel("sqm")} />
              <YAxis yAxisId="sqft" orientation="right" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[60 * 10.764, 90 * 10.764]} tickFormatter={v => Math.round(v)} label={yAxisLabel("sqft", { angle: 90, position: "insideRight" })} />
              <Tooltip content={<CustomTooltip formatter={v => `${v} sqm (${Math.round(v * 10.764)} sqft)`} />} />
              <Line yAxisId="sqm" type="monotone" dataKey="avgSqm" name="Avg floor area" stroke={P.yellow} strokeWidth={2.5} dot={{ r: 3, fill: P.yellow }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <div style={{ marginTop: 24 }}>
          <ChartCard title="International New Build Size" subtitle="Average floor area (sqm), latest available" source={<>SOURCE: <a href="https://www.commsec.com.au/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>CommSec Home Size Reports</a> &middot; Various national statistics agencies</>}>
            <ResponsiveContainer width="100%" height={Math.max(300, sizeIntlSorted.length * 36)}>
              <BarChart data={sizeIntlSorted} layout="vertical" margin={{ top: 5, right: 30, left: isMobile ? 10 : 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="country"
                  tick={{ fontSize: isMobile ? 10 : 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={isMobile ? 80 : 120}
                />
                <Tooltip content={<CustomTooltip formatter={v => `${v} sqm`} />} />
                <Bar dataKey="avgSqm" name="Avg floor area" radius={[0, 3, 3, 0]}>
                  {sizeIntlSorted.map(entry => (
                    <Cell
                      key={entry.country}
                      fill={entry.country === "United Kingdom" ? P.red : P.navy}
                      opacity={entry.country === "United Kingdom" ? 1 : 0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <AnalysisBox color={P.teal} label="Context">
        England added {snap.netAdditions?.toLocaleString()} net dwellings in {snap.netAdditionsYear},
        below the 300,000/yr target. The peak was {snap.netAdditionsPeak?.toLocaleString()} in{" "}
        {snap.netAdditionsPeakYear}. New build completions totalled {snap.completionTotal?.toLocaleString()} in{" "}
        {snap.completionTotalYear}, with the private sector accounting for over 80%.
        Average new build floor area is {snap.avgNewBuildSqm} sqm, among the smallest in the
        developed world.
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
