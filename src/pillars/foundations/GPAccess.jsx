import { useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area, ComposedChart, Bar, BarChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine } from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, CHART_CARD, CHART_TITLE, CHART_SUBTITLE,
  SOURCE_TEXT, AXIS_TICK_MONO, yAxisLabel } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ShareableChart from "../../components/ShareableChart";
import MethodologyBreak from "../../components/MethodologyBreak";
import { useJsonDataset, getBreaks } from "../../hooks/useDataset";

export default function GPAccess() {
  const { data, loading, error, raw } = useJsonDataset("gp-access.json");

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>General Practice</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading GP data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>General Practice</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>General Practice</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Appointments, access, workforce & patient experience
        </span>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard label="Monthly Appts" value={`${s.monthlyAppointments}${s.monthlyAppointmentsUnit}`} change={s.monthlyAppointmentsPeriod} up={true} color={P.teal} delay={0.1} />
        <MetricCard label="GP FTE" value={s.gpFte.toLocaleString()} change={`qualified (${s.gpFteYear})`} up={false} color={P.navy} delay={0.18} />
        <MetricCard label="Satisfaction" value={`${s.satisfactionPct}%`} change={`rated good (${s.satisfactionYear})`} up={false} color="#7B4B8A" delay={0.26} />
        <MetricCard label="Same-Day" value={`${s.sameDayPct}%`} change={`of appts (${s.sameDayPeriod})`} up={false} color={P.sienna} delay={0.34} />
      </div>

      {/* ── 1. Appointment Volume & Type ──────────────────────────── */}
      {data.appointments && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Appointment Volume &amp; Type</h3>
          <p style={SECTION_NOTE}>
            General practice delivers around 30 million appointments per month in England.
            Face-to-face appointments fell during the pandemic and have since recovered to around
            60% of the total. Online consultations grew from under 4% to approximately 20%, while
            telephone appointments peaked during COVID and have since declined.
          </p>
          <ShareableChart title="GP Appointments by Type">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Appointments by Type</div>
                <div style={CHART_SUBTITLE}>Face-to-face, telephone, and online consultations (millions)</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={data.appointments} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="month" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="m" label={yAxisLabel("Appointments (m)")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="faceToFace" name="Face-to-face" stackId="1" fill={P.teal} fillOpacity={0.6} stroke={P.teal} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="telephone" name="Telephone" stackId="1" fill={P.navy} fillOpacity={0.5} stroke={P.navy} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="online" name="Online" stackId="1" fill={P.sienna} fillOpacity={0.5} stroke={P.sienna} strokeWidth={1.5} />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/appointments-in-general-practice" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS Digital Appointments in General Practice
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* ── 2. Who Delivers the Appointments ─────────────────────── */}
      {data.appointmentsByStaff && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Who Delivers the Appointments?</h3>
          <p style={SECTION_NOTE}>
            The GP share of appointments fell from 48% in 2019 to 43% by 2026, while the share
            delivered by other practice staff grew correspondingly. From August 2023, a finer
            classification separates nurses (19-20%) from other clinical roles such as pharmacists,
            physician associates, and physiotherapists (24-26%). Before that date, all non-GP
            clinical staff were grouped together. Approximately 11% of appointments have no staff
            type recorded.
          </p>
          <ShareableChart title="Appointments by Staff Type">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Appointments by Staff Type</div>
                <div style={CHART_SUBTITLE}>Share of appointments by healthcare professional group, England (%)</div>
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={data.appointmentsByStaff.map(d => {
                    const gp = d.gp ?? 0;
                    const unrecorded = d.unrecorded ?? 0;
                    const hasBreakdown = d.nurse != null;
                    const otherStaff = d.otherStaff ?? (hasBreakdown ? d.nurse + d.otherClinical : 0);
                    return {
                      month: d.month, gp, otherStaff, unrecorded,
                      gpSpacer: hasBreakdown ? gp : undefined,
                      otherClinical: hasBreakdown ? d.otherClinical : undefined,
                      nurse: hasBreakdown ? d.nurse : undefined,
                      _rawNurse: d.nurse, _rawOtherClinical: d.otherClinical,
                    };
                  })} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="month" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={4} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} allowDataOverflow ticks={[0, 25, 50, 75, 100]} label={yAxisLabel("%")} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    const hasBreakdown = d._rawNurse != null;
                    return (
                      <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.month}</div>
                        <div style={{ color: P.navy }}>GP: {d.gp}%</div>
                        {!hasBreakdown && <div style={{ color: "#7A9AB5" }}>Other practice staff: {d.otherStaff}%</div>}
                        {hasBreakdown && <div style={{ color: P.sienna }}>Other clinical: {d._rawOtherClinical}%</div>}
                        {hasBreakdown && <div style={{ color: P.teal }}>Nurse: {d._rawNurse}%</div>}
                        <div style={{ color: P.textMuted }}>Not recorded: {d.unrecorded}%</div>
                      </div>
                    );
                  }} />
                  <ReferenceLine x="2023-08" stroke={P.red} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "New classification", fontSize: 10, fill: P.red, position: "top", fontFamily: "'DM Mono', monospace" }} />
                  <Area type="monotone" dataKey="gp" name="GP" stackId="1" fill={P.navy} fillOpacity={0.7} stroke={P.navy} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="otherStaff" name="Other practice staff" stackId="1" fill="#A3B8CC" fillOpacity={0.6} stroke="#7A9AB5" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="unrecorded" name="Not recorded" stackId="1" fill={P.grey} fillOpacity={0.3} stroke={P.grey} strokeWidth={1} />
                  <Area type="monotone" dataKey="gpSpacer" stackId="2" fill="transparent" stroke="none" strokeWidth={0} legendType="none" isAnimationActive={false} />
                  <Area type="monotone" dataKey="otherClinical" name="Other clinical roles" stackId="2" fill={P.sienna} fillOpacity={0.85} stroke={P.sienna} strokeWidth={1.5} isAnimationActive={false} />
                  <Area type="monotone" dataKey="nurse" name="Nurse" stackId="2" fill={P.teal} fillOpacity={0.85} stroke={P.teal} strokeWidth={1.5} isAnimationActive={false} />
                  <Legend verticalAlign="top" height={48} wrapperStyle={{ fontSize: "10px", fontFamily: "'DM Mono', monospace" }} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/appointments-in-general-practice" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS Digital Appointments in General Practice
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* ── 3. Practice Staff by Role ────────────────────────────── */}
      {data.practiceStaff && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Practice Staff by Role</h3>
          <p style={SECTION_NOTE}>
            The total GP practice workforce grew from 118,000 FTE in 2015 to 128,000 in 2024.
            Receptionists are the single largest group at 32,500 FTE, though their numbers have
            declined from 36,500 in 2015. Other clinical roles (clinical pharmacists, physician
            associates, physiotherapists, paramedics, and social prescribers) grew from 3,200
            to 18,500 FTE.
            GP FTE and practice nurse numbers both declined over the period. Practice managers
            and other administrative staff have been broadly stable.
          </p>
          <ShareableChart title="GP Practice Staff by Role">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Practice Workforce by Role</div>
                <div style={CHART_SUBTITLE}>Full-time equivalent staff in GP practices, England (thousands)</div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={data.practiceStaff.map(d => ({ year: d.year, gpsK: d.gps / 1000, nursesK: d.nurses / 1000, dpcK: d.dpc / 1000, receptionistsK: d.receptionists / 1000, managersK: d.managers / 1000, secretariesK: d.secretaries / 1000, otherAdminK: d.otherAdmin / 1000 }))} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="k" label={yAxisLabel("FTE (thousands)")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="receptionistsK" name="Receptionists" stackId="1" fill="#A3B8CC" fillOpacity={0.7} stroke="#7A9AB5" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="otherAdminK" name="Other admin" stackId="1" fill="#C4A882" fillOpacity={0.7} stroke="#A88B64" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="secretariesK" name="Secretaries & clerical" stackId="1" fill="#B5C4A3" fillOpacity={0.7} stroke="#8FA478" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="managersK" name="Practice managers" stackId="1" fill="#C4A0C9" fillOpacity={0.7} stroke="#9B6FA2" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="gpsK" name="GPs" stackId="1" fill={P.navy} fillOpacity={0.6} stroke={P.navy} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="nursesK" name="Nurses" stackId="1" fill={P.teal} fillOpacity={0.6} stroke={P.teal} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="dpcK" name="Other clinical roles" stackId="1" fill={P.sienna} fillOpacity={0.6} stroke={P.sienna} strokeWidth={1.5} />
                  <Legend verticalAlign="top" height={48} wrapperStyle={{ fontSize: "10px", fontFamily: "'DM Mono', monospace" }} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/general-and-personal-medical-services" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS Digital General Practice Workforce
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* ── 4. Headcount vs FTE ──────────────────────────────────── */}
      {data.workforce && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Headcount vs FTE</h3>
          <p style={SECTION_NOTE}>
            GP headcount rose from 34,900 in 2015 to 35,900 in 2024, while FTE fell over the same
            period. The difference reflects increased part-time working. The average GP works the
            equivalent
            of {data.workforce.length > 0 ? Math.round((data.workforce[data.workforce.length - 1].gpFte / data.workforce[data.workforce.length - 1].gpHeadcount) * 100) : "--"}% of
            a full-time post, down
            from {data.workforce.length > 0 ? Math.round((data.workforce[0].gpFte / data.workforce[0].gpHeadcount) * 100) : "--"}% in 2015.
            The gap between the two lines represents this part-time effect.
          </p>
          <ShareableChart title="GP Headcount vs FTE">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>GP Headcount vs Full-Time Equivalent</div>
                <div style={CHART_SUBTITLE}>Fully qualified GPs, England, the gap is part-time working</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={data.workforce} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[24000, 38000]} label={yAxisLabel("GPs")} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      const ptPct = d.gpHeadcount ? Math.round((1 - d.gpFte / d.gpHeadcount) * 100) : null;
                      return (
                        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.year}</div>
                          <div style={{ color: P.teal }}>Headcount: {d.gpHeadcount?.toLocaleString()}</div>
                          <div style={{ color: P.navy }}>FTE: {d.gpFte?.toLocaleString()}</div>
                          {ptPct != null && <div style={{ color: P.sienna }}>Part-time gap: {ptPct}%</div>}
                        </div>
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="gpHeadcount" name="Headcount" stroke={P.teal} strokeWidth={2.5} dot />
                  <Line type="monotone" dataKey="gpFte" name="FTE" stroke={P.navy} strokeWidth={2.5} dot />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/general-and-personal-medical-services" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS Digital General Practice Workforce
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* ── 5. Patients per GP ───────────────────────────────────── */}
      {data.workforce && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Patients per GP</h3>
          <p style={SECTION_NOTE}>
            Each full-time-equivalent GP
            covers {s.patientsPerGp.toLocaleString()} registered patients, up 16% from 1,874
            in 2015. This reflects population growth, increased part-time working, and net
            workforce growth that has not kept pace with demand.
          </p>
          <ShareableChart title="Patients per GP FTE">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Patients per GP (FTE)</div>
                <div style={CHART_SUBTITLE}>Registered patients per full-time-equivalent GP, England</div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data.workforce} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[1800, 2300]} label={yAxisLabel("Patients per GP")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="patientsPerGp" name="Patients per GP" fill={P.red} opacity={0.6} radius={[3, 3, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/general-and-personal-medical-services" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS Digital General Practice Workforce
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* ── 6. GP Training Pipeline ──────────────────────────────── */}
      {data.trainingPipeline && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>GP Training Pipeline</h3>
          <p style={SECTION_NOTE}>
            GP specialty training (ST1) posts increased from 3,250 in 2015 to 4,276 in 2024-25,
            with fill rates reaching 100% from 2019 onward. GP trainees in the system grew from
            6,500 to approximately 11,000 FTE. Attrition during training, emigration, and part-time
            working on qualification mean that approximately 450-500 net FTE are added to the
            qualified workforce per 1,000 training places.
          </p>
          <ShareableChart title="GP Training Pipeline">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>GP Training Pipeline</div>
                <div style={CHART_SUBTITLE}>ST1 training posts filled and GP trainees in system (FTE), England</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={data.trainingPipeline} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis yAxisId="left" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 5000]} label={yAxisLabel("ST1 posts")} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 12000]} label={yAxisLabel("Trainees (FTE)", { angle: 90, position: "insideRight" })} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.year}</div>
                          <div style={{ color: P.navy }}>ST1 posts: {d.st1Posts?.toLocaleString()}</div>
                          <div style={{ color: P.teal }}>Filled: {d.st1Fill?.toLocaleString()} ({d.fillRate}%)</div>
                          <div style={{ color: P.sienna }}>Trainees in system: {d.traineeFte?.toLocaleString()} FTE</div>
                        </div>
                      );
                    }}
                  />
                  <Bar yAxisId="left" dataKey="st1Fill" name="ST1 filled" fill={P.navy} opacity={0.6} radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="traineeFte" name="Trainees (FTE)" stroke={P.sienna} strokeWidth={2.5} dot />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://medical.hee.nhs.uk/medical-training-recruitment/medical-specialty-training/general-practice-gp" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS England GP Specialty Training Recruitment
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* ── 7. Practice Consolidation ────────────────────────────── */}
      {data.practices && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Practice Consolidation</h3>
          <p style={SECTION_NOTE}>
            The number of GP practices in England fell from 8,106 in 2013 to 6,172 in 2025, a
            reduction of 24% through closures and mergers. Average list size rose correspondingly
            from 6,900 to nearly 10,000 registered patients per practice over the same period.
          </p>
          <ShareableChart title="GP Practice Count & List Size">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Practice Count &amp; Average List Size</div>
                <div style={CHART_SUBTITLE}>Active GP practices in England and mean registered patients per practice</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={data.practices} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis yAxisId="left" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[5000, 9000]} label={yAxisLabel("Practices")} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[5000, 11000]} label={yAxisLabel("Avg list size", { angle: 90, position: "insideRight" })} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.year}</div>
                          <div style={{ color: P.navy }}>Practices: {d.practiceCount?.toLocaleString()}</div>
                          <div style={{ color: P.red }}>Avg list size: {d.avgListSize?.toLocaleString()}</div>
                        </div>
                      );
                    }}
                  />
                  <Bar yAxisId="left" dataKey="practiceCount" name="Practices" fill={P.navy} opacity={0.5} radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="avgListSize" name="Avg list size" stroke={P.red} strokeWidth={2.5} dot />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/patients-registered-at-a-gp-practice" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS Digital Patients Registered at a GP Practice
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* ── 8. Time from Booking to Appointment ──────────────────── */}
      {data.appointmentWait && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Time from Booking to Appointment</h3>
          <p style={SECTION_NOTE}>
            NHS Digital also records the time between booking and appointment. Around 45% of GP
            appointments are same-day and over half within 48 hours. Approximately 7% of patients
            wait more than 3 weeks. These proportions have been broadly stable since 2019.
          </p>
          <ShareableChart title="GP Appointment Wait Time">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Time from Booking to Appointment</div>
                <div style={CHART_SUBTITLE}>% of appointments seen within each time window, England</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={data.appointmentWait} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="month" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} label={yAxisLabel("%")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="sameDay" name="Same day" stroke={P.teal} strokeWidth={2.5} dot />
                  <Line type="monotone" dataKey="within7Days" name="Within 7 days" stroke={P.navy} strokeWidth={2} dot />
                  <Line type="monotone" dataKey="within14Days" name="Within 14 days" stroke={P.sienna} strokeWidth={1.5} strokeDasharray="4 3" dot />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </LineChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/appointments-in-general-practice" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS Digital Appointments in General Practice
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* ── 9. Patient Experience ────────────────────────────────── */}
      {data.satisfaction && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>Patient Experience</h3>
          <p style={SECTION_NOTE}>
            The GP Patient Survey asks approximately 2.7 million people each year how they rate their
            practice. "Overall experience good" was around 85% until 2021, then fell to 71% by 2023.
            The 2024 survey was redesigned, so the 75% figure in 2025 is not directly comparable to
            earlier years. The share finding it easy to get through by phone fell from 73% in 2012
            to 54% in 2025.
          </p>
          <ShareableChart title="GP Patient Satisfaction">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Patient Satisfaction</div>
                <div style={CHART_SUBTITLE}>% rating overall experience as good, and ease of getting through by phone</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={data.satisfaction} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[40, 100]} label={yAxisLabel("%")} />
                  <Tooltip content={<CustomTooltip />} />
                  <MethodologyBreak breaks={getBreaks(raw, "satisfaction")} />
                  <Line type="monotone" dataKey="overallGood" name="Overall good" stroke={P.teal} strokeWidth={2.5} dot />
                  <Line type="monotone" dataKey="easyToGetThrough" name="Easy to phone" stroke={P.sienna} strokeWidth={2} dot />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </LineChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://www.gp-patient.co.uk/surveysandreports" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  GP Patient Survey (NHS England / Ipsos)
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      <AnalysisBox color={P.teal} label="Summary">
        England's general practice delivers {s.monthlyAppointments}m appointments per month
        ({s.monthlyAppointmentsPeriod}) across {s.practiceCount.toLocaleString()} practices, down
        from 8,100 in 2013.
        {" "}GP headcount rose from 34,900 to 35,900 between 2015 and 2024, while FTE fell from
        29,400 to 27,500 due to increased part-time working (average {data.workforce?.length > 0 ? Math.round((data.workforce[data.workforce.length - 1].gpFte / data.workforce[data.workforce.length - 1].gpHeadcount) * 100) : "--"}% of
        full-time, down from 84%).
        {" "}Each FTE GP covers {s.patientsPerGp.toLocaleString()} registered patients, up 16% since 2015.
        {" "}The training pipeline expanded to 4,276 ST1 places (100% fill rate) with 10,900 trainees
        in the system.
        {" "}{s.sameDayPct}% of appointments are same-day and 73% within a week. These proportions
        have been broadly stable since 2019.
        {" "}Patient satisfaction fell from 85% to 71% between 2018 and 2023. The share finding it
        easy to get through by phone was 54% in 2025.
      </AnalysisBox>
    </div>
  );
}
