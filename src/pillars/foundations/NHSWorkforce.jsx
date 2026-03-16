import { useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area, ComposedChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend } from "recharts";
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

export default function NHSWorkforce() {
  const { data, loading, error, raw } = useJsonDataset("nhs-workforce.json");

  const staffChartData = useMemo(() => {
    if (!data?.staffByGroup) return [];
    return data.staffByGroup.map(d => ({
      year: d.year,
      doctorsK: d.doctors / 1000,
      nursesK: d.nurses / 1000,
      ahpsK: (d.ahps + d.scientificTechnical) / 1000,
      supportK: d.support / 1000,
      infraK: d.infrastructure / 1000,
      otherK: (d.midwives + d.ambulance) / 1000,
    }));
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>NHS Workforce</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading workforce data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>NHS Workforce</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>NHS Workforce</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Hospital and community health services staff
        </span>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Total FTE"
          value={`${(s.totalFte / 1000).toFixed(0)}k`}
          change={s.totalFteDate}
          up={true}
          color={P.teal}
          delay={0.1}
        />
        <MetricCard
          label="Headcount"
          value={`${(s.totalHeadcount / 1000).toFixed(0)}k`}
          change={s.totalFteDate}
          up={true}
          color={P.navy}
          delay={0.18}
        />
        <MetricCard
          label="Vacancy Rate"
          value={`${s.vacancyRate}%`}
          change={`${s.vacancies.toLocaleString()} posts (${s.vacancyRateDate})`}
          up={false}
          color={P.red}
          delay={0.26}
        />
        <MetricCard
          label="Sickness Rate"
          value={`${s.sicknessRate}%`}
          change={s.sicknessRateDate}
          up={false}
          color={P.sienna}
          delay={0.34}
        />
      </div>

      {/* Staff by group */}
      {data.staffByGroup && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Staff by Group</h3>
          <p style={SECTION_NOTE}>
            The NHS HCHS workforce in England grew from 1.05 million FTE in 2010 to 1.38 million
            in 2025, an increase of 31%. Growth was concentrated during 2020-2025, with the workforce
            increasing by approximately 300,000 FTE. Nurses are the largest clinical group (368k FTE),
            followed by doctors (153k FTE). Support to clinical staff (312k FTE) is the largest
            single category.
          </p>
          <ShareableChart title="NHS Staff by Group">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>NHS HCHS Workforce by Staff Group</div>
                <div style={CHART_SUBTITLE}>Full-time equivalent, England (thousands)</div>
              </div>
              <ResponsiveContainer width="100%" height={380}>
                <AreaChart data={staffChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="k" label={yAxisLabel("FTE (thousands)")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="nursesK" name="Nurses" stackId="1" fill={P.teal} fillOpacity={0.6} stroke={P.teal} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="supportK" name="Clinical support" stackId="1" fill={P.navy} fillOpacity={0.5} stroke={P.navy} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="doctorsK" name="Doctors" stackId="1" fill={P.red} fillOpacity={0.5} stroke={P.red} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="ahpsK" name="AHPs & scientific" stackId="1" fill={P.sienna} fillOpacity={0.5} stroke={P.sienna} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="infraK" name="Infrastructure" stackId="1" fill={P.grey} fillOpacity={0.4} stroke={P.grey} strokeWidth={1} />
                  <Area type="monotone" dataKey="otherK" name="Midwives & ambulance" stackId="1" fill="#7B4B8A" fillOpacity={0.4} stroke="#7B4B8A" strokeWidth={1} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "10px", fontFamily: "'DM Mono', monospace" }} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/nhs-workforce-statistics" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS Digital Workforce Statistics
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* Vacancies */}
      {data.vacancies && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Vacancy Rates</h3>
          <p style={SECTION_NOTE}>
            The overall NHS vacancy rate peaked at 9.7% (133,400 posts) in Q3 2022, then fell to
            6.7% (100,200 posts) by Q3 2025. Nursing vacancies peaked at 13.5% in Q3 2022 and
            have since fallen to 8.8%. Medical vacancy rates have been more stable, ranging between
            5% and 6.6% over the period.
          </p>
          <ShareableChart title="NHS Vacancy Rates">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Vacancy Rates by Staff Group</div>
                <div style={CHART_SUBTITLE}>% of posts vacant, NHS England (quarterly)</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={data.vacancies} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="quarter" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={2} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[0, 15]} label={yAxisLabel("%")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="rate" name="Overall" stroke={P.navy} strokeWidth={2.5} dot />
                  <Line type="monotone" dataKey="nursingRate" name="Nursing" stroke={P.teal} strokeWidth={2} dot />
                  <Line type="monotone" dataKey="medicalRate" name="Medical" stroke={P.sienna} strokeWidth={2} dot />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </LineChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/nhs-vacancies-survey" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS Digital Vacancy Statistics
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* Sickness absence */}
      {data.sickness && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>Sickness Absence</h3>
          <p style={SECTION_NOTE}>
            NHS staff sickness absence was 4.1-4.4% between 2010 and 2019. The rate rose to 5.8%
            in 2021 during the COVID-19 pandemic and has since decreased to 5.2% in 2025, which
            remains above the pre-pandemic level.
          </p>
          <ShareableChart title="NHS Sickness Absence Rate">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Sickness Absence Rate</div>
                <div style={CHART_SUBTITLE}>% of available FTE days lost to sickness, HCHS staff, England</div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data.sickness} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[0, 7]} label={yAxisLabel("%")} />
                  <Tooltip content={<CustomTooltip />} />
                  <MethodologyBreak breaks={getBreaks(raw, "sickness")} />
                  <Bar dataKey="rate" name="Sickness rate" fill={P.sienna} opacity={0.6} radius={[3, 3, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/nhs-sickness-absence-rates" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS Digital Sickness Absence Rates
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      <AnalysisBox color={P.teal} label="Summary">
        The NHS HCHS workforce in England was {(s.totalFte / 1000).toFixed(0)}k FTE
        ({(s.totalHeadcount / 1000).toFixed(0)}k headcount) as of {s.totalFteDate}, up 31% from
        1.05 million FTE in 2010.
        {" "}The vacancy rate was {s.vacancyRate}% ({s.vacancies.toLocaleString()} posts) in
        {" "}{s.vacancyRateDate}, down from a peak of 9.7% in Q3 2022. Nursing vacancies fell from
        13.5% to 8.8% over the same period.
        {" "}Sickness absence was {s.sicknessRate}% in {s.sicknessRateDate}, above the pre-pandemic
        level of approximately 4.4%.
      </AnalysisBox>
    </div>
  );
}
