import { useState, useEffect } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell,
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

const BREAKDOWN_COLORS = [
  P.red, P.navy, P.teal, P.sienna, P.yellow, P.grey,
  "#6B5B4E", "#4A7A58", "#607DAA", "#D97040",
];

export default function Justice() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/data/justice.json")
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
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Justice & Policing</h2>
        <p style={{ fontSize: "12px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading justice data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Justice & Policing</h2>
        <p style={{ fontSize: "12px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Justice & Policing
      </h2>
      <p style={{ fontSize: "13px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        Crime levels, police workforce, prison capacity, and court performance across England & Wales.
      </p>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
        <MetricCard label="Recorded crime" value={`${s.recordedCrime}m`} change={s.recordedCrimeYear} />
        <MetricCard label="Police officers" value={`${s.policeOfficers}k`} change={`FTE, ${s.policeOfficersYear}`} />
        <MetricCard label="Prison population" value={`${s.prisonPop}k`} change={`Capacity ${s.prisonCapacity}k`} up color={P.red} />
        <MetricCard label="Crown Court backlog" value={`${s.courtBacklog}k`} change={`Cases, ${s.courtBacklogYear}`} up color={P.red} />
      </div>

      {/* Section 1: Crime trends */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Crime Trends</h3>
        <p style={sectionNote}>
          Two measures of crime tell different stories. The Crime Survey (CSEW) — which captures
          unreported crime — shows a sustained decline from 11.7m incidents in 2002-03 to 4.3m.
          Police recorded crime fell to a trough in 2012-13, then rose as recording practices improved.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data.crimeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textMuted }} interval={3} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[0, 13]} tickFormatter={(v) => `${v}m`} label={{ value: "millions", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}m`} />} />
              <Line type="monotone" dataKey="csew" stroke={P.teal} strokeWidth={2.5} dot={{ r: 2, fill: P.teal }} name="CSEW estimate" connectNulls />
              <Line type="monotone" dataKey="recorded" stroke={P.navy} strokeWidth={2.5} dot={{ r: 2, fill: P.navy }} name="Police recorded" connectNulls />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: ONS Crime in England and Wales
          </div>
        </div>
      </section>

      {/* Section 2: Crime breakdown */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Recorded Crime by Type</h3>
        <p style={sectionNote}>
          Police recorded crime by offence group, 2023-24. Violence against the person accounts
          for 38% of all recorded crime, though many incidents are relatively minor.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={data.crimeBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis type="number" tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v}k`} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: P.textMuted }} width={160} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toLocaleString()}k`} />} />
              <Bar dataKey="value" name="Offences (thousands)" radius={[0, 3, 3, 0]}>
                {data.crimeBreakdown.map((_, i) => (
                  <Cell key={i} fill={BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length]} fillOpacity={0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: ONS Police Recorded Crime, year ending March 2024
          </div>
        </div>
      </section>

      {/* Section 3: Police workforce */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Police Workforce</h3>
        <p style={sectionNote}>
          Police officer numbers in England & Wales fell by 21,000 (15%) between 2009 and 2017
          under austerity cuts. The "20,000 uplift" programme restored numbers by 2023, but
          officers are now declining again as funding pressures return.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data.policeWorkforce}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[0, 250]} tickFormatter={(v) => `${v}k`} label={{ value: "Police workforce", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}k`} />} />
              <Area type="monotone" dataKey="pcsos" stackId="1" stroke={P.grey} fill={P.grey} fillOpacity={0.5} name="PCSOs" />
              <Area type="monotone" dataKey="staff" stackId="1" stroke={P.teal} fill={P.teal} fillOpacity={0.5} name="Staff" />
              <Area type="monotone" dataKey="officers" stackId="1" stroke={P.navy} fill={P.navy} fillOpacity={0.5} name="Officers" />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: Home Office Police Workforce Statistics, England & Wales
          </div>
        </div>
      </section>

      {/* Section 4: Charge rate */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Charge Rate</h3>
        <p style={sectionNote}>
          The proportion of recorded crimes resulting in a charge or summons has collapsed
          from 16% in 2014-15 to just {s.chargeRate}% in {s.chargeRateYear}. The vast majority
          of reported crimes now result in no suspect being charged.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.chargeRate}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: P.textMuted }} interval={1} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[0, 20]} tickFormatter={(v) => `${v}%`} label={{ value: "%", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Area type="monotone" dataKey="rate" stroke={P.red} fill={P.red} fillOpacity={0.12} strokeWidth={2.5} name="Charge rate" dot={{ r: 2.5, fill: P.red }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: Home Office Crime Outcomes in England and Wales
          </div>
        </div>
      </section>

      {/* Section 5: Prison population */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Prison Population</h3>
        <p style={sectionNote}>
          The prison population in England & Wales has risen 35% since 2000, reaching {s.prisonPop}k
          against an operational capacity of {s.prisonCapacity}k. Prisons are effectively full,
          forcing early-release schemes.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.prisonPopulation}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[60, 95]} tickFormatter={(v) => `${v}k`} label={{ value: "Prison population", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}k`} />} />
              <Line type="monotone" dataKey="capacity" stroke={P.red} strokeWidth={2} strokeDasharray="6 3" dot={false} name="Operational capacity" />
              <Line type="monotone" dataKey="population" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 2.5, fill: P.sienna }} name="Prison population" />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: MoJ Offender Management Statistics, England & Wales
          </div>
        </div>
      </section>

      {/* Section 6: Court backlog */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Crown Court Backlog</h3>
        <p style={sectionNote}>
          Outstanding Crown Court cases have nearly doubled since 2019, from 39k to {s.courtBacklog}k.
          COVID closures triggered the surge, but structural under-investment in court capacity
          means the backlog continues to grow.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.courtBacklog}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[0, 80]} tickFormatter={(v) => `${v}k`} label={{ value: "Outstanding cases", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}k cases`} />} />
              <Bar dataKey="outstanding" name="Outstanding cases (thousands)" fill={P.navy} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: MoJ Criminal Court Statistics Quarterly
          </div>
        </div>
      </section>

      {/* Analysis */}
      <AnalysisBox>
        The justice system is under severe strain. While the Crime Survey shows total crime
        at historic lows — down 63% from 2002-03 — the charge rate has collapsed to just {s.chargeRate}%,
        meaning 19 in 20 reported crimes result in no charge. Police officer numbers recovered
        to {s.policeOfficers}k after the uplift programme but remain below the 2009 peak and are
        falling again. The prison population of {s.prisonPop}k is near capacity ({s.prisonCapacity}k),
        leaving no headroom. The Crown Court backlog of {s.courtBacklog}k cases — nearly double
        pre-COVID levels — means victims wait years for trials. The system catches fewer
        criminals, takes longer to try them, and has nowhere to put them when convicted.
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
