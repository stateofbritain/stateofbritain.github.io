import { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, ComposedChart, AreaChart, Area, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, yAxisLabel,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ChartCard from "../../components/ChartCard";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";
import useIsMobile from "../../hooks/useIsMobile";

const GRID = { strokeDasharray: "3 3", stroke: "rgba(28,43,69,0.06)" };

export default function ChildrensSocialCare() {
  const isMobile = useIsMobile();
  const { data, loading, error, raw } = useJsonDataset("childrens-social-care.json");
  const [claView, setClaView] = useState("total");
  const [fosterView, setFosterView] = useState("carers");
  const [workforceView, setWorkforceView] = useState("caseload");
  const [spendingView, setSpendingView] = useState("total");
  const [priceView, setPriceView] = useState("nominal");

  // Hooks must run before any early returns
  const recruitWithNet = useMemo(() =>
    (data?.fosterRecruitment || []).map(d => ({ ...d, net: d.newApprovals - d.deregistrations })),
    [data]
  );

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Children's Social Care</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading children's social care data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Children's Social Care</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const snap = data.snapshot || {};
  const cla = data.childrenLookedAfter || [];
  const firstCla = cla[0];
  const lastCla = cla[cla.length - 1];
  const claChange = firstCla && lastCla ? (((lastCla.total - firstCla.total) / firstCla.total) * 100).toFixed(0) : null;

  const fc = data.fosterCarers || [];
  const lastFc = fc[fc.length - 1];

  const recruit = data.fosterRecruitment || [];

  const sw = data.socialWorkerWorkforce || [];
  const lastSw = sw[sw.length - 1];

  const refs = data.referralsAndProtection || [];
  const lastRef = refs[refs.length - 1];

  const spend = data.spending || [];
  const lastSpend = spend[spend.length - 1];

  const cl = data.careLeavers || [];
  const lastCl = cl[cl.length - 1];

  const placements = data.placementTypes || [];
  const fosterBk = data.fosterBreakdown || [];

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>
          Children's Social Care
        </h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          England &middot; {snap.childrenInCareYear}
        </span>
      </div>

      {/* ═══ SECTION 1 — CHILDREN LOOKED AFTER ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Children Looked After</h3>
        <p style={SECTION_NOTE}>
          The number of children in the care system in England reached {lastCla?.total?.toLocaleString()} in {lastCla?.year},
          a rate of {lastCla?.ratePer10k} per 10,000 children under 18. This represents
          a {claChange}% increase since {firstCla?.year}. The rate rose from {firstCla?.ratePer10k} to {lastCla?.ratePer10k} per
          10,000 over the same period, with approximately half of that increase occurring since 2018.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard label="Children in care" value={`${(snap.childrenInCare / 1000).toFixed(1)}k`} change={`rate ${snap.childrenInCareRate} per 10,000 (${snap.childrenInCareYear})`} color={P.red} delay={0.1} />
          <MetricCard label="Foster carers" value={snap.fosterCarers?.toLocaleString()} change={`${snap.fosterCarersChange}% since ${snap.fosterCarersChangeFrom}`} up={false} color={P.sienna} delay={0.18} />
          <MetricCard label="Avg caseload" value={snap.avgCaseload?.toString()} change={`per social worker (${snap.avgCaseloadYear})`} color={P.teal} delay={0.26} />
          <MetricCard label="SW vacancy rate" value={`${snap.vacancyRate}%`} change={snap.vacancyRateYear?.toString()} color={P.navy} delay={0.34} />
        </div>

        <ChartCard
          title={claView === "total" ? "Children Looked After" : "Rate per 10,000"}
          subtitle={claView === "total"
            ? `England, ${firstCla?.year}-${lastCla?.year}`
            : `Per 10,000 children under 18, England, ${firstCla?.year}-${lastCla?.year}`
          }
          views={["total", "rate"]}
          viewLabels={{ total: "Total", rate: "Rate" }}
          activeView={claView}
          onViewChange={setClaView}
          source={sourceFrom(raw, "childrenLookedAfter")}
          isMobile={isMobile}
        >
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={cla} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO} />
              {claView === "total" ? (
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  label={yAxisLabel("Children")} domain={[0, "auto"]} />
              ) : (
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  label={yAxisLabel("Per 10,000")} domain={[0, "auto"]} />
              )}
              <Tooltip content={<CustomTooltip formatter={v => claView === "total" ? v?.toLocaleString() : v} />} />
              {claView === "total" ? (
                <>
                  <Bar dataKey="total" name="Children looked after" fill={P.red} opacity={0.25} radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="total" name="Children looked after" stroke={P.red} strokeWidth={2.5} dot={{ r: 3, fill: P.red }} />
                </>
              ) : (
                <>
                  <Bar dataKey="ratePer10k" name="Rate per 10,000" fill={P.teal} opacity={0.25} radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="ratePer10k" name="Rate per 10,000" stroke={P.teal} strokeWidth={2.5} dot={{ r: 3, fill: P.teal }} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ═══ SECTION 2 — FOSTER CARE ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Foster Care</h3>
        <p style={SECTION_NOTE}>
          The number of approved mainstream foster carers in England was {lastFc?.approved?.toLocaleString()} as
          at March {lastFc?.year}, a decline of 12% from {fc.find(d => d.year === 2021)?.approved?.toLocaleString()} in 2021.
          In {recruitWithNet[recruitWithNet.length - 1]?.year}, {recruitWithNet[recruitWithNet.length - 1]?.newApprovals?.toLocaleString()} new
          foster households were approved while {recruitWithNet[recruitWithNet.length - 1]?.deregistrations?.toLocaleString()} deregistered,
          a net loss of {Math.abs(recruitWithNet[recruitWithNet.length - 1]?.net)} households.
          Around one third of approved carers are aged 60 or over, up from a quarter five years ago.
        </p>

        <ChartCard
          title={fosterView === "carers" ? "Approved Foster Carers" : "Recruitment vs Deregistration"}
          subtitle={fosterView === "carers"
            ? `Mainstream foster carers, England, ${fc[0]?.year}-${lastFc?.year}`
            : `Fostering households, England, ${recruit[0]?.year}-${recruit[recruit.length - 1]?.year}`
          }
          views={["carers", "recruitment"]}
          viewLabels={{ carers: "Foster Carers", recruitment: "Recruitment" }}
          activeView={fosterView}
          onViewChange={setFosterView}
          source={sourceFrom(raw, fosterView === "carers" ? "fosterCarers" : "fosterRecruitment")}
          legend={fosterView === "recruitment" ? [
            { key: "new", label: "Newly approved", color: P.teal },
            { key: "dereg", label: "Deregistered", color: P.red },
          ] : undefined}
          isMobile={isMobile}
        >
          {fosterView === "carers" ? (
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={fc} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO} />
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  label={yAxisLabel("Foster carers")} domain={[0, "auto"]} />
                <Tooltip content={<CustomTooltip formatter={v => v?.toLocaleString()} />} />
                <Bar dataKey="approved" name="Approved carers" fill={P.sienna} opacity={0.3} radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="approved" name="Approved carers" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 3, fill: P.sienna }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={recruitWithNet} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} />
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(1)}k`}
                  label={yAxisLabel("Households")} />
                <Tooltip content={<CustomTooltip formatter={v => v?.toLocaleString()} />} />
                <Bar dataKey="newApprovals" name="Newly approved" fill={P.teal} opacity={0.7} radius={[3, 3, 0, 0]} />
                <Bar dataKey="deregistrations" name="Deregistered" fill={P.red} opacity={0.7} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ═══ SECTION 3 — PLACEMENT TYPES ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Placement Types</h3>
        <p style={SECTION_NOTE}>
          Foster care remains the predominant placement for children looked after, accounting for 67% of all placements
          as at March 2024. Within foster care, placements with a relative or friend have increased to 24% of all
          foster placements, up from 20% in 2020. Children's homes accommodate 10% of looked-after children,
          with spending on residential care at a historical high.
        </p>

        <ChartCard
          title="Children Looked After by Placement Type"
          subtitle="England, as at 31 March 2024"
          source={sourceFrom(raw, "placementTypes")}
          isMobile={isMobile}
        >
          <ResponsiveContainer width="100%" height={Math.max(240, placements.length * 42)}>
            <BarChart data={placements} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid {...GRID} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="type"
                tick={{ fontSize: isMobile ? 10 : 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }}
                axisLine={false} tickLine={false} width={isMobile ? 110 : 140} />
              <Tooltip content={<CustomTooltip formatter={v => v?.toLocaleString()} />} />
              <Bar dataKey="count" name="Children" radius={[0, 3, 3, 0]}>
                {placements.map((entry) => (
                  <Cell key={entry.type}
                    fill={entry.type === "Foster care" ? P.teal : entry.type === "Children's homes" ? P.sienna : P.navy}
                    opacity={0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ═══ SECTION 4 — SOCIAL WORKER WORKFORCE ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Social Worker Workforce</h3>
        <p style={SECTION_NOTE}>
          The average caseload per children's social worker was {lastSw?.avgCaseload} in {lastSw?.year},
          within the recommended range of 15-20 cases and the lowest in the series since 2017. The vacancy
          rate was {lastSw?.vacancyRate}%, down from a peak of 20.3% in 2022. Agency workers accounted
          for {lastSw?.agencyRate}% of the workforce, with 81% of agency workers filling vacant posts
          rather than providing additional capacity.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard label="Avg caseload" value={lastSw?.avgCaseload?.toString()} change={`recommended 15-20 (${lastSw?.year})`} color={P.teal} delay={0.1} />
          <MetricCard label="Vacancy rate" value={`${lastSw?.vacancyRate}%`} change={`down from 20.3% in 2022`} up={false} color={P.navy} delay={0.18} />
          <MetricCard label="Turnover rate" value={`${lastSw?.turnoverRate}%`} change={lastSw?.year?.toString()} color={P.sienna} delay={0.26} />
          <MetricCard label="Agency rate" value={`${lastSw?.agencyRate}%`} change={lastSw?.year?.toString()} color={P.grey} delay={0.34} />
        </div>

        <ChartCard
          title={workforceView === "caseload" ? "Average Caseload per Social Worker" : "Vacancy & Turnover Rates"}
          subtitle={`England, ${sw[0]?.year}-${lastSw?.year}`}
          views={["caseload", "rates"]}
          viewLabels={{ caseload: "Caseload", rates: "Vacancies" }}
          activeView={workforceView}
          onViewChange={setWorkforceView}
          source={sourceFrom(raw, "socialWorkerWorkforce")}
          legend={workforceView === "rates" ? [
            { key: "vacancy", label: "Vacancy rate", color: P.red },
            { key: "turnover", label: "Turnover rate", color: P.navy },
            { key: "agency", label: "Agency rate", color: P.grey },
          ] : undefined}
          isMobile={isMobile}
        >
          {workforceView === "caseload" ? (
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={sw} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO} />
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  label={yAxisLabel("Cases per worker")} domain={[0, 25]} />
                <Tooltip content={<CustomTooltip formatter={v => `${v} cases`} />} />
                <ReferenceLine y={15} stroke={P.teal} strokeDasharray="4 4"
                  label={{ value: "Recommended range (15-20)", fontSize: 10, fill: P.teal, position: "insideTopRight", fontFamily: "'DM Mono', monospace" }} />
                <ReferenceLine y={20} stroke={P.teal} strokeDasharray="4 4" />
                <Bar dataKey="avgCaseload" name="Average caseload" fill={P.sienna} opacity={0.3} radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="avgCaseload" name="Average caseload" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 3, fill: P.sienna }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={sw} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO} />
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  label={yAxisLabel("Rate (%)")} domain={[0, 25]} />
                <Tooltip content={<CustomTooltip formatter={v => `${v}%`} />} />
                <Line type="monotone" dataKey="vacancyRate" name="Vacancy rate" stroke={P.red} strokeWidth={2.5} dot={{ r: 3, fill: P.red }} />
                <Line type="monotone" dataKey="turnoverRate" name="Turnover rate" stroke={P.navy} strokeWidth={2} dot={{ r: 2.5, fill: P.navy }} strokeDasharray="6 3" />
                <Line type="monotone" dataKey="agencyRate" name="Agency rate" stroke={P.grey} strokeWidth={2} dot={{ r: 2.5, fill: P.grey }} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ═══ SECTION 5 — REFERRALS & CHILD PROTECTION ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Referrals &amp; Child Protection</h3>
        <p style={SECTION_NOTE}>
          There were {lastRef?.referrals?.toLocaleString()} referrals to children's social care
          in {lastRef?.year}, relating to approximately 551,000 children. Section 47 enquiries,
          which investigate suspected significant harm, numbered {lastRef?.section47?.toLocaleString()}.
          As at 31 March 2024, {lastRef?.cppAt31Mar?.toLocaleString()} children were subject to a child
          protection plan, equivalent to approximately 1 in every 240 children.
        </p>

        <ChartCard
          title="Referrals, Section 47 Enquiries & Child Protection Plans"
          subtitle={`England, ${refs[0]?.year}-${lastRef?.year}`}
          source={sourceFrom(raw, "referralsAndProtection")}
          legend={[
            { key: "referrals", label: "Referrals (thousands)", color: P.navy },
            { key: "section47", label: "Section 47 enquiries (thousands)", color: P.red },
            { key: "cpp", label: "Children on CPP at 31 March (thousands)", color: P.teal },
          ]}
          isMobile={isMobile}
        >
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={refs} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false}
                interval={isMobile ? 2 : 1} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                label={yAxisLabel("Thousands")} domain={[0, "auto"]} />
              <Tooltip content={<CustomTooltip formatter={v => `${(v / 1000).toFixed(1)}k`} />} />
              <Line type="monotone" dataKey="referrals" name="Referrals" stroke={P.navy} strokeWidth={2.5} dot={{ r: 3, fill: P.navy }} />
              <Line type="monotone" dataKey="section47" name="Section 47 enquiries" stroke={P.red} strokeWidth={2} dot={{ r: 2.5, fill: P.red }} strokeDasharray="6 3" />
              <Line type="monotone" dataKey="cppAt31Mar" name="Children on CPP" stroke={P.teal} strokeWidth={2} dot={{ r: 2.5, fill: P.teal }} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ═══ SECTION 6 — SPENDING ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Spending</h3>
        <p style={SECTION_NOTE}>
          Total children's social care spending by local authorities in England
          reached {lastSpend?.totalBn} billion in {lastSpend?.year}, up
          from {spend[0]?.totalBn} billion in {spend[0]?.year}. Spending per child in care
          has risen from {spend[0]?.perChildInCare?.toLocaleString()} to {lastSpend?.perChildInCare?.toLocaleString()} over
          the same period, driven in part by rising residential placement costs. Since 2010-11,
          the number of children in residential care has increased 79%, with spending on residential
          care reaching a historical high.
        </p>

        <ChartCard
          title={spendingView === "total" ? "Total Children's Social Care Spending" : "Spending per Child in Care"}
          subtitle={spendingView === "total"
            ? `Net current expenditure, England, ${spend[0]?.year}–${lastSpend?.year}`
            : `England, ${priceView === "real" ? "2024-25 prices" : "cash terms"}, ${spend[0]?.year}–${lastSpend?.year}`
          }
          views={["total", "perChild"]}
          viewLabels={{ total: "Total (£bn)", perChild: "Per Child" }}
          activeView={spendingView}
          onViewChange={setSpendingView}
          source={sourceFrom(raw, "spending")}
          isMobile={isMobile}
        >
          {spendingView === "perChild" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button onClick={() => setPriceView("nominal")} style={{ background: priceView === "nominal" ? "rgba(28,43,69,0.06)" : "transparent", border: `1px solid ${P.borderStrong}`, color: priceView === "nominal" ? P.text : P.textLight, padding: "3px 10px", fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", fontFamily: "'DM Mono', monospace", borderRadius: 2 }}>Cash</button>
              <button onClick={() => setPriceView("real")} style={{ background: priceView === "real" ? "rgba(28,43,69,0.06)" : "transparent", border: `1px solid ${P.borderStrong}`, color: priceView === "real" ? P.text : P.textLight, padding: "3px 10px", fontSize: "10px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", fontFamily: "'DM Mono', monospace", borderRadius: 2 }}>Real (2024-25)</button>
            </div>
          )}
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={spend} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false}
                interval={isMobile ? 3 : 2} />
              {spendingView === "total" ? (
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  label={yAxisLabel("£ billions")} domain={[0, "auto"]}
                  tickFormatter={v => `£${v}bn`} />
              ) : (
                <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                  label={yAxisLabel(priceView === "real" ? "£ per child (real)" : "£ per child")} domain={[0, "auto"]}
                  tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
              )}
              <Tooltip content={<CustomTooltip formatter={v =>
                spendingView === "total" ? `£${v}bn` : `£${v?.toLocaleString()}`
              } />} />
              {spendingView === "total" ? (
                <>
                  <Bar dataKey="totalBn" name="Total spending" fill={P.navy} opacity={0.25} radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="totalBn" name="Total spending" stroke={P.navy} strokeWidth={2.5} dot={{ r: 3, fill: P.navy }} />
                </>
              ) : (
                <>
                  <Bar dataKey={priceView === "real" ? "perChildReal" : "perChildInCare"} name={priceView === "real" ? "Per child (real)" : "Per child (cash)"} fill={P.sienna} opacity={0.25} radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey={priceView === "real" ? "perChildReal" : "perChildInCare"} name={priceView === "real" ? "Per child (real)" : "Per child (cash)"} stroke={P.sienna} strokeWidth={2.5} dot={{ r: 3, fill: P.sienna }} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ═══ SECTION 7 — CARE LEAVERS ═══ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Care Leavers</h3>
        <p style={SECTION_NOTE}>
          Of care leavers aged 19-21 in {lastCl?.year}, {lastCl?.inEET}% were in education, employment or
          training (EET), compared to an estimated 85% of all young people in that age group. {lastCl?.inSuitableAccom}%
          were living in accommodation judged to be suitable. 40% of care leavers were not in education,
          employment or training, compared to approximately 15% of all 19-21 year olds.
        </p>

        <ChartCard
          title="Care Leaver Outcomes at Age 19-21"
          subtitle={`England, ${cl[0]?.year}-${lastCl?.year}`}
          source={sourceFrom(raw, "careLeavers")}
          legend={[
            { key: "eet", label: "In EET (%)", color: P.teal },
            { key: "accom", label: "Suitable accommodation (%)", color: P.navy },
          ]}
          isMobile={isMobile}
        >
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={cl} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK_MONO} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false}
                label={yAxisLabel("Percentage")} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip formatter={v => `${v}%`} />} />
              <Line type="monotone" dataKey="inEET" name="In EET (%)" stroke={P.teal} strokeWidth={2.5} dot={{ r: 3, fill: P.teal }} />
              <Line type="monotone" dataKey="inSuitableAccom" name="Suitable accommodation (%)" stroke={P.navy} strokeWidth={2.5} dot={{ r: 3, fill: P.navy }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <AnalysisBox color={P.teal} label="Context">
        {snap.childrenInCare?.toLocaleString()} children were looked after in England in {snap.childrenInCareYear},
        a rate of {snap.childrenInCareRate} per 10,000 children under 18. The number of approved foster carers
        has fallen 12% since 2021 to {snap.fosterCarers?.toLocaleString()}, with deregistrations outpacing new
        approvals in most recent years. The average social worker caseload was {snap.avgCaseload} cases
        in {snap.avgCaseloadYear}, within the recommended range of 15-20. Total spending
        reached £{snap.totalSpendingBn}bn in {snap.totalSpendingYear}. Of care leavers aged 19-21,
        {snap.careLeaverEET}% were in education, employment or training, compared to approximately 85% of
        all young people in that age group.
      </AnalysisBox>
    </div>
  );
}
