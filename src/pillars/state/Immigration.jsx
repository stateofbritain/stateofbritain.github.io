import { useState, useEffect } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, Cell, PieChart, Pie,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, CHART_CARD, CHART_TITLE, CHART_SUBTITLE,
  SOURCE_TEXT, AXIS_TICK, yAxisLabel, GRID_PROPS,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ShareableChart from "../../components/ShareableChart";

const VISA_COLORS = [P.teal, P.navy, P.sienna, P.red, P.grey];
const AGE_COLORS = [P.teal, P.navy, P.sienna, "#4A7A58", P.grey, P.red];

export default function Immigration() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/data/immigration.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Immigration</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading immigration data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Immigration</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Immigration
      </h2>
      <p style={{ fontSize: "14px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        Migration flows, visa types, asylum, population growth, and demographic change across the UK.
      </p>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
        <MetricCard label="Net migration" value={`${s.netMigration}k`} change={`${s.netMigrationYear} (peak ${s.netMigrationPeak}k in ${s.netMigrationPeakYear})`} color={P.navy} />
        <MetricCard label="UK population" value={`${s.population}m`} change={String(s.populationYear)} />
        <MetricCard label="Foreign-born" value={`${s.foreignBornPct}%`} change={String(s.foreignBornYear)} />
        <MetricCard label="Natural change" value={`${s.naturalChange > 0 ? "+" : ""}${s.naturalChange}k`} change={`Deaths exceed births (${s.naturalChangeYear})`} up color={P.red} />
      </div>

      {/* Section 1: Net migration */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Net Migration</h3>
        <p style={SECTION_NOTE}>
          UK net migration was near zero in the early 1990s, rose through EU enlargement in 2004,
          and spiked to a record 710k in 2022 as post-COVID visa liberalisation — especially for
          health & care workers and students — coincided with Ukraine and Hong Kong schemes.
          It has since fallen to 348k following visa tightening.
        </p>
        <ShareableChart title="UK Net Migration">
          <div style={CHART_CARD}>
            <div style={{ marginBottom: 10 }}>
              <div style={CHART_TITLE}>UK Net Migration</div>
              <div style={CHART_SUBTITLE}>Net long-term international migration, thousands</div>
            </div>
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={data.netMigration.map((d) => ({ ...d, emigrationNeg: -d.emigration }))}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} domain={[-700, 1300]} tickFormatter={(v) => `${v}k`} label={yAxisLabel("thousands")} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toLocaleString()}k`} />} />
                <ReferenceLine y={0} stroke={P.text} strokeWidth={1} />
                <Line type="monotone" dataKey="immigration" stroke={P.teal} strokeWidth={2} dot={{ r: 2, fill: P.teal }} name="Immigration" />
                <Line type="monotone" dataKey="emigrationNeg" stroke={P.red} strokeWidth={2} dot={{ r: 2, fill: P.red }} name="Emigration" />
                <Line type="monotone" dataKey="net" stroke={P.navy} strokeWidth={2.5} dot={{ r: 2, fill: P.navy }} name="Net migration" />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
              </LineChart>
            </ResponsiveContainer>
            <div style={SOURCE_TEXT}>
              SOURCE: ONS Long-term International Migration, year ending
            </div>
          </div>
        </ShareableChart>
      </section>

      {/* Section 2: Visa breakdown */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Migration by Visa Type</h3>
        <p style={SECTION_NOTE}>
          Non-EU/EEA migration by reason, year ending June 2024.
          Study visas are the largest category (418k), followed by work (277k).
          The 2024 restrictions on dependants and the care worker route are expected
          to reduce these numbers significantly.
        </p>
        <ShareableChart title="Migration by Visa Type">
          <div style={CHART_CARD}>
            <div style={{ marginBottom: 10 }}>
              <div style={CHART_TITLE}>Migration by Visa Type</div>
              <div style={CHART_SUBTITLE}>Long-term immigration by visa category</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={data.visaBreakdown}
                    dataKey="value"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke={P.bgCard}
                    strokeWidth={2}
                  >
                    {data.visaBreakdown.map((_, i) => (
                      <Cell key={i} fill={VISA_COLORS[i % VISA_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip formatter={(v) => `${v}k`} />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.visaBreakdown.map((d, i) => (
                  <div key={d.type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: VISA_COLORS[i % VISA_COLORS.length] }} />
                    <span style={{ fontSize: "13px", fontFamily: "'DM Mono', monospace", color: P.textMuted }}>
                      {d.type}: {d.value}k
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...SOURCE_TEXT, marginTop: 12 }}>
              SOURCE: Home Office Immigration Statistics, year ending June 2024
            </div>
          </div>
        </ShareableChart>
      </section>

      {/* Section 3: Asylum */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Asylum Applications</h3>
        <p style={SECTION_NOTE}>
          Asylum applications peaked at 75k in 2022, driven by small boat Channel crossings.
          The grant rate has historically been low, creating a large backlog of people awaiting decisions.
        </p>
        <ShareableChart title="Asylum Applications">
          <div style={CHART_CARD}>
            <div style={{ marginBottom: 10 }}>
              <div style={CHART_TITLE}>Asylum Applications</div>
              <div style={CHART_SUBTITLE}>Asylum applications received, UK</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.asylum}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} domain={[0, 80]} tickFormatter={(v) => `${v}k`} label={yAxisLabel("thousands")} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}k`} />} />
                <Bar dataKey="applications" name="Applications" fill={P.navy} fillOpacity={0.6} radius={[3, 3, 0, 0]} />
                <Bar dataKey="grants" name="Grants" fill={P.teal} fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
              </BarChart>
            </ResponsiveContainer>
            <div style={SOURCE_TEXT}>
              SOURCE: Home Office Immigration Statistics
            </div>
          </div>
        </ShareableChart>
      </section>

      {/* Section 4: Population growth components */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Drivers of Population Growth</h3>
        <p style={SECTION_NOTE}>
          Since 2020, deaths have exceeded births — the UK's natural population change turned
          negative for the first time since WWII. All population growth is now driven by
          net migration.
        </p>
        <ShareableChart title="Drivers of Population Growth">
          <div style={CHART_CARD}>
            <div style={{ marginBottom: 10 }}>
              <div style={CHART_TITLE}>Drivers of Population Growth</div>
              <div style={CHART_SUBTITLE}>Natural change vs net migration</div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.popComponents}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} domain={[-100, 750]} tickFormatter={(v) => `${v}k`} label={yAxisLabel("thousands")} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toLocaleString()}k`} />} />
                <ReferenceLine y={0} stroke={P.text} strokeWidth={1} />
                <Bar dataKey="naturalChange" name="Natural change (births - deaths)" fill={P.teal} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                <Bar dataKey="netMigration" name="Net migration" fill={P.navy} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
              </BarChart>
            </ResponsiveContainer>
            <div style={SOURCE_TEXT}>
              SOURCE: ONS Components of Population Change, UK
            </div>
          </div>
        </ShareableChart>
      </section>

      {/* Section 5: Population */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>UK Population</h3>
        <p style={SECTION_NOTE}>
          The UK population has grown from 55.9m in 1971 to {s.population}m, an increase of 22%.
          Growth was slow (0.1% p.a.) until the late 1990s, then accelerated with rising net migration.
        </p>
        <ShareableChart title="UK Population">
          <div style={CHART_CARD}>
            <div style={{ marginBottom: 10 }}>
              <div style={CHART_TITLE}>UK Population</div>
              <div style={CHART_SUBTITLE}>Total UK population estimate (millions)</div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.populationSeries}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} domain={[54, 70]} tickFormatter={(v) => `${v}m`} label={yAxisLabel("millions")} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v}m`} />} />
                <Area type="monotone" dataKey="population" stroke={P.navy} fill={P.navy} fillOpacity={0.1} strokeWidth={2.5} name="Population (millions)" dot={{ r: 2.5, fill: P.navy }} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={SOURCE_TEXT}>
              SOURCE: ONS Population Estimates, UK
            </div>
          </div>
        </ShareableChart>
      </section>

      {/* Section 6: Age structure */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Age Structure</h3>
        <p style={SECTION_NOTE}>
          The UK's age profile, mid-2023. Over 25% of the population is 60+, and the
          dependency ratio (dependants per 100 working-age) has risen from 52 in 2001
          to {s.dependencyRatio} — driven almost entirely by population ageing.
        </p>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <ShareableChart title="UK Age Structure">
            <div style={{ ...CHART_CARD, flex: "1 1 300px" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>UK Age Structure</div>
                <div style={CHART_SUBTITLE}>Population by age group over time</div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.ageStructure}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="group" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} domain={[0, 25]} tickFormatter={(v) => `${v}%`} label={yAxisLabel("%")} />
                  <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
                  <Bar dataKey="pct" name="% of population" radius={[3, 3, 0, 0]}>
                    {data.ageStructure.map((_, i) => (
                      <Cell key={i} fill={AGE_COLORS[i]} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE: ONS Population Estimates by Age, mid-2023
              </div>
            </div>
          </ShareableChart>
          <ShareableChart title="Dependency Ratio">
            <div style={{ ...CHART_CARD, flex: "1 1 300px" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Dependency Ratio</div>
                <div style={CHART_SUBTITLE}>Dependants per 1,000 working-age population</div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.dependencyRatio}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="year" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} domain={[0, 60]} label={yAxisLabel("ratio")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="old" stackId="1" stroke={P.sienna} fill={P.sienna} fillOpacity={0.5} name="Old-age (65+)" />
                  <Area type="monotone" dataKey="young" stackId="1" stroke={P.teal} fill={P.teal} fillOpacity={0.5} name="Youth (0-15)" />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE: ONS Dependency Ratio, per 100 working age
              </div>
            </div>
          </ShareableChart>
        </div>
      </section>

      {/* Section 7: Foreign-born share */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Foreign-Born Population</h3>
        <p style={SECTION_NOTE}>
          The share of UK residents born abroad has risen from 9.3% in 2004 to {s.foreignBornPct}%,
          reflecting two decades of sustained high net migration.
        </p>
        <ShareableChart title="Foreign-Born Population">
          <div style={CHART_CARD}>
            <div style={{ marginBottom: 10 }}>
              <div style={CHART_TITLE}>Foreign-Born Population</div>
              <div style={CHART_SUBTITLE}>% of population born abroad, UK</div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.foreignBorn}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} domain={[8, 18]} tickFormatter={(v) => `${v}%`} label={yAxisLabel("%")} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
                <Area type="monotone" dataKey="pct" stroke={P.sienna} fill={P.sienna} fillOpacity={0.12} strokeWidth={2.5} name="Foreign-born %" dot={{ r: 2.5, fill: P.sienna }} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={SOURCE_TEXT}>
              SOURCE: ONS Annual Population Survey / Labour Force Survey
            </div>
          </div>
        </ShareableChart>
      </section>

      {/* Analysis */}
      <AnalysisBox>
        Net migration reached a record {s.netMigrationPeak}k in {s.netMigrationPeakYear}, driven by
        post-COVID visa liberalisation across health, care, and student routes. Subsequent
        restrictions have brought it down to {s.netMigration}k in {s.netMigrationYear}, but this
        is still historically unprecedented. Migration has become the sole engine of population
        growth: natural change turned negative in 2020 and has stayed there, with deaths now
        exceeding births by {Math.abs(s.naturalChange)}k per year. The UK population of {s.population}m
        is 22% larger than in 1971, with {s.foreignBornPct}% born abroad. The dependency ratio
        has risen to {s.dependencyRatio} per 100 working-age, driven by ageing — old-age dependency
        now exceeds youth dependency for the first time. Without migration, the UK's working-age
        population would be shrinking.
      </AnalysisBox>

      {/* Sources */}
      <div style={{ marginTop: 24, fontSize: "12px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
        <strong>Sources:</strong>{" "}
        {data.meta.sources.map((src, i) => (
          <span key={i}>
            {i > 0 && " · "}
            <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>{src.name}</a>
          </span>
        ))}
      </div>
    </div>
  );
}
