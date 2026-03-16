import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Legend, Cell } from "recharts";
import P from "../../theme/palette";
import { SECTION_HEADING, SECTION_NOTE, AXIS_TICK, yAxisLabel, GRID_PROPS } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ChartCard from "../../components/ChartCard";
import { useJsonDataset } from "../../hooks/useDataset";

const DEGREE_COLORS = {
  first: P.teal,
  twoOne: P.navy,
  twoTwo: P.sienna,
  third: P.grey };

export default function Education() {
  const { data, loading, error, raw } = useJsonDataset("education.json");

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Education</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading education data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Education</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Education
      </h2>
      <p style={{ fontSize: "14px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        School funding, attainment, international benchmarks, and higher education across England and the UK.
      </p>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
        <MetricCard label="Per-pupil spending" value={`£${s.perPupilLatest.toLocaleString()}`} sub={`${s.perPupilChange}% below ${s.perPupilPeakYear} peak (real terms)`} color={P.red} />
        <MetricCard label="GCSE 5+ English & Maths" value={`${s.gcseRate}%`} sub={`England, ${s.gcseYear}`} />
        <MetricCard label="PISA maths score" value={s.pisaMaths} sub={`UK, ${s.pisaYear} (OECD avg ${Math.round((s.pisaMaths / 489) * 472)})`} />
        <MetricCard label="HE participation" value={`${s.heParticipation}%`} sub={`England, ${s.heParticipationYear}`} />
      </div>

      {/* Section 1: Per-pupil spending */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Per-Pupil Spending (Real Terms)</h3>
        <p style={SECTION_NOTE}>
          Spending per pupil in England's state schools, adjusted for inflation to 2023-24 prices.
          After rising steadily through the 2000s, real-terms funding fell 9% between 2009-10
          and 2018-19 — the longest squeeze since the 1970s. Recovery has only partially restored levels.
        </p>
        <ChartCard
          title="Per-Pupil Spending"
          subtitle="England state schools, real terms (2023-24 prices)"
          source="SOURCE: IFS Annual Report on Education Spending in England 2024"
          height={320}
        >
            <AreaChart data={data.perPupilSpending}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK} interval={2} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={AXIS_TICK} domain={[5000, 7200]} tickFormatter={(v) => `£${(v / 1000).toFixed(1)}k`} label={yAxisLabel("£ per pupil (real terms)")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `£${v?.toLocaleString()}`} />} />
              <ReferenceLine y={s.perPupilPeak} stroke={P.red} strokeDasharray="4 4" label={{ value: `Peak £${s.perPupilPeak.toLocaleString()}`, fontSize: 10, fill: P.red, position: "right" }} />
              <Area type="monotone" dataKey="value" stroke={P.teal} fill={P.teal} fillOpacity={0.12} strokeWidth={2.5} name="Per-pupil spending" dot={{ r: 2, fill: P.teal }} />
            </AreaChart>
        </ChartCard>
      </section>

      {/* Section 2: GCSE results */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>GCSE Results: English & Maths</h3>
        <p style={SECTION_NOTE}>
          Share of pupils in England achieving a strong pass (grade 5+) in both English and Maths.
          The 2017 switch to the new 9-1 grading scale makes direct pre/post comparison difficult.
          COVID-era teacher assessments (2020-21) inflated results, which have since normalised.
        </p>
        <ChartCard
          title="GCSE Results: English &amp; Maths"
          subtitle="% achieving grade 5+ in both, England"
          source="SOURCE: DfE KS4 Performance Tables, England"
          height={300}
        >
            <LineChart data={data.gcseResults}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} domain={[30, 65]} tickFormatter={(v) => `${v}%`} label={yAxisLabel("Achieving grade 5+ (%)")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}%`} />} />
              <ReferenceLine x={2017} stroke={P.grey} strokeDasharray="4 4" label={{ value: "New grading", fontSize: 10, fill: P.grey, position: "top" }} />
              <Line type="monotone" dataKey="rate" stroke={P.navy} strokeWidth={2.5} dot={{ r: 2.5, fill: P.navy }} name="% achieving 5+ in E&M" connectNulls />
            </LineChart>
        </ChartCard>
      </section>

      {/* Section 3: PISA scores */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>PISA International Benchmarks</h3>
        <p style={SECTION_NOTE}>
          The UK's PISA scores in maths, reading, and science compared with the OECD average.
          While the OECD average has declined — particularly in maths — the UK has held
          broadly steady, widening the gap above average.
        </p>
        <ChartCard
          title="PISA International Benchmarks"
          subtitle="UK scores vs OECD average"
          source={<>SOURCE: OECD PISA 2022 Results &middot; Solid = UK, dashed = OECD average</>}
          height={340}
        >
            <LineChart data={data.pisaScores}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} domain={[460, 520]} label={yAxisLabel("PISA score")} />
              <Tooltip content={<CustomTooltip formatter={(v) => v?.toString()} />} />
              <Line type="monotone" dataKey="ukMaths" stroke={P.teal} strokeWidth={2.5} dot={{ r: 3, fill: P.teal }} name="UK Maths" />
              <Line type="monotone" dataKey="ukReading" stroke={P.navy} strokeWidth={2.5} dot={{ r: 3, fill: P.navy }} name="UK Reading" />
              <Line type="monotone" dataKey="ukScience" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 3, fill: P.sienna }} name="UK Science" />
              <Line type="monotone" dataKey="oecdMaths" stroke={P.teal} strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="OECD Maths" />
              <Line type="monotone" dataKey="oecdReading" stroke={P.navy} strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="OECD Reading" />
              <Line type="monotone" dataKey="oecdScience" stroke={P.sienna} strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="OECD Science" />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
            </LineChart>
        </ChartCard>
      </section>

      {/* Section 4: HE participation */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Higher Education Participation</h3>
        <p style={SECTION_NOTE}>
          The share of young people in England entering higher education by age 30 (HEIPR).
          Participation rose from 38% in 2006-07 to 55% in 2020-21, dipping to 52%
          post-COVID as the labour market tightened and cost-of-living rose.
        </p>
        <ChartCard
          title="Higher Education Participation"
          subtitle="% entering HE by age 30, England (HEIPR)"
          source="SOURCE: DfE Participation Rates in Higher Education, England"
          height={280}
        >
            <AreaChart data={data.heParticipation}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK} interval={2} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={AXIS_TICK} domain={[30, 60]} tickFormatter={(v) => `${v}%`} label={yAxisLabel("% entering HE by age 30")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Area type="monotone" dataKey="rate" stroke={P.navy} fill={P.navy} fillOpacity={0.1} strokeWidth={2.5} name="HE entry rate" dot={{ r: 2.5, fill: P.navy }} />
            </AreaChart>
        </ChartCard>
      </section>

      {/* Section 5: Degree classification inflation */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Degree Classification</h3>
        <p style={SECTION_NOTE}>
          Distribution of UK first-degree classifications. First-class honours doubled from
          15% in 2010-11 to 36% in 2020-21, a trend widely attributed to grade inflation
          rather than improved student performance. Post-COVID adjustments have partially corrected this.
        </p>
        <ChartCard
          title="Degree Classification"
          subtitle="Distribution of first-degree honours, UK"
          source="SOURCE: HESA Student Statistics, UK"
          height={320}
        >
            <AreaChart data={data.degreeClassification}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK} interval={2} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={AXIS_TICK} domain={[0, 100]} tickFormatter={(v) => `${v}%`} label={yAxisLabel("% of graduates")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Area type="monotone" dataKey="third" stackId="1" stroke={DEGREE_COLORS.third} fill={DEGREE_COLORS.third} fillOpacity={0.6} name="Third / Other" />
              <Area type="monotone" dataKey="twoTwo" stackId="1" stroke={DEGREE_COLORS.twoTwo} fill={DEGREE_COLORS.twoTwo} fillOpacity={0.6} name="2:2" />
              <Area type="monotone" dataKey="twoOne" stackId="1" stroke={DEGREE_COLORS.twoOne} fill={DEGREE_COLORS.twoOne} fillOpacity={0.6} name="2:1" />
              <Area type="monotone" dataKey="first" stackId="1" stroke={DEGREE_COLORS.first} fill={DEGREE_COLORS.first} fillOpacity={0.6} name="First" />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
            </AreaChart>
        </ChartCard>
      </section>

      {/* Section 6: Teacher workforce */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Teacher Workforce</h3>
        <p style={SECTION_NOTE}>
          Full-time equivalent teachers in England's state schools (thousands) and the
          pupil-to-teacher ratio. Teacher numbers have plateaued while vacancy rates
          have risen, reflecting recruitment and retention challenges.
        </p>
        <ChartCard
          title="Teacher Workforce"
          subtitle="FTE teachers &amp; pupil-to-teacher ratio, England"
          source="SOURCE: DfE School Workforce Census, England"
          height={300}
        >
            <LineChart data={data.teacherWorkforce}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK} />
              <YAxis yAxisId="left" tick={AXIS_TICK} domain={[420, 480]} tickFormatter={(v) => `${v}k`} label={yAxisLabel("Teachers (000s FTE)")} />
              <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} domain={[16, 19]} label={yAxisLabel("Pupil:teacher ratio", { angle: 90, position: "insideRight" })} />
              <Tooltip content={<CustomTooltip />} />
              <Line yAxisId="left" type="monotone" dataKey="teachers" stroke={P.teal} strokeWidth={2.5} dot={{ r: 2, fill: P.teal }} name="Teachers (000s)" />
              <Line yAxisId="right" type="monotone" dataKey="ratio" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 2, fill: P.sienna }} name="Pupil:teacher ratio" />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
            </LineChart>
        </ChartCard>
      </section>

      {/* Section 7: International spending comparison */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Education Spending (% GDP)</h3>
        <p style={SECTION_NOTE}>
          Total public spending on education as a share of GDP. The UK spends 4.3%,
          below the OECD average of 4.9% and well behind Scandinavian countries.
        </p>
        <ChartCard
          title="Education Spending (% GDP)"
          subtitle="Total public spending on education, OECD comparison"
          source="SOURCE: OECD Education at a Glance 2024, 2021 data"
          height={320}
        >
            <BarChart data={data.intlSpending} layout="vertical">
              <CartesianGrid {...GRID_PROPS} />
              <XAxis type="number" tick={AXIS_TICK} domain={[0, 7]} tickFormatter={(v) => `${v}%`} label={yAxisLabel("% of GDP", { angle: 0, position: "insideBottomRight" })} />
              <YAxis type="category" dataKey="country" tick={AXIS_TICK} width={80} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}% GDP`} />} />
              <Bar dataKey="pct" name="% GDP" radius={[0, 3, 3, 0]}>
                {data.intlSpending.map((d, i) => (
                  <Cell key={i} fill={d.country === "UK" ? P.sienna : d.country === "OECD avg" ? P.navy : P.teal} fillOpacity={d.country === "UK" || d.country === "OECD avg" ? 1 : 0.5} />
                ))}
              </Bar>
            </BarChart>
        </ChartCard>
      </section>

      {/* Analysis */}
      <AnalysisBox>
        UK education presents a mixed picture. Per-pupil spending fell 9% in real terms
        between {s.perPupilPeakYear} and 2018-19 — the longest funding squeeze since the 1970s —
        and at £{s.perPupilLatest.toLocaleString()} remains {Math.abs(s.perPupilChange)}% below
        its peak. Despite this, PISA results have held steady while the OECD average
        has declined: the UK scored {s.pisaMaths} in maths, {s.pisaReading} in reading,
        and {s.pisaScience} in science in {s.pisaYear}, comfortably above average.
        GCSE attainment at grade 5+ in English and maths stands at {s.gcseRate}%,
        though the 2017 grading change makes long-run comparison difficult.
        Higher education participation has grown from 38% to {s.heParticipation}%
        in a decade and a half, but degree classification inflation — first-class
        honours doubling from 15% to {s.firstClassPct}% — raises questions about
        standards. The UK spends {s.spendingPctGdp}% of GDP on education, below the
        OECD average of {s.oecdAvgPctGdp}%. Teacher vacancy rates have risen to 0.5%,
        with the pupil-to-teacher ratio at {s.pupilTeacherRatio}:1.
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
