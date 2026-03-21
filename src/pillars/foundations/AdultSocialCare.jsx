import { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, ComposedChart, AreaChart, Area, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, yAxisLabel,
  withFyNum, fyTickFormatter,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ChartCard from "../../components/ChartCard";
import MethodologyBreak, { getMethodologyBreaks } from "../../components/MethodologyBreak";
import { useJsonDataset, sourceFrom, getBreaks } from "../../hooks/useDataset";
import useIsMobile from "../../hooks/useIsMobile";

const GRID = { strokeDasharray: "3 3", stroke: "rgba(28,43,69,0.06)" };

export default function AdultSocialCare() {
  const isMobile = useIsMobile();
  const { data, loading, error, raw } = useJsonDataset("adult-social-care.json");
  const [supportView, setSupportView] = useState("requests");
  const [workforceView, setWorkforceView] = useState("workforce");
  const [ratingsView, setRatingsView] = useState("trend");
  const [spendView, setSpendView] = useState("total");
  const [priceView, setPriceView] = useState("nominal");

  // Hooks must run before any early returns
  const requests = useMemo(() => withFyNum(data?.requestsForSupport || []), [data]);
  const lts = useMemo(() => withFyNum(data?.longTermSupport || []), [data]);
  const spend = useMemo(() => withFyNum(data?.spending || []), [data]);
  const wf = useMemo(() => withFyNum(data?.workforce || []), [data]);
  const ratingsStacked = useMemo(() =>
    (data?.cqcRatings || []).map(d => ({
      ...d,
      goodOrOutstanding: (d.outstanding || 0) + (d.good || 0),
    })),
    [data]
  );

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Adult Social Care</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading adult social care data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Adult Social Care</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const snap = data.snapshot || {};

  const payData = data.pay || [];
  const ratings = data.cqcRatings || [];
  const unpaid = data.unpaidCarers || [];
  const selfFunders = data.selfFunders || [];

  const lastReq = requests[requests.length - 1];
  const lastLts = lts[lts.length - 1];
  const lastSpend = spend[spend.length - 1];
  const lastWf = wf[wf.length - 1];
  const lastPay = payData[payData.length - 1];
  const lastRating = ratings[ratings.length - 1];

  // Unpaid carers providing care (excluding "no unpaid care")
  const unpaidProviding = unpaid.filter(d => d.category !== "No unpaid care");
  const totalUnpaid = unpaidProviding.reduce((sum, d) => sum + d.count, 0);

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>
          Adult Social Care
        </h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          England &middot; {snap.requestsYear}
        </span>
      </div>

      {/* ═══ SECTION 1 — DEMAND & SUPPORT ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Demand &amp; Support</h3>
        <p style={SECTION_NOTE}>
          Local authorities received {snap.requestsM} million new requests for adult social care
          support in {snap.requestsYear}. {(snap.longTermSupport / 1000).toFixed(0)}k people were receiving
          long-term support as at 31 March 2025. While the number of requests has risen over the past
          decade, the number of older adults (65+) receiving long-term support fell between 2015-16
          and 2020-21, before recovering. The number of working-age adults receiving support has grown
          steadily, reflecting increased demand from people with learning disabilities and mental health needs.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard label="New requests" value={`${snap.requestsM}m`} change={snap.requestsYear} color={P.red} delay={0.1} />
          <MetricCard label="Long-term support" value={`${(snap.longTermSupport / 1000).toFixed(0)}k`} change={`people (${snap.longTermSupportYear})`} color={P.teal} delay={0.18} />
          <MetricCard label="Total spending" value={`£${snap.totalSpendingBn}bn`} change={snap.totalSpendingYear} color={P.navy} delay={0.26} />
          <MetricCard label="Care workers" value={`${snap.filledPostsK / 1000}m`} change={`filled posts (${snap.filledPostsYear})`} color={P.sienna} delay={0.34} />
        </div>

        <ChartCard
          title={supportView === "requests" ? "New Requests for Support" : "People Receiving Long-Term Support"}
          subtitle={supportView === "requests"
            ? `Millions, England, ${data.requestsForSupport?.[0]?.year}-${lastReq?.year}`
            : `Thousands, England, ${data.longTermSupport?.[0]?.year}-${lastLts?.year}`
          }
          views={["requests", "longTerm"]}
          viewLabels={{ requests: "Requests", longTerm: "Long-Term" }}
          activeView={supportView}
          onViewChange={setSupportView}
          source={sourceFrom(raw, supportView === "requests" ? "requestsForSupport" : "longTermSupport")}
          legend={supportView === "longTerm" ? [
            { key: "65plus", label: "Aged 65+", color: P.navy },
            { key: "18-64", label: "Aged 18-64", color: P.teal },
          ] : undefined}
          isMobile={isMobile}
        >
          {supportView === "requests" ? (
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={requests} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="fyNum" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO}
                  tickFormatter={fyTickFormatter} />
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  label={yAxisLabel("Millions")} domain={[0, "auto"]} />
                <Tooltip content={<CustomTooltip formatter={v => `${v}m`} labelFormatter={fyTickFormatter} />} />
                <MethodologyBreak breaks={getBreaks(raw, "requestsForSupport")} />
                <Bar dataKey="newRequestsM" name="New requests (millions)" fill={P.red} opacity={0.25} radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="newRequestsM" name="New requests (millions)" stroke={P.red} strokeWidth={2.5} dot={{ r: 3, fill: P.red }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={lts} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="fyNum" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO}
                  tickFormatter={fyTickFormatter} />
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  label={yAxisLabel("Thousands")} domain={[0, "auto"]}
                  tickFormatter={v => `${v}k`} />
                <Tooltip content={<CustomTooltip formatter={v => `${v}k`} labelFormatter={fyTickFormatter} />} />
                <Area type="monotone" dataKey="aged18to64" stackId="1" name="Aged 18-64" stroke={P.teal} fill={P.teal} fillOpacity={0.4} />
                <Area type="monotone" dataKey="aged65plus" stackId="1" name="Aged 65+" stroke={P.navy} fill={P.navy} fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ═══ SECTION 3 — WORKFORCE ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Workforce</h3>
        <p style={SECTION_NOTE}>
          There were {(snap.filledPostsK / 1000).toFixed(2)} million filled posts in adult social care
          in England in {snap.filledPostsYear}. The vacancy rate fell to {snap.vacancyRate}%, returning
          to pre-pandemic levels after a peak of 10.6% in 2021-22. The turnover rate
          was {snap.turnoverRate}%, down from 30.7% in 2017-18. Approximately {snap.zeroHoursPct}% of
          the domiciliary care workforce are employed on zero-hours contracts.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard label="Filled posts" value={`${(snap.filledPostsK / 1000).toFixed(2)}m`} change={snap.filledPostsYear} color={P.teal} delay={0.1} />
          <MetricCard label="Vacancy rate" value={`${snap.vacancyRate}%`} change={snap.vacancyRateYear} up={false} color={P.red} delay={0.18} />
          <MetricCard label="Turnover rate" value={`${snap.turnoverRate}%`} change={snap.turnoverRateYear} up={false} color={P.sienna} delay={0.26} />
          <MetricCard label="Zero-hours" value={`${snap.zeroHoursPct}%`} change="of domiciliary care" color={P.grey} delay={0.34} />
        </div>

        <ChartCard
          title={workforceView === "workforce" ? "Filled Posts & Vacancy Rate" : "Turnover Rate"}
          subtitle={`England, ${data.workforce?.[0]?.year}-${data.workforce?.[data.workforce.length - 1]?.year}`}
          views={["workforce", "turnover"]}
          viewLabels={{ workforce: "Posts & Vacancies", turnover: "Turnover" }}
          activeView={workforceView}
          onViewChange={setWorkforceView}
          source={sourceFrom(raw, "workforce")}
          legend={workforceView === "workforce" ? [
            { key: "posts", label: "Filled posts (thousands)", color: P.navy },
            { key: "vacancy", label: "Vacancy rate (%)", color: P.red },
          ] : undefined}
          isMobile={isMobile}
        >
          {workforceView === "workforce" ? (
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={wf} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="fyNum" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO}
                  tickFormatter={fyTickFormatter} />
                <YAxis yAxisId="left" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  label={yAxisLabel("Filled posts (k)")} domain={[0, "auto"]} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  label={yAxisLabel("Vacancy rate (%)", { position: "insideRight" })} domain={[0, 14]} />
                <Tooltip content={<CustomTooltip labelFormatter={fyTickFormatter} />} />
                <Bar yAxisId="left" dataKey="filledPostsK" name="Filled posts (k)" fill={P.navy} opacity={0.3} radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="vacancyRate" name="Vacancy rate (%)" stroke={P.red} strokeWidth={2.5} dot={{ r: 3, fill: P.red }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={wf} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="fyNum" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO}
                  tickFormatter={fyTickFormatter} />
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  label={yAxisLabel("Rate (%)")} domain={[0, 40]} />
                <Tooltip content={<CustomTooltip formatter={v => `${v}%`} labelFormatter={fyTickFormatter} />} />
                <Line type="monotone" dataKey="turnoverRate" name="Turnover rate" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 3, fill: P.sienna }} />
                <Line type="monotone" dataKey="vacancyRate" name="Vacancy rate" stroke={P.red} strokeWidth={2} dot={{ r: 2.5, fill: P.red }} strokeDasharray="6 3" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ═══ SECTION 4 — PAY ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Pay</h3>
        <p style={SECTION_NOTE}>
          The median hourly pay for independent sector care workers was £{lastPay?.careWorker?.toFixed(2)} in
          December {lastPay?.year}, compared to the National Living Wage of £{lastPay?.nlw?.toFixed(2)} and
          the UK median hourly wage of £{lastPay?.medianUK?.toFixed(2)}. Care worker pay has
          consistently tracked close to the statutory minimum, with 26% of care workers paid at or within
          10p of the National Living Wage. Experienced staff earn on average just 10p more per hour
          than those new to the sector.
        </p>

        <ChartCard
          title="Care Worker Pay vs National Living Wage"
          subtitle={`Median hourly pay (£), England, ${payData[0]?.year}-${lastPay?.year}`}
          source={sourceFrom(raw, "pay")}
          legend={[
            { key: "care", label: "Care worker (independent)", color: P.sienna },
            { key: "nlw", label: "National Living Wage", color: P.red },
            { key: "median", label: "UK median hourly pay", color: P.navy },
          ]}
          isMobile={isMobile}
        >
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={payData} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                label={yAxisLabel("£ per hour")} domain={[0, "auto"]}
                tickFormatter={v => `£${v}`} />
              <Tooltip content={<CustomTooltip formatter={v => `£${v?.toFixed(2)}`} />} />
              <Line type="monotone" dataKey="careWorker" name="Care worker" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 3, fill: P.sienna }} />
              <Line type="monotone" dataKey="nlw" name="National Living Wage" stroke={P.red} strokeWidth={2} dot={{ r: 2.5, fill: P.red }} strokeDasharray="6 3" />
              <Line type="monotone" dataKey="medianUK" name="UK median" stroke={P.navy} strokeWidth={2} dot={{ r: 2.5, fill: P.navy }} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ═══ SECTION 2 — SPENDING ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Spending</h3>
        <p style={SECTION_NOTE}>
          Net current expenditure on adult social care was £{lastSpend?.totalBn}bn
          in {data.spending?.[data.spending.length - 1]?.year}, up
          from £{data.spending?.[0]?.totalBn}bn in {data.spending?.[0]?.year}. The cash/real
          toggle shows nominal and inflation-adjusted trends.
        </p>

        <ChartCard
          title={spendView === "total" ? "Adult Social Care Spending" : "Spending per Recipient"}
          subtitle={spendView === "total"
            ? `Net current expenditure (£bn), ${priceView === "real" ? "2024-25 prices" : "cash terms"}, England`
            : `Per long-term support recipient, ${priceView === "real" ? "2024-25 prices" : "cash terms"}, England`
          }
          views={["total", "perRecipient"]}
          viewLabels={{ total: "Total (£bn)", perRecipient: "Per Recipient" }}
          activeView={spendView}
          onViewChange={setSpendView}
          source={sourceFrom(raw, "spending")}
          isMobile={isMobile}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button onClick={() => setPriceView("nominal")} style={{ background: priceView === "nominal" ? "rgba(28,43,69,0.06)" : "transparent", border: `1px solid ${P.borderStrong}`, color: priceView === "nominal" ? P.text : P.textLight, padding: "3px 10px", fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", fontFamily: "'DM Mono', monospace", borderRadius: 2 }}>Cash</button>
            <button onClick={() => setPriceView("real")} style={{ background: priceView === "real" ? "rgba(28,43,69,0.06)" : "transparent", border: `1px solid ${P.borderStrong}`, color: priceView === "real" ? P.text : P.textLight, padding: "3px 10px", fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", fontFamily: "'DM Mono', monospace", borderRadius: 2 }}>Real (2024-25)</button>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={spend} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="fyNum" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO}
                tickFormatter={fyTickFormatter} />
              {spendView === "total" ? (
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  label={yAxisLabel("£ billions")} domain={[0, "auto"]}
                  tickFormatter={v => `£${v}bn`} />
              ) : (
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  label={yAxisLabel(priceView === "real" ? "£ per recipient (real)" : "£ per recipient")} domain={[0, "auto"]}
                  tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
              )}
              <Tooltip content={<CustomTooltip formatter={v =>
                spendView === "total" ? `£${v}bn` : `£${v?.toLocaleString()}`
              } labelFormatter={fyTickFormatter} />} />
              {spendView === "total" ? (
                <>
                  <Bar dataKey={priceView === "real" ? "totalBnReal" : "totalBn"} name={priceView === "real" ? "Total (real)" : "Total (cash)"} fill={P.navy} opacity={0.25} radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey={priceView === "real" ? "totalBnReal" : "totalBn"} name={priceView === "real" ? "Total (real)" : "Total (cash)"} stroke={P.navy} strokeWidth={2.5} dot={{ r: 3, fill: P.navy }} />
                </>
              ) : (
                <>
                  <ReferenceLine x={2014} stroke={P.red} strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ value: "SALT replaces RAP", fontSize: 10, fill: P.red, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
                  <Bar dataKey={priceView === "real" ? "perRecipientReal" : "perRecipient"} name={priceView === "real" ? "Per recipient (real)" : "Per recipient (cash)"} fill={P.sienna} opacity={0.25} radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey={priceView === "real" ? "perRecipientReal" : "perRecipient"} name={priceView === "real" ? "Per recipient (real)" : "Per recipient (cash)"} stroke={P.sienna} strokeWidth={2.5} dot={{ r: 3, fill: P.sienna }} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      {/* ═══ SECTION 5 — CQC RATINGS ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>CQC Ratings</h3>
        <p style={SECTION_NOTE}>
          As at 31 March {lastRating?.year}, {lastRating?.outstanding + lastRating?.good}% of adult social care
          providers were rated Good or Outstanding by the Care Quality Commission, with {lastRating?.reqImprovement}%
          rated Requires Improvement and {lastRating?.inadequate}% rated Inadequate. The proportion rated Good
          or Outstanding has been broadly stable since 2019.
        </p>

        <ChartCard
          title={ratingsView === "trend" ? "CQC Ratings Over Time" : "Current Rating Distribution"}
          subtitle={ratingsView === "trend"
            ? `% of rated adult social care providers, England, ${ratings[0]?.year}-${lastRating?.year}`
            : `As at 31 March ${lastRating?.year}`
          }
          views={["trend", "current"]}
          viewLabels={{ trend: "Trend", current: "Current" }}
          activeView={ratingsView}
          onViewChange={setRatingsView}
          source={sourceFrom(raw, "cqcRatings")}
          legend={ratingsView === "trend" ? [
            { key: "good", label: "Good or Outstanding", color: P.teal },
            { key: "ri", label: "Requires Improvement", color: P.sienna },
            { key: "inad", label: "Inadequate", color: P.red },
          ] : undefined}
          isMobile={isMobile}
        >
          {ratingsView === "trend" ? (
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={ratingsStacked} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO} />
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  label={yAxisLabel("Percentage")} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip formatter={v => `${v}%`} />} />
                <Area type="monotone" dataKey="inadequate" stackId="1" name="Inadequate" stroke={P.red} fill={P.red} fillOpacity={0.5} />
                <Area type="monotone" dataKey="reqImprovement" stackId="1" name="Requires Improvement" stroke={P.sienna} fill={P.sienna} fillOpacity={0.4} />
                <Area type="monotone" dataKey="good" stackId="1" name="Good" stroke={P.teal} fill={P.teal} fillOpacity={0.4} />
                <Area type="monotone" dataKey="outstanding" stackId="1" name="Outstanding" stroke={P.navy} fill={P.navy} fillOpacity={0.5} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={[
                  { rating: "Outstanding", pct: lastRating?.outstanding },
                  { rating: "Good", pct: lastRating?.good },
                  { rating: "Requires Improvement", pct: lastRating?.reqImprovement },
                  { rating: "Inadequate", pct: lastRating?.inadequate },
                ]}
                margin={{ top: 5, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid {...GRID} />
                <XAxis dataKey="rating" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  label={yAxisLabel("Percentage")} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip formatter={v => `${v}%`} />} />
                <Bar dataKey="pct" name="% of providers" radius={[3, 3, 0, 0]}>
                  {[P.navy, P.teal, P.sienna, P.red].map((color, i) => (
                    <Cell key={i} fill={color} opacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ═══ SECTION 6 — UNPAID CARERS ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Unpaid Carers</h3>
        <p style={SECTION_NOTE}>
          The 2021 Census recorded approximately {(totalUnpaid / 1000000).toFixed(1)} million people providing
          unpaid care in England, 8.9% of the population aged 5 and over. Of these,
          1.4 million provided 50 or more hours of unpaid care per week. 10.3% of women provided
          unpaid care compared to 7.6% of men. There were approximately 120,000 young carers aged 5-17.
        </p>

        <ChartCard
          title="Unpaid Carers by Hours per Week"
          subtitle="England, Census 2021"
          source={sourceFrom(raw, "unpaidCarers")}
          isMobile={isMobile}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={unpaidProviding} margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="category" tick={{ fontSize: isMobile ? 9 : 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }}
                axisLine={{ stroke: P.border }} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000000).toFixed(1)}m`}
                label={yAxisLabel("People")} domain={[0, "auto"]} />
              <Tooltip content={<CustomTooltip formatter={v => `${(v / 1000000).toFixed(2)}m`} />} />
              <Bar dataKey="count" name="People" fill={P.teal} opacity={0.7} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ═══ SECTION 7 — SELF-FUNDERS ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Self-funders</h3>
        <p style={SECTION_NOTE}>
          An estimated 37% of care home residents fund their own care, compared to 26% of community
          care service users. Self-funders pay approximately 40% more for care home places and around
          £3 more per hour for home care than publicly funded clients. These figures are likely to be
          underestimates, as self-funders are not systematically tracked by local authorities.
        </p>

        <ChartCard
          title="Funding Sources by Care Setting"
          subtitle="Estimated proportion (%), England, 2019-22"
          source={sourceFrom(raw, "selfFunders")}
          legend={[
            { key: "self", label: "Self-funded", color: P.sienna },
            { key: "council", label: "Council-funded", color: P.navy },
            { key: "nhs", label: "NHS-funded", color: P.teal },
          ]}
          isMobile={isMobile}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={selfFunders} margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="setting" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                label={yAxisLabel("Percentage")} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip formatter={v => `${v}%`} />} />
              <Bar dataKey="selfFundedPct" name="Self-funded" stackId="1" fill={P.sienna} opacity={0.7} />
              <Bar dataKey="councilFundedPct" name="Council-funded" stackId="1" fill={P.navy} opacity={0.7} />
              <Bar dataKey="nhsFundedPct" name="NHS-funded" stackId="1" fill={P.teal} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <AnalysisBox color={P.teal} label="Context">
        Adult social care in England received {snap.requestsM} million new requests for
        support in {snap.requestsYear}, with {(snap.longTermSupport / 1000).toFixed(0)}k people receiving
        long-term care. Total spending reached £{snap.totalSpendingBn}bn, having fallen in real terms
        between 2010-11 and 2014-15 before recovering. The workforce of {(snap.filledPostsK / 1000).toFixed(2)} million
        filled posts saw its vacancy rate fall to {snap.vacancyRate}%, though turnover
        remains at {snap.turnoverRate}%. Care worker median pay of £{snap.careWorkerPay?.toFixed(2)}/hr sits
        just 39p above the National Living Wage. {snap.cqcGoodOrOutstanding}% of providers are rated Good
        or Outstanding by CQC. An estimated {(totalUnpaid / 1000000).toFixed(1)} million people provide unpaid care,
        with 1.4 million providing 50+ hours per week.
      </AnalysisBox>
    </div>
  );
}
