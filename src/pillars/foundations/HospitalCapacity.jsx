import {
  LineChart, Line, AreaChart, Area, ComposedChart, Bar, BarChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell } from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, CHART_CARD, CHART_TITLE, CHART_SUBTITLE,
  SOURCE_TEXT, AXIS_TICK_MONO, yAxisLabel, withFyNum, fyTickFormatter } from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ShareableChart from "../../components/ShareableChart";
import { useJsonDataset } from "../../hooks/useDataset";

export default function HospitalCapacity() {
  const { data, loading, error } = useJsonDataset("hospital-capacity.json");

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Hospital Capacity</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading hospital data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Hospital Capacity</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Hospital Capacity</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Beds, occupancy, admissions
        </span>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Total Beds"
          value={(s.totalBeds / 1000).toFixed(0) + "k"}
          change={s.totalBedsYear}
          up={false}
          color={P.navy}
          delay={0.1}
        />
        <MetricCard
          label="Occupancy"
          value={`${s.occupancyRate}%`}
          change={s.occupancyRateYear}
          up={true}
          color={P.red}
          delay={0.18}
        />
        <MetricCard
          label="Beds / 1,000"
          value={`${s.bedsPerThousand}`}
          change={`UK (${s.bedsPerThousandYear})`}
          up={false}
          color={P.sienna}
          delay={0.26}
        />
        <MetricCard
          label="OECD Avg"
          value={`${s.oecdAvgBeds}`}
          change={`beds / 1,000 (${s.oecdAvgBedsYear})`}
          up={false}
          color={P.teal}
          delay={0.34}
        />
      </div>

      {/* Bed numbers over time */}
      {data.beds && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Overnight Beds</h3>
          <p style={SECTION_NOTE}>
            Total overnight NHS beds in England fell from 186,200 in 2000-01 to 101,000 in 2025-26,
            a reduction of 46%. General and acute beds account for most of the total. Mental illness
            beds fell from 34,200 to 15,600 over the same period. Learning disability beds were
            almost entirely closed following the shift to community-based care.
          </p>
          <ShareableChart title="NHS Overnight Beds, England">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>NHS Overnight Beds</div>
                <div style={CHART_SUBTITLE}>Available beds by type, England (thousands)</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={withFyNum(data.beds.map(d => ({ ...d, generalAcuteK: d.generalAcute / 1000, matK: d.maternity / 1000, mhK: d.mentalIllness / 1000, ldK: d.learningDisability / 1000 })), "year")} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="fyNum" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fyTickFormatter} tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={4} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="k" label={yAxisLabel("Beds (thousands)")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="generalAcuteK" name="General & acute" stackId="1" fill={P.navy} fillOpacity={0.6} stroke={P.navy} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="mhK" name="Mental illness" stackId="1" fill={P.sienna} fillOpacity={0.5} stroke={P.sienna} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="matK" name="Maternity" stackId="1" fill={P.teal} fillOpacity={0.5} stroke={P.teal} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="ldK" name="Learning disability" stackId="1" fill={P.grey} fillOpacity={0.4} stroke={P.grey} strokeWidth={1} />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://www.england.nhs.uk/statistics/statistical-work-areas/bed-availability-and-occupancy/bed-data-overnight/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS England KH03 Bed Availability and Occupancy
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* Occupancy rates */}
      {data.occupancy && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Bed Occupancy</h3>
          <p style={SECTION_NOTE}>
            Overnight bed occupancy rose from 82% in 2000-01 to 89% in 2025-26 for general and
            acute beds. Occupancy fell during 2020-21 as elective care was suspended, then returned
            to pre-pandemic levels. The Royal College of Emergency Medicine considers sustained
            occupancy above 85% to be associated with increased risk of hospital-acquired infections
            and longer emergency department waits.
          </p>
          <ShareableChart title="NHS Bed Occupancy Rate">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Bed Occupancy Rate</div>
                <div style={CHART_SUBTITLE}>Overnight beds, general & acute and overall, England (%)</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={withFyNum(data.occupancy, "year")} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="fyNum" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fyTickFormatter} tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[70, 95]} label={yAxisLabel("%")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="generalAcute" name="General & acute" stroke={P.navy} strokeWidth={2.5} dot />
                  <Line type="monotone" dataKey="overall" name="Overall" stroke={P.teal} strokeWidth={2} dot />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </LineChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://www.england.nhs.uk/statistics/statistical-work-areas/bed-availability-and-occupancy/bed-data-overnight/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS England KH03 Bed Availability and Occupancy
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* International comparison */}
      {data.international && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>International Comparison</h3>
          <p style={SECTION_NOTE}>
            The UK has 2.4 hospital beds per 1,000 population, compared to an OECD average of 4.3.
            Japan (12.6) and South Korea (12.4) have the highest ratios. Among comparable European
            countries, Germany (7.8) and France (5.7) have significantly more beds per capita.
            Sweden (2.0) operates with a similar ratio to the UK.
          </p>
          <ShareableChart title="Hospital Beds per 1,000 Population, OECD">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Hospital Beds per 1,000 Population</div>
                <div style={CHART_SUBTITLE}>OECD countries, {s.bedsPerThousandYear}</div>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(360, data.international.length * 30 + 30)}>
                <BarChart data={data.international} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
                  <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: P.textMuted }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="bedsPerThousand" name="Beds per 1,000" radius={[0, 3, 3, 0]} barSize={14}>
                    {data.international.map((d, i) => (
                      <Cell key={i} fill={d.country === "United Kingdom" ? P.red : d.country === "OECD Average" ? P.sienna : P.navy} fillOpacity={d.country === "United Kingdom" || d.country === "OECD Average" ? 1 : 0.5} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://www.oecd.org/en/data/indicators/hospital-beds.html" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  OECD Health Statistics
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* Admissions */}
      {data.admissions && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>Hospital Admissions</h3>
          <p style={SECTION_NOTE}>
            Hospital admissions in England totalled approximately 20.6 million in 2024-25. Day cases
            (procedures not requiring an overnight stay) account for the largest share at 8.6 million,
            reflecting the shift toward same-day treatment. Emergency admissions (6.6 million) have
            grown from 5.8 million in 2013-14. Elective inpatient admissions were 5.4 million.
          </p>
          <ShareableChart title="Hospital Admissions by Type">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Hospital Admissions</div>
                <div style={CHART_SUBTITLE}>Elective, emergency, and day case admissions, England (thousands)</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={withFyNum(data.admissions, "year")} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="fyNum" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fyTickFormatter} tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="k" label={yAxisLabel("Admissions (thousands)")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="dayCase" name="Day cases" stackId="1" fill={P.teal} fillOpacity={0.6} stroke={P.teal} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="emergency" name="Emergency" stackId="1" fill={P.red} fillOpacity={0.5} stroke={P.red} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="elective" name="Elective inpatient" stackId="1" fill={P.navy} fillOpacity={0.5} stroke={P.navy} strokeWidth={1.5} />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/hospital-admitted-patient-care-activity" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS Digital Hospital Episode Statistics
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      <AnalysisBox color={P.navy} label="Summary">
        NHS England had {(s.totalBeds / 1000).toFixed(0)}k overnight beds in {s.totalBedsYear}, down
        from 186k in 2000-01 (a 46% reduction).
        {" "}General and acute bed occupancy was {s.occupancyRate}%, above the 85% threshold at which
        the Royal College of Emergency Medicine considers risks to increase.
        {" "}The UK has {s.bedsPerThousand} hospital beds per 1,000 population, compared to the OECD
        average of {s.oecdAvgBeds} ({s.oecdAvgBedsYear}).
        {" "}Hospital admissions totalled approximately 20.6 million in 2024-25, of which 8.6 million
        were day cases, 6.6 million emergency, and 5.4 million elective inpatient.
      </AnalysisBox>
    </div>
  );
}
