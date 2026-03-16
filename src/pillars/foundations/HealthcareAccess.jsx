import { useState, useMemo } from "react";
import {
  LineChart, Line, ComposedChart, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine } from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, CHART_CARD, CHART_TITLE, CHART_SUBTITLE, SOURCE_TEXT,
  AXIS_TICK_MONO, yAxisLabel, toggleBtn } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ShareableChart from "../../components/ShareableChart";
import { useJsonDataset } from "../../hooks/useDataset";

const VIEWS = ["waitlist", "performance", "ae"];
const VIEW_LABELS = {
  waitlist: "Waiting List",
  performance: "18-Week Target",
  ae: "A&E Performance" };

export default function HealthcareAccess() {
  const { data, loading, error, raw } = useJsonDataset("nhs.json");
  const [view, setView] = useState("waitlist");
  const [specialtyLabel, setSpecialtyLabel] = useState("everyday");

  // useMemo must be before early returns
  const chartData = useMemo(() => {
    if (!data?.rtt) return [];
    // Sample every 3 months for cleaner chart
    return data.rtt.filter((_, i) => i % 3 === 0 || i === data.rtt.length - 1);
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Healthcare Access</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading NHS England data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Healthcare Access</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.summary;
  const waitingMillions = s.totalWaiting ? (s.totalWaiting / 1e6).toFixed(2) : "--";
  const over52kFormatted = s.over52Weeks ? s.over52Weeks.toLocaleString() : "--";

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Healthcare Access</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          NHS England waiting times & A&E
        </span>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Waiting List"
          value={`${waitingMillions}m`}
          change={`incomplete pathways (${s.rttPeriod})`}
          up={true}
          color={P.red}
          delay={0.1}
        />
        <MetricCard
          label="Within 18 Weeks"
          value={`${s.pctWithin18Weeks ?? "--"}%`}
          change="target: 92%"
          up={false}
          color={P.navy}
          delay={0.18}
        />
        <MetricCard
          label="Waiting 52+ Weeks"
          value={over52kFormatted}
          change={`patients (${s.rttPeriod})`}
          up={true}
          color={P.sienna}
          delay={0.26}
        />
        <MetricCard
          label="A&E Within 4 Hours"
          value={`${s.aePctWithin4Hours ?? "--"}%`}
          change={`target: 95% (${s.aePeriod})`}
          up={false}
          color={P.teal}
          delay={0.34}
        />
      </div>

      {/* Chart area */}
      <ShareableChart title="NHS Waiting Times & A&E Performance">
      <div style={{ ...CHART_CARD, marginBottom: 24, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
        <div style={{ marginBottom: 10 }}>
          <div style={CHART_TITLE}>NHS Waiting Times &amp; A&amp;E</div>
          <div style={CHART_SUBTITLE}>RTT pathways &amp; emergency department performance, England</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: "11px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em", fontFamily: "'DM Mono', monospace" }}>
            {VIEW_LABELS[view]}, {view === "ae" ? "quarterly 2025-26" : `${data.rtt[0]?.period} to ${s.rttPeriod}`}
          </span>
          <div style={{ display: "flex", gap: 0, border: `1px solid ${P.borderStrong}`, borderRadius: 3 }}>
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  background: view === v ? "rgba(28,43,69,0.06)" : "transparent",
                  border: "none",
                  color: view === v ? P.text : P.textLight,
                  padding: "4px 10px", fontSize: "10px", fontWeight: 500,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  cursor: "pointer", fontFamily: "'DM Mono', monospace",
                  transition: "all 0.15s", borderRadius: 2 }}
              >
                {VIEW_LABELS[v].split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {view === "waitlist" && <WaitlistChart data={chartData} />}
        {view === "performance" && <PerformanceChart data={chartData} />}
        {view === "ae" && <AEChart data={data.ae} />}

        <div style={SOURCE_TEXT}>
          SOURCE:{" "}
          <a href="https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
            NHS England RTT Waiting Times
          </a>
          {" "}&middot;{" "}
          <a href="https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
            A&E Attendances
          </a>
        </div>
      </div>
      </ShareableChart>

      {/* Waiting list by specialty */}
      {data.bySpecialty && (
        <section style={{ marginTop: 32, marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>What Are Patients Waiting For?</h3>
          <p style={SECTION_NOTE}>
            Waiting list size by clinical specialty. Trauma & Orthopaedics (hip and knee replacements,
            fractures) is the largest single queue at 845k. Faded bars show the pre-Covid baseline
            (January 2020). Every specialty has grown, with ENT (+84%), Gynaecology (+99%), and
            Oral Surgery (+88%) seeing the largest proportional increases.
          </p>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <button style={toggleBtn(specialtyLabel === "everyday")} onClick={() => setSpecialtyLabel("everyday")}>Everyday</button>
            <button style={toggleBtn(specialtyLabel === "specialty")} onClick={() => setSpecialtyLabel("specialty")}>Clinical</button>
          </div>
          <ShareableChart
            title="NHS Waiting List by Specialty"
            shareHeight={380}
            shareContent={
              <div style={CHART_CARD}>
                <div style={{ marginBottom: 10 }}>
                  <div style={CHART_TITLE}>Waiting List by Specialty</div>
                  <div style={CHART_SUBTITLE}>Incomplete pathways, {data.bySpecialty.period} vs pre-Covid ({data.bySpecialty.preCovidPeriod})</div>
                </div>
                <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 14, height: 8, background: P.red, display: "inline-block", borderRadius: 1 }} />
                    <span style={{ fontSize: "11px", color: P.textMuted }}>Current</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 14, height: 8, background: P.red, opacity: 0.25, display: "inline-block", borderRadius: 1 }} />
                    <span style={{ fontSize: "11px", color: P.textMuted }}>Jan 2020</span>
                  </div>
                </div>
                <SpecialtyChart data={data.bySpecialty.specialties.slice(0, 14)} labelMode={specialtyLabel} />
                <div style={SOURCE_TEXT}>
                  SOURCE: NHS England RTT Waiting Times, Incomplete Pathways by Treatment Function
                </div>
              </div>
            }
          >
          <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
            <div style={{ marginBottom: 10 }}>
              <div style={CHART_TITLE}>Waiting List by Specialty</div>
              <div style={CHART_SUBTITLE}>Incomplete pathways, {data.bySpecialty.period} vs pre-Covid ({data.bySpecialty.preCovidPeriod})</div>
            </div>
            <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 14, height: 8, background: P.red, display: "inline-block", borderRadius: 1 }} />
                <span style={{ fontSize: "11px", color: P.textMuted }}>Current</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 14, height: 8, background: P.red, opacity: 0.25, display: "inline-block", borderRadius: 1 }} />
                <span style={{ fontSize: "11px", color: P.textMuted }}>Jan 2020</span>
              </div>
            </div>
            <SpecialtyChart data={data.bySpecialty.specialties} labelMode={specialtyLabel} />
            <div style={SOURCE_TEXT}>
              SOURCE:{" "}
              <a href="https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                NHS England RTT Waiting Times, Incomplete Pathways by Treatment Function
              </a>
            </div>
          </div>
          </ShareableChart>
        </section>
      )}

      {/* Common operations: volume & wait */}
      {data.byProcedure && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>How Long Do Common Operations Take to Get?</h3>
          <p style={SECTION_NOTE}>
            The chart above shows waiting lists by clinical specialty. This chart takes a different cut,
            showing the 15 most common elective operations by the number actually performed in {data.byProcedure.period},
            and the median number of days patients waited from referral to surgery. This is retrospective,
            covering procedures already completed, not patients still in the queue.
          </p>
          <ShareableChart title="Common NHS Operations, Wait Times">
          <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
            <div style={{ marginBottom: 10 }}>
              <div style={CHART_TITLE}>Common Operations, Median Wait</div>
              <div style={CHART_SUBTITLE}>Elective procedures performed in {data.byProcedure.period}, median days waited</div>
            </div>
            <ProcedureChart data={data.byProcedure.procedures} />
            <div style={SOURCE_TEXT}>
              SOURCE:{" "}
              <a href="https://digital.nhs.uk/data-and-information/publications/statistical/hospital-admitted-patient-care-activity" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                NHS Digital Hospital Episode Statistics, Admitted Patient Care {data.byProcedure.period}
              </a>
            </div>
          </div>
          </ShareableChart>
        </section>
      )}

      <AnalysisBox color={P.navy} label="Context">
        NHS England RTT waiting list: {waitingMillions}m incomplete pathways ({s.rttPeriod}).
        {" "}{s.pctWithin18Weeks}% treated within 18 weeks (target: 92%).
        {" "}{over52kFormatted} patients waiting over 52 weeks.
        {" "}A&E: {s.aePctWithin4Hours}% seen within 4 hours ({s.aePeriod}, target: 95%).
        {" "}Median referral-to-treatment wait: {s.medianWait} weeks.
        {data.bySpecialty && (
          <>
            {" "}Largest queues by specialty: Trauma & Orthopaedics ({(data.bySpecialty.specialties[0].waiting / 1000).toFixed(0)}k),
            Ophthalmology ({(data.bySpecialty.specialties[1].waiting / 1000).toFixed(0)}k),
            ENT ({(data.bySpecialty.specialties[2].waiting / 1000).toFixed(0)}k).
            {" "}Every named specialty has grown since Jan 2020. Gynaecology (+99%),
            Oral Surgery (+88%), and ENT (+84%) saw the steepest rises.
          </>
        )}
      </AnalysisBox>
    </div>
  );
}

function WaitlistChart({ data }) {
  const formatted = data.map((d) => ({
    ...d,
    waitingMillions: d.totalWaiting ? Math.round(d.totalWaiting / 1000) / 1000 : null }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="period" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="m" label={yAxisLabel("Waiting (millions)")} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="waitingMillions" name="Waiting (millions)" stroke={P.red} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PerformanceChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="period" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[40, 100]} label={yAxisLabel("% within 18 weeks")} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={92} stroke={P.teal} strokeDasharray="6 4" label={{ value: "92% target", position: "right", fontSize: 10, fill: P.teal, fontFamily: "'DM Mono', monospace" }} />
        <Line type="monotone" dataKey="pctWithin18" name="% within 18 weeks" stroke={P.navy} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function AEChart({ data }) {
  if (!data?.length) return <p style={{ fontSize: "13px", color: P.textMuted }}>No A&E data available.</p>;

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="period" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
        <YAxis yAxisId="left" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Attendances")} />
        <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[60, 85]} label={yAxisLabel("% within 4 hours", { angle: 90, position: "insideRight" })} />
        <Tooltip content={<CustomTooltip />} />
        <Bar yAxisId="left" dataKey="totalAttendances" name="Attendances" fill={P.grey} opacity={0.5} radius={[3, 3, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="pctWithin4Hours" name="% within 4 hours" stroke={P.teal} strokeWidth={2.5} dot />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

const SPECIALTY_EVERYDAY = {
  "Trauma & Orthopaedics": "Bones & joints",
  "Ophthalmology": "Eyes & vision",
  "ENT": "Ear, nose & throat",
  "Gynaecology": "Women's health",
  "Dermatology": "Skin",
  "Urology": "Bladder & prostate",
  "General Surgery": "General surgery",
  "Cardiology": "Heart",
  "Gastroenterology": "Stomach & bowel",
  "Oral Surgery": "Mouth & jaw",
  "Neurology": "Brain & nerves",
  "Respiratory Medicine": "Lungs & breathing",
  "Rheumatology": "Arthritis & joints",
  "Plastic Surgery": "Reconstructive",
  "Neurosurgery": "Brain & spine surgery",
  "General Medicine": "General medicine",
  "Elderly Medicine": "Elderly care",
  "Cardiothoracic Surgery": "Heart & lung surgery" };

const SPECIALTY_GLOSS = {
  "Trauma & Orthopaedics": "Bones, joints & fractures",
  "Ophthalmology": "Eyes, cataracts, glaucoma",
  "ENT": "Ear, nose & throat, hearing, tonsils",
  "Gynaecology": "Women's reproductive health",
  "Dermatology": "Skin conditions & cancer checks",
  "Urology": "Kidneys, bladder & prostate",
  "General Surgery": "Hernias, gallbladder, appendix",
  "Cardiology": "Heart conditions & monitoring",
  "Gastroenterology": "Stomach, bowel & liver",
  "Oral Surgery": "Jaw, teeth & mouth surgery",
  "Neurology": "Brain & nerve conditions",
  "Respiratory Medicine": "Lungs & breathing",
  "Rheumatology": "Arthritis & autoimmune conditions",
  "Plastic Surgery": "Reconstructive & hand surgery",
  "Neurosurgery": "Brain & spinal surgery",
  "General Medicine": "Complex diagnosis & multi-organ",
  "Elderly Medicine": "Frailty & age-related illness",
  "Cardiothoracic Surgery": "Heart & lung surgery" };

function SpecialtyChart({ data, labelMode }) {
  const formatted = data.map((d) => ({
    ...d,
    label: labelMode === "everyday" ? (SPECIALTY_EVERYDAY[d.specialty] || d.specialty) : d.specialty,
    waitingK: Math.round(d.waiting / 1000),
    preCovidK: d.preCovidWaiting ? Math.round(d.preCovidWaiting / 1000) : 0 }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(400, data.length * 28 + 30)}>
      <BarChart data={formatted} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}k`} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: P.textMuted }} axisLine={false} tickLine={false} width={130} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            const growth = d.preCovidWaiting
              ? Math.round(((d.waiting - d.preCovidWaiting) / d.preCovidWaiting) * 100)
              : null;
            const gloss = SPECIALTY_GLOSS[d.specialty];
            return (
              <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.specialty}</div>
                {gloss && <div style={{ color: P.textLight, fontStyle: "italic", marginBottom: 4 }}>{gloss}</div>}
                <div style={{ color: P.red }}>Waiting: {d.waiting.toLocaleString()}</div>
                {d.preCovidWaiting && <div style={{ color: P.textMuted }}>Jan 2020: {d.preCovidWaiting.toLocaleString()}</div>}
                {growth != null && <div style={{ color: growth > 0 ? P.sienna : P.teal }}>Change: {growth > 0 ? "+" : ""}{growth}%</div>}
                <div style={{ color: P.textMuted }}>Median wait: {d.medianWeeks} weeks</div>
                <div style={{ color: P.textMuted }}>Within 18 wks: {d.pctWithin18}%</div>
                <div style={{ color: P.textMuted }}>52+ weeks: {d.over52weeks.toLocaleString()}</div>
              </div>
            );
          }}
        />
        <Bar dataKey="preCovidK" name="Jan 2020" fill={P.red} fillOpacity={0.2} radius={[0, 3, 3, 0]} barSize={10} />
        <Bar dataKey="waitingK" name="Current" radius={[0, 3, 3, 0]} barSize={10}>
          {formatted.map((d, i) => (
            <Cell key={i} fill={P.red} fillOpacity={d.waitingK > 300 ? 1 : 0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ProcedureChart({ data }) {
  const sorted = [...data].sort((a, b) => b.medianWait - a.medianWait);

  return (
    <ResponsiveContainer width="100%" height={Math.max(400, sorted.length * 28 + 30)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit=" days" />
        <YAxis type="category" dataKey="procedure" tick={{ fontSize: 11, fill: P.textMuted }} axisLine={false} tickLine={false} width={145} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            const waitMonths = (d.medianWait / 30.4).toFixed(1);
            return (
              <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.procedure}</div>
                <div style={{ color: P.navy }}>Median wait: {d.medianWait} days ({waitMonths} months)</div>
                <div style={{ color: P.textMuted }}>Mean wait: {d.meanWait} days</div>
                <div style={{ color: P.textMuted }}>Procedures performed: {d.volume.toLocaleString()}</div>
                <div style={{ color: P.textLight, fontSize: "10px", marginTop: 4 }}>OPCS: {d.code}</div>
              </div>
            );
          }}
        />
        <Bar dataKey="medianWait" name="Median wait (days)" radius={[0, 3, 3, 0]} barSize={12}>
          {sorted.map((d, i) => (
            <Cell key={i} fill={d.medianWait > 100 ? P.red : d.medianWait > 60 ? P.sienna : P.teal} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
