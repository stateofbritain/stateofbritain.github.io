import { useMemo } from "react";
import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, yAxisLabel, GRID_PROPS,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import ChartCard from "../../components/ChartCard";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";

const RELIGION_COLORS = {
  christian: P.navy,
  noReligion: P.grey,
  muslim: P.teal,
  hindu: P.sienna,
  sikh: "#7B4B8A",
  jewish: P.yellow,
  buddhist: "#5B8C5A",
  other: "#A0866C",
};

export default function Culture() {
  const { data, loading, error, raw } = useJsonDataset("culture.json");

  // Reshape for grouped bar chart: one bar group per religion, bars for each year
  const groupedData = useMemo(() => {
    if (!data?.religionPct) return [];
    const religions = ["christian", "noReligion", "muslim", "hindu", "sikh", "jewish", "buddhist", "other"];
    const labels = {
      christian: "Christian",
      noReligion: "No religion",
      muslim: "Muslim",
      hindu: "Hindu",
      sikh: "Sikh",
      jewish: "Jewish",
      buddhist: "Buddhist",
      other: "Other",
    };
    return religions.map(r => {
      const row = { religion: labels[r] };
      for (const d of data.religionPct) {
        row[`y${d.year}`] = d[r];
      }
      return row;
    });
  }, [data]);

  // Reshape for trend line chart: year on x-axis, major groups as lines
  const trendData = useMemo(() => {
    if (!data?.religionPct) return [];
    return data.religionPct.map(d => ({
      year: d.year,
      christian: d.christian,
      noReligion: d.noReligion,
      muslim: d.muslim,
      otherFaiths: +(d.hindu + d.sikh + d.jewish + d.buddhist + d.other).toFixed(1),
    }));
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Culture & Religion</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Culture & Religion</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Culture & Religion</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Census religious affiliation, England & Wales
        </span>
      </div>

      <p style={{ ...SECTION_NOTE, marginBottom: 20, background: "#FFF8E8", padding: "10px 14px", borderRadius: 3, borderLeft: `3px solid ${P.yellow}` }}>
        The most recent Census was conducted in March 2021. Significant population change,
        particularly through immigration, has occurred since. These figures are therefore
        considerably out of date and should be treated with caution.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Christian"
          value={`${s.christianPct}%`}
          change="Census 2021"
          up={false}
          color={P.navy}
          delay={0.1}
        />
        <MetricCard
          label="No Religion"
          value={`${s.noReligionPct}%`}
          change="Census 2021"
          up={true}
          color={P.grey}
          delay={0.18}
        />
        <MetricCard
          label="Muslim"
          value={`${s.muslimPct}%`}
          change="Census 2021"
          up={true}
          color={P.teal}
          delay={0.26}
        />
      </div>

      {/* ── Section 1: Religious Affiliation by Census Year ────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Religious Affiliation by Census Year</h3>
        <p style={SECTION_NOTE}>
          The Census religion question is voluntary. Between 2001 and 2021, the share identifying
          as Christian fell from 71.7% to 46.2%, while those reporting no religion rose from 14.8%
          to 37.2%. The Muslim population grew from 3.0% to 6.5%. Other faiths remained
          relatively stable in percentage terms.
        </p>

        {groupedData.length > 0 && (
          <ChartCard
            title="Religious Affiliation"
            subtitle="% of population, Census years, England & Wales"
            source={sourceFrom(raw, "religionPct")}
            legend={[
              { key: "y2001", label: "2001", color: P.grey },
              { key: "y2011", label: "2011", color: P.navy },
              { key: "y2021", label: "2021", color: P.teal },
            ]}
            height={380}
          >
            <BarChart data={groupedData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} layout="horizontal">
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="religion" tick={{ ...AXIS_TICK_MONO, fontSize: 10 }} axisLine={{ stroke: P.border }} tickLine={false} interval={0} angle={-35} textAnchor="end" height={60} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} label={yAxisLabel("%")} domain={[0, 80]} />
              <Tooltip content={<CustomTooltip formatter={v => `${v}%`} />} />
              <Bar dataKey="y2001" name="2001" fill={P.grey} fillOpacity={0.5} radius={[2, 2, 0, 0]} />
              <Bar dataKey="y2011" name="2011" fill={P.navy} fillOpacity={0.7} radius={[2, 2, 0, 0]} />
              <Bar dataKey="y2021" name="2021" fill={P.teal} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartCard>
        )}
      </section>

      {/* ── Section 2: Major Group Trends ─────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Major Group Trends</h3>
        <p style={SECTION_NOTE}>
          The most notable shift across the three censuses is the convergence between Christianity
          and no religion. In 2001, Christians outnumbered those with no religion by nearly 5 to 1.
          By 2021, the gap had narrowed to less than 10 percentage points. Other faiths (Hindu,
          Sikh, Jewish, Buddhist combined) have remained between 2.5% and 4.2% of the population.
        </p>

        {trendData.length > 0 && (
          <ChartCard
            title="Religious Affiliation Trends"
            subtitle="% of population, Census years, England & Wales"
            source={sourceFrom(raw, "religionPct")}
            legend={[
              { key: "christian", label: "Christian", color: RELIGION_COLORS.christian },
              { key: "noReligion", label: "No religion", color: RELIGION_COLORS.noReligion },
              { key: "muslim", label: "Muslim", color: RELIGION_COLORS.muslim },
              { key: "otherFaiths", label: "Other faiths", color: P.sienna },
            ]}
            height={340}
          >
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" type="number" domain={[2001, 2021]} tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} ticks={[2001, 2011, 2021]} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} label={yAxisLabel("%")} domain={[0, 80]} />
              <Tooltip content={<CustomTooltip formatter={v => `${v}%`} />} />
              <Line type="monotone" dataKey="christian" name="Christian" stroke={RELIGION_COLORS.christian} strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="noReligion" name="No religion" stroke={RELIGION_COLORS.noReligion} strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="muslim" name="Muslim" stroke={RELIGION_COLORS.muslim} strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="otherFaiths" name="Other faiths" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ChartCard>
        )}
      </section>
    </div>
  );
}
