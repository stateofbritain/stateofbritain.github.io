import { useMemo } from "react";
import {
  LineChart, Line, ComposedChart, BarChart, Bar,
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

export default function MentalHealth() {
  const { data, loading, error, raw } = useJsonDataset("mental-health.json");

  // useMemo hooks must be before any early returns
  const iaptSampled = useMemo(() => {
    if (!data?.iaptReferrals) return [];
    // Show every other quarter for readability
    return data.iaptReferrals.filter((_, i) => i % 2 === 0 || i === data.iaptReferrals.length - 1);
  }, [data]);

  const cypFormatted = useMemo(() => {
    if (!data?.cypReferrals) return [];
    return data.cypReferrals.map((d) => ({
      ...d,
      referralsK: Math.round(d.referrals / 1000),
      enteringTreatmentK: Math.round(d.enteringTreatment / 1000),
    }));
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Mental Health</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading mental health data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Mental Health</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Mental Health</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Prevalence, talking therapies, CYP referrals & suicide rates
        </span>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="CMD Prevalence"
          value={`${s.cmdPrevalence}%`}
          change={`adults (${s.cmdPrevalenceYear})`}
          up={true}
          color={P.sienna}
          delay={0.1}
        />
        <MetricCard
          label="Talking Therapies Recovery"
          value={`${s.iaptRecoveryRate}%`}
          change={`${s.iaptRecoveryRateYear}`}
          up={true}
          color={P.teal}
          delay={0.18}
        />
        <MetricCard
          label="CYP Referrals"
          value={`${Math.round(s.cypReferrals / 1000)}k`}
          change={`${s.cypReferralsYear}`}
          up={true}
          color={P.navy}
          delay={0.26}
        />
        <MetricCard
          label="Suicide Rate"
          value={`${s.suicideRate}`}
          change={`per 100k (${s.suicideRateYear})`}
          up={true}
          color={P.red}
          delay={0.34}
        />
      </div>

      {/* Prevalence Chart */}
      {data.prevalence && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Common Mental Disorder Prevalence</h3>
          <p style={SECTION_NOTE}>
            The proportion of adults meeting criteria for a common mental disorder (anxiety, depression)
            rose gradually from 15.5% in 2000 to 17.4% in 2019. In 2020, prevalence increased to
            an estimated 20.8% during the COVID-19 pandemic, before declining to 17.5% in 2023.
          </p>
          <ShareableChart title="Common Mental Disorder Prevalence, England">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Common Mental Disorder Prevalence</div>
                <div style={CHART_SUBTITLE}>Percentage of adults aged 16+, England, 2000–2023</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={data.prevalence} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[12, 24]} label={yAxisLabel("%")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="prevalence" name="Prevalence %" stroke={P.sienna} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/adult-psychiatric-morbidity-survey" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  Adult Psychiatric Morbidity Survey, NHS Digital
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* Talking Therapies Referrals and Recovery */}
      {data.iaptReferrals && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Talking Therapies Referrals & Recovery</h3>
          <p style={SECTION_NOTE}>
            NHS Talking Therapies (formerly IAPT) referrals grew from approximately 298,000 per quarter
            in 2015-16 to 492,000 in Q2 2024-25. The recovery rate has remained close to the 50% target
            since 2017-18. Referrals fell sharply during Q1 2020-21 due to the COVID-19 lockdown.
          </p>
          <ShareableChart title="NHS Talking Therapies, Referrals & Recovery Rate">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Talking Therapies Referrals & Recovery Rate</div>
                <div style={CHART_SUBTITLE}>Quarterly referrals (bars) and recovery rate (line), England</div>
              </div>
              <ResponsiveContainer width="100%" height={380}>
                <ComposedChart data={iaptSampled} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="quarter" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} angle={-45} textAnchor="end" interval={1} />
                  <YAxis yAxisId="left" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Referrals")} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[40, 55]} label={yAxisLabel("Recovery %")} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.quarter}</div>
                          <div style={{ color: P.navy }}>Referrals: {d.referrals?.toLocaleString()}</div>
                          <div style={{ color: P.teal }}>Entering treatment: {d.enteringTreatment?.toLocaleString()}</div>
                          <div style={{ color: P.textMuted }}>Completing: {d.completing?.toLocaleString()}</div>
                          <div style={{ color: P.sienna }}>Recovery rate: {d.recoveryRate}%</div>
                        </div>
                      );
                    }}
                  />
                  <MethodologyBreak breaks={getBreaks(raw, "iaptReferrals")} />
                  <Bar yAxisId="left" dataKey="referrals" name="Referrals" fill={P.navy} fillOpacity={0.35} radius={[2, 2, 0, 0]} barSize={14} />
                  <Line yAxisId="right" type="monotone" dataKey="recoveryRate" name="Recovery %" stroke={P.sienna} strokeWidth={2.5} dot={false} />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/psychological-therapies-annual-reports-on-the-use-of-iapt-services" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS Talking Therapies Official Statistics, NHS Digital
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* CYP Mental Health Referrals */}
      {data.cypReferrals && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Children & Young People Mental Health Referrals</h3>
          <p style={SECTION_NOTE}>
            CYP mental health referrals rose from 539,000 in 2018-19 to an estimated 1.05 million in
            2024-25, an increase of 95%. The proportion of referrals that resulted in entering
            treatment was approximately 62% in 2024-25.
          </p>
          <ShareableChart title="CYP Mental Health Referrals, England">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>CYP Mental Health Referrals</div>
                <div style={CHART_SUBTITLE}>Annual referrals and those entering treatment (thousands), England</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={cypFormatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Thousands")} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.year}</div>
                          <div style={{ color: P.navy }}>Referrals: {d.referrals?.toLocaleString()}</div>
                          <div style={{ color: P.teal }}>Entering treatment: {d.enteringTreatment?.toLocaleString()}</div>
                        </div>
                      );
                    }}
                  />
                  <MethodologyBreak breaks={getBreaks(raw, "cypReferrals")} />
                  <Bar dataKey="referralsK" name="Referrals (k)" fill={P.navy} fillOpacity={0.7} radius={[3, 3, 0, 0]} barSize={24} />
                  <Bar dataKey="enteringTreatmentK" name="Entering Treatment (k)" fill={P.teal} fillOpacity={0.7} radius={[3, 3, 0, 0]} barSize={24} />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </BarChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/mental-health-services-monthly-statistics" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  Mental Health Services Monthly Statistics, NHS Digital
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* Suicide Rates */}
      {data.suicideRate && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Suicide Rates</h3>
          <p style={SECTION_NOTE}>
            The male suicide rate was 15.6 per 100,000 in 2023, approximately three times the female
            rate of 5.3 per 100,000. The overall rate fell from 10.5 in 2000 to 9.3 in 2007, before
            rising during the 2008 recession and returning to 10.3 per 100,000 in 2023.
          </p>
          <ShareableChart title="Suicide Rates by Sex, England & Wales">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Suicide Rates by Sex</div>
                <div style={CHART_SUBTITLE}>Age-standardised rate per 100,000 population, England & Wales, 2000–2023</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={data.suicideRate} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 20]} label={yAxisLabel("Per 100k")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="male" name="Male" stroke={P.navy} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="female" name="Female" stroke={P.teal} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="total" name="Total" stroke={P.sienna} strokeWidth={2} dot={false} strokeDasharray="5 3" />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </LineChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/deaths/datasets/suicidesintheunitedkingdomreferencetables" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  ONS Suicides in England and Wales
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* MHA Detentions */}
      {data.mhaDetentions && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>Mental Health Act Detentions</h3>
          <p style={SECTION_NOTE}>
            The number of detentions under the Mental Health Act rose from 43,361 in 2010-11 to a peak
            of 58,400 in 2015-16, before falling following a change in recording methodology in
            2016-17. Detentions were 52,100 in 2023-24.
          </p>
          <ShareableChart title="Mental Health Act Detentions, England">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Mental Health Act Detentions</div>
                <div style={CHART_SUBTITLE}>Annual detentions under the Mental Health Act, England</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={data.mhaDetentions} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Detentions")} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.year}</div>
                          <div style={{ color: P.navy }}>Detentions: {d.detentions?.toLocaleString()}</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="detentions" name="Detentions" fill={P.red} fillOpacity={0.65} radius={[3, 3, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/mental-health-act-statistics-annual-figures" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  Mental Health Act Statistics, NHS Digital
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      <AnalysisBox color={P.navy} label="Summary">
        Common mental disorder prevalence: {s.cmdPrevalence}% of adults ({s.cmdPrevalenceYear}),
        up from 15.5% in 2000 with a temporary spike to 20.8% in 2020 during COVID-19.
        {" "}NHS Talking Therapies recovery rate: {s.iaptRecoveryRate}% ({s.iaptRecoveryRateYear}),
        close to the 50% national target. Quarterly referrals have grown from around 298,000 in
        2015-16 to 492,000.
        {" "}Children and young people mental health referrals: approximately {Math.round(s.cypReferrals / 1000).toLocaleString()}k
        in {s.cypReferralsYear}, nearly double the 2018-19 level of 539,000.
        {" "}Suicide rate: {s.suicideRate} per 100,000 ({s.suicideRateYear}), with males (15.6) at
        approximately three times the female rate (5.3).
      </AnalysisBox>
    </div>
  );
}
