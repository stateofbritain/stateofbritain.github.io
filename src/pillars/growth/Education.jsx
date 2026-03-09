import { useState, useEffect } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, Cell,
} from "recharts";
import P from "../../theme/palette";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";

const sectionHeading = {
  fontFamily: "'Playfair Display', serif",
  fontSize: "20px",
  fontWeight: 600,
  color: P.text,
  margin: "0 0 6px",
};

const sectionNote = {
  fontSize: "13px",
  lineHeight: 1.7,
  color: P.textMuted,
  fontFamily: "'Playfair Display', serif",
  margin: "0 0 18px",
  maxWidth: 720,
};

const DEGREE_COLORS = {
  first: P.teal,
  twoOne: P.navy,
  twoTwo: P.sienna,
  third: P.grey,
};

export default function Education() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/data/education.json")
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
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Education</h2>
        <p style={{ fontSize: "12px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading education data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Education</h2>
        <p style={{ fontSize: "12px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Education
      </h2>
      <p style={{ fontSize: "13px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
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
        <h3 style={sectionHeading}>Per-Pupil Spending (Real Terms)</h3>
        <p style={sectionNote}>
          Spending per pupil in England's state schools, adjusted for inflation to 2023-24 prices.
          After rising steadily through the 2000s, real-terms funding fell 9% between 2009-10
          and 2018-19 — the longest squeeze since the 1970s. Recovery has only partially restored levels.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data.perPupilSpending}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textMuted }} interval={2} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[5000, 7200]} tickFormatter={(v) => `£${(v / 1000).toFixed(1)}k`} label={{ value: "£ per pupil (real terms)", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => `£${v?.toLocaleString()}`} />} />
              <ReferenceLine y={s.perPupilPeak} stroke={P.red} strokeDasharray="4 4" label={{ value: `Peak £${s.perPupilPeak.toLocaleString()}`, fontSize: 9, fill: P.red, position: "right" }} />
              <Area type="monotone" dataKey="value" stroke={P.teal} fill={P.teal} fillOpacity={0.12} strokeWidth={2.5} name="Per-pupil spending" dot={{ r: 2, fill: P.teal }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: IFS Annual Report on Education Spending in England 2024
          </div>
        </div>
      </section>

      {/* Section 2: GCSE results */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>GCSE Results: English & Maths</h3>
        <p style={sectionNote}>
          Share of pupils in England achieving a strong pass (grade 5+) in both English and Maths.
          The 2017 switch to the new 9-1 grading scale makes direct pre/post comparison difficult.
          COVID-era teacher assessments (2020-21) inflated results, which have since normalised.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.gcseResults}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[30, 65]} tickFormatter={(v) => `${v}%`} label={{ value: "% achieving 5+", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}%`} />} />
              <ReferenceLine x={2017} stroke={P.grey} strokeDasharray="4 4" label={{ value: "New grading", fontSize: 9, fill: P.grey, position: "top" }} />
              <Line type="monotone" dataKey="rate" stroke={P.navy} strokeWidth={2.5} dot={{ r: 2.5, fill: P.navy }} name="% achieving 5+ in E&M" connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: DfE KS4 Performance Tables, England
          </div>
        </div>
      </section>

      {/* Section 3: PISA scores */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>PISA International Benchmarks</h3>
        <p style={sectionNote}>
          The UK's PISA scores in maths, reading, and science compared with the OECD average.
          While the OECD average has declined — particularly in maths — the UK has held
          broadly steady, widening the gap above average.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data.pisaScores}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[460, 520]} label={{ value: "PISA score", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => v?.toString()} />} />
              <Line type="monotone" dataKey="ukMaths" stroke={P.teal} strokeWidth={2.5} dot={{ r: 3, fill: P.teal }} name="UK Maths" />
              <Line type="monotone" dataKey="ukReading" stroke={P.navy} strokeWidth={2.5} dot={{ r: 3, fill: P.navy }} name="UK Reading" />
              <Line type="monotone" dataKey="ukScience" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 3, fill: P.sienna }} name="UK Science" />
              <Line type="monotone" dataKey="oecdMaths" stroke={P.teal} strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="OECD Maths" />
              <Line type="monotone" dataKey="oecdReading" stroke={P.navy} strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="OECD Reading" />
              <Line type="monotone" dataKey="oecdScience" stroke={P.sienna} strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="OECD Science" />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: OECD PISA 2022 Results · Solid = UK, dashed = OECD average
          </div>
        </div>
      </section>

      {/* Section 4: HE participation */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Higher Education Participation</h3>
        <p style={sectionNote}>
          The share of young people in England entering higher education by age 30 (HEIPR).
          Participation rose from 38% in 2006-07 to 55% in 2020-21, dipping to 52%
          post-COVID as the labour market tightened and cost-of-living rose.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.heParticipation}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textMuted }} interval={2} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[30, 60]} tickFormatter={(v) => `${v}%`} label={{ value: "% entering HE by age 30", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Area type="monotone" dataKey="rate" stroke={P.navy} fill={P.navy} fillOpacity={0.1} strokeWidth={2.5} name="HE entry rate" dot={{ r: 2.5, fill: P.navy }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: DfE Participation Rates in Higher Education, England
          </div>
        </div>
      </section>

      {/* Section 5: Degree classification inflation */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Degree Classification</h3>
        <p style={sectionNote}>
          Distribution of UK first-degree classifications. First-class honours doubled from
          15% in 2010-11 to 36% in 2020-21, a trend widely attributed to grade inflation
          rather than improved student performance. Post-COVID adjustments have partially corrected this.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data.degreeClassification}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textMuted }} interval={2} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} label={{ value: "% of graduates", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Area type="monotone" dataKey="third" stackId="1" stroke={DEGREE_COLORS.third} fill={DEGREE_COLORS.third} fillOpacity={0.6} name="Third / Other" />
              <Area type="monotone" dataKey="twoTwo" stackId="1" stroke={DEGREE_COLORS.twoTwo} fill={DEGREE_COLORS.twoTwo} fillOpacity={0.6} name="2:2" />
              <Area type="monotone" dataKey="twoOne" stackId="1" stroke={DEGREE_COLORS.twoOne} fill={DEGREE_COLORS.twoOne} fillOpacity={0.6} name="2:1" />
              <Area type="monotone" dataKey="first" stackId="1" stroke={DEGREE_COLORS.first} fill={DEGREE_COLORS.first} fillOpacity={0.6} name="First" />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: HESA Student Statistics, UK
          </div>
        </div>
      </section>

      {/* Section 6: Teacher workforce */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Teacher Workforce</h3>
        <p style={sectionNote}>
          Full-time equivalent teachers in England's state schools (thousands) and the
          pupil-to-teacher ratio. Teacher numbers have plateaued while vacancy rates
          have risen, reflecting recruitment and retention challenges.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.teacherWorkforce}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: P.textMuted }} domain={[420, 480]} tickFormatter={(v) => `${v}k`} label={{ value: "Teachers (000s FTE)", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: P.textMuted }} domain={[16, 19]} label={{ value: "Pupil:teacher ratio", angle: 90, position: "insideRight", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip />} />
              <Line yAxisId="left" type="monotone" dataKey="teachers" stroke={P.teal} strokeWidth={2.5} dot={{ r: 2, fill: P.teal }} name="Teachers (000s)" />
              <Line yAxisId="right" type="monotone" dataKey="ratio" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 2, fill: P.sienna }} name="Pupil:teacher ratio" />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: DfE School Workforce Census, England
          </div>
        </div>
      </section>

      {/* Section 7: International spending comparison */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Education Spending (% GDP)</h3>
        <p style={sectionNote}>
          Total public spending on education as a share of GDP. The UK spends 4.3%,
          below the OECD average of 4.9% and well behind Scandinavian countries.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.intlSpending} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis type="number" tick={{ fontSize: 11, fill: P.textMuted }} domain={[0, 7]} tickFormatter={(v) => `${v}%`} label={{ value: "% of GDP", position: "insideBottomRight", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: P.textMuted }} width={80} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}% GDP`} />} />
              <Bar dataKey="pct" name="% GDP" radius={[0, 3, 3, 0]}>
                {data.intlSpending.map((d, i) => (
                  <Cell key={i} fill={d.country === "UK" ? P.sienna : d.country === "OECD avg" ? P.navy : P.teal} fillOpacity={d.country === "UK" || d.country === "OECD avg" ? 1 : 0.5} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: OECD Education at a Glance 2024, 2021 data
          </div>
        </div>
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
      <div style={{ marginTop: 24, fontSize: "11px", color: P.textLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
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
