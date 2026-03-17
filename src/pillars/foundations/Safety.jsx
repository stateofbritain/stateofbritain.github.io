import { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, ComposedChart, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend as RLegend,
} from "recharts";
import P from "../../theme/palette";
import {
  SECTION_HEADING, SECTION_NOTE, SOURCE_TEXT, AXIS_TICK_MONO, yAxisLabel,
} from "../../theme/chartStyles";
import MetricCard from "../../components/MetricCard";
import CustomTooltip from "../../components/CustomTooltip";
import AnalysisBox from "../../components/AnalysisBox";
import ShareableChart from "../../components/ShareableChart";
import ChartCard from "../../components/ChartCard";
import MethodologyBreak, { getMethodologyBreaks } from "../../components/MethodologyBreak";
import { useJsonDataset, getBreaks } from "../../hooks/useDataset";
import useIsMobile from "../../hooks/useIsMobile";

const SRC = {
  onsCrime: <a href="https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>ONS Crime in England and Wales</a>,
  hoWeapons: <a href="https://www.gov.uk/government/statistics/offences-involving-the-use-of-weapons-open-data-tables" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>Home Office Weapons Statistics</a>,
  onsHomicide: <a href="https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/articles/homicideinenglandandwales/latest" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>ONS Homicide Index</a>,
  nhsHes: <a href="https://digital.nhs.uk/data-and-information/publications/statistical/hospital-admitted-patient-care-activity" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>NHS HES</a>,
  csew: <a href="https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/bulletins/crimeinenglandandwales/latest" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>ONS Crime Survey for England and Wales</a>,
  hoOutcomes: <a href="https://www.gov.uk/government/statistics/crime-outcomes-in-england-and-wales-2023-to-2024" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>Home Office Crime Outcomes</a>,
  mojReoffending: <a href="https://www.gov.uk/government/statistics/proven-reoffending-statistics-quarterly-bulletin" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>MoJ Proven Reoffending Statistics</a>,
  onsPfa: <a href="https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/datasets/policeforceareadatatables" target="_blank" rel="noopener noreferrer" style={{ color: P.textLight, textDecoration: "underline" }}>ONS Crime by Police Force Area</a>,
};

export default function Safety() {
  const isMobile = useIsMobile();
  const { data, loading, error, raw } = useJsonDataset("safety.json");
  const [crimeView, setCrimeView] = useState("violent");
  const [weaponView, setWeaponView] = useState("knife");
  const [sexualView, setSexualView] = useState("offences");
  const [outcomesView, setOutcomesView] = useState("chargeRate");
  const [cityView, setCityView] = useState("total");

  // Knife crime per 100k calculated series (for overlaying on offences chart)
  const knifeWithRate = useMemo(() => {
    if (!data?.knifeCrime) return [];
    return data.knifeCrime.map((d) => ({
      ...d,
      offencesK: Math.round(d.offences / 100) / 10,
    }));
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Safety</h2>
        <p style={{ fontSize: "13px", color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>Loading crime statistics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 600, color: P.text, margin: "0 0 16px" }}>Safety</h2>
        <p style={{ fontSize: "13px", color: P.red, fontFamily: "'DM Mono', monospace" }}>Failed to load data: {error ?? "No data"}</p>
      </div>
    );
  }

  const snap = data.snapshot || {};
  const latestViolent = data.violentCrime?.[data.violentCrime.length - 1];
  const firstViolent = data.violentCrime?.[0];
  const violentChange = latestViolent && firstViolent
    ? ((latestViolent.total - firstViolent.total) / firstViolent.total * 100).toFixed(0)
    : null;

  const latestKnife = data.knifeCrime?.[data.knifeCrime.length - 1];
  const minKnife = data.knifeCrime?.reduce((min, d) => d.offences < min.offences ? d : min, data.knifeCrime[0]);

  // Sexual offences growth
  const firstSexual = data.sexualOffences?.[0];
  const latestSexual = data.sexualOffences?.[data.sexualOffences.length - 1];
  const sexualChange = latestSexual && firstSexual
    ? ((latestSexual.total - firstSexual.total) / firstSexual.total * 100).toFixed(0)
    : null;

  // ASB decline
  const firstAsb = data.asb?.[0];
  const latestAsb = data.asb?.[data.asb.length - 1];
  const asbChange = latestAsb && firstAsb
    ? ((latestAsb.incidents - firstAsb.incidents) / firstAsb.incidents * 100).toFixed(0)
    : null;

  // Charge rate decline
  const firstOutcome = data.crimeOutcomes?.[0];
  const latestOutcome = data.crimeOutcomes?.[data.crimeOutcomes.length - 1];

  return (
    <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 600, color: P.text, margin: 0 }}>Safety</h2>
        <span style={{ fontSize: "13px", color: P.textLight, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>
          England &amp; Wales &middot; {snap.violentCrimeYear}
        </span>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1 — NATIONAL CRIME OVERVIEW
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>National Crime</h3>
        <p style={SECTION_NOTE}>
          Police recorded violent crime has risen sharply since 2014, driven partly by improved
          recording practices and partly by real increases in certain offence types. The ONS
          Crime Survey (which captures unreported crime) shows a long-term decline, suggesting
          that some of the recorded rise reflects better police compliance with counting rules.
          Nonetheless, knife crime and serious violence remain at historically elevated levels.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="Violent Crime"
            value={`${(snap.violentCrime / 1000).toFixed(0)}k`}
            change={violentChange ? `${violentChange > 0 ? "+" : ""}${violentChange}% since ${firstViolent.year}` : snap.violentCrimeYear}
            up={true}
            color={P.red}
            delay={0.1}
          />
          <MetricCard
            label="Knife Crime"
            value={snap.knifeCrime?.toLocaleString()}
            change={`peak ${snap.knifeCrimePeak?.toLocaleString()} in ${snap.knifeCrimePeakYear}`}
            up={true}
            color={P.sienna}
            delay={0.18}
          />
          <MetricCard
            label="Homicides"
            value={snap.homicides?.toString()}
            change={snap.homicidesYear}
            up={false}
            color={P.navy}
            delay={0.26}
          />
          <MetricCard
            label="National Crime Rate"
            value={`${snap.nationalCrimeRate} per 1k`}
            change={`${snap.highestCrimeRateArea} highest (${snap.highestCrimeRate})`}
            up={false}
            color={P.teal}
            delay={0.34}
          />
        </div>

        <ChartCard
          title={crimeView === "violent" ? "Violence Against the Person" : "Homicides"}
          subtitle={crimeView === "violent" ? `England & Wales, thousands, ${firstViolent?.year}–${latestViolent?.year}` : `England & Wales, ${data.homicide?.[0]?.year}–${data.homicide?.[data.homicide.length - 1]?.year}`}
          views={["violent", "homicide"]}
          viewLabels={{ violent: "Violent Crime", homicide: "Homicides" }}
          activeView={crimeView}
          onViewChange={setCrimeView}
          source={crimeView === "violent" ? <>SOURCE: {SRC.onsCrime}</> : <>SOURCE: {SRC.onsHomicide}</>}
          isMobile={isMobile}
        >
          {crimeView === "violent" && <ViolentCrimeChart data={data.violentCrime} isMobile={isMobile} />}
          {crimeView === "homicide" && <HomicideChart data={data.homicide} isMobile={isMobile} />}
        </ChartCard>

        {crimeView === "homicide" && (
          <Legend items={[
            { key: "total", label: "All homicides", color: P.navy },
            { key: "knife", label: "Knife / sharp instrument", color: P.red },
          ]} />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2 — WEAPONS CRIME (KNIFE + FIREARMS)
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Weapons Crime</h3>
        <p style={SECTION_NOTE}>
          Knife crime rose 82% between 2013-14 and its peak in 2022-23, with {snap.knifeCrimePeak?.toLocaleString()} recorded
          offences. Hospital admissions for assault by sharp object followed a similar trajectory.
          Firearms offences, while far fewer in number, peaked in 2018-19 at 6,759 before falling
          back to {snap.firearms?.toLocaleString()} in {snap.firearmsYear}. London consistently records
          the highest knife crime rate of any police force area.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="Knife Offences"
            value={snap.knifeCrime?.toLocaleString()}
            change={`${snap.knifeCrimeYear} · down from peak`}
            up={false}
            color={P.red}
            delay={0.1}
          />
          <MetricCard
            label="Firearms Offences"
            value={snap.firearms?.toLocaleString()}
            change={snap.firearmsYear}
            up={false}
            color={P.navy}
            delay={0.18}
          />
          <MetricCard
            label="Knife Homicides"
            value={snap.knifeHomicides?.toString()}
            change={`${((snap.knifeHomicides / snap.homicides) * 100).toFixed(0)}% of all homicides`}
            up={false}
            color={P.sienna}
            delay={0.26}
          />
          <MetricCard
            label="Hospital Admissions"
            value={snap.hospitalAdmissions?.toLocaleString()}
            change={`assault by sharp object (${snap.hospitalAdmissionsYear})`}
            up={false}
            color={P.grey}
            delay={0.34}
          />
        </div>

        <ChartCard
          title={
            weaponView === "knife" ? "Knife / Sharp Instrument Offences" :
            weaponView === "firearms" ? "Firearms Offences" :
            "Hospital Admissions for Assault by Sharp Object"
          }
          subtitle={
            weaponView === "knife" ? `England & Wales, ${data.knifeCrime?.[0]?.year}–${latestKnife?.year}` :
            weaponView === "firearms" ? `England & Wales, ${data.firearmsCrime?.[0]?.year}–${data.firearmsCrime?.[data.firearmsCrime.length - 1]?.year}` :
            `England, ${data.hospitalAdmissions?.[0]?.year}–${data.hospitalAdmissions?.[data.hospitalAdmissions.length - 1]?.year}`
          }
          views={["knife", "firearms", "hospital"]}
          viewLabels={{ knife: "Knife", firearms: "Firearms", hospital: "Hospital" }}
          activeView={weaponView}
          onViewChange={setWeaponView}
          source={weaponView === "hospital" ? <>SOURCE: {SRC.nhsHes}</> : <>SOURCE: {SRC.hoWeapons}</>}
          isMobile={isMobile}
        >
          {weaponView === "knife" && <KnifeCrimeChart data={knifeWithRate} breaks={getBreaks(raw, "knifeCrime")} isMobile={isMobile} />}
          {weaponView === "firearms" && <FirearmsChart data={data.firearmsCrime} breaks={getBreaks(raw, "firearmsCrime")} isMobile={isMobile} />}
          {weaponView === "hospital" && <HospitalChart data={data.hospitalAdmissions} isMobile={isMobile} />}
        </ChartCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3 — SEXUAL OFFENCES & DOMESTIC ABUSE
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Sexual Offences &amp; Domestic Abuse</h3>
        <p style={SECTION_NOTE}>
          Recorded sexual offences have risen nearly {sexualChange ? `${sexualChange}%` : "fourfold"} since {firstSexual?.year},
          from {firstSexual?.total}k to {latestSexual?.total}k. Much of the increase since 2014
          reflects improved recording practices following HMIC inspections and greater willingness
          to report, including historic offences. Domestic abuse prevalence (CSEW) has remained
          broadly stable at around 5–6% of adults, while police-flagged incidents have more than
          doubled since systematic recording began in 2015-16.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="Sexual Offences"
            value={`${snap.sexualOffences}k`}
            change={sexualChange ? `+${sexualChange}% since ${firstSexual?.year}` : snap.sexualOffencesYear}
            up={true}
            color={P.red}
            delay={0.1}
          />
          <MetricCard
            label="DA Prevalence"
            value={`${snap.domesticAbusePrevalence}%`}
            change={`of adults (${snap.domesticAbuseYear})`}
            up={false}
            color={P.teal}
            delay={0.18}
          />
          <MetricCard
            label="DA Police-Flagged"
            value={`${snap.domesticAbuse}k`}
            change={snap.domesticAbuseYear}
            up={true}
            color={P.sienna}
            delay={0.26}
          />
        </div>

        <ChartCard
          title={sexualView === "offences" ? "Police Recorded Sexual Offences" : "Domestic Abuse"}
          subtitle={sexualView === "offences"
            ? `England & Wales, thousands, ${firstSexual?.year}–${latestSexual?.year}`
            : `Prevalence & police-flagged, ${data.domesticAbuse?.[0]?.year}–${data.domesticAbuse?.[data.domesticAbuse.length - 1]?.year}`
          }
          views={["offences", "domestic"]}
          viewLabels={{ offences: "Sexual Offences", domestic: "Domestic Abuse" }}
          activeView={sexualView}
          onViewChange={setSexualView}
          source={sexualView === "offences" ? <>SOURCE: {SRC.onsCrime}</> : <>SOURCE: {SRC.csew}</>}
          isMobile={isMobile}
        >
          {sexualView === "offences" && <SexualOffencesChart data={data.sexualOffences} breaks={getBreaks(raw, "sexualOffences")} isMobile={isMobile} />}
          {sexualView === "domestic" && <DomesticAbuseChart data={data.domesticAbuse} isMobile={isMobile} />}
        </ChartCard>

        {sexualView === "offences" && (
          <Legend items={[
            { key: "total", label: "Total sexual offences", color: P.red },
            { key: "rape", label: "Rape", color: P.sienna },
            { key: "other", label: "Other sexual offences", color: P.grey },
          ]} />
        )}
        {sexualView === "domestic" && (
          <Legend items={[
            { key: "prevalence", label: "CSEW prevalence (%)", color: P.teal },
            { key: "police", label: "Police-flagged (thousands)", color: P.sienna },
          ]} />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4 — FRAUD & ONLINE CRIME
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Fraud &amp; Online Crime</h3>
        <p style={SECTION_NOTE}>
          Fraud is the single most common crime type in England and Wales, with the CSEW estimating
          {" "}{snap.fraudEstimate} million incidents in {snap.fraudYear} — yet only {snap.fraudRecorded}k
          were recorded by police. This enormous gap reflects the fact that most fraud goes unreported
          or is routed through Action Fraud rather than local police. CSEW estimates have fallen from
          a peak of 5.4 million in 2015-16, though this remains a huge volume of crime.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="CSEW Fraud Estimate"
            value={`${snap.fraudEstimate}m`}
            change={`incidents (${snap.fraudYear})`}
            up={false}
            color={P.navy}
            delay={0.1}
          />
          <MetricCard
            label="Police Recorded"
            value={`${snap.fraudRecorded}k`}
            change={snap.fraudYear}
            up={false}
            color={P.red}
            delay={0.18}
          />
        </div>

        <ChartCard
          title="Fraud"
          subtitle={`CSEW estimate (millions) vs police recorded (thousands), ${data.fraud?.[0]?.year}–${data.fraud?.[data.fraud.length - 1]?.year}`}
          source={<>SOURCE: {SRC.csew} &middot; {SRC.onsCrime}</>}
          isMobile={isMobile}
        >
          <FraudChart data={data.fraud} isMobile={isMobile} />
        </ChartCard>

        <Legend items={[
          { key: "csew", label: "CSEW estimate (millions)", color: P.navy },
          { key: "police", label: "Police recorded (thousands, right axis)", color: P.red },
        ]} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5 — ANTI-SOCIAL BEHAVIOUR
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Anti-social Behaviour</h3>
        <p style={SECTION_NOTE}>
          Police recorded ASB incidents have fallen {asbChange ? `${asbChange}%` : "sharply"} since
          {" "}{firstAsb?.year}, from {firstAsb?.incidents?.toLocaleString()}k to {latestAsb?.incidents?.toLocaleString()}k.
          This sustained decline was interrupted in 2020-21 when COVID regulation breaches
          (unlawful gatherings, breaching stay-at-home orders) were recorded as ASB incidents,
          pushing the figure back up to 1,843k before resuming its downward path.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="ASB Incidents"
            value={`${snap.asbIncidents?.toLocaleString()}k`}
            change={asbChange ? `${asbChange}% since ${firstAsb?.year}` : snap.asbYear}
            up={false}
            color={P.teal}
            delay={0.1}
          />
        </div>

        <ChartCard
          title="Anti-Social Behaviour"
          subtitle={`Police recorded incidents (thousands), ${firstAsb?.year}–${latestAsb?.year}`}
          source={<>SOURCE: {SRC.onsCrime}</>}
          isMobile={isMobile}
        >
          <ASBChart data={data.asb} breaks={getBreaks(raw, "asb")} isMobile={isMobile} />
        </ChartCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6 — CRIME OUTCOMES & REOFFENDING
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Crime Outcomes</h3>
        <p style={SECTION_NOTE}>
          The proportion of crimes resulting in a charge or summons has fallen dramatically —
          from {firstOutcome?.overall}% in {firstOutcome?.year} to just {latestOutcome?.overall}%
          in {latestOutcome?.year}. Sexual offences have the lowest charge rate at just{" "}
          {snap.chargeRateSexual}%. Meanwhile, the proven reoffending rate has remained stubbornly
          stable at around 25%, with juvenile reoffenders consistently higher than adults.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="Overall Charge Rate"
            value={`${snap.chargeRateOverall}%`}
            change={`down from ${firstOutcome?.overall}% in ${firstOutcome?.year}`}
            up={false}
            color={P.navy}
            delay={0.1}
          />
          <MetricCard
            label="Sexual Charge Rate"
            value={`${snap.chargeRateSexual}%`}
            change={snap.chargeRateYear}
            up={false}
            color={P.red}
            delay={0.18}
          />
          <MetricCard
            label="Reoffending Rate"
            value={`${snap.reoffendingRate}%`}
            change={`proven reoffending (${snap.reoffendingYear})`}
            up={false}
            color={P.sienna}
            delay={0.26}
          />
        </div>

        <ChartCard
          title={outcomesView === "chargeRate" ? "Charge / Summons Rate" : "Proven Reoffending Rate"}
          subtitle={outcomesView === "chargeRate"
            ? `By crime type (%), ${firstOutcome?.year}–${latestOutcome?.year}`
            : `England & Wales (%), ${data.reoffending?.[0]?.year}–${data.reoffending?.[data.reoffending.length - 1]?.year}`
          }
          views={["chargeRate", "reoffending"]}
          viewLabels={{ chargeRate: "Charge Rate", reoffending: "Reoffending" }}
          activeView={outcomesView}
          onViewChange={setOutcomesView}
          source={outcomesView === "chargeRate" ? <>SOURCE: {SRC.hoOutcomes}</> : <>SOURCE: {SRC.mojReoffending}</>}
          isMobile={isMobile}
        >
          {outcomesView === "chargeRate" && <ChargeRateChart data={data.crimeOutcomes} isMobile={isMobile} />}
          {outcomesView === "reoffending" && <ReoffendingChart data={data.reoffending} isMobile={isMobile} />}
        </ChartCard>

        {outcomesView === "chargeRate" && (
          <Legend items={[
            { key: "overall", label: "Overall", color: P.navy },
            { key: "violent", label: "Violent", color: P.red },
            { key: "sexual", label: "Sexual", color: P.sienna },
            { key: "theft", label: "Theft", color: P.grey },
            { key: "robbery", label: "Robbery", color: P.teal },
          ]} />
        )}
        {outcomesView === "reoffending" && (
          <Legend items={[
            { key: "overall", label: "Overall", color: P.navy },
            { key: "juvenile", label: "Juvenile", color: P.red },
            { key: "adult", label: "Adult", color: P.teal },
          ]} />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7 — FEAR OF CRIME
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>Fear of Crime</h3>
        <p style={SECTION_NOTE}>
          Public perceptions of safety have worsened since the pandemic despite long-term falls
          in most crime types. The proportion feeling unsafe walking alone at night reached{" "}
          {snap.unsafeAtNight}% in {snap.unsafeAtNightYear}, up from a low of 28% in 2015-16.
          This perception–reality gap is one of the most striking features of the UK crime landscape:
          while survey-measured crime has fallen substantially since the mid-1990s, anxiety about
          crime has risen since 2020.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <MetricCard
            label="Feel Unsafe at Night"
            value={`${snap.unsafeAtNight}%`}
            change={`walking alone (${snap.unsafeAtNightYear})`}
            up={true}
            color={P.red}
            delay={0.1}
          />
        </div>

        <ChartCard
          title="Fear of Crime"
          subtitle={`CSEW perceptions (%), ${data.fearOfCrime?.[0]?.year}–${data.fearOfCrime?.[data.fearOfCrime.length - 1]?.year}`}
          source={<>SOURCE: {SRC.csew}</>}
          isMobile={isMobile}
        >
          <FearOfCrimeChart data={data.fearOfCrime} isMobile={isMobile} />
        </ChartCard>

        <Legend items={[
          { key: "unsafe", label: "Feel unsafe walking alone at night", color: P.red },
          { key: "violent", label: "High worry about violent crime", color: P.sienna },
          { key: "burglary", label: "High worry about burglary", color: P.grey },
        ]} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 8 — CITY COMPARISON
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={SECTION_HEADING}>City Comparison</h3>
        <p style={SECTION_NOTE}>
          Crime rates vary enormously across police force areas. Cleveland (Middlesbrough)
          records the highest overall rate at {snap.highestCrimeRate} crimes per 1,000 population,
          while Surrey records the lowest at {snap.lowestCrimeRate}. For knife crime specifically,
          London leads at 182 offences per 100,000, more than double the national average of 80.
          These figures cover the full police force area, not just the named city.
        </p>

        <ChartCard
          title={cityView === "total" ? "Crime Rate by Police Force Area" : "Knife Crime by Police Force Area"}
          subtitle={cityView === "total" ? `Total recorded crime per 1,000 population, ${snap.nationalCrimeRateYear}` : `Offences per 100,000 population, ${snap.nationalCrimeRateYear}`}
          views={["total", "knife"]}
          viewLabels={{ total: "All Crime", knife: "Knife Crime" }}
          activeView={cityView}
          onViewChange={setCityView}
          source={cityView === "total" ? <>SOURCE: {SRC.onsPfa}</> : <>SOURCE: {SRC.hoWeapons}</>}
          isMobile={isMobile}
        >
          {cityView === "total" && <CityRatesChart data={data.cityRates} isMobile={isMobile} />}
          {cityView === "knife" && <CityKnifeChart data={data.cityKnife} isMobile={isMobile} />}
        </ChartCard>
      </div>

      <AnalysisBox color={P.navy} label="Context">
        Police recorded violent crime stands at {(snap.violentCrime / 1000).toFixed(0)}k offences ({snap.violentCrimeYear}),
        {violentChange ? ` up ${violentChange}% since ${firstViolent.year}` : ""} — though part of the rise reflects improved recording standards.
        {" "}Knife crime: {snap.knifeCrime?.toLocaleString()} offences, down slightly from
        the {snap.knifeCrimePeak?.toLocaleString()} peak in {snap.knifeCrimePeakYear}.
        {" "}Sexual offences have risen to {snap.sexualOffences}k, largely reflecting recording improvements.
        {" "}The charge rate has collapsed from {firstOutcome?.overall}% to {latestOutcome?.overall}%,
        while {snap.unsafeAtNight}% now feel unsafe walking alone at night.
        {" "}Crime rates range from {snap.highestCrimeRate}/1,000 ({snap.highestCrimeRateArea}) to {snap.lowestCrimeRate}/1,000 ({snap.lowestCrimeRateArea}).
      </AnalysisBox>
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────────


function Legend({ items }) {
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
      {items.map((item) => (
        <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 14, height: 8, background: item.color, display: "inline-block", borderRadius: 1 }} />
          <span style={{ fontSize: "11px", color: P.textMuted, fontWeight: 400, letterSpacing: "0.04em" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Charts ─────────────────────────────────────────────────────────

function ViolentCrimeChart({ data, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 4 : 2} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Offences (thousands)")} />
        <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toLocaleString()}k`} />} />
        <Bar dataKey="total" name="Violence against person" fill={P.red} opacity={0.25} radius={[3, 3, 0, 0]} />
        <Line type="monotone" dataKey="total" name="Violence against person" stroke={P.red} strokeWidth={2.5} dot={{ r: 3, fill: P.red }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function HomicideChart({ data, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 4 : 2} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Homicides")} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="total" name="All homicides" stroke={P.navy} strokeWidth={2.5} dot={{ r: 3, fill: P.navy }} />
        <Line type="monotone" dataKey="knife" name="Knife homicides" stroke={P.red} strokeWidth={2} dot={{ r: 2.5, fill: P.red }} strokeDasharray="6 3" />
      </LineChart>
    </ResponsiveContainer>
  );
}

function KnifeCrimeChart({ data, breaks, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 2 : 1} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Offences")} />
        <Tooltip content={<CustomTooltip />} />
        <MethodologyBreak breaks={breaks} />
        <Bar dataKey="offences" name="Knife offences" fill={P.sienna} opacity={0.3} radius={[3, 3, 0, 0]} />
        <Line type="monotone" dataKey="offences" name="Knife offences" stroke={P.sienna} strokeWidth={2.5} dot={{ r: 3, fill: P.sienna }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function FirearmsChart({ data, breaks, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 2 : 1} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Offences")} />
        <Tooltip content={<CustomTooltip />} />
        <MethodologyBreak breaks={breaks} />
        <Bar dataKey="offences" name="Firearms offences" fill={P.navy} opacity={0.3} radius={[3, 3, 0, 0]} />
        <Line type="monotone" dataKey="offences" name="Firearms offences" stroke={P.navy} strokeWidth={2.5} dot={{ r: 3, fill: P.navy }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function HospitalChart({ data, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 2 : 1} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Admissions")} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="admissions" name="Hospital admissions" fill={P.red} opacity={0.3} radius={[3, 3, 0, 0]} />
        <Line type="monotone" dataKey="admissions" name="Admissions" stroke={P.red} strokeWidth={2.5} dot={{ r: 3, fill: P.red }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function SexualOffencesChart({ data, breaks, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 4 : 2} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Offences (thousands)")} />
        <Tooltip content={<CustomTooltip formatter={(v) => `${v}k`} />} />
        <MethodologyBreak breaks={breaks} />
        <Line type="monotone" dataKey="total" name="Total" stroke={P.red} strokeWidth={2.5} dot={{ r: 3, fill: P.red }} />
        <Line type="monotone" dataKey="rape" name="Rape" stroke={P.sienna} strokeWidth={2} dot={{ r: 2.5, fill: P.sienna }} strokeDasharray="6 3" />
        <Line type="monotone" dataKey="other" name="Other sexual" stroke={P.grey} strokeWidth={2} dot={{ r: 2.5, fill: P.grey }} strokeDasharray="4 4" />
      </LineChart>
    </ResponsiveContainer>
  );
}

function DomesticAbuseChart({ data, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 4 : 2} />
        <YAxis yAxisId="left" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Prevalence (%)")} domain={[0, 10]} />
        <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Police-flagged (thousands)", { position: "insideRight" })} />
        <Tooltip content={<CustomTooltip />} />
        <Line yAxisId="left" type="monotone" dataKey="prevalencePct" name="CSEW prevalence (%)" stroke={P.teal} strokeWidth={2.5} dot={{ r: 3, fill: P.teal }} />
        <Bar yAxisId="right" dataKey="policeFlagged" name="Police-flagged (thousands)" fill={P.sienna} opacity={0.4} radius={[3, 3, 0, 0]} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function FraudChart({ data, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 2 : 1} />
        <YAxis yAxisId="left" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("CSEW estimate (millions)")} />
        <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Police recorded (thousands)", { position: "insideRight" })} />
        <Tooltip content={<CustomTooltip />} />
        <Bar yAxisId="left" dataKey="csewEstimate" name="CSEW estimate (m)" fill={P.navy} opacity={0.4} radius={[3, 3, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="policeRecorded" name="Police recorded (k)" stroke={P.red} strokeWidth={2.5} dot={{ r: 3, fill: P.red }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function ASBChart({ data, breaks, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 3 : 2} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Incidents (thousands)")} />
        <Tooltip content={<CustomTooltip formatter={(v) => `${v?.toLocaleString()}k`} />} />
        <MethodologyBreak breaks={breaks} />
        <Bar dataKey="incidents" name="ASB incidents" fill={P.teal} opacity={0.3} radius={[3, 3, 0, 0]} />
        <Line type="monotone" dataKey="incidents" name="ASB incidents" stroke={P.teal} strokeWidth={2.5} dot={{ r: 3, fill: P.teal }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function ChargeRateChart({ data, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 2 : 1} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Charge rate (%)")} domain={[0, 'auto']} />
        <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
        <Line type="monotone" dataKey="overall" name="Overall" stroke={P.navy} strokeWidth={2.5} dot={{ r: 3, fill: P.navy }} />
        <Line type="monotone" dataKey="violent" name="Violent" stroke={P.red} strokeWidth={2} dot={{ r: 2.5, fill: P.red }} />
        <Line type="monotone" dataKey="sexual" name="Sexual" stroke={P.sienna} strokeWidth={2} dot={{ r: 2.5, fill: P.sienna }} strokeDasharray="6 3" />
        <Line type="monotone" dataKey="theft" name="Theft" stroke={P.grey} strokeWidth={2} dot={{ r: 2.5, fill: P.grey }} strokeDasharray="4 4" />
        <Line type="monotone" dataKey="robbery" name="Robbery" stroke={P.teal} strokeWidth={2} dot={{ r: 2.5, fill: P.teal }} strokeDasharray="8 4" />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ReoffendingChart({ data, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 2 : 1} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Reoffending rate (%)")} domain={[0, 50]} />
        <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
        <Line type="monotone" dataKey="overall" name="Overall" stroke={P.navy} strokeWidth={2.5} dot={{ r: 3, fill: P.navy }} />
        <Line type="monotone" dataKey="juvenile" name="Juvenile" stroke={P.red} strokeWidth={2} dot={{ r: 2.5, fill: P.red }} strokeDasharray="6 3" />
        <Line type="monotone" dataKey="adult" name="Adult" stroke={P.teal} strokeWidth={2} dot={{ r: 2.5, fill: P.teal }} strokeDasharray="4 4" />
      </LineChart>
    </ResponsiveContainer>
  );
}

function FearOfCrimeChart({ data, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: isMobile ? -15 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" />
        <XAxis dataKey="year" tick={AXIS_TICK_MONO} axisLine={{ stroke: P.border }} tickLine={false} interval={isMobile ? 3 : 2} />
        <YAxis tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} label={yAxisLabel("Respondents (%)")} domain={[0, 50]} />
        <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
        <Line type="monotone" dataKey="unsafeAlone" name="Feel unsafe at night" stroke={P.red} strokeWidth={2.5} dot={{ r: 3, fill: P.red }} />
        <Line type="monotone" dataKey="highWorryViolent" name="High worry — violent" stroke={P.sienna} strokeWidth={2} dot={{ r: 2.5, fill: P.sienna }} strokeDasharray="6 3" />
        <Line type="monotone" dataKey="highWorryBurglary" name="High worry — burglary" stroke={P.grey} strokeWidth={2} dot={{ r: 2.5, fill: P.grey }} strokeDasharray="4 4" />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CityRatesChart({ data, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(340, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: isMobile ? 10 : 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="city"
          tick={{ fontSize: isMobile ? 10 : 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }}
          axisLine={false}
          tickLine={false}
          width={isMobile ? 90 : 110}
        />
        <Tooltip content={<CustomTooltip formatter={(v) => `${v} per 1,000`} />} />
        <Bar dataKey="rate" name="Crime rate per 1,000" radius={[0, 3, 3, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.city}
              fill={entry.city === "National avg" ? P.teal : entry.rate >= 110 ? P.red : entry.rate >= 92 ? P.sienna : P.navy}
              opacity={entry.city === "National avg" ? 1 : 0.75}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CityKnifeChart({ data, isMobile }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(340, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: isMobile ? 10 : 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,69,0.06)" horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK_MONO} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="city"
          tick={{ fontSize: isMobile ? 10 : 11, fill: P.textMuted, fontFamily: "'DM Mono', monospace" }}
          axisLine={false}
          tickLine={false}
          width={isMobile ? 90 : 110}
        />
        <Tooltip content={<CustomTooltip formatter={(v) => `${v} per 100k`} />} />
        <Bar dataKey="rate" name="Knife crime per 100k" radius={[0, 3, 3, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.city}
              fill={entry.city === "National avg" ? P.teal : entry.rate >= 120 ? P.red : entry.rate >= 80 ? P.sienna : P.navy}
              opacity={entry.city === "National avg" ? 1 : 0.75}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
