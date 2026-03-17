import {
  LineChart, Line, BarChart, Bar, Cell, AreaChart, Area, ComposedChart,
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
import { useJsonDataset } from "../../hooks/useDataset";

export default function NHSFunding() {
  const { data, loading, error } = useJsonDataset("nhs-funding.json");

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>NHS Funding</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading NHS funding data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>NHS Funding</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  const internationalSorted = data.international
    ? [...data.international].sort((a, b) => b.pctGdp - a.pctGdp)
    : [];

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>NHS Funding</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Budget, per capita spending & international comparison
        </span>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Total Budget (real)"
          value={`£${s.totalBudgetReal}bn`}
          change={s.totalBudgetRealYear}
          up={true}
          color={P.navy}
          delay={0.1}
        />
        <MetricCard
          label="Per Capita (real)"
          value={`£${s.perCapitaLatest?.toLocaleString()}`}
          change={`${s.perCapitaYear}`}
          up={true}
          color={P.teal}
          delay={0.18}
        />
        <MetricCard
          label="Health Spend (% GDP)"
          value={`${s.pctGdpUK}%`}
          change={`${s.pctGdpYear}`}
          up={false}
          color={P.sienna}
          delay={0.26}
        />
        <MetricCard
          label="Real Growth Rate"
          value={`${s.realGrowthLatest > 0 ? "+" : ""}${s.realGrowthLatest}%`}
          change={s.realGrowthLatestYear}
          up={s.realGrowthLatest > 0}
          color={P.red}
          delay={0.34}
        />
      </div>

      {/* NHS Budget in Real Terms */}
      {data.totalBudget && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>NHS England Budget</h3>
          <p style={SECTION_NOTE}>
            The NHS England budget has grown from £44.6bn in 2000-01 to £181.4bn in 2025-26 in nominal
            terms. In real terms (2023-24 prices), the budget rose from £76.8bn to £164.9bn over the
            same period. Annual real-terms growth averaged over 6% during 2000-2010, slowed to around
            1% between 2010 and 2018, and increased temporarily during 2020-21 due to pandemic-related
            spending.
          </p>
          <ShareableChart title="NHS England Budget, Real Terms">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>NHS England Budget</div>
                <div style={CHART_SUBTITLE}>Nominal and real terms (2023-24 prices), £bn, 2000-01 to 2025-26</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={data.totalBudget} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={4} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("£bn")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="real" name="Real (2023-24 prices)" stroke={P.navy} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="nominal" name="Nominal" stroke={P.teal} strokeWidth={2} dot={false} strokeDasharray="5 3" />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </LineChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://www.gov.uk/government/collections/public-expenditure-statistical-analyses-pesa" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  HM Treasury PESA
                </a>
                {" / "}
                <a href="https://www.kingsfund.org.uk/projects/nhs-in-a-nutshell/nhs-budget" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  The King's Fund
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* Per Capita Spending */}
      {data.perCapita && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Per Capita Health Spending</h3>
          <p style={SECTION_NOTE}>
            Real-terms health spending per person rose from approximately £1,380 in 2000 to £2,320 in
            2009, before a period of slower growth during 2010-2018. Spending per capita increased
            to £2,720 in 2020, partly due to pandemic-related costs, and stood at £2,890 in 2024.
          </p>
          <ShareableChart title="Per Capita Health Spending, Real Terms">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Health Spending per Capita</div>
                <div style={CHART_SUBTITLE}>Real terms (2023-24 prices), £ per person, England</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={data.perCapita} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" vertical={false} />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 3200]} label={yAxisLabel("£")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="perCapita" name="Per capita (£)" fill={P.teal} fillOpacity={0.75} radius={[3, 3, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://www.kingsfund.org.uk/projects/nhs-in-a-nutshell/nhs-budget" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  The King's Fund
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* International Comparison */}
      {internationalSorted.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>International Comparison</h3>
          <p style={SECTION_NOTE}>
            The UK spent 10.3% of GDP on health in 2023, above the OECD average of 9.2% but below
            Germany (12.7%), France (12.1%), and Canada (11.2%). On a per capita PPP basis, the UK
            spent $5,138, compared to the OECD average of $4,986 and the US figure of $12,555.
          </p>
          <ShareableChart title="Health Spending as % GDP, OECD Countries">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Health Spending as % of GDP</div>
                <div style={CHART_SUBTITLE}>Total (public + private) health expenditure, 2023</div>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(340, internationalSorted.length * 34 + 30)}>
                <BarChart data={internationalSorted} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
                  <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[0, 18]} />
                  <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: P.textMuted }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.country}</div>
                          <div style={{ color: P.navy }}>{d.pctGdp}% of GDP</div>
                          <div style={{ color: P.textMuted }}>${d.perCapitaPPP?.toLocaleString()} per capita (PPP)</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="pctGdp" name="% of GDP" radius={[0, 3, 3, 0]} barSize={14}>
                    {internationalSorted.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.country === "United Kingdom" ? P.navy : d.country === "OECD Average" ? P.sienna : P.teal}
                        fillOpacity={d.country === "United Kingdom" || d.country === "OECD Average" ? 0.9 : 0.5}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 14, marginTop: 8, marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 14, height: 8, background: P.navy, display: "inline-block", borderRadius: 1, opacity: 0.9 }} />
                  <span style={{ fontSize: "11px", color: P.textMuted }}>United Kingdom</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 14, height: 8, background: P.sienna, display: "inline-block", borderRadius: 1, opacity: 0.9 }} />
                  <span style={{ fontSize: "11px", color: P.textMuted }}>OECD Average</span>
                </div>
              </div>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://stats.oecd.org/Index.aspx?DataSetCode=SHA" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  OECD Health Statistics
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* Spending by Category */}
      {data.byCategory && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>Spending by Category</h3>
          <p style={SECTION_NOTE}>
            Hospital and specialist services account for the largest share of NHS England spending
            at £87.2bn, followed by primary and community care (£33.6bn) and mental health (£16.4bn).
            Prescribing, capital expenditure, and administration together make up approximately £27.7bn.
          </p>
          <ShareableChart title="NHS England Spending by Category">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Spending by Category</div>
                <div style={CHART_SUBTITLE}>NHS England, £bn, latest available year</div>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(240, data.byCategory.length * 40 + 30)}>
                <BarChart data={data.byCategory} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
                  <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="bn" />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: P.textMuted }} axisLine={false} tickLine={false} width={170} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.category}</div>
                          <div style={{ color: P.navy }}>£{d.amount}bn</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="amount" name="£bn" fill={P.navy} fillOpacity={0.7} radius={[0, 3, 3, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://www.england.nhs.uk/publication/nhs-england-annual-report/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS England Annual Report and Accounts
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* Spending Split */}
      {data.spendingSplit && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Where Does the Money Go?</h3>
          <p style={SECTION_NOTE}>
            Staff costs account for approximately 49% of total NHS spending in 2024-25 (65% at
            the provider trust level, where most clinical staff are employed). Capital investment
            has fallen from 5% to approximately 4% of total spending since 2013-14. The UK spends
            roughly half the OECD average share of GDP on health capital (0.27% vs 0.51%), and has
            the lowest number of CT and MRI scanners per capita among comparable countries.
          </p>
          <ShareableChart title="NHS Spending Split">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Spending Split</div>
                <div style={CHART_SUBTITLE}>Share of total NHS budget by category (%), England</div>
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={data.spendingSplit} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} label={yAxisLabel("%")} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="staffPct" name="Staff costs" stackId="1" fill={P.navy} fillOpacity={0.7} stroke={P.navy} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="drugsClinicalPct" name="Drugs & clinical supplies" stackId="1" fill={P.teal} fillOpacity={0.6} stroke={P.teal} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="premisesDeprecPct" name="Premises & depreciation" stackId="1" fill={P.sienna} fillOpacity={0.5} stroke={P.sienna} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="capitalPct" name="Capital" stackId="1" fill={P.red} fillOpacity={0.6} stroke={P.red} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="otherPct" name="Other operating" stackId="1" fill={P.grey} fillOpacity={0.4} stroke={P.grey} strokeWidth={1} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "10px", fontFamily: "'DM Mono', monospace" }} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://www.england.nhs.uk/long-read/consolidated-nhs-provider-accounts-2024-25/" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS England Consolidated Provider Accounts
                </a>
                {" "}&middot;{" "}
                <a href="https://www.kingsfund.org.uk/insight-and-analysis/data-and-charts/nhs-capital-investment" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  King's Fund Capital Investment Analysis
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* Capital CDEL */}
      {data.capitalCdel && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Capital Investment</h3>
          <p style={SECTION_NOTE}>
            The DHSC capital departmental expenditure limit (CDEL) covers spending on buildings,
            equipment, IT, and maintenance across the NHS. In real terms, capital spending fell from
            £5.8bn in 2010-11 to £4.7bn in 2016-17, partly due to £4.3bn being transferred from
            capital to revenue budgets between 2014-15 and 2017-18. It has since risen to £13.6bn
            in 2025-26. The Darzi Review (2024) identified a cumulative £37bn shortfall in NHS
            capital investment relative to comparable OECD countries.
          </p>
          <ShareableChart title="NHS Capital Spending (CDEL)">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Capital Spending (CDEL)</div>
                <div style={CHART_SUBTITLE}>DHSC capital departmental expenditure limit, real terms (2023-24 prices, £bn)</div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={data.capitalCdel} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="bn" domain={[0, 16]} label={yAxisLabel("£bn (real)")} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.year}</div>
                          <div style={{ color: P.navy }}>Capital CDEL: £{d.real}bn (real)</div>
                          {d.transferredToRevenue > 0 && <div style={{ color: P.red }}>Transferred to revenue: £{d.transferredToRevenue}bn</div>}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="real" name="Capital CDEL (£bn real)" fill={P.navy} opacity={0.6} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="transferredToRevenue" name="Transferred to revenue" fill={P.red} opacity={0.7} radius={[3, 3, 0, 0]} />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://www.gov.uk/government/collections/public-expenditure-statistical-analyses-pesa" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  HM Treasury PESA
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      {/* Backlog Maintenance */}
      {data.backlogMaintenance && (
        <section style={{ marginBottom: 48 }}>
          <h3 style={SECTION_HEADING}>Estates Backlog Maintenance</h3>
          <p style={SECTION_NOTE}>
            The estimated cost to clear the NHS estates maintenance backlog rose from £4.4bn in
            2013-14 to £15.9bn in 2024-25. The backlog covers deferred work across the full estate,
            including roofs, electrical systems, heating, lifts, fire safety, and general building
            fabric. Much of the NHS estate dates from the 1960s-1970s and is reaching end of life
            for major building systems. RAAC (reinforced autoclaved aerated concrete) is a specific
            structural issue with a £1.6bn remediation programme (2025-2029), but represents a
            relatively small share of the total. The high-risk component grew from £0.8bn to £3.5bn
            over the period. The Estates Safety Fund provides £750m per year from 2025-26, covering
            approximately 5% of the total backlog annually.
          </p>
          <ShareableChart title="NHS Estates Backlog Maintenance">
            <div style={{ ...CHART_CARD, boxShadow: "0 1px 6px rgba(28,43,69,0.05)" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={CHART_TITLE}>Estates Backlog Maintenance</div>
                <div style={CHART_SUBTITLE}>Estimated cost to clear, by risk category (£bn), England</div>
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={data.backlogMaintenance} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
                  <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="bn" label={yAxisLabel("£bn")} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.year}</div>
                          <div style={{ color: P.red }}>High risk: £{d.highRisk}bn</div>
                          <div style={{ color: P.sienna }}>Significant risk: £{d.significantRisk}bn</div>
                          <div style={{ color: P.navy }}>Moderate risk: £{d.moderateRisk}bn</div>
                          <div style={{ color: P.grey }}>Low risk: £{d.lowRisk}bn</div>
                          <div style={{ fontWeight: 500, marginTop: 4 }}>Total: £{d.total}bn</div>
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="highRisk" name="High risk" stackId="1" fill={P.red} fillOpacity={0.7} stroke={P.red} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="significantRisk" name="Significant risk" stackId="1" fill={P.sienna} fillOpacity={0.6} stroke={P.sienna} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="moderateRisk" name="Moderate risk" stackId="1" fill={P.navy} fillOpacity={0.5} stroke={P.navy} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="lowRisk" name="Low risk" stackId="1" fill={P.grey} fillOpacity={0.4} stroke={P.grey} strokeWidth={1} />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px", fontFamily: "'DM Mono', monospace" }} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={SOURCE_TEXT}>
                SOURCE:{" "}
                <a href="https://digital.nhs.uk/data-and-information/publications/statistical/estates-returns-information-collection" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
                  NHS Estates Returns Information Collection (ERIC)
                </a>
              </div>
            </div>
          </ShareableChart>
        </section>
      )}

      <AnalysisBox color={P.navy} label="Summary">
        The NHS England budget for 2025-26 is £164.9bn in real terms (2023-24 prices),
        up from £76.8bn in 2000-01. Real-terms growth averaged over 6% annually during 2000-2010,
        slowed to approximately 1% per year between 2010 and 2018, and saw a temporary increase
        in 2020-21 linked to pandemic spending.
        {" "}Per capita health spending stands at £2,890 (2024), compared to £1,380 in 2000.
        {" "}The UK spends 10.3% of GDP on health, above the OECD average of 9.2% but below
        Germany (12.7%) and France (12.1%).
        {" "}Capital spending (CDEL) is £13.6bn in 2025-26. The NHS estates maintenance backlog
        stands at £15.9bn (2024-25), of which £3.5bn is classified as high risk.
      </AnalysisBox>
    </div>
  );
}
