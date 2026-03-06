import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
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

const PARITY_COLORS = {
  tfr1: P.teal,
  tfr2: P.navy,
  tfr3: P.sienna,
  tfr4: P.grey,
};

const AGE_COLORS = {
  age1: P.teal,
  age2: P.navy,
  age3: P.sienna,
  ageAll: P.grey,
};

const FAMILY_COLORS = {
  married: P.navy,
  cohabiting: P.teal,
  loneParent: P.sienna,
};

export default function Family() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/data/family.json")
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
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Family</h2>
        <p style={{ fontSize: "12px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading family data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Family</h2>
        <p style={{ fontSize: "12px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;
  const tfrBelow = ((s.replacementRate - s.tfr) / s.replacementRate * 100).toFixed(0);

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 6px" }}>
        Family
      </h2>
      <p style={{ fontSize: "13px", color: P.textMuted, margin: "0 0 24px", fontFamily: "'Playfair Display', serif", maxWidth: 720 }}>
        Birth rates, family structure, and household composition across England, Wales, and the UK.
      </p>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
        <MetricCard label="Total fertility rate" value={s.tfr.toFixed(2)} sub={`${tfrBelow}% below replacement (${s.tfrYear})`} color={P.red} />
        <MetricCard label="Live births" value={`${(s.liveBirths / 1000).toFixed(0)}k`} sub={`England & Wales, ${s.liveBirthsYear}`} />
        <MetricCard label="Mean age, 1st child" value={s.meanAge1st.toFixed(1)} sub={`years (${s.meanAge1stYear})`} />
        <MetricCard label="Avg household size" value={s.avgHouseholdSize.toFixed(2)} sub="persons per household" />
      </div>

      {/* Section 1: Total Fertility Rate */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Total Fertility Rate</h3>
        <p style={sectionNote}>
          Children per woman over a lifetime at current age-specific rates.
          The bold line shows the overall TFR; thinner lines show the contribution from each birth order.
          The 1st-child rate — a proxy for the share of women who become mothers at all — has
          fallen from 0.93 to 0.55, the steepest decline. Rising childlessness is the primary driver.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data.tfrByOrder}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[0, 3.2]} />
              <Tooltip content={<CustomTooltip formatter={(v) => v?.toFixed(2)} />} />
              <ReferenceLine y={2.1} stroke={P.red} strokeDasharray="4 4" label={{ value: "Replacement (2.1)", fontSize: 9, fill: P.red, position: "right" }} />
              <Line type="monotone" dataKey="tfrTotal" stroke={P.text} strokeWidth={3} dot={false} name="Total TFR" connectNulls />
              <Line type="monotone" dataKey="tfr1" stroke={PARITY_COLORS.tfr1} strokeWidth={1.5} dot={false} name="1st child" connectNulls />
              <Line type="monotone" dataKey="tfr2" stroke={PARITY_COLORS.tfr2} strokeWidth={1.5} dot={false} name="2nd child" connectNulls />
              <Line type="monotone" dataKey="tfr3" stroke={PARITY_COLORS.tfr3} strokeWidth={1.5} dot={false} name="3rd child" connectNulls />
              <Line type="monotone" dataKey="tfr4" stroke={PARITY_COLORS.tfr4} strokeWidth={1.5} dot={false} name="4th+ child" connectNulls />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: ONS Fertility Rates by Parity, England & Wales
          </div>
        </div>
      </section>

      {/* Section 2: Mean age of mother by birth order */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Mean Age of Mother at Birth</h3>
        <p style={sectionNote}>
          Average age at which women have their first, second, and third child.
          First-time mothers are now over 5 years older than in 1970.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data.meanAgeByOrder}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[22, 35]} tickFormatter={(v) => `${v}`} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(1)} years`} />} />
              <Line type="monotone" dataKey="age1" stroke={AGE_COLORS.age1} strokeWidth={2.5} dot={false} name="1st child" />
              <Line type="monotone" dataKey="age2" stroke={AGE_COLORS.age2} strokeWidth={2.5} dot={false} name="2nd child" />
              <Line type="monotone" dataKey="age3" stroke={AGE_COLORS.age3} strokeWidth={2.5} dot={false} name="3rd child" />
              <Line type="monotone" dataKey="ageAll" stroke={AGE_COLORS.ageAll} strokeWidth={1.5} dot={false} strokeDasharray="4 3" name="All births" />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: ONS Birth Characteristics, England & Wales
          </div>
        </div>
      </section>

      {/* Section 3: Live births */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Live Births</h3>
        <p style={sectionNote}>
          Annual live births in England and Wales. The 1964 baby boom peak of 876,000 compares
          with 595,000 in 2024 — a 32% decline despite a 20% larger population.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.birthsSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${v}k`} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toLocaleString()}k`} />} />
              <Area type="monotone" dataKey="births" stroke={P.teal} fill={P.teal} fillOpacity={0.12} strokeWidth={2.5} name="Live births (thousands)" dot={{ r: 2, fill: P.teal }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: ONS Births in England and Wales
          </div>
        </div>
      </section>

      {/* Section 4: Family types */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Family Structure</h3>
        <p style={sectionNote}>
          UK families by type. Married couples remain the majority but cohabiting families have
          grown 49% since 2004. Lone-parent families have also increased.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data.familyTypeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}m`} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${(v / 1000).toFixed(1)}m`} />} />
              <Area type="monotone" dataKey="loneParent" stackId="1" stroke={FAMILY_COLORS.loneParent} fill={FAMILY_COLORS.loneParent} fillOpacity={0.5} name="Lone parent" />
              <Area type="monotone" dataKey="cohabiting" stackId="1" stroke={FAMILY_COLORS.cohabiting} fill={FAMILY_COLORS.cohabiting} fillOpacity={0.5} name="Cohabiting couple" />
              <Area type="monotone" dataKey="married" stackId="1" stroke={FAMILY_COLORS.married} fill={FAMILY_COLORS.married} fillOpacity={0.5} name="Married couple" />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: ONS Families and Households in the UK
          </div>
        </div>
      </section>

      {/* Section 5: Household size */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={sectionHeading}>Average Household Size</h3>
        <p style={sectionNote}>
          Average number of people per household. The long-term decline from 3.1 in 1961 to 2.35 today
          reflects smaller families, more single-person households, and an ageing population.
        </p>
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "24px 20px 16px" }}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.householdSizeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: P.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: P.textMuted }} domain={[2.0, 3.2]} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed(2)} persons`} />} />
              <Line type="monotone" dataKey="size" stroke={P.navy} strokeWidth={2.5} dot={{ r: 2.5, fill: P.navy }} name="Persons per household" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: "9px", color: P.textLight, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            SOURCE: ONS Families and Households in the UK
          </div>
        </div>
      </section>

      {/* Context */}
      <AnalysisBox>
        The UK's total fertility rate fell to {s.tfr} children per woman in {s.tfrYear},
        {tfrBelow}% below the 2.1 replacement rate and the lowest on record.
        The primary driver is rising childlessness: the first-child fertility rate has dropped
        from 0.93 in 1960 to 0.55 in 2022 — meaning at current rates, nearly half of women
        would never have a child. Among those who do, family size has shrunk less dramatically.
        The mean age of first-time mothers has risen from 23.7 in 1970 to {s.meanAge1st} in {s.meanAge1stYear},
        compressing the window for subsequent births. Live births were {(s.liveBirths / 1000).toFixed(0)}k
        in {s.liveBirthsYear}, down 32% from the 1964 peak despite a 20% larger population.
        Married couples still account for {s.marriedPct}% of families, but cohabiting couples
        have grown to {s.cohabitingPct}%. Average household size has fallen from 3.1 in 1961
        to {s.avgHouseholdSize}, with {s.youngAdultsWithParentsPct}% of 20-34 year olds now
        living with their parents, up from 26% a decade ago.
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
