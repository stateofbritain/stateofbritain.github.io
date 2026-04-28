import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, CHART_CARD, CHART_TITLE, CHART_SUBTITLE,
  AXIS_TICK, yAxisLabel, GRID_PROPS,
} from "../../theme/chartStyles";
import CustomTooltip from "../../components/CustomTooltip";
import WorldChoroplethMap from "../../components/WorldChoroplethMap";
import AnalysisBox from "../../components/AnalysisBox";
import { useJsonDataset } from "../../hooks/useDataset";

const HEADER = {
  fontFamily: "'Playfair Display', serif",
  fontSize: "28px",
  fontWeight: 600,
  color: P.text,
  margin: "0 0 6px",
};
const SUBHEADER = {
  fontSize: "14px",
  color: P.textMuted,
  margin: "0 0 24px",
  fontFamily: "'Playfair Display', serif",
  maxWidth: 720,
};

const COLOR_LOW = "#b9462f";   // diverging — sienna/red
const COLOR_HIGH = "#1c2b45";  // aligned — navy
const NULL_COLOR = "#f3f0e7";

export default function ForeignAffairs() {
  const { data, loading, error } = useJsonDataset("unga-alignment.json");
  const [selectedCode, setSelectedCode] = useState(null);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={HEADER}>Foreign Affairs</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>
          Loading UNGA voting data…
        </p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={HEADER}>Foreign Affairs</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>
          Failed to load data: {error ?? "No data"}
        </p>
      </div>
    );
  }

  const countries = data.countries ?? [];
  const snap = data.snapshot ?? {};

  // Map data: { iso3num: alignmentPct }
  const mapData = useMemo(() => {
    const m = {};
    for (const c of countries) {
      if (c.iso3num && c.alignmentPct != null) m[c.iso3num] = c.alignmentPct;
    }
    return m;
  }, [countries]);

  const selectedCountry = useMemo(() => {
    if (!selectedCode) return null;
    return countries.find((c) => c.iso3num === selectedCode) ?? null;
  }, [selectedCode, countries]);

  const handleClickArea = ({ code }) => {
    setSelectedCode((prev) => (prev === code ? null : code));
  };

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2 style={HEADER}>Foreign Affairs</h2>
      <p style={SUBHEADER}>
        How the UK aligns diplomatically at the United Nations General Assembly. Each country
        is coloured by its share of UNGA roll-call votes that matched the UK over the {snap.window}
        window. Click a country to see its full record back to 1946.
      </p>

      {/* Section 1: Map */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>UK Voting Alignment at the UN</h3>
        <p style={SECTION_NOTE}>
          UK alignment is highest with Western Europe and the broader US-aligned bloc, and lowest
          with Russia, China, Iran, North Korea, Syria, and the post-Soviet authoritarian states.
          Roll-call votes are typically on resolutions concerning conflict, human rights, and
          development — abstentions count as disagreement.
        </p>
        <div style={CHART_CARD}>
          <div style={{ marginBottom: 14 }}>
            <div style={CHART_TITLE}>UK alignment with each UN member state, {snap.window}</div>
            <div style={CHART_SUBTITLE}>
              Share of UNGA roll-call votes cast in agreement with the United Kingdom (%) ·
              Bailey, Strezhnev &amp; Voeten (2017) ·{" "}
              <a
                href="https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/LEJUQZ"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: P.textMuted }}
              >
                Harvard Dataverse
              </a>
            </div>
          </div>
          <WorldChoroplethMap
            data={mapData}
            colorScale={[COLOR_LOW, COLOR_HIGH]}
            nullColor={NULL_COLOR}
            domain={[35, 95]}
            height={520}
            selectedCode={selectedCode}
            onClickArea={handleClickArea}
            formatLegend={(v) => `${Math.round(v)}%`}
            renderTooltip={({ code, name, value }) => (
              <div>
                <div style={{ fontWeight: 600 }}>{name}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, opacity: 0.9, marginTop: 2 }}>
                  {value != null ? `${value.toFixed(1)}% aligned` : "no data"}
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, opacity: 0.6, marginTop: 4 }}>
                  click for trend
                </div>
              </div>
            )}
          />
        </div>
      </section>

      {/* Section 2: Selected-country trend */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Country Trend</h3>
        {selectedCountry ? (
          <CountryTrendCard country={selectedCountry} />
        ) : (
          <div style={{
            ...CHART_CARD,
            padding: "32px 24px",
            textAlign: "center",
            color: P.textMuted,
            fontFamily: "'DM Mono', monospace",
            fontSize: 13,
          }}>
            Click a country on the map above to see how UK alignment with it has moved over time.
          </div>
        )}
      </section>

      {/* Section 3: Top movers */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={SECTION_HEADING}>Biggest Recent Shifts</h3>
        <p style={SECTION_NOTE}>
          The five countries the UK has converged with — and diverged from — most over the last
          five years, comparing the {snap.window} mean against the {snap.priorWindow} mean.
          Russia&rsquo;s plunge tracks the post-2022 invasion of Ukraine; the United States&rsquo;
          jump captures the swing from the first Trump administration into Biden.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          <MoverList title="Converging" items={snap.topConverging || []} positive />
          <MoverList title="Diverging" items={snap.topDiverging || []} positive={false} />
        </div>
      </section>

      <AnalysisBox>
        <p>
          Roll-call agreement is one of the most visible measures of diplomatic alignment.
          The dataset is comprehensive — every UN member casts thousands of votes per session
          and the aggregate is hard to game — but it leaves room outside the chamber: defence
          treaties, intelligence sharing, and trade ties don&rsquo;t show up here. The picture
          is most useful in combination with those, especially when paired against trade and
          investment exposure to identify cases where commercial dependence and diplomatic
          alignment disagree.
        </p>
        <p style={{ marginTop: 10 }}>
          <strong>Source:</strong> Bailey, Michael A., Anton Strezhnev, and Erik Voeten.
          &ldquo;Estimating Dynamic State Preferences from United Nations Voting Data.&rdquo;
          <em> Journal of Conflict Resolution</em> 61, no. 2 (2017): 430-456.
          Updated annually on Harvard Dataverse.
        </p>
      </AnalysisBox>
    </div>
  );
}

function CountryTrendCard({ country }) {
  const yearly = country.yearly || [];
  const start = yearly[0]?.year ?? null;
  const end = yearly[yearly.length - 1]?.year ?? null;

  return (
    <div style={CHART_CARD}>
      <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={CHART_TITLE}>{country.country}</div>
          <div style={CHART_SUBTITLE}>UK roll-call agreement, {start}–{end}</div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
          <Stat label="Latest 5y" value={`${country.alignmentPct?.toFixed(1)}%`} />
          {country.alignmentPriorPct != null && (
            <Stat label="Prior 5y" value={`${country.alignmentPriorPct.toFixed(1)}%`} />
          )}
          {country.deltaPct != null && (
            <Stat
              label="Shift"
              value={`${country.deltaPct >= 0 ? "+" : ""}${country.deltaPct.toFixed(1)}`}
              color={country.deltaPct >= 0 ? P.teal : P.red}
            />
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={yearly} margin={{ top: 12, right: 24, left: 8, bottom: 12 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} tick={AXIS_TICK} />
          <YAxis
            tick={AXIS_TICK}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            label={yAxisLabel("% agreement")}
          />
          <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toFixed?.(1) ?? v}%`} />} />
          <ReferenceLine y={50} stroke={P.border} strokeDasharray="3 3" />
          <Line type="monotone" dataKey="agree" stroke={P.navy} strokeWidth={2} dot={false} name="Agreement" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MoverList({ title, items, positive }) {
  return (
    <div style={CHART_CARD}>
      <div style={{ ...CHART_TITLE, marginBottom: 4 }}>{title}</div>
      <div style={CHART_SUBTITLE}>UK alignment vs prior 5y window, % points</div>
      <div style={{ marginTop: 12 }}>
        {items.length === 0 && (
          <div style={{ fontSize: 12, color: P.textLight, fontFamily: "'DM Mono', monospace" }}>
            No data
          </div>
        )}
        {items.map((it) => (
          <div key={it.iso3 || it.country} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "6px 0",
            borderBottom: `1px dashed ${P.border}`,
          }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: P.text }}>
              {it.country}
            </span>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 13,
              fontWeight: 600,
              color: positive ? P.teal : P.red,
            }}>
              {positive ? "+" : ""}{it.deltaPct?.toFixed(1) ?? "?"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: "right", lineHeight: 1.1 }}>
      <div style={{
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontFamily: "'DM Mono', monospace",
        color: P.textLight,
      }}>{label}</div>
      <div style={{
        fontSize: 18,
        fontWeight: 600,
        fontFamily: "'Playfair Display', serif",
        color: color ?? P.text,
      }}>{value}</div>
    </div>
  );
}
