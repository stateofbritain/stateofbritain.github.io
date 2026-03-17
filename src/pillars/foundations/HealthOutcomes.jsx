import {
  LineChart, Line, BarChart, Bar, Cell,
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

export default function HealthOutcomes() {
  const { data, loading, error, raw } = useJsonDataset("health-outcomes.json");

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Health Outcomes</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading health outcomes data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Health Outcomes</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Health Outcomes</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Life expectancy, cancer survival & avoidable mortality
        </span>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Life Expectancy (M)"
          value={`${s.lifeExpMale} yrs`}
          change={`${s.lifeExpMaleYear}`}
          up={false}
          color={P.navy}
          delay={0.1}
        />
        <MetricCard
          label="Life Expectancy (F)"
          value={`${s.lifeExpFemale} yrs`}
          change={`${s.lifeExpFemaleYear}`}
          up={false}
          color={P.teal}
          delay={0.18}
        />
        <MetricCard
          label="Cancer 5yr Survival"
          value={`${s.cancerSurvival5yr}%`}
          change={`all cancers (${s.cancerSurvival5yrYear})`}
          up={true}
          color={P.sienna}
          delay={0.26}
        />
        <MetricCard
          label="Avoidable Mortality"
          value={`${s.avoidableMortalityRate}`}
          change={`per 100k (${s.avoidableMortalityRateYear})`}
          up={true}
          color={P.red}
          delay={0.34}
        />
      </div>

      {/* Life Expectancy Chart */}
      {data.lifeExpectancy && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Life Expectancy at Birth</h3>
          <p style={SECTION_NOTE}>
            UK life expectancy increased from the 1980s until around 2011, when the rate of
            improvement slowed. Life expectancy fell in 2020 during the COVID-19 pandemic.
            As of 2023, male life expectancy (79.0 years) remains below its 2014 level of 79.3.
          </p>
          <ShareableChart title="Life Expectancy at Birth, UK">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Life Expectancy at Birth</div>
                <div style={CHART_SUBTITLE}>United Kingdom, males and females, 1980–{s.lifeExpMaleYear}</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={data.lifeExpectancy} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[68, 86]} label={yAxisLabel("Years")} />
                  <Tooltip content={<CustomTooltip />} />
                  <MethodologyBreak breaks={getBreaks(raw, "lifeExpectancy")} />
                  <Line type="monotone" dataKey="male" name="Male" stroke={P.navy} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="female" name="Female" stroke={P.teal} strokeWidth={2.5} dot={false} />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </LineChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/lifeexpectancies/datasets/nationallifetablesunitedkingdomreferencetables" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  ONS National Life Tables, United Kingdom
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* Cause of Death */}
      {data.causeOfDeath && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Leading Causes of Death</h3>
          <p style={SECTION_NOTE}>
            Heart disease and dementia are the two leading causes of death in England and Wales,
            together accounting for 29% of all deaths. Cancer sites (lung, bowel, prostate, breast,
            pancreatic, oesophageal) collectively represent approximately 15% of deaths. Chronic
            lower respiratory diseases and stroke are the next largest categories.
          </p>
          <ShareableChart title="Leading Causes of Death, England & Wales">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Leading Causes of Death</div>
                <div style={CHART_SUBTITLE}>Age-standardised mortality rate per 100,000 population, England & Wales, 2023</div>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(420, data.causeOfDeath.length * 28 + 30)}>
                <BarChart data={data.causeOfDeath} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
                  <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="cause" tick={{ fontSize: 11, fill: P.textMuted }} axisLine={false} tickLine={false} width={160} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.cause}</div>
                          <div style={{ color: P.navy }}>Rate: {d.rate} per 100,000</div>
                          <div style={{ color: P.textMuted }}>Deaths: {d.deaths?.toLocaleString()}</div>
                          <div style={{ color: P.textMuted }}>{d.pctTotal}% of all deaths</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="rate" name="Rate per 100,000" radius={[0, 3, 3, 0]} barSize={12}>
                    {data.causeOfDeath.map((d, i) => (
                      <Cell key={i} fill={d.cause.toLowerCase().includes("cancer") ? P.sienna : P.navy} fillOpacity={i < 3 ? 0.9 : 0.55} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/deaths/datasets/deathregistrationssummarytablesenglandandwalesreferencetables" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  ONS Death Registrations, England & Wales
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* Cancer Survival Chart */}
      {data.cancerSurvival && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Cancer Survival Rates</h3>
          <p style={SECTION_NOTE}>
            Five-year survival rates range from above 85% for melanoma, breast, and prostate cancers
            to below 10% for pancreatic cancer. The variation largely reflects differences in stage
            at diagnosis and the availability of effective treatments.
          </p>
          <ShareableChart title="Cancer Survival Rates, England">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Cancer Survival by Type</div>
                <div style={CHART_SUBTITLE}>1-year and 5-year age-standardised net survival (%), adults diagnosed {s.cancerSurvival5yrYear}, England</div>
              </div>
              <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 14, height: 8, background: P.navy, display: "inline-block", borderRadius: 1 }} />
                  <span style={{ fontSize: "11px", color: P.textMuted }}>5-year survival</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 14, height: 8, background: P.teal, display: "inline-block", borderRadius: 1 }} />
                  <span style={{ fontSize: "11px", color: P.textMuted }}>1-year survival</span>
                </div>
              </div>
              <CancerSurvivalChart data={data.cancerSurvival} />
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/conditionsanddiseases/datasets/cancersurvivalratescancersurvivalinenglandadultsdiagnosed" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  ONS Cancer Survival in England
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* Avoidable Mortality Chart */}
      {data.avoidableMortality && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>Avoidable Mortality</h3>
          <p style={SECTION_NOTE}>
            Avoidable deaths are classified as preventable (through public health measures) or
            treatable (through timely healthcare). The combined rate fell from 257 per 100,000 in
            2001 to 202 in 2019, rose to 227 during 2020-2021, and was 218 per 100,000 in 2023.
          </p>
          <ShareableChart title="Avoidable Mortality, England & Wales">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Avoidable Mortality</div>
                <div style={CHART_SUBTITLE}>Age-standardised rate per 100,000 population, England & Wales</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={data.avoidableMortality} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Per 100k")} />
                  <Tooltip content={<CustomTooltip />} />
                  <MethodologyBreak breaks={getBreaks(raw, "avoidableMortality")} />
                  <Line type="monotone" dataKey="preventable" name="Preventable" stroke={P.red} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="treatable" name="Treatable" stroke={P.sienna} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="total" name="Total" stroke={P.navy} strokeWidth={2.5} dot={false} />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </LineChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/causesofdeath/datasets/avoidablemortalityinenglandandwalesreferencetable1" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  ONS Avoidable Mortality in England and Wales
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      <AnalysisBox color={P.navy} label="Summary">
        UK life expectancy at birth: male {s.lifeExpMale} years, female {s.lifeExpFemale} years ({s.lifeExpMaleYear}).
        {" "}The rate of improvement slowed from around 2011. Life expectancy fell in 2020 during
        COVID-19 and has not returned to its 2014 level for males.
        {" "}Five-year cancer survival averages {s.cancerSurvival5yr}% across all cancers, ranging from
        melanoma (92%), prostate (87%), and breast (86%) to pancreatic cancer (7%).
        {" "}Avoidable mortality: {s.avoidableMortalityRate} per 100,000 ({s.avoidableMortalityRateYear}),
        compared to 202 per 100,000 in 2019.
      </AnalysisBox>
    </div>
  );
}

function CancerSurvivalChart({ data }) {
  const sorted = [...data].sort((a, b) => b.survival5yr - a.survival5yr);

  return (
    <ResponsiveContainer width="100%" height={Math.max(400, sorted.length * 28 + 30)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
        <YAxis type="category" dataKey="cancerType" tick={{ fontSize: 11, fill: P.textMuted }} axisLine={false} tickLine={false} width={90} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.cancerType}</div>
                <div style={{ color: P.teal }}>1-year survival: {d.survival1yr}%</div>
                <div style={{ color: P.navy }}>5-year survival: {d.survival5yr}%</div>
              </div>
            );
          }}
        />
        <Bar dataKey="survival1yr" name="1-year" fill={P.teal} fillOpacity={0.35} radius={[0, 3, 3, 0]} barSize={10} />
        <Bar dataKey="survival5yr" name="5-year" fill={P.navy} radius={[0, 3, 3, 0]} barSize={10} />
      </BarChart>
    </ResponsiveContainer>
  );
}
