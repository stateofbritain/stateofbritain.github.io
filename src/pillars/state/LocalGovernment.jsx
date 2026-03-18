import { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell } from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, SOURCE_TEXT,
  AXIS_TICK_MONO, yAxisLabel, GRID_PROPS } from "../../theme/chartStyles";
import useIsMobile from "../../hooks/useIsMobile";
import MetricCard from "../../components/MetricCard";
import ChartCard from "../../components/ChartCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import MethodologyBreak, { getMethodologyBreaks } from "../../components/MethodologyBreak";
import { useJsonDataset, getBreaks } from "../../hooks/useDataset";

const SERVICE_COLORS = {
  adultSocialCare: P.teal,
  childrenSocialCare: P.sienna,
  highways: P.navy,
  housing: "#4A7A58",
  environment: "#5B8A6B",
  cultural: P.yellow,
  planning: "#7A5B8A",
  publicHealth: P.red,
  fire: "#C25454",
  central: P.grey,
  police: "#4E5D6C",
};

const SERVICE_LABELS = {
  adultSocialCare: "Adult social care",
  childrenSocialCare: "Children's social care",
  highways: "Highways & transport",
  housing: "Housing",
  environment: "Environmental services",
  cultural: "Cultural services",
  planning: "Planning & development",
  publicHealth: "Public health",
  fire: "Fire & rescue",
  central: "Central services",
  police: "Police",
};

const FUNDING_COLORS = {
  councilTax: P.teal,
  govGrants: P.navy,
  businessRates: P.sienna,
  other: P.grey,
};

const FUNDING_LABELS = {
  councilTax: "Council tax",
  govGrants: "Government grants",
  businessRates: "Business rates",
  other: "Other income",
};

const SOURCE_LINK = (url, name) => (
  <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>
    {name}
  </a>
);

export default function LocalGovernment() {
  const { data, loading, error, raw } = useJsonDataset("local-government.json");
  const isMobile = useIsMobile();
  const [spendingView, setSpendingView] = useState("stacked");

  // Compute latest service breakdown for bar chart
  const latestServiceBreakdown = useMemo(() => {
    if (!data?.serviceSpending) return [];
    const latest = data.serviceSpending[data.serviceSpending.length - 1];
    return Object.entries(SERVICE_LABELS)
      .map(([key, label]) => ({
        service: label,
        value: latest[key],
        key,
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Local Government</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading local government data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Local Government</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>
          Local Government Finance
        </h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Spending, funding, council tax & financial health
        </span>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Service spending (ex. education)"
          value={`£${s.totalServiceSpend}bn`}
          change={s.totalServiceSpendYear}
          color={P.navy}
          delay={0.1}
        />
        <MetricCard
          label="Average Band D council tax"
          value={`£${s.avgBandD?.toLocaleString()}`}
          change={`+${s.avgBandDChange}% since 2010-11`}
          up={true}
          color={P.sienna}
          delay={0.18}
        />
        <MetricCard
          label="Social care share"
          value={`${s.socialCarePct}%`}
          change={`of non-education spend, ${s.socialCarePctYear}`}
          up={true}
          color={P.teal}
          delay={0.26}
        />
        <MetricCard
          label="Section 114 notices"
          value={s.section114Count}
          change={s.section114Period}
          color={P.red}
          delay={0.34}
        />
      </div>

      {/* Section 1: Spending by service */}
      {data.serviceSpending && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Spending by Service Area</h3>
          <p style={SECTION_NOTE}>
            Local authority net current expenditure in England (excluding education) totalled £89.8bn in
            2024-25. Adult social care (£25.2bn) and children's social care (£15.6bn) together account
            for the largest share. Education spending is excluded from this comparison because the
            transfer of schools to centrally-funded academy status since 2010 makes the figures
            non-comparable over time.
          </p>

          <ChartCard
            title="Current Service Spending"
            subtitle="Net current expenditure by service, £bn, England, 2024-25"
            source={<>SOURCE: {SOURCE_LINK("https://www.gov.uk/government/collections/local-authority-revenue-expenditure-and-financing", "DLUHC Revenue Outturn")}</>}
          >
            <ResponsiveContainer width="100%" height={Math.max(340, latestServiceBreakdown.length * 36 + 30)}>
              <BarChart data={latestServiceBreakdown} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="bn" />
                <YAxis type="category" dataKey="service" tick={{ fontSize: isMobile ? 9 : 11, fill: P.textMuted }} axisLine={false} tickLine={false} width={isMobile ? 110 : 160} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.service}</div>
                        <div style={{ color: P.navy }}>£{d.value}bn</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" name="£bn" radius={[0, 3, 3, 0]} barSize={14}>
                  {latestServiceBreakdown.map((d, i) => (
                    <Cell key={i} fill={SERVICE_COLORS[d.key] || P.grey} fillOpacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>
      )}

      {/* Section 2: Social care squeeze */}
      {data.socialCareShare && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>The Social Care Squeeze</h3>
          <p style={SECTION_NOTE}>
            The share of councils' non-education spending allocated to social care has risen from
            approximately 42% in 2010-11 to {s.socialCarePct}% in 2024-25. Adults' and children's
            social care are statutory obligations, meaning councils have limited ability to reduce
            them. This increased share has come at the expense of discretionary services: spending
            on highways and transport, cultural services, and planning has each fallen by more than
            40% in real terms per person since 2010-11.
          </p>
          <ChartCard
            title="Social Care Share of Spending"
            subtitle="Adult and children's social care as % of non-education service spend, England"
            source={<>SOURCE: {SOURCE_LINK("https://www.gov.uk/government/collections/local-authority-revenue-expenditure-and-financing", "DLUHC Revenue Outturn")} &middot; {SOURCE_LINK("https://ifs.org.uk/publications/how-have-english-councils-funding-and-spending-changed-2010-2024", "IFS")}</>}
            legend={[
              { key: "adult", label: "Adult social care", color: P.teal },
              { key: "children", label: "Children's social care", color: P.sienna },
            ]}
            height={320}
          >
            <AreaChart data={data.socialCareShare} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 3 : 2} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[0, 60]} label={yAxisLabel("%")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Area type="monotone" dataKey="adultPct" name="Adult social care" stackId="1" fill={P.teal} fillOpacity={0.6} stroke={P.teal} strokeWidth={1.5} />
              <Area type="monotone" dataKey="childrenPct" name="Children's social care" stackId="1" fill={P.sienna} fillOpacity={0.5} stroke={P.sienna} strokeWidth={1.5} />
            </AreaChart>
          </ChartCard>
        </section>
      )}

      {/* Section 3: Funding sources */}
      {data.fundingSources && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>How Councils Are Funded</h3>
          <p style={SECTION_NOTE}>
            The mix of local authority funding has shifted significantly since 2010. Central government
            grants were cut by approximately 40% in real terms between 2009-10 and 2019-20. To
            compensate, councils became increasingly reliant on council tax, which rose from 34% of
            revenue in 2010-11 to a peak of 52% in 2019-20. Since 2020-21, government grants have
            partially recovered, with the council tax share settling at around 46%.
          </p>
          <ChartCard
            title="Revenue Funding Mix"
            subtitle="Share of local authority revenue by source (%), England"
            source={<>SOURCE: {SOURCE_LINK("https://www.gov.uk/government/collections/local-authority-revenue-expenditure-and-financing", "DLUHC Revenue Outturn")} &middot; {SOURCE_LINK("https://www.instituteforgovernment.org.uk/explainer/local-government-funding-england", "Institute for Government")}</>}
            legend={Object.entries(FUNDING_LABELS).map(([key, label]) => ({
              key, label, color: FUNDING_COLORS[key],
            }))}
            height={340}
          >
            <AreaChart data={data.fundingSources} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 3 : 2} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} label={yAxisLabel("%")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Area type="monotone" dataKey="councilTax" name="Council tax" stackId="1" fill={FUNDING_COLORS.councilTax} fillOpacity={0.65} stroke={FUNDING_COLORS.councilTax} strokeWidth={1.5} />
              <Area type="monotone" dataKey="businessRates" name="Business rates" stackId="1" fill={FUNDING_COLORS.businessRates} fillOpacity={0.55} stroke={FUNDING_COLORS.businessRates} strokeWidth={1.5} />
              <Area type="monotone" dataKey="govGrants" name="Government grants" stackId="1" fill={FUNDING_COLORS.govGrants} fillOpacity={0.6} stroke={FUNDING_COLORS.govGrants} strokeWidth={1.5} />
              <Area type="monotone" dataKey="other" name="Other" stackId="1" fill={FUNDING_COLORS.other} fillOpacity={0.35} stroke={FUNDING_COLORS.other} strokeWidth={1} />
            </AreaChart>
          </ChartCard>
        </section>
      )}

      {/* Section 4: Council tax */}
      {data.councilTax && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Council Tax</h3>
          <p style={SECTION_NOTE}>
            The average Band D council tax in England rose from £1,439 in 2010-11 to £2,280 in
            2025-26, an increase of {s.avgBandDChange}% in cash terms. Between 2011-12 and 2015-16,
            many councils accepted government freeze grants, keeping council tax growth below 2%
            annually. From 2016-17, councils gained permission to levy a social care precept of up
            to 2% on top of the standard referendum threshold, accelerating the rate of increase.
          </p>
          <ChartCard
            title="Average Band D Council Tax"
            subtitle="England, all local authority types, £ per year"
            source={<>SOURCE: {SOURCE_LINK("https://www.gov.uk/government/statistics/council-tax-levels-set-by-local-authorities-in-england-2025-to-2026", "DLUHC Council Tax Levels 2025-26")}</>}
            height={320}
          >
            <BarChart data={data.councilTax} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} vertical={false} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 3 : 2} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 2500]} label={yAxisLabel("£")} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.year}</div>
                      <div style={{ color: P.navy }}>Band D: £{d.bandD?.toLocaleString()}</div>
                    </div>
                  );
                }}
              />
              <ReferenceLine x="2016-17" stroke={P.grey} strokeDasharray="4 4"
                label={{ value: "Social care precept", fontSize: 10, fill: P.grey, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
              <Bar dataKey="bandD" name="Band D (£)" fill={P.navy} fillOpacity={0.7} radius={[3, 3, 0, 0]} barSize={isMobile ? 10 : 16} />
            </BarChart>
          </ChartCard>
        </section>
      )}

      {/* Section 5: Core spending power */}
      {data.coreSpendingPower && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Core Spending Power</h3>
          <p style={SECTION_NOTE}>
            Core spending power measures the total resources available to councils, combining government
            grants, council tax, and retained business rates. On a per-person basis, adjusting for
            inflation and population growth, core spending power in 2024-25 remains 18% below 2010-11
            levels. The most deprived areas experienced the largest reductions, with funding per person
            approximately 26% lower than in 2010-11, compared with 11% lower for the least deprived.
          </p>
          <ChartCard
            title="Core Spending Power per Person"
            subtitle="Real terms, indexed (2010-11 = 100), England"
            source={<>SOURCE: {SOURCE_LINK("https://ifs.org.uk/publications/how-have-english-councils-funding-and-spending-changed-2010-2024", "IFS")} &middot; {SOURCE_LINK("https://www.gov.uk/government/collections/final-local-government-finance-settlement-england-2024-to-2025", "DLUHC Local Government Finance Settlement")}</>}
            height={300}
          >
            <LineChart data={data.coreSpendingPower} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 3 : 2} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[60, 105]} label={yAxisLabel("Index")} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={100} stroke={P.grey} strokeDasharray="4 4" label={{ value: "2010-11 level", fontSize: 10, fill: P.grey, position: "right", fontFamily: "'DM Mono', monospace" }} />
              <Line type="monotone" dataKey="index" name="Core spending power index" stroke={P.navy} strokeWidth={2.5} dot={{ r: 3, fill: P.navy }} />
            </LineChart>
          </ChartCard>
        </section>
      )}

      {/* Section 6: Financial health — Section 114 notices */}
      {data.section114 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Financial Health</h3>
          <p style={SECTION_NOTE}>
            A section 114 notice is issued by a council's chief finance officer under the Local
            Government Finance Act 1988 when expenditure is likely to exceed available resources
            in a financial year. Between 2018 and 2023, seven councils issued section 114 notices.
            Before 2018, the last notice was issued by the London Borough of Hackney in 2000.
            As of 2024-25, 42 authorities have received exceptional financial support from
            government, totalling over £5 billion.
          </p>

          {/* Section 114 timeline */}
          <ChartCard
            title="Section 114 Notices"
            subtitle="Councils issuing section 114 notices, 2018-2023"
            source={<>SOURCE: {SOURCE_LINK("https://www.nao.org.uk/reports/local-government-financial-sustainability-2025/", "NAO Financial Sustainability (2025)")} &middot; {SOURCE_LINK("https://commonslibrary.parliament.uk/what-happens-if-a-council-goes-bankrupt/", "House of Commons Library")}</>}
          >
            <div style={{ padding: isMobile ? "8px 0" : "8px 4px" }}>
              {data.section114.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: isMobile ? 10 : 16,
                    padding: "10px 0",
                    borderBottom: i < data.section114.length - 1 ? `1px solid ${P.border}` : "none",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{
                    minWidth: isMobile ? 70 : 90,
                    fontSize: "12px",
                    fontFamily: "'DM Mono', monospace",
                    color: P.textLight,
                    paddingTop: 1,
                  }}>
                    {new Date(item.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <div>
                    <div style={{
                      fontSize: "14px",
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 600,
                      color: P.text,
                      marginBottom: 2,
                    }}>
                      {item.council}
                    </div>
                    <div style={{
                      fontSize: "12px",
                      fontFamily: "'DM Mono', monospace",
                      color: P.textMuted,
                      lineHeight: 1.5,
                    }}>
                      {item.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </section>
      )}

      {/* Section 7: Reserves */}
      {data.reserves && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Reserves</h3>
          <p style={SECTION_NOTE}>
            Local authorities built up usable reserves from £13bn in 2010-11 to a peak of £31.2bn
            in 2021-22, partly as a contingency against further funding reductions and partly due
            to unspent COVID-related grants. Reserves have since declined to an estimated £{s.usableReserves}bn
            in {s.usableReservesYear}, with reserves as a proportion of service spending at their lowest
            level since 2011-12. Some councils have drawn heavily on reserves to balance budgets,
            reducing their financial resilience.
          </p>
          <ChartCard
            title="Usable Reserves"
            subtitle="Total usable reserves held by local authorities, £bn, England"
            source={<>SOURCE: {SOURCE_LINK("https://www.nao.org.uk/reports/local-government-financial-sustainability-2025/", "NAO")} &middot; {SOURCE_LINK("https://www.gov.uk/government/collections/local-authority-revenue-expenditure-and-financing", "DLUHC")}</>}
            height={300}
          >
            <BarChart data={data.reserves} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} vertical={false} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 3 : 2} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 35]} label={yAxisLabel("£bn")} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 3, padding: "8px 12px", fontSize: "12px", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.year}</div>
                      <div style={{ color: P.navy }}>£{d.usable}bn</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="usable" name="Usable reserves (£bn)" fill={P.teal} fillOpacity={0.7} radius={[3, 3, 0, 0]} barSize={isMobile ? 12 : 18} />
            </BarChart>
          </ChartCard>
        </section>
      )}

      {/* Section 8: Audit backlog */}
      {data.auditBacklog && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Audit Backlog</h3>
          <p style={SECTION_NOTE}>
            The number of outstanding local authority audited accounts rose from 29 in 2017-18 to a
            peak of 918 in 2022-23, reflecting a breakdown of the local audit system following
            the abolition of the Audit Commission in 2015. The government introduced a statutory
            backstop programme in 2024, requiring all accounts up to 2022-23 to be signed off by
            December 2024. This reduced the backlog to approximately 100 outstanding audits by
            the end of 2024-25.
          </p>
          <ChartCard
            title="Outstanding Unaudited Accounts"
            subtitle="Number of local authority accounts outstanding past deadline, England"
            source={<>SOURCE: {SOURCE_LINK("https://www.gov.uk/government/publications/local-audit-reform", "DLUHC Local Audit Reform")} &middot; {SOURCE_LINK("https://www.nao.org.uk/reports/local-government-financial-sustainability-2025/", "NAO")}</>}
            height={300}
          >
            <BarChart data={data.auditBacklog} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} vertical={false} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[0, 1000]} label={yAxisLabel("Accounts")} />
              <Tooltip content={<CustomTooltip />} />
              <MethodologyBreak breaks={getBreaks(raw, "auditBacklog")} />
              <Bar dataKey="outstanding" name="Outstanding audits" fill={P.red} fillOpacity={0.7} radius={[3, 3, 0, 0]} barSize={isMobile ? 16 : 24} />
            </BarChart>
          </ChartCard>
        </section>
      )}

      {/* Section 9: Workforce */}
      {data.workforce && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={SECTION_HEADING}>Local Government Workforce</h3>
          <p style={SECTION_NOTE}>
            The local government workforce in England (excluding police, fire, and centrally-funded
            teachers) fell from approximately 1,510,000 FTE in 2010 to {s.workforceFte?.toLocaleString()},000
            FTE in {s.workforceFteYear}, a reduction of {Math.abs(s.workforceFteChange)}%. The majority of
            reductions occurred between 2010 and 2016, coinciding with the deepest period of
            spending reductions. Approximately 73% of the local government workforce is female, and
            the average full-time salary is £37,000.
          </p>
          <ChartCard
            title="Local Government Workforce"
            subtitle="Full-time equivalent employees (thousands), England, excluding police, fire, teachers"
            source={<>SOURCE: {SOURCE_LINK("https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/publicsectorpersonnel", "ONS Quarterly Public Sector Employment Survey")}</>}
            height={300}
          >
            <LineChart data={data.workforce} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} domain={[800, 1600]} label={yAxisLabel("FTE (k)")} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}k FTE`} />} />
              <Line type="monotone" dataKey="fte" name="FTE (thousands)" stroke={P.navy} strokeWidth={2.5} dot={{ r: 3, fill: P.navy }} />
            </LineChart>
          </ChartCard>
        </section>
      )}

      <AnalysisBox color={P.navy} label="Summary">
        Local authority service spending in England (excluding education) totalled £89.8bn in
        2024-25. Social care now accounts for {s.socialCarePct}% of councils' non-education spending,
        up from approximately 42% in 2010-11, squeezing discretionary services such as highways,
        cultural services, and planning by more than 40% in real terms per person.
        {" "}Core spending power per person remains 18% below 2010-11 levels in real terms. Council
        tax has risen from £1,439 to £2,280 (Band D average), partly offsetting a 40% real-terms
        cut in government grants.
        {" "}Seven councils issued section 114 notices between 2018 and 2023, and 42 councils have
        received exceptional financial support. The local audit backlog, which peaked at 918
        outstanding accounts in 2022-23, has been substantially reduced following the government's
        statutory backstop programme.
      </AnalysisBox>
    </div>
  );
}
