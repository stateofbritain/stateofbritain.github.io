/**
 * fetch-asylum-statistics.js
 *
 * Comprehensive asylum and irregular migration statistics for the debate page.
 * All data is curated from official published sources — hardcoded here for
 * reproducibility (same pattern as fetch-immigration.js).
 *
 * Sources:
 *   - Home Office Immigration Statistics (quarterly release)
 *   - Home Office Irregular Migration to the UK
 *   - NAO Investigation into asylum accommodation (HC 1722)
 *   - NAO Investigation into the UK-Rwanda partnership (HC 1720)
 *   - Eurostat Asylum Statistics (migr_asyappctza, migr_asydcfsta)
 *   - UNHCR Global Trends
 *   - EUAA Annual Report on the Situation of Asylum
 *   - Ministry of Justice, Tribunal Statistics
 *
 * Outputs: public/data/asylum-statistics.json
 */
import { writeFileSync } from "fs";

// ── Channel crossings (small boats, calendar year) ─────────────────────
// Source: Home Office, Irregular migration to the UK statistics
// https://www.gov.uk/government/statistics/irregular-migration-to-the-uk-year-ending-december-2024
const channelCrossings = [
  { year: 2018, crossings: 299 },
  { year: 2019, crossings: 1843 },
  { year: 2020, crossings: 8466 },
  { year: 2021, crossings: 28526 },
  { year: 2022, crossings: 45774 },
  { year: 2023, crossings: 29437 },
  { year: 2024, crossings: 36816 },
];

// ── Channel crossings quarterly (for granular trend) ───────────────────
// Source: Home Office, Irregular migration to the UK
// Crossings are seasonal — higher in summer months
const channelCrossingsQuarterly = [
  { quarter: "2020-Q1", crossings: 476 },
  { quarter: "2020-Q2", crossings: 2296 },
  { quarter: "2020-Q3", crossings: 4217 },
  { quarter: "2020-Q4", crossings: 1477 },
  { quarter: "2021-Q1", crossings: 1610 },
  { quarter: "2021-Q2", crossings: 4230 },
  { quarter: "2021-Q3", crossings: 12696 },
  { quarter: "2021-Q4", crossings: 9990 },
  { quarter: "2022-Q1", crossings: 4524 },
  { quarter: "2022-Q2", crossings: 9650 },
  { quarter: "2022-Q3", crossings: 18754 },
  { quarter: "2022-Q4", crossings: 12846 },
  { quarter: "2023-Q1", crossings: 3216 },
  { quarter: "2023-Q2", crossings: 7535 },
  { quarter: "2023-Q3", crossings: 11808 },
  { quarter: "2023-Q4", crossings: 6878 },
  { quarter: "2024-Q1", crossings: 5373 },
  { quarter: "2024-Q2", crossings: 11432 },
  { quarter: "2024-Q3", crossings: 13247 },
  { quarter: "2024-Q4", crossings: 6764 },
];

// ── Asylum applications and initial decisions (UK, calendar year) ──────
// Source: Home Office Immigration Statistics, Table Asy_D01 / Asy_D02
// Extended back to 2001 for full modern era
const asylumDecisions = [
  { year: 2001, applications: 71365, initialDecisions: 64980, grants: 20510, refusals: 44470, grantRatePct: 32 },
  { year: 2002, applications: 84130, initialDecisions: 83540, grants: 10405, refusals: 73135, grantRatePct: 12 },
  { year: 2003, applications: 60045, initialDecisions: 64585, grants: 5690, refusals: 58895, grantRatePct: 9 },
  { year: 2004, applications: 40625, initialDecisions: 46310, grants: 3780, refusals: 42530, grantRatePct: 8 },
  { year: 2005, applications: 30840, initialDecisions: 27560, grants: 2695, refusals: 24865, grantRatePct: 10 },
  { year: 2006, applications: 28320, initialDecisions: 23625, grants: 3195, refusals: 20430, grantRatePct: 14 },
  { year: 2007, applications: 27905, initialDecisions: 22475, grants: 4055, refusals: 18420, grantRatePct: 18 },
  { year: 2008, applications: 31315, initialDecisions: 22165, grants: 4535, refusals: 17630, grantRatePct: 20 },
  { year: 2009, applications: 30675, initialDecisions: 24485, grants: 5220, refusals: 19265, grantRatePct: 21 },
  { year: 2010, applications: 25420, initialDecisions: 23225, grants: 5885, refusals: 17340, grantRatePct: 25 },
  { year: 2011, applications: 26915, initialDecisions: 19810, grants: 5965, refusals: 13845, grantRatePct: 30 },
  { year: 2012, applications: 28895, initialDecisions: 19120, grants: 6965, refusals: 12155, grantRatePct: 36 },
  { year: 2013, applications: 30585, initialDecisions: 21840, grants: 7510, refusals: 14330, grantRatePct: 34 },
  { year: 2014, applications: 32344, initialDecisions: 24198, grants: 9920, refusals: 14278, grantRatePct: 41 },
  { year: 2015, applications: 32733, initialDecisions: 28798, grants: 13905, refusals: 14893, grantRatePct: 48 },
  { year: 2016, applications: 30747, initialDecisions: 28452, grants: 12584, refusals: 15868, grantRatePct: 44 },
  { year: 2017, applications: 26350, initialDecisions: 25780, grants: 8501, refusals: 17279, grantRatePct: 33 },
  { year: 2018, applications: 29480, initialDecisions: 20343, grants: 11932, refusals: 8411, grantRatePct: 59 },
  { year: 2019, applications: 35566, initialDecisions: 20507, grants: 16075, refusals: 4432, grantRatePct: 78 },
  { year: 2020, applications: 29456, initialDecisions: 13399, grants: 8672, refusals: 4727, grantRatePct: 65 },
  { year: 2021, applications: 48540, initialDecisions: 14784, grants: 13692, refusals: 1092, grantRatePct: 93 },
  { year: 2022, applications: 74751, initialDecisions: 18444, grants: 17001, refusals: 1443, grantRatePct: 92 },
  { year: 2023, applications: 67337, initialDecisions: 50820, grants: 37035, refusals: 13785, grantRatePct: 73 },
  { year: 2024, applications: 50658, initialDecisions: 52973, grants: 30756, refusals: 22217, grantRatePct: 58 },
];

// ── Asylum grant rate by top nationalities (year ending Dec 2023) ──────
// Source: Home Office Immigration Statistics, Table Asy_D02
const grantRateByNationality = [
  { nationality: "Afghanistan", grantRatePct: 98, decisions: 7421 },
  { nationality: "Eritrea", grantRatePct: 92, decisions: 2103 },
  { nationality: "Syria", grantRatePct: 98, decisions: 1852 },
  { nationality: "Sudan", grantRatePct: 82, decisions: 2476 },
  { nationality: "Iran", grantRatePct: 67, decisions: 5234 },
  { nationality: "Iraq", grantRatePct: 52, decisions: 2891 },
  { nationality: "Vietnam", grantRatePct: 81, decisions: 1247 },
  { nationality: "Albania", grantRatePct: 53, decisions: 12074 },
  { nationality: "India", grantRatePct: 18, decisions: 1685 },
  { nationality: "Pakistan", grantRatePct: 24, decisions: 1093 },
];

// ── Grant rates for key nationalities over time (2019-2024) ─────────────
// Source: Home Office Immigration Statistics, Table Asy_D02
// Tracks how grant rates shift as decision volumes and policy change
const grantRateTimeSeries = [
  { year: 2019, afghanistan: 83, iran: 62, albania: 47, iraq: 38, eritrea: 88, syria: 95 },
  { year: 2020, afghanistan: 90, iran: 58, albania: 42, iraq: 34, eritrea: 91, syria: 96 },
  { year: 2021, afghanistan: 99, iran: 88, albania: 53, iraq: 72, eritrea: 95, syria: 99 },
  { year: 2022, afghanistan: 99, iran: 91, albania: 56, iraq: 75, eritrea: 96, syria: 99 },
  { year: 2023, afghanistan: 98, iran: 67, albania: 53, iraq: 52, eritrea: 92, syria: 98 },
  { year: 2024, afghanistan: 95, iran: 52, albania: 21, iraq: 42, eritrea: 89, syria: 96 },
];

// ── Asylum backlog (cases awaiting initial decision, end of period) ────
// Source: Home Office Immigration Statistics, Table Asy_D04
// Extended back to 2010
const asylumBacklog = [
  { year: 2010, pending: 18195 },
  { year: 2011, pending: 23115 },
  { year: 2012, pending: 27920 },
  { year: 2013, pending: 29270 },
  { year: 2014, pending: 30398 },
  { year: 2015, pending: 30560 },
  { year: 2016, pending: 33061 },
  { year: 2017, pending: 33812 },
  { year: 2018, pending: 42098 },
  { year: 2019, pending: 57422 },
  { year: 2020, pending: 73526 },
  { year: 2021, pending: 107453 },
  { year: 2022, pending: 160919 },
  { year: 2023, pending: 118584 },
  { year: 2024, pending: 96577 },
];

// ── Quarterly backlog (recent surge period detail) ─────────────────────
// Source: Home Office Immigration Statistics, Table Asy_D04
const asylumBacklogQuarterly = [
  { quarter: "2019-Q1", pending: 43536 },
  { quarter: "2019-Q2", pending: 47866 },
  { quarter: "2019-Q3", pending: 52487 },
  { quarter: "2019-Q4", pending: 57422 },
  { quarter: "2020-Q1", pending: 61424 },
  { quarter: "2020-Q2", pending: 65281 },
  { quarter: "2020-Q3", pending: 68503 },
  { quarter: "2020-Q4", pending: 73526 },
  { quarter: "2021-Q1", pending: 77643 },
  { quarter: "2021-Q2", pending: 84297 },
  { quarter: "2021-Q3", pending: 94518 },
  { quarter: "2021-Q4", pending: 107453 },
  { quarter: "2022-Q1", pending: 117945 },
  { quarter: "2022-Q2", pending: 132584 },
  { quarter: "2022-Q3", pending: 148723 },
  { quarter: "2022-Q4", pending: 160919 },
  { quarter: "2023-Q1", pending: 170865 },
  { quarter: "2023-Q2", pending: 164312 },
  { quarter: "2023-Q3", pending: 143870 },
  { quarter: "2023-Q4", pending: 118584 },
  { quarter: "2024-Q1", pending: 111248 },
  { quarter: "2024-Q2", pending: 105732 },
  { quarter: "2024-Q3", pending: 100145 },
  { quarter: "2024-Q4", pending: 96577 },
];

// ── Dublin III transfers (UK, calendar year) ───────────────────────────
// Source: Home Office Immigration Statistics; Eurostat Dublin statistics
// "Outgoing" = transfers FROM UK to EU states
// "Incoming" = transfers TO UK from EU states
// System ceased to apply to UK from 1 January 2021 (Brexit)
const dublinTransfers = [
  { year: 2015, outgoing: 71, incoming: 196 },
  { year: 2016, outgoing: 352, incoming: 519 },
  { year: 2017, outgoing: 212, incoming: 341 },
  { year: 2018, outgoing: 209, incoming: 296 },
  { year: 2019, outgoing: 166, incoming: 231 },
  { year: 2020, outgoing: 24, incoming: 47 },
];

// ── Returns and removals (UK, year ending) ─────────────────────────────
// Source: Home Office Immigration Statistics, Table Ret_D01
// Extended back to 2004 for long-run trend
const returns = [
  { year: 2004, enforced: 14280, voluntary: 7965, total: 22245, fnoReturns: null },
  { year: 2005, enforced: 15685, voluntary: 11975, total: 27660, fnoReturns: null },
  { year: 2006, enforced: 18280, voluntary: 13015, total: 31295, fnoReturns: null },
  { year: 2007, enforced: 16475, voluntary: 13365, total: 29840, fnoReturns: null },
  { year: 2008, enforced: 16810, voluntary: 15665, total: 32475, fnoReturns: 5395 },
  { year: 2009, enforced: 15050, voluntary: 22195, total: 37245, fnoReturns: 5235 },
  { year: 2010, enforced: 14770, voluntary: 25560, total: 40330, fnoReturns: 5235 },
  { year: 2011, enforced: 15035, voluntary: 25015, total: 40050, fnoReturns: 4998 },
  { year: 2012, enforced: 14574, voluntary: 24765, total: 39339, fnoReturns: 4941 },
  { year: 2013, enforced: 13299, voluntary: 27718, total: 41017, fnoReturns: 5097 },
  { year: 2014, enforced: 12744, voluntary: 27365, total: 40109, fnoReturns: 5372 },
  { year: 2015, enforced: 12056, voluntary: 26745, total: 38801, fnoReturns: 5602 },
  { year: 2016, enforced: 12150, voluntary: 25528, total: 37678, fnoReturns: 5810 },
  { year: 2017, enforced: 11438, voluntary: 19689, total: 31127, fnoReturns: 5297 },
  { year: 2018, enforced: 9474, voluntary: 17883, total: 27357, fnoReturns: 5071 },
  { year: 2019, enforced: 8375, voluntary: 15998, total: 24373, fnoReturns: 5134 },
  { year: 2020, enforced: 3815, voluntary: 6261, total: 10076, fnoReturns: 2342 },
  { year: 2021, enforced: 4413, voluntary: 7055, total: 11468, fnoReturns: 2680 },
  { year: 2022, enforced: 5269, voluntary: 9387, total: 14656, fnoReturns: 3281 },
  { year: 2023, enforced: 6561, voluntary: 12481, total: 19042, fnoReturns: 3687 },
  { year: 2024, enforced: 7102, voluntary: 12938, total: 20040, fnoReturns: 3954 },
];

// ── International comparison: asylum applications per 100k (time series) ──
// Source: Eurostat migr_asyappctza; UNHCR; Home Office for UK
// Per capita rates for selected European countries, 2015-2023
const internationalComparison = [
  { year: 2015, uk: 49, germany: 587, france: 114, sweden: 1667, italy: 142, austria: 1024, netherlands: 261, spain: 32 },
  { year: 2016, uk: 47, germany: 890, france: 124, sweden: 282, italy: 207, austria: 472, netherlands: 120, spain: 33 },
  { year: 2017, uk: 40, germany: 245, france: 147, sweden: 249, italy: 212, austria: 289, netherlands: 100, spain: 71 },
  { year: 2018, uk: 45, germany: 216, france: 163, sweden: 212, italy: 87, austria: 161, netherlands: 125, spain: 122 },
  { year: 2019, uk: 53, germany: 191, france: 187, sweden: 225, italy: 61, austria: 139, netherlands: 139, spain: 256 },
  { year: 2020, uk: 44, germany: 146, france: 132, sweden: 147, italy: 44, austria: 101, netherlands: 82, spain: 185 },
  { year: 2021, uk: 73, germany: 200, france: 162, sweden: 148, italy: 89, austria: 451, netherlands: 147, spain: 144 },
  { year: 2022, uk: 111, germany: 294, france: 222, sweden: 219, italy: 140, austria: 631, netherlands: 238, spain: 246 },
  { year: 2023, uk: 99, germany: 417, france: 246, sweden: 119, italy: 232, austria: 638, netherlands: 247, spain: 339 },
];

// ── Asylum accommodation costs ─────────────────────────────────────────
// Source: NAO Investigation into asylum accommodation, HC 1722 (2024)
// Home Office annual accounts
const accommodationCosts = [
  { year: "2015-16", costMnGBP: 540, hotelResidents: null, dispersalResidents: null },
  { year: "2016-17", costMnGBP: 575, hotelResidents: null, dispersalResidents: null },
  { year: "2017-18", costMnGBP: 610, hotelResidents: null, dispersalResidents: null },
  { year: "2018-19", costMnGBP: 720, hotelResidents: null, dispersalResidents: null },
  { year: "2019-20", costMnGBP: 900, hotelResidents: null, dispersalResidents: null },
  { year: "2020-21", costMnGBP: 1200, hotelResidents: 9500, dispersalResidents: 51380 },
  { year: "2021-22", costMnGBP: 2100, hotelResidents: 26000, dispersalResidents: 55212 },
  { year: "2022-23", costMnGBP: 3900, hotelResidents: 51000, dispersalResidents: 58432 },
  { year: "2023-24", costMnGBP: 4700, hotelResidents: 47000, dispersalResidents: 61890 },
  { year: "2024-25", costMnGBP: 3800, hotelResidents: 29000, dispersalResidents: 65230 },
];

// ── Rwanda partnership costs ───────────────────────────────────────────
// Source: NAO Investigation into the UK-Rwanda partnership (2024)
// HC 1720, published March 2024
const rwandaCosts = {
  totalSpentMn: 290,
  periodStart: "April 2022",
  periodEnd: "February 2024",
  flightsCompleted: 0,
  personsRelocated: 0,
  breakdown: [
    { category: "Payments to Government of Rwanda", amountMn: 240 },
    { category: "Legal costs (defence and judicial review)", amountMn: 28 },
    { category: "Operational and staffing costs", amountMn: 17 },
    { category: "Other (facility, travel, admin)", amountMn: 5 },
  ],
  source: "NAO, Investigation into the UK-Rwanda partnership, HC 1720",
};

// ── Processing times (median weeks to initial decision) ────────────────
// Source: Home Office Immigration Statistics; Refugee Council analysis
// Extended back to 2014
const processingTimes = [
  { year: 2014, medianWeeksUK: 16 },
  { year: 2015, medianWeeksUK: 14 },
  { year: 2016, medianWeeksUK: 16 },
  { year: 2017, medianWeeksUK: 20 },
  { year: 2018, medianWeeksUK: 26 },
  { year: 2019, medianWeeksUK: 24 },
  { year: 2020, medianWeeksUK: 36 },
  { year: 2021, medianWeeksUK: 48 },
  { year: 2022, medianWeeksUK: 60 },
  { year: 2023, medianWeeksUK: 52 },
  { year: 2024, medianWeeksUK: 32 },
];

// ── Processing times international comparison (2023) ───────────────────
// Source: EUAA Annual Report 2024
const processingComparison2023 = [
  { country: "United Kingdom", medianWeeks: 52 },
  { country: "France", medianWeeks: 21 },
  { country: "Germany", medianWeeks: 28 },
  { country: "Netherlands", medianWeeks: 17 },
  { country: "Sweden", medianWeeks: 14 },
];

// ── Visa overstayers vs irregular crossings ────────────────────────────
// Source: Home Office estimates (transparency data); ONS
// Extended with earlier estimates
const irregularRoutes = [
  { year: 2019, channelCrossings: 1843, estimatedOverstayers: 62000, lorryDetections: 6100 },
  { year: 2020, channelCrossings: 8466, estimatedOverstayers: 44000, lorryDetections: 3900 },
  { year: 2021, channelCrossings: 28526, estimatedOverstayers: 51000, lorryDetections: 3500 },
  { year: 2022, channelCrossings: 45774, estimatedOverstayers: 56000, lorryDetections: 3200 },
  { year: 2023, channelCrossings: 29437, estimatedOverstayers: 53000, lorryDetections: 2800 },
  { year: 2024, channelCrossings: 36816, estimatedOverstayers: 49000, lorryDetections: 2400 },
];

// ── Asylum appeals ─────────────────────────────────────────────────────
// Source: Ministry of Justice, Tribunal Statistics Quarterly
// First-tier Tribunal (Immigration and Asylum Chamber)
// "allowed" = appeal succeeds, refusal overturned
// "dismissed" = appeal fails, refusal upheld
// "withdrawn" = appeal withdrawn before determination
// Overturn rates are critical context — many initial refusals don't stick
const asylumAppeals = [
  { year: 2014, lodged: 17830, determined: 15920, allowed: 4410, dismissed: 10720, withdrawn: 790, overturnPct: 29 },
  { year: 2015, lodged: 16210, determined: 16740, allowed: 5190, dismissed: 10640, withdrawn: 910, overturnPct: 33 },
  { year: 2016, lodged: 15490, determined: 16310, allowed: 5220, dismissed: 10100, withdrawn: 990, overturnPct: 34 },
  { year: 2017, lodged: 21340, determined: 18820, allowed: 6240, dismissed: 11470, withdrawn: 1110, overturnPct: 35 },
  { year: 2018, lodged: 12960, determined: 16970, allowed: 6520, dismissed: 9320, withdrawn: 1130, overturnPct: 41 },
  { year: 2019, lodged: 7480, determined: 11230, allowed: 5250, dismissed: 5060, withdrawn: 920, overturnPct: 51 },
  { year: 2020, lodged: 6240, determined: 6880, allowed: 3530, dismissed: 2720, withdrawn: 630, overturnPct: 56 },
  { year: 2021, lodged: 3790, determined: 5290, allowed: 2860, dismissed: 1930, withdrawn: 500, overturnPct: 60 },
  { year: 2022, lodged: 4520, determined: 5870, allowed: 3360, dismissed: 2010, withdrawn: 500, overturnPct: 63 },
  { year: 2023, lodged: 14870, determined: 13960, allowed: 7150, dismissed: 5710, withdrawn: 1100, overturnPct: 56 },
  { year: 2024, lodged: 22410, determined: 19680, allowed: 8860, dismissed: 9230, withdrawn: 1590, overturnPct: 49 },
];

// ── Immigration detention ──────────────────────────────────────────────
// Source: Home Office Immigration Statistics, Table Det_D01/D02
// Persons entering immigration detention and snapshot population
const detention = [
  { year: 2010, entering: 27070, population: 2775 },
  { year: 2011, entering: 28640, population: 2942 },
  { year: 2012, entering: 29440, population: 2796 },
  { year: 2013, entering: 30418, population: 2885 },
  { year: 2014, entering: 32053, population: 3223 },
  { year: 2015, entering: 32163, population: 3030 },
  { year: 2016, entering: 28908, population: 2619 },
  { year: 2017, entering: 27290, population: 2338 },
  { year: 2018, entering: 24748, population: 1784 },
  { year: 2019, entering: 24052, population: 1637 },
  { year: 2020, entering: 12586, population: 786 },
  { year: 2021, entering: 16512, population: 1332 },
  { year: 2022, entering: 21427, population: 1576 },
  { year: 2023, entering: 22785, population: 1786 },
  { year: 2024, entering: 23410, population: 1842 },
];

// ── Resettlement schemes (safe/legal routes) ───────────────────────────
// Source: Home Office Immigration Statistics, Table Asy_D10
// VPRS = Vulnerable Persons Resettlement Scheme (Syrian)
// UKRS = UK Resettlement Scheme (replaced VPRS from 2021)
// ACRS = Afghan Citizens Resettlement Scheme
// ARAP = Afghan Relocations and Assistance Policy
// Homes for Ukraine not included (separate visa route, not asylum)
const resettlement = [
  { year: 2014, vprs: 143, ukrs: null, acrs: null, arap: null, total: 143 },
  { year: 2015, vprs: 1085, ukrs: null, acrs: null, arap: null, total: 1085 },
  { year: 2016, vprs: 4414, ukrs: null, acrs: null, arap: null, total: 4414 },
  { year: 2017, vprs: 4832, ukrs: null, acrs: null, arap: null, total: 4832 },
  { year: 2018, vprs: 5074, ukrs: null, acrs: null, arap: null, total: 5074 },
  { year: 2019, vprs: 5241, ukrs: null, acrs: null, arap: null, total: 5241 },
  { year: 2020, vprs: 824, ukrs: 0, acrs: null, arap: null, total: 824 },
  { year: 2021, vprs: null, ukrs: 1127, acrs: 0, arap: 6532, total: 7659 },
  { year: 2022, vprs: null, ukrs: 1218, acrs: 112, arap: 5380, total: 6710 },
  { year: 2023, vprs: null, ukrs: 2356, acrs: 1573, arap: 1972, total: 5901 },
  { year: 2024, vprs: null, ukrs: 2890, acrs: 1420, arap: 1245, total: 5555 },
];

// ── Asylum applications by nationality over time ───────────────────────
// Source: Home Office Immigration Statistics, Table Asy_D01
// Top nationalities by volume of applications, 2018-2024
const applicationsByNationality = [
  { year: 2018, iran: 2402, iraq: 2895, albania: 1539, afghanistan: 2738, eritrea: 2657, sudan: 1365, syria: 654, vietnam: 1418, other: 13812 },
  { year: 2019, iran: 3490, iraq: 3157, albania: 2847, afghanistan: 3018, eritrea: 3068, sudan: 2032, syria: 714, vietnam: 2358, other: 14882 },
  { year: 2020, iran: 3298, iraq: 2415, albania: 2095, afghanistan: 2861, eritrea: 2620, sudan: 1763, syria: 543, vietnam: 1106, other: 12755 },
  { year: 2021, iran: 8754, iraq: 4536, albania: 6230, afghanistan: 4893, eritrea: 3021, sudan: 2412, syria: 1064, vietnam: 2180, other: 15450 },
  { year: 2022, iran: 11209, iraq: 5068, albania: 16052, afghanistan: 7632, eritrea: 3471, sudan: 3258, syria: 1345, vietnam: 3028, other: 23688 },
  { year: 2023, iran: 7214, iraq: 3846, albania: 7124, afghanistan: 8541, eritrea: 2878, sudan: 4157, syria: 1290, vietnam: 2368, other: 29919 },
  { year: 2024, iran: 4628, iraq: 3012, albania: 2147, afghanistan: 6842, eritrea: 2341, sudan: 3756, syria: 1012, vietnam: 1854, other: 25066 },
];

// ── Age and gender of Channel crossings ────────────────────────────────
// Source: Home Office, Irregular migration to the UK
// Approximate composition of small boat arrivals, 2023
const crossingsDemographics2023 = [
  { group: "Adult men", pct: 76 },
  { group: "Adult women", pct: 9 },
  { group: "Children (under 18)", pct: 15 },
];

const crossingsDemographicsTimeSeries = [
  { year: 2020, adultMenPct: 87, adultWomenPct: 5, childrenPct: 8 },
  { year: 2021, adultMenPct: 85, adultWomenPct: 6, childrenPct: 9 },
  { year: 2022, adultMenPct: 82, adultWomenPct: 7, childrenPct: 11 },
  { year: 2023, adultMenPct: 76, adultWomenPct: 9, childrenPct: 15 },
  { year: 2024, adultMenPct: 74, adultWomenPct: 10, childrenPct: 16 },
];


// ── Modern Slavery referrals from asylum system ────────────────────────
// Source: Home Office, National Referral Mechanism Statistics
// NRM referrals where the individual is also in the asylum system
const modernSlaveryReferrals = [
  { year: 2016, referrals: 3805 },
  { year: 2017, referrals: 5145 },
  { year: 2018, referrals: 6985 },
  { year: 2019, referrals: 10627 },
  { year: 2020, referrals: 10613 },
  { year: 2021, referrals: 12727 },
  { year: 2022, referrals: 16938 },
  { year: 2023, referrals: 17004 },
  { year: 2024, referrals: 14239 },
];

// ── Unaccompanied asylum-seeking children (UASC) ──────────────────────
// Source: Home Office Immigration Statistics, Table Asy_D01
// Applications from unaccompanied minors
const uasc = [
  { year: 2014, applications: 1945 },
  { year: 2015, applications: 3253 },
  { year: 2016, applications: 3290 },
  { year: 2017, applications: 2399 },
  { year: 2018, applications: 2872 },
  { year: 2019, applications: 3775 },
  { year: 2020, applications: 1517 },
  { year: 2021, applications: 5222 },
  { year: 2022, applications: 5242 },
  { year: 2023, applications: 4583 },
  { year: 2024, applications: 3817 },
];

// ── Global forced displacement ─────────────────────────────────────────
// Source: UNHCR Global Trends (published annually)
// https://www.unhcr.org/global-trends
// Total forcibly displaced worldwide (refugees, asylum seekers, IDPs, stateless, others of concern)
// These figures are cited by the UK government in parliamentary debates and Home Office publications
const globalDisplacement = [
  { year: 2001, displacedMn: 40.0, refugeesMn: 12.1 },
  { year: 2002, displacedMn: 38.3, refugeesMn: 10.6 },
  { year: 2003, displacedMn: 36.6, refugeesMn: 9.7 },
  { year: 2004, displacedMn: 33.8, refugeesMn: 9.2 },
  { year: 2005, displacedMn: 33.9, refugeesMn: 8.7 },
  { year: 2006, displacedMn: 32.9, refugeesMn: 9.9 },
  { year: 2007, displacedMn: 31.7, refugeesMn: 11.4 },
  { year: 2008, displacedMn: 42.0, refugeesMn: 10.5 },
  { year: 2009, displacedMn: 43.3, refugeesMn: 10.4 },
  { year: 2010, displacedMn: 43.7, refugeesMn: 10.5 },
  { year: 2011, displacedMn: 42.5, refugeesMn: 10.4 },
  { year: 2012, displacedMn: 45.2, refugeesMn: 10.5 },
  { year: 2013, displacedMn: 51.2, refugeesMn: 11.7 },
  { year: 2014, displacedMn: 59.5, refugeesMn: 14.4 },
  { year: 2015, displacedMn: 65.3, refugeesMn: 16.1 },
  { year: 2016, displacedMn: 65.6, refugeesMn: 17.2 },
  { year: 2017, displacedMn: 68.5, refugeesMn: 19.9 },
  { year: 2018, displacedMn: 70.8, refugeesMn: 20.4 },
  { year: 2019, displacedMn: 79.5, refugeesMn: 20.4 },
  { year: 2020, displacedMn: 82.4, refugeesMn: 20.7 },
  { year: 2021, displacedMn: 89.3, refugeesMn: 21.3 },
  { year: 2022, displacedMn: 108.4, refugeesMn: 29.4 },
  { year: 2023, displacedMn: 117.3, refugeesMn: 31.6 },
  { year: 2024, displacedMn: 122.6, refugeesMn: 33.7 },
];

// ── Major conflicts driving displacement ───────────────────────────────
// Source: UNHCR Global Trends; Uppsala Conflict Data Program
// Shows which conflicts produced the displacement surges that feed UK asylum applications
// Each row: year the conflict escalated, country, and UNHCR estimated displaced population (millions)
const conflictDisplacement = [
  { conflict: "Afghanistan (ongoing)", escalation: 2001, displacedMn: 6.4, yearEstimate: 2023 },
  { conflict: "Iraq (post-2003)", escalation: 2003, displacedMn: 4.6, yearEstimate: 2023 },
  { conflict: "Syria (civil war)", escalation: 2011, displacedMn: 13.8, yearEstimate: 2023 },
  { conflict: "South Sudan", escalation: 2013, displacedMn: 4.4, yearEstimate: 2023 },
  { conflict: "Yemen", escalation: 2014, displacedMn: 4.5, yearEstimate: 2023 },
  { conflict: "Myanmar (Rohingya)", escalation: 2017, displacedMn: 1.3, yearEstimate: 2023 },
  { conflict: "Eritrea (indefinite conscription)", escalation: 2001, displacedMn: 0.6, yearEstimate: 2023 },
  { conflict: "Ukraine (Russian invasion)", escalation: 2022, displacedMn: 11.7, yearEstimate: 2023 },
  { conflict: "Sudan (civil war)", escalation: 2023, displacedMn: 10.8, yearEstimate: 2024 },
  { conflict: "DR Congo", escalation: 2022, displacedMn: 7.3, yearEstimate: 2023 },
];

// ── UK asylum applications: conflict vs non-conflict origin ────────────
// Source: Derived from Home Office Immigration Statistics Asy_D01
// "Conflict" = nationalities where UK grant rate >70% (proxy for active conflict/persecution)
// Includes: Afghanistan, Syria, Eritrea, Sudan, Iran, Iraq, Somalia, Yemen
// "Non-conflict" = all other nationalities
// This shows how the compositional shift drives the overall grant rate
const conflictVsNonConflict = [
  { year: 2004, conflictOrigin: 18200, nonConflictOrigin: 22425, conflictPct: 45 },
  { year: 2006, conflictOrigin: 12800, nonConflictOrigin: 15520, conflictPct: 45 },
  { year: 2008, conflictOrigin: 14700, nonConflictOrigin: 16615, conflictPct: 47 },
  { year: 2010, conflictOrigin: 12900, nonConflictOrigin: 12520, conflictPct: 51 },
  { year: 2012, conflictOrigin: 14800, nonConflictOrigin: 14095, conflictPct: 51 },
  { year: 2014, conflictOrigin: 17500, nonConflictOrigin: 14844, conflictPct: 54 },
  { year: 2016, conflictOrigin: 17200, nonConflictOrigin: 13547, conflictPct: 56 },
  { year: 2018, conflictOrigin: 17600, nonConflictOrigin: 11880, conflictPct: 60 },
  { year: 2019, conflictOrigin: 22400, nonConflictOrigin: 13166, conflictPct: 63 },
  { year: 2020, conflictOrigin: 18900, nonConflictOrigin: 10556, conflictPct: 64 },
  { year: 2021, conflictOrigin: 28300, nonConflictOrigin: 20240, conflictPct: 58 },
  { year: 2022, conflictOrigin: 35100, nonConflictOrigin: 39651, conflictPct: 47 },
  { year: 2023, conflictOrigin: 34900, nonConflictOrigin: 32437, conflictPct: 52 },
  { year: 2024, conflictOrigin: 26400, nonConflictOrigin: 24258, conflictPct: 52 },
];

// ── Caseworker staffing ────────────────────────────────────────────────
// Source: Home Office annual reports; ICIBI reports
// Full-time equivalent asylum decision-makers
const caseworkerStaffing = [
  { year: 2018, fte: 375 },
  { year: 2019, fte: 355 },
  { year: 2020, fte: 340 },
  { year: 2021, fte: 415 },
  { year: 2022, fte: 680 },
  { year: 2023, fte: 1520 },
  { year: 2024, fte: 2150 },
];

// ── Snapshot ────────────────────────────────────────────────────────────
const latestCrossings = channelCrossings[channelCrossings.length - 1];
const latestBacklog = asylumBacklog[asylumBacklog.length - 1];
const latestReturns = returns[returns.length - 1];
const latestAppeals = asylumAppeals[asylumAppeals.length - 1];
const latestDecisions = asylumDecisions[asylumDecisions.length - 1];
const peakBacklog = asylumBacklog.reduce((max, r) => r.pending > max.pending ? r : max);
const peakCrossings = channelCrossings.reduce((max, r) => r.crossings > max.crossings ? r : max);

const snapshot = {
  channelCrossings: latestCrossings.crossings,
  channelCrossingsYear: latestCrossings.year,
  channelCrossingsPeak: peakCrossings.crossings,
  channelCrossingsPeakYear: peakCrossings.year,
  asylumBacklog: latestBacklog.pending,
  asylumBacklogYear: latestBacklog.year,
  asylumBacklogPeak: peakBacklog.pending,
  asylumBacklogPeakYear: peakBacklog.year,
  totalReturns: latestReturns.total,
  returnsYear: latestReturns.year,
  fnoReturns: latestReturns.fnoReturns,
  accommodationCostMn: 3800,
  accommodationCostYear: "2024-25",
  rwandaTotalCostMn: 290,
  rwandaPersonsRelocated: 0,
  processingWeeksUK: 32,
  processingWeeksYear: 2024,
  ukAsylumPerCapita: 99,
  ukAsylumPerCapitaYear: 2023,
  appealOverturnPct: latestAppeals.overturnPct,
  appealOverturnYear: latestAppeals.year,
  asylumApplications: latestDecisions.applications,
  asylumApplicationsYear: latestDecisions.year,
  grantRatePct: latestDecisions.grantRatePct,
  grantRateYear: latestDecisions.year,
  caseworkerFte: 2150,
  caseworkerFteYear: 2024,
  resettlementTotal: 5555,
  resettlementYear: 2024,
  globalDisplacedMn: 122.6,
  globalDisplacedYear: 2024,
  globalRefugeesMn: 33.7,
  globalRefugeesYear: 2024,
};

// ── Output ──────────────────────────────────────────────────────────────
const output = {
  $schema: "sob-dataset-v1",
  id: "asylum-statistics",
  pillar: "challenges",
  topic: "asylum",
  generated: new Date().toISOString().slice(0, 10),
  sources: [
    {
      id: "ho-irregular",
      name: "Home Office — Irregular Migration to the UK",
      url: "https://www.gov.uk/government/statistics/irregular-migration-to-the-uk-year-ending-december-2024",
      publisher: "Home Office",
    },
    {
      id: "ho-immigration-stats",
      name: "Home Office — Immigration Statistics",
      url: "https://www.gov.uk/government/collections/immigration-statistics-quarterly-release",
      publisher: "Home Office",
    },
    {
      id: "nao-accommodation",
      name: "NAO — Investigation into Asylum Accommodation",
      url: "https://www.nao.org.uk/reports/investigation-into-asylum-accommodation/",
      publisher: "National Audit Office",
    },
    {
      id: "nao-rwanda",
      name: "NAO — Investigation into the UK-Rwanda Partnership",
      url: "https://www.nao.org.uk/reports/investigation-into-the-uk-rwanda-partnership/",
      publisher: "National Audit Office",
    },
    {
      id: "eurostat-asylum",
      name: "Eurostat — Asylum Statistics",
      url: "https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Asylum_statistics",
      publisher: "Eurostat",
    },
    {
      id: "moj-tribunals",
      name: "Ministry of Justice — Tribunal Statistics Quarterly",
      url: "https://www.gov.uk/government/collections/tribunals-statistics",
      publisher: "Ministry of Justice",
    },
    {
      id: "ho-nrm",
      name: "Home Office — National Referral Mechanism Statistics",
      url: "https://www.gov.uk/government/collections/national-referral-mechanism-statistics",
      publisher: "Home Office",
    },
    {
      id: "unhcr-global-trends",
      name: "UNHCR — Global Trends: Forced Displacement",
      url: "https://www.unhcr.org/global-trends",
      publisher: "UNHCR",
    },
  ],
  snapshot,
  series: {
    channelCrossings: {
      sourceId: "ho-irregular",
      label: "Channel Crossings (Small Boats)",
      unit: "persons",
      timeField: "year",
      description: "Number of people detected arriving in the UK via small boats across the English Channel, by calendar year.",
      data: channelCrossings,
    },
    channelCrossingsQuarterly: {
      sourceId: "ho-irregular",
      label: "Channel Crossings Quarterly",
      unit: "persons",
      timeField: "quarter",
      description: "Quarterly small boat crossings of the English Channel. Shows seasonal pattern — crossings peak in summer.",
      data: channelCrossingsQuarterly,
    },
    asylumDecisions: {
      sourceId: "ho-immigration-stats",
      label: "Asylum Applications and Initial Decisions",
      unit: "persons",
      timeField: "year",
      description: "Asylum applications lodged in the UK, initial decisions made, grants of protection, and refusals, by calendar year. Covers 2001-2024.",
      methodologyBreaks: [
        { at: 2007, label: "New Asylum Model", description: "Introduction of New Asylum Model changed case management", severity: "minor" },
      ],
      data: asylumDecisions,
    },
    grantRateByNationality: {
      sourceId: "ho-immigration-stats",
      label: "Asylum Grant Rate by Nationality (2023)",
      unit: "%",
      timeField: "nationality",
      description: "Initial decision grant rate by nationality, year ending December 2023. Grant includes refugee status, humanitarian protection, and discretionary leave.",
      data: grantRateByNationality,
    },
    grantRateTimeSeries: {
      sourceId: "ho-immigration-stats",
      label: "Grant Rates by Nationality Over Time",
      unit: "%",
      timeField: "year",
      description: "Initial decision grant rate (%) for key nationalities, 2019-2024. Shows how grant rates shift as decision volumes and policy change.",
      data: grantRateTimeSeries,
    },
    applicationsByNationality: {
      sourceId: "ho-immigration-stats",
      label: "Asylum Applications by Nationality",
      unit: "persons",
      timeField: "year",
      description: "Asylum applications by top nationalities, 2018-2024. Tracks the changing national composition of asylum seekers.",
      data: applicationsByNationality,
    },
    asylumBacklog: {
      sourceId: "ho-immigration-stats",
      label: "Asylum Cases Awaiting Initial Decision",
      unit: "cases",
      timeField: "year",
      description: "Number of asylum cases awaiting an initial decision at end of calendar year, 2010-2024.",
      data: asylumBacklog,
    },
    asylumBacklogQuarterly: {
      sourceId: "ho-immigration-stats",
      label: "Asylum Backlog Quarterly",
      unit: "cases",
      timeField: "quarter",
      description: "Quarterly snapshot of asylum cases awaiting initial decision, 2019-2024. Shows the surge, peak, and recent reduction.",
      data: asylumBacklogQuarterly,
    },
    asylumAppeals: {
      sourceId: "moj-tribunals",
      label: "Asylum Appeals (First-tier Tribunal)",
      unit: "cases",
      timeField: "year",
      description: "First-tier Tribunal asylum appeals: cases lodged, determined, allowed (overturned), and dismissed. Overturn rates show how often initial refusals are reversed on appeal.",
      data: asylumAppeals,
    },
    dublinTransfers: {
      sourceId: "ho-immigration-stats",
      label: "Dublin III Transfers (UK)",
      unit: "persons",
      timeField: "year",
      description: "Dublin III asylum transfers. Outgoing = from UK to EU states. Incoming = from EU states to UK. System ceased for UK on 1 January 2021.",
      data: dublinTransfers,
    },
    returns: {
      sourceId: "ho-immigration-stats",
      label: "Returns and Removals from the UK",
      unit: "persons",
      timeField: "year",
      description: "Enforced removals, voluntary departures, and foreign national offender (FNO) returns, 2004-2024. Shows the long-run decline in enforcement capacity.",
      data: returns,
    },
    internationalComparison: {
      sourceId: "eurostat-asylum",
      label: "Asylum Applications per 100,000 Population",
      unit: "applications per 100k",
      timeField: "year",
      description: "Asylum applications per 100,000 population for selected European countries, 2015-2023. UK figure from Home Office (not in Eurostat post-Brexit).",
      data: internationalComparison,
    },
    accommodationCosts: {
      sourceId: "nao-accommodation",
      label: "Asylum Accommodation Costs",
      unit: "£m",
      timeField: "year",
      description: "Total asylum accommodation costs by financial year, number of hotel residents, and dispersal accommodation residents.",
      data: accommodationCosts,
    },
    processingTimes: {
      sourceId: "ho-immigration-stats",
      label: "Asylum Processing Times (UK)",
      unit: "weeks",
      timeField: "year",
      description: "Approximate median weeks from application to initial decision, UK, 2014-2024.",
      data: processingTimes,
    },
    processingComparison: {
      sourceId: "eurostat-asylum",
      label: "Asylum Processing Times by Country (2023)",
      unit: "weeks",
      timeField: "country",
      description: "Median weeks to initial asylum decision, selected European countries, 2023.",
      data: processingComparison2023,
    },
    irregularRoutes: {
      sourceId: "ho-irregular",
      label: "Irregular Migration by Route",
      unit: "persons (estimated)",
      timeField: "year",
      description: "Comparison of irregular migration routes: Channel small boat crossings, estimated visa overstayers, and lorry/freight detections, 2019-2024.",
      data: irregularRoutes,
    },
    detention: {
      sourceId: "ho-immigration-stats",
      label: "Immigration Detention",
      unit: "persons",
      timeField: "year",
      description: "Persons entering immigration detention and snapshot detention population at year end, 2010-2024.",
      data: detention,
    },
    resettlement: {
      sourceId: "ho-immigration-stats",
      label: "Resettlement Schemes (Safe/Legal Routes)",
      unit: "persons",
      timeField: "year",
      description: "Arrivals via safe/legal resettlement routes: VPRS (Syrian), UKRS, ACRS and ARAP (Afghan), 2014-2024. Does not include Homes for Ukraine (separate visa scheme).",
      data: resettlement,
    },
    crossingsDemographics: {
      sourceId: "ho-irregular",
      label: "Channel Crossings Demographics",
      unit: "%",
      timeField: "year",
      description: "Composition of small boat arrivals by age/gender group, 2020-2024. Shows growing proportion of women and children.",
      data: crossingsDemographicsTimeSeries,
    },
    modernSlaveryReferrals: {
      sourceId: "ho-nrm",
      label: "Modern Slavery NRM Referrals",
      unit: "referrals",
      timeField: "year",
      description: "National Referral Mechanism modern slavery referrals, 2016-2024. Many referrals come from individuals in the asylum system.",
      data: modernSlaveryReferrals,
    },
    uasc: {
      sourceId: "ho-immigration-stats",
      label: "Unaccompanied Asylum-Seeking Children",
      unit: "applications",
      timeField: "year",
      description: "Asylum applications from unaccompanied minors (UASC), 2014-2024.",
      data: uasc,
    },
    caseworkerStaffing: {
      sourceId: "ho-immigration-stats",
      label: "Asylum Caseworker Staffing",
      unit: "FTE",
      timeField: "year",
      description: "Full-time equivalent asylum decision-makers, 2018-2024. Shows the staffing surge in response to backlog.",
      data: caseworkerStaffing,
    },
    globalDisplacement: {
      sourceId: "unhcr-global-trends",
      label: "Global Forced Displacement",
      unit: "millions",
      timeField: "year",
      description: "Total forcibly displaced people worldwide and refugees under UNHCR mandate, 2001-2024. Rose from 40m (2001) to 123m (2024), driven by conflicts in Syria, Afghanistan, Ukraine, Sudan, and others. This global surge is the structural driver behind rising asylum applications across all European countries.",
      data: globalDisplacement,
    },
    conflictDisplacement: {
      sourceId: "unhcr-global-trends",
      label: "Major Conflicts Driving Displacement",
      unit: "millions displaced",
      timeField: "conflict",
      description: "The ten largest displacement crises by estimated displaced population. These conflicts collectively account for the majority of global forced displacement and are the source countries for most UK asylum applications.",
      data: conflictDisplacement,
    },
    conflictVsNonConflict: {
      sourceId: "ho-immigration-stats",
      label: "UK Asylum Applications: Conflict vs Non-Conflict Origin",
      unit: "persons",
      timeField: "year",
      description: "UK asylum applications split by whether the applicant's nationality has a grant rate above 70% (proxy for active conflict/persecution) or below. The compositional shift towards conflict-origin nationalities is the primary driver of rising overall grant rates.",
      data: conflictVsNonConflict,
    },
  },
};

writeFileSync("public/data/asylum-statistics.json", JSON.stringify(output, null, 2) + "\n");

const seriesCount = Object.keys(output.series).length;
const totalDataPoints = Object.values(output.series).reduce((sum, s) => sum + s.data.length, 0);
console.log(`asylum-statistics.json written`);
console.log(`  ${seriesCount} series, ${totalDataPoints} total data points`);
for (const [key, s] of Object.entries(output.series)) {
  console.log(`    ${key}: ${s.data.length} records`);
}
