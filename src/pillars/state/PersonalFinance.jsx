import { useMemo } from "react";
import {
  AreaChart, Area,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, AXIS_TICK_MONO, yAxisLabel, GRID_PROPS,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import ChartCard from "../../components/ChartCard";
import useIsMobile from "../../hooks/useIsMobile";
import { useJsonDataset, sourceFrom } from "../../hooks/useDataset";

export default function PersonalFinance() {
  const { data, loading, error, raw } = useJsonDataset("money-supply.json");
  const isMobile = useIsMobile();

  const mortgageQuarterly = useMemo(() => {
    if (!data?.mortgageApprovals) return [];
    const byQ = {};
    for (const d of data.mortgageApprovals) {
      const [y, m] = d.month.split("-");
      const q = Math.ceil(parseInt(m, 10) / 3);
      const key = `${y}-Q${q}`;
      if (!byQ[key]) byQ[key] = { quarter: key, total: 0, count: 0 };
      byQ[key].total += d.approvals;
      byQ[key].count += 1;
    }
    return Object.values(byQ)
      .filter(d => d.count === 3)
      .map(d => ({ quarter: d.quarter, approvals: Math.round(d.total / 3) }))
      .sort((a, b) => a.quarter.localeCompare(b.quarter));
  }, [data]);

  const isaQuarterly = useMemo(() => {
    if (!data?.cashIsaDeposits) return [];
    const byQ = {};
    for (const d of data.cashIsaDeposits) {
      const [y, m] = d.month.split("-");
      const q = Math.ceil(parseInt(m, 10) / 3);
      const key = `${y}-Q${q}`;
      byQ[key] = { quarter: key, balance: d.balance };
    }
    return Object.values(byQ)
      .sort((a, b) => a.quarter.localeCompare(b.quarter));
  }, [data]);

  const creditQuarterly = useMemo(() => {
    if (!data?.consumerCredit || !data?.creditCardLending) return [];
    const byQ = {};
    for (const d of data.consumerCredit) {
      const [y, m] = d.month.split("-");
      const q = Math.ceil(parseInt(m, 10) / 3);
      const key = `${y}-Q${q}`;
      byQ[key] = { quarter: key, consumerCredit: d.outstanding };
    }
    for (const d of data.creditCardLending) {
      const [y, m] = d.month.split("-");
      const q = Math.ceil(parseInt(m, 10) / 3);
      const key = `${y}-Q${q}`;
      if (byQ[key]) byQ[key].creditCard = d.outstanding;
    }
    return Object.values(byQ)
      .filter(d => d.consumerCredit != null && d.creditCard != null)
      .map(d => ({ ...d, otherCredit: d.consumerCredit - d.creditCard }))
      .sort((a, b) => a.quarter.localeCompare(b.quarter));
  }, [data]);

  const rateQuarterly = useMemo(() => {
    if (!data?.mortgageRate) return [];
    const byQ = {};
    for (const d of data.mortgageRate) {
      const [y, m] = d.month.split("-");
      const q = Math.ceil(parseInt(m, 10) / 3);
      const key = `${y}-Q${q}`;
      byQ[key] = { quarter: key, rate: d.rate };
    }
    return Object.values(byQ)
      .sort((a, b) => a.quarter.localeCompare(b.quarter));
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Personal Finance</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Personal Finance</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Personal Finance</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          Mortgage lending, household savings & consumer credit
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard
          label="Mortgage Approvals"
          value={s.mortgageApprovalsLatest?.toLocaleString()}
          change={s.mortgageApprovalsLatestMonth}
          up={false}
          color={P.navy}
          delay={0.1}
        />
        <MetricCard
          label="Cash ISA Balances"
          value={`£${Math.round(s.cashIsaDepositsLatest / 1000)}bn`}
          change={s.cashIsaDepositsLatestMonth}
          up={true}
          color={P.teal}
          delay={0.18}
        />
        <MetricCard
          label="Consumer Credit"
          value={`£${Math.round(s.consumerCreditLatest / 1000)}bn`}
          change={s.consumerCreditLatestMonth}
          up={true}
          color={P.sienna}
          delay={0.26}
        />
      </div>

      {/* ── Section 1: Mortgage Approvals ──────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Mortgage Approvals</h3>
        <p style={SECTION_NOTE}>
          Mortgage approvals for house purchase measure commitments to lend, and are a leading
          indicator of housing market activity. Approvals peaked at around 133,000 per month in
          late 2003 before falling to 26,000 during the financial crisis and 9,000 during
          COVID-19. They currently stand at around {s.mortgageApprovalsLatest?.toLocaleString()} per month.
        </p>

        {mortgageQuarterly.length > 0 && (
          <ChartCard
            title="Mortgage Approvals for House Purchase"
            subtitle="Quarterly average of monthly approvals, seasonally adjusted, United Kingdom"
            source={sourceFrom(raw, "mortgageApprovals")}
            height={340}
          >
            <AreaChart data={mortgageQuarterly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="quarter" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} tickFormatter={v => v.slice(0, 4)} interval={isMobile ? 15 : 7} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} label={yAxisLabel("Approvals / month")} domain={[0, "auto"]} />
              <Tooltip content={<CustomTooltip formatter={v => v?.toLocaleString()} />} />
              <Area type="monotone" dataKey="approvals" name="Mortgage approvals" stroke={P.navy} fill={P.navy} fillOpacity={0.12} strokeWidth={2.5} />
            </AreaChart>
          </ChartCard>
        )}
      </section>

      {/* ── Section 2: Cash ISA Deposits ──────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Cash ISA Deposits</h3>
        <p style={SECTION_NOTE}>
          Cash ISA balances track the stock of tax-sheltered household savings. Balances grew
          steadily from under £10bn in 2000 to around £290bn by 2020, then accelerated sharply
          from late 2022 as rising interest rates made cash ISAs more attractive. As of{" "}
          {s.cashIsaDepositsLatestMonth}, total cash ISA deposits stood at
          £{Math.round(s.cashIsaDepositsLatest / 1000)}bn.
        </p>

        {isaQuarterly.length > 0 && (
          <ChartCard
            title="Cash ISA Deposits Outstanding"
            subtitle="£bn, end of quarter, seasonally adjusted, United Kingdom"
            source={sourceFrom(raw, "cashIsaDeposits")}
            height={340}
          >
            <AreaChart data={isaQuarterly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="quarter" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} tickFormatter={v => v.slice(0, 4)} interval={isMobile ? 15 : 7} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `£${Math.round(v / 1000)}bn`} label={yAxisLabel("£bn")} domain={[0, "auto"]} />
              <Tooltip content={<CustomTooltip formatter={v => `£${(v / 1000).toFixed(1)}bn`} />} />
              <Area type="monotone" dataKey="balance" name="Cash ISA balance" stroke={P.teal} fill={P.teal} fillOpacity={0.15} strokeWidth={2.5} />
            </AreaChart>
          </ChartCard>
        )}
      </section>

      {/* ── Section 3: Consumer Credit ────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Consumer Credit</h3>
        <p style={SECTION_NOTE}>
          Consumer credit measures total unsecured lending to individuals, comprising credit card
          debt and other forms such as personal loans, car finance and overdrafts. Total consumer
          credit outstanding has grown from £84bn in 2000 to
          £{Math.round(s.consumerCreditLatest / 1000)}bn as of {s.consumerCreditLatestMonth},
          of which £{Math.round(s.creditCardLendingLatest / 1000)}bn is credit card lending.
        </p>

        {creditQuarterly.length > 0 && (
          <ChartCard
            title="Consumer Credit Outstanding"
            subtitle="£bn, end of quarter, seasonally adjusted, United Kingdom"
            source={sourceFrom(raw, "consumerCredit")}
            legend={[
              { key: "creditCard", label: "Credit cards", color: P.sienna },
              { key: "otherCredit", label: "Other consumer credit", color: P.yellow },
            ]}
            height={340}
          >
            <AreaChart data={creditQuarterly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="quarter" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} tickFormatter={v => v.slice(0, 4)} interval={isMobile ? 15 : 7} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `£${Math.round(v / 1000)}bn`} label={yAxisLabel("£bn")} domain={[0, "auto"]} />
              <Tooltip content={<CustomTooltip formatter={v => `£${(v / 1000).toFixed(1)}bn`} />} />
              <Area type="monotone" dataKey="otherCredit" name="Other consumer credit" stackId="1" stroke={P.yellow} fill={P.yellow} fillOpacity={0.25} strokeWidth={0} />
              <Area type="monotone" dataKey="creditCard" name="Credit cards" stackId="1" stroke={P.sienna} fill={P.sienna} fillOpacity={0.35} strokeWidth={1.5} />
            </AreaChart>
          </ChartCard>
        )}
      </section>

      {/* ── Section 4: Effective Mortgage Rate ────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={SECTION_HEADING}>Mortgage Interest Rates</h3>
        <p style={SECTION_NOTE}>
          The effective interest rate on new mortgage lending measures the average rate actually
          paid by new borrowers, weighted by loan value. Rates fell from around 7% in 2000 to
          historic lows below 2% in 2021, before rising sharply as the Bank of England tightened
          policy. As of {s.mortgageRateLatestMonth}, the effective rate on new mortgages
          stood at {s.mortgageRateLatest?.toFixed(2)}%.
        </p>

        {rateQuarterly.length > 0 && (
          <ChartCard
            title="Effective Interest Rate on New Mortgage Lending"
            subtitle="%, end of quarter, United Kingdom"
            source={sourceFrom(raw, "mortgageRate")}
            height={340}
          >
            <LineChart data={rateQuarterly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="quarter" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} tickFormatter={v => v.slice(0, 4)} interval={isMobile ? 15 : 7} />
              <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} label={yAxisLabel("%")} domain={[0, "auto"]} />
              <Tooltip content={<CustomTooltip formatter={v => `${v?.toFixed(2)}%`} />} />
              <Line type="monotone" dataKey="rate" name="Effective mortgage rate" stroke={P.red} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ChartCard>
        )}
      </section>
    </div>
  );
}
