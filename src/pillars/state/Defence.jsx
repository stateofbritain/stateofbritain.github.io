import { useState, useEffect } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, Cell, PieChart, Pie,
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
  fontSize: "14px",
  lineHeight: 1.7,
  color: P.textMuted,
  fontFamily: "'Playfair Display', serif",
  margin: "0 0 18px",
  maxWidth: 720,
};

const SERVICE_COLORS = {
  army: P.sienna,
  navy: P.navy,
  raf: P.teal,
};

const EQUIP_COLORS = [
  P.navy, P.teal, P.sienna, "#4A7A58", P.yellow, P.grey, P.red, "#607DAA",
];

export default function Defence() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/data/defence.json")
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
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Defence</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading defence data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Defence</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Defence
      </h2>
      <p style={{ fontSize: "14px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        UK defence spending, armed forces personnel, equipment programmes, and NATO commitments.
      </p>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
        <MetricCard label="Defence spending" value={`${s.spendingPctGdp}% GDP`} change={`£${s.spendingBn}bn, ${s.spendingYear}`} color={P.navy} />
        <MetricCard label="Regular forces" value={`${s.totalPersonnel}k`} change={`${s.personnelDecline}% below ${s.personnelPeakYear}`} up color={P.red} />
        <MetricCard label="Reserve strength" value={`${s.reserveStrength}k`} change={`Trained, ${s.reserveYear}`} />
        <MetricCard label="NATO target" value={`${s.newTarget}%`} change={`UK at ${s.spendingPctGdp}%`} up color={P.red} />
      </div>

      {/* Section 1: Spending % GDP */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Defence Spending (% GDP)</h3>
        <p style={sectionNote}>
          UK defence spending fell from 3.8% of GDP at the end of the Cold War to a low of 2.0%
          in 2015-16. The NATO 2% guideline — now raised to 2.5% following the Ukraine war —
          has only recently been met consistently.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data.spendingPctGdp}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[1.5, 4.2]} tickFormatter={(v) => `${v}%`} label={{ value: "% of GDP", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}% GDP`} />} />
              <ReferenceLine y={2.0} stroke={P.grey} strokeDasharray="4 4" label={{ value: "NATO 2%", fontSize: 10, fill: P.grey, position: "right" }} />
              <ReferenceLine y={2.5} stroke={P.red} strokeDasharray="4 4" label={{ value: "New 2.5% target", fontSize: 10, fill: P.red, position: "right" }} />
              <Area type="monotone" dataKey="pct" stroke={P.navy} fill={P.navy} fillOpacity={0.12} strokeWidth={2.5} name="% GDP" dot={{ r: 2, fill: P.navy }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: NATO Defence Expenditure · MoD UK Defence Statistics
          </div>
        </div>
      </section>

      {/* Section 2: Real spending */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Defence Spending (Real Terms)</h3>
        <p style={sectionNote}>
          In 2023-24 prices, defence spending fell from £46bn in 2009 to £38bn by 2016 before
          recovering. Recent increases — driven by the Ukraine response — have pushed spending
          to £54bn, but this includes one-off military aid.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.spendingReal}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[35, 58]} tickFormatter={(v) => `£${v}bn`} label={{ value: "£bn", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => `£${v}bn`} />} />
              <Area type="monotone" dataKey="value" stroke={P.teal} fill={P.teal} fillOpacity={0.12} strokeWidth={2.5} name="Real spending (£bn)" dot={{ r: 2, fill: P.teal }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: MoD Annual Report, 2023-24 prices
          </div>
        </div>
      </section>

      {/* Section 3: Personnel */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Armed Forces Personnel</h3>
        <p style={sectionNote}>
          UK regular forces have shrunk from 208k in 2000 to {s.totalPersonnel}k — a {s.personnelDecline}% reduction.
          The Army has been cut hardest, from 110k to 72.5k. All three services are below
          their target manning levels.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data.personnel}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[0, 220]} tickFormatter={(v) => `${v}k`} label={{ value: "thousands", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}k`} />} />
              <Area type="monotone" dataKey="raf" stackId="1" stroke={SERVICE_COLORS.raf} fill={SERVICE_COLORS.raf} fillOpacity={0.5} name="RAF" />
              <Area type="monotone" dataKey="navy" stackId="1" stroke={SERVICE_COLORS.navy} fill={SERVICE_COLORS.navy} fillOpacity={0.5} name="Royal Navy" />
              <Area type="monotone" dataKey="army" stackId="1" stroke={SERVICE_COLORS.army} fill={SERVICE_COLORS.army} fillOpacity={0.5} name="Army" />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: MoD UK Armed Forces Quarterly Service Personnel Statistics
          </div>
        </div>
      </section>

      {/* Section 4: Reserves */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Reserve Forces</h3>
        <p style={sectionNote}>
          Trained reserve strength peaked at 30.7k in 2022 but has since declined to {s.reserveStrength}k.
          The 2013 "Future Reserves" plan aimed for 30k trained reservists to offset regular cuts,
          a target that was briefly met before recruitment faltered.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.reserves}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[18, 34]} tickFormatter={(v) => `${v}k`} label={{ value: "thousands", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: P.textLight, fontFamily: "'DM Mono', monospace" } }} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)}k`} />} />
              <ReferenceLine y={30} stroke={P.grey} strokeDasharray="4 4" label={{ value: "30k target", fontSize: 10, fill: P.grey, position: "right" }} />
              <Line type="monotone" dataKey="strength" stroke={P.navy} strokeWidth={2.5} dot={{ r: 2.5, fill: P.navy }} name="Trained reserves (thousands)" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: MoD UK Armed Forces Quarterly Service Personnel Statistics
          </div>
        </div>
      </section>

      {/* Section 5: Equipment plan */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Equipment Plan (10-Year)</h3>
        <p style={sectionNote}>
          The MoD's equipment plan covers £60bn over 10 years. Submarines and the nuclear
          deterrent represent the single largest commitment, reflecting the Dreadnought programme.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={data.equipmentPlan} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis type="number" tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `£${v}bn`} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: P.textMuted }} width={150} />
              <Tooltip content={<CustomTooltip formatter={(v) => `£${v}bn`} />} />
              <Bar dataKey="value" name="10-year spend (£bn)" radius={[0, 3, 3, 0]}>
                {data.equipmentPlan.map((_, i) => (
                  <Cell key={i} fill={EQUIP_COLORS[i % EQUIP_COLORS.length]} fillOpacity={0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: MoD Equipment Plan 2024
          </div>
        </div>
      </section>

      {/* Section 6: NATO comparison */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>NATO Spending Comparison</h3>
        <p style={sectionNote}>
          Defence spending as a share of GDP across NATO allies. Poland leads at 3.9%
          following its rapid build-up. Several major allies remain below the 2% guideline.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={data.intlComparison} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis type="number" tick={{ fontSize: 11, fill: P.textMuted }} domain={[0, 4.5]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: P.textMuted }} width={70} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}% GDP`} />} />
              <ReferenceLine x={2.0} stroke={P.grey} strokeDasharray="4 4" />
              <Bar dataKey="pct" name="% GDP" radius={[0, 3, 3, 0]}>
                {data.intlComparison.map((d, i) => (
                  <Cell key={i} fill={d.country === "UK" ? P.sienna : d.pct >= 2.0 ? P.navy : P.grey} fillOpacity={d.country === "UK" ? 1 : 0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: NATO Defence Expenditure 2024 estimates
          </div>
        </div>
      </section>

      {/* Analysis */}
      <AnalysisBox>
        The UK spends {s.spendingPctGdp}% of GDP on defence (£{s.spendingBn}bn), meeting the NATO 2%
        guideline but well short of the new 2.5% aspiration. In absolute terms this makes the UK
        the largest European NATO spender, but the force it buys is much smaller than a generation
        ago: regular personnel have fallen {s.personnelDecline}% from {s.personnelPeakYear} levels
        to {s.totalPersonnel}k, with all three services below target manning. The equipment plan
        is dominated by the £17bn nuclear submarine programme, crowding out conventional
        capabilities. Reserve forces have also declined after briefly hitting their 30k target.
        The gap between commitments and capacity — from the Indo-Pacific tilt to European deterrence —
        continues to widen.
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
