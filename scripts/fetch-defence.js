/**
 * fetch-defence.js
 *
 * Curated UK defence data from official sources:
 *  - MoD Annual Report & Accounts (spending)
 *  - NATO Defence Expenditure data (spending % GDP, international comparison)
 *  - MoD UK Armed Forces Quarterly Service Personnel Statistics (personnel, recruitment, retention)
 *  - MoD Equipment Plan (equipment spending allocation)
 *  - MoD UK Armed Forces Equipment & Formations (fleet inventory)
 *  - National defence ministry publications, HoC Library briefings (international equipment comparison)
 *  - SIPRI Military Expenditure Database
 *
 * Outputs: public/data/defence.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";

// ══════════════════════════════════════════════════════════════════════
// SPENDING DATA
// ══════════════════════════════════════════════════════════════════════

// ── Defence spending as % GDP ───────────────────────────────────────
// Source: NATO Defence Expenditure of NATO Countries (2014-2024)
// Pre-2014 from MoD UK Defence Statistics / HM Treasury PESA
const spendingPctGdp = [
  { year: 1990, pct: 3.8 },
  { year: 1995, pct: 2.8 },
  { year: 2000, pct: 2.3 },
  { year: 2005, pct: 2.2 },
  { year: 2006, pct: 2.2 },
  { year: 2007, pct: 2.2 },
  { year: 2008, pct: 2.3 },
  { year: 2009, pct: 2.5 },
  { year: 2010, pct: 2.4 },
  { year: 2011, pct: 2.3 },
  { year: 2012, pct: 2.2 },
  { year: 2013, pct: 2.1 },
  { year: 2014, pct: 2.1 },
  { year: 2015, pct: 2.0 },
  { year: 2016, pct: 2.0 },
  { year: 2017, pct: 2.1 },
  { year: 2018, pct: 2.1 },
  { year: 2019, pct: 2.1 },
  { year: 2020, pct: 2.3 },
  { year: 2021, pct: 2.2 },
  { year: 2022, pct: 2.2 },
  { year: 2023, pct: 2.3 },
  { year: 2024, pct: 2.3 },
];

// ── Defence spending (real terms, £bn, 2023-24 prices) ──────────────
// Source: MoD Annual Report / PESA adjusted
const spendingReal = [
  { year: 2000, value: 40.2 },
  { year: 2005, value: 43.5 },
  { year: 2008, value: 45.8 },
  { year: 2009, value: 46.1 },
  { year: 2010, value: 44.5 },
  { year: 2011, value: 42.8 },
  { year: 2012, value: 41.3 },
  { year: 2013, value: 39.8 },
  { year: 2014, value: 39.2 },
  { year: 2015, value: 38.5 },
  { year: 2016, value: 38.1 },
  { year: 2017, value: 38.6 },
  { year: 2018, value: 39.4 },
  { year: 2019, value: 40.8 },
  { year: 2020, value: 42.2 },
  { year: 2021, value: 43.5 },
  { year: 2022, value: 44.1 },
  { year: 2023, value: 50.2 },
  { year: 2024, value: 54.2 },
];

// ── International comparison (% GDP, 2024 estimates) ────────────────
// Source: NATO / SIPRI
const intlComparison = [
  { country: "USA", pct: 3.4 },
  { country: "Greece", pct: 3.1 },
  { country: "Poland", pct: 3.9 },
  { country: "UK", pct: 2.3 },
  { country: "France", pct: 2.1 },
  { country: "Germany", pct: 2.1 },
  { country: "Turkey", pct: 1.9 },
  { country: "Italy", pct: 1.5 },
  { country: "Canada", pct: 1.4 },
  { country: "Spain", pct: 1.3 },
];

// ── Equipment spending plan (£bn, MoD Equipment Plan 2024) ──────────
const equipmentPlan = [
  { category: "Submarines & nuclear", value: 17.2 },
  { category: "Combat air", value: 12.5 },
  { category: "Ships", value: 8.3 },
  { category: "Land equipment", value: 6.1 },
  { category: "Weapons", value: 5.4 },
  { category: "ISTAR & networks", value: 4.8 },
  { category: "Helicopters", value: 3.2 },
  { category: "Air support", value: 2.9 },
];

// ══════════════════════════════════════════════════════════════════════
// PERSONNEL DATA
// ══════════════════════════════════════════════════════════════════════

// ── Armed forces personnel (UK regular forces, thousands) ───────────
// Source: MoD Quarterly Service Personnel Statistics
// Trained strength at 1 April each year
const personnel = [
  { year: 2000, army: 110.1, navy: 42.8, raf: 54.8 },
  { year: 2005, army: 102.4, navy: 39.9, raf: 48.7 },
  { year: 2008, army: 100.0, navy: 38.6, raf: 43.4 },
  { year: 2010, army: 101.3, navy: 35.5, raf: 40.7 },
  { year: 2011, army: 99.7, navy: 34.9, raf: 39.6 },
  { year: 2012, army: 96.1, navy: 33.3, raf: 37.6 },
  { year: 2013, army: 91.3, navy: 32.5, raf: 34.9 },
  { year: 2014, army: 87.8, navy: 31.8, raf: 33.5 },
  { year: 2015, army: 84.6, navy: 31.2, raf: 32.7 },
  { year: 2016, army: 81.7, navy: 30.5, raf: 31.8 },
  { year: 2017, army: 79.4, navy: 30.0, raf: 31.3 },
  { year: 2018, army: 78.4, navy: 29.7, raf: 30.7 },
  { year: 2019, army: 76.3, navy: 29.4, raf: 30.2 },
  { year: 2020, army: 76.5, navy: 29.9, raf: 30.0 },
  { year: 2021, army: 76.3, navy: 30.0, raf: 29.6 },
  { year: 2022, army: 75.5, navy: 29.8, raf: 29.0 },
  { year: 2023, army: 73.8, navy: 29.3, raf: 28.3 },
  { year: 2024, army: 72.5, navy: 28.9, raf: 27.8 },
  { year: 2025, army: 70.3, navy: 27.8, raf: 27.6 },
];

// ── Reserves (trained strength, thousands) ──────────────────────────
// Source: MoD Quarterly Service Personnel Statistics
const reserves = [
  { year: 2012, strength: 22.6 },
  { year: 2013, strength: 21.2 },
  { year: 2014, strength: 21.4 },
  { year: 2015, strength: 22.6 },
  { year: 2016, strength: 25.0 },
  { year: 2017, strength: 26.4 },
  { year: 2018, strength: 27.5 },
  { year: 2019, strength: 29.0 },
  { year: 2020, strength: 30.0 },
  { year: 2021, strength: 30.4 },
  { year: 2022, strength: 30.7 },
  { year: 2023, strength: 27.5 },
  { year: 2024, strength: 26.0 },
  { year: 2025, strength: 29.1 },
];

// ── Trained strength vs requirement (1 April 2025) ──────────────────
// Source: MoD Quarterly Service Personnel Statistics, 1 April 2025
// Deficit: Army -3%, RN/RM -8%, RAF -13%, overall -6%
const strengthVsRequirement = [
  { service: "Army", trained: 70.3, requirement: 72.5, deficit: -3 },
  { service: "RN/RM", trained: 27.8, requirement: 30.2, deficit: -8 },
  { service: "RAF", trained: 27.6, requirement: 31.7, deficit: -13 },
];

// ── Intake vs outflow (financial year, thousands) ───────────────────
// Source: MoD Quarterly Service Personnel Statistics
// Intake = individuals joining UK Regular Forces; outflow = leaving
const intakeOutflow = [
  { year: "2015-16", intake: 17.5, outflow: 17.9 },
  { year: "2016-17", intake: 15.2, outflow: 16.3 },
  { year: "2017-18", intake: 14.7, outflow: 15.8 },
  { year: "2018-19", intake: 15.3, outflow: 15.4 },
  { year: "2019-20", intake: 15.8, outflow: 14.6 },
  { year: "2020-21", intake: 11.6, outflow: 13.2 },
  { year: "2021-22", intake: 12.8, outflow: 14.7 },
  { year: "2022-23", intake: 11.4, outflow: 16.2 },
  { year: "2023-24", intake: 11.3, outflow: 15.7 },
  { year: "2024-25", intake: 13.5, outflow: 14.6 },
];

// ── Voluntary outflow rate (%, 12m to 31 March each year) ───────────
// Source: MoD Quarterly Service Personnel Statistics
// % of trained strength voluntarily leaving before end of engagement
const voluntaryOutflow = [
  { year: "2015-16", overall: 4.9, army: 5.4, navy: 4.1, raf: 4.5 },
  { year: "2016-17", overall: 5.3, army: 5.8, navy: 4.4, raf: 4.9 },
  { year: "2017-18", overall: 5.4, army: 5.9, navy: 4.6, raf: 4.8 },
  { year: "2018-19", overall: 5.4, army: 5.8, navy: 4.8, raf: 5.0 },
  { year: "2019-20", overall: 5.7, army: 6.2, navy: 5.0, raf: 4.9 },
  { year: "2020-21", overall: 4.5, army: 4.8, navy: 3.9, raf: 4.2 },
  { year: "2021-22", overall: 5.6, army: 6.0, navy: 5.0, raf: 5.0 },
  { year: "2022-23", overall: 6.2, army: 6.6, navy: 5.6, raf: 5.5 },
  { year: "2023-24", overall: 6.4, army: 6.8, navy: 5.8, raf: 5.7 },
  { year: "2024-25", overall: 5.9, army: 6.3, navy: 5.3, raf: 5.0 },
];

// ══════════════════════════════════════════════════════════════════════
// EQUIPMENT DATA
// ══════════════════════════════════════════════════════════════════════

// ── Current UK equipment inventory (as at 1 April 2025) ─────────────
// Source: MoD UK Armed Forces Equipment & Formations 2025
const currentEquipment = [
  { platform: "Challenger 2 MBT", category: "Land", count: 288, note: "148 to be upgraded to Challenger 3" },
  { platform: "Warrior IFV", category: "Land", count: 604, note: "To be replaced by Boxer" },
  { platform: "Bulldog APC", category: "Land", count: 738, note: "" },
  { platform: "Boxer MIV", category: "Land", count: 65, note: "523 on order, entering service" },
  { platform: "Typhoon", category: "Air", count: 129, note: "Tranche 1 drawdown begun" },
  { platform: "F-35B Lightning", category: "Air", count: 41, note: "47 in first batch, 27 more ordered" },
  { platform: "Apache AH-64E", category: "Air", count: 50, note: "Fleet delivery completed Mar 2025" },
  { platform: "Chinook", category: "Air", count: 50, note: "14 new HC6/6A on order" },
  { platform: "Merlin", category: "Air", count: 44, note: "HM2 (ASW) and HC4 (commando)" },
  { platform: "Wildcat", category: "Air", count: 55, note: "AH1 (Army) and HMA2 (Navy)" },
  { platform: "Puma HC2", category: "Air", count: 24, note: "Scheduled for retirement" },
  { platform: "Type 45 Destroyer", category: "Naval", count: 6, note: "Daring class" },
  { platform: "Type 23 Frigate", category: "Naval", count: 7, note: "Being replaced by Type 26/31" },
  { platform: "QE-class Carrier", category: "Naval", count: 2, note: "HMS Queen Elizabeth, Prince of Wales" },
  { platform: "Astute-class SSN", category: "Naval", count: 5, note: "7 planned, 2 more building" },
  { platform: "Vanguard-class SSBN", category: "Naval", count: 4, note: "Continuous at-sea deterrent" },
  { platform: "River-class OPV", category: "Naval", count: 8, note: "Batch 1 and Batch 2" },
];

// ── Fleet size trends — frigates & destroyers ───────────────────────
// Source: House of Commons Library, MoD Annual Reports
// Combined escort fleet (frigates + destroyers) at roughly each SDSR
const escortFleet = [
  { year: 1990, frigates: 35, destroyers: 13, total: 48 },
  { year: 1995, frigates: 27, destroyers: 12, total: 39 },
  { year: 2000, frigates: 21, destroyers: 11, total: 32 },
  { year: 2005, frigates: 17, destroyers: 8, total: 25 },
  { year: 2010, frigates: 13, destroyers: 6, total: 19 },
  { year: 2015, frigates: 13, destroyers: 6, total: 19 },
  { year: 2020, frigates: 12, destroyers: 6, total: 18 },
  { year: 2025, frigates: 7, destroyers: 6, total: 13 },
];

// ── International equipment comparison ──────────────────────────────
// Sources: National defence ministry publications, House of Commons Library
// defence briefings, Naval News, IISS-cited analyses. See source entries below.
// Comparable middle powers — equipment numbers (total inventory/in-service)
const intlEquipment = [
  { country: "UK",           tanks: 288,  fighters: 170, attackHeli: 50, submarines: 10, frigates: 8,  destroyers: 6  },
  { country: "France",       tanks: 222,  fighters: 200, attackHeli: 67, submarines: 10, frigates: 15, destroyers: 0  },
  { country: "Germany",      tanks: 313,  fighters: 143, attackHeli: 55, submarines: 6,  frigates: 11, destroyers: 0  },
  { country: "Italy",        tanks: 125,  fighters: 114, attackHeli: 48, submarines: 8,  frigates: 10, destroyers: 2  },
  { country: "Japan",        tanks: 400,  fighters: 330, attackHeli: 62, submarines: 22, frigates: 6,  destroyers: 36 },
  { country: "S. Korea",     tanks: 2200, fighters: 314, attackHeli: 91, submarines: 22, frigates: 17, destroyers: 13 },
  { country: "Turkey",       tanks: 2238, fighters: 230, attackHeli: 74, submarines: 14, frigates: 16, destroyers: 0  },
  { country: "Australia",    tanks: 46,   fighters: 72,  attackHeli: 22, submarines: 6,  frigates: 7,  destroyers: 3  },
];

// ── RAF combat aircraft trend ───────────────────────────────────────
// Source: MoD Equipment & Formations, IISS Military Balance (various years)
// Total combat-capable fast jet fleet (Tornado, Typhoon, Harrier, F-35)
const combatAircraft = [
  { year: 2000, tornado: 178, harrier: 72,  typhoon: 0,   f35: 0,  total: 250 },
  { year: 2005, tornado: 150, harrier: 60,  typhoon: 20,  f35: 0,  total: 230 },
  { year: 2010, tornado: 135, harrier: 30,  typhoon: 72,  f35: 0,  total: 237 },
  { year: 2011, tornado: 125, harrier: 0,   typhoon: 82,  f35: 0,  total: 207 },
  { year: 2015, tornado: 80,  harrier: 0,   typhoon: 107, f35: 0,  total: 187 },
  { year: 2019, tornado: 0,   harrier: 0,   typhoon: 137, f35: 18, total: 155 },
  { year: 2022, tornado: 0,   harrier: 0,   typhoon: 137, f35: 30, total: 167 },
  { year: 2025, tornado: 0,   harrier: 0,   typhoon: 129, f35: 41, total: 170 },
];

// ══════════════════════════════════════════════════════════════════════
// PROCUREMENT DATA
// ══════════════════════════════════════════════════════════════════════

// ── Equipment Plan affordability (NAO annual assessments) ────────────
// Source: NAO Equipment Plan reports (annual), 10-year plan periods
// Values are the central/headline affordability gap in £bn as assessed by NAO
// Positive = forecast costs exceed budget; 0 = assessed as broadly affordable
const equipmentPlanAffordability = [
  { year: "2012-22", totalCost: 159,  budget: 152,  gap: 0,    naoVerdict: "Affordable" },
  { year: "2013-23", totalCost: 163,  budget: 159,  gap: 0,    naoVerdict: "Affordable" },
  { year: "2014-24", totalCost: 166,  budget: 164,  gap: 0,    naoVerdict: "Affordable but higher risk" },
  { year: "2015-25", totalCost: 178,  budget: 172,  gap: 5.8,  naoVerdict: "At risk" },
  { year: "2016-26", totalCost: 180,  budget: 176,  gap: 4.6,  naoVerdict: "Unaffordable" },
  { year: "2017-27", totalCost: 186,  budget: 180,  gap: 4.9,  naoVerdict: "Unaffordable" },
  { year: "2018-28", totalCost: 190,  budget: 183,  gap: 7.0,  naoVerdict: "Unaffordable" },
  { year: "2019-29", totalCost: 184,  budget: 181,  gap: 2.9,  naoVerdict: "Unaffordable" },
  { year: "2020-30", totalCost: 192,  budget: 183,  gap: 7.3,  naoVerdict: "Unaffordable" },
  { year: "2021-31", totalCost: 238,  budget: 232,  gap: 5.8,  naoVerdict: "Unaffordable" },
  { year: "2022-32", totalCost: 242,  budget: 240,  gap: 0,    naoVerdict: "Affordable" },
  { year: "2023-33", totalCost: 289,  budget: 272,  gap: 16.9, naoVerdict: "Unaffordable" },
];

// ── Major programme cost and schedule ────────────────────────────────
// Source: NAO Major Projects Reports, MoD Annual Reports, HoC Library briefings
// originalCost / currentCost in £bn; originalISD / currentISD = in-service dates
const majorProgrammes = [
  { programme: "Ajax",       originalCost: 3.5, currentCost: 6.2, costGrowth: 77,  originalISD: "2017", currentISD: "Paused",    status: "Under review" },
  { programme: "Type 26",    originalCost: 3.7, currentCost: 7.9, costGrowth: 114, originalISD: "2026", currentISD: "2028",       status: "Building" },
  { programme: "Type 31",    originalCost: 1.25,currentCost: 1.6, costGrowth: 28,  originalISD: "2027", currentISD: "Late 2020s", status: "Building" },
  { programme: "Dreadnought",originalCost: 31.0,currentCost: 34.4,costGrowth: 11,  originalISD: "2030", currentISD: "Early 2030s",status: "Building" },
  { programme: "F-35B",      originalCost: 9.1, currentCost: 11.0,costGrowth: 21,  originalISD: "2018", currentISD: "2018 (IOC)", status: "Delivering" },
  { programme: "GCAP",       originalCost: 12.0,currentCost: 12.0,costGrowth: 0,   originalISD: "2035", currentISD: "2035",       status: "Assessment" },
  { programme: "Boxer",      originalCost: 2.8, currentCost: 5.0, costGrowth: 79,  originalISD: "2023", currentISD: "Late 2025",  status: "Delivering" },
  { programme: "Apache AH-64E",originalCost: 2.3,currentCost: 2.6,costGrowth: 13,  originalISD: "2022", currentISD: "2025 (complete)", status: "Complete" },
];

// ── Industry concentration (MoD expenditure by supplier, 2024-25) ───
// Source: MoD Trade, Industry and Contracts 2025
const industryConcentration = [
  { supplier: "BAE Systems",   spend: 6.7,  sharePct: 16.3, note: "Submarines, combat air, munitions" },
  { supplier: "Babcock",       spend: 3.2,  sharePct: 7.8,  note: "Naval support, Skynet" },
  { supplier: "Rolls-Royce",   spend: 2.5,  sharePct: 6.1,  note: "Nuclear propulsion (Unity contract)" },
  { supplier: "QinetiQ",       spend: 1.4,  sharePct: 3.4,  note: "Test & evaluation" },
  { supplier: "Leonardo",      spend: 1.2,  sharePct: 2.9,  note: "Helicopters, electronics" },
  { supplier: "Airbus",        spend: 0.8,  sharePct: 1.9,  note: "A400M, Skynet" },
  { supplier: "Thales",        spend: 0.7,  sharePct: 1.7,  note: "Sensors, communications" },
  { supplier: "Leidos",        spend: 0.6,  sharePct: 1.5,  note: "Logistics information systems" },
  { supplier: "Serco",         spend: 0.6,  sharePct: 1.5,  note: "Training, base support" },
  { supplier: "Boeing",        spend: 0.5,  sharePct: 1.2,  note: "Chinook, P-8 support" },
];

// ── Competition vs non-competitive procurement ──────────────────────
// Source: MoD Trade, Industry and Contracts (annual bulletins)
// Percentage of in-year MOD procurement expenditure by sourcing method
const competitionRate = [
  { year: "2014-15", competitive: 31, nonCompetitive: 36, other: 33 },
  { year: "2015-16", competitive: 26, nonCompetitive: 39, other: 35 },
  { year: "2016-17", competitive: 17, nonCompetitive: 32, other: 51 },
  { year: "2017-18", competitive: 12, nonCompetitive: 33, other: 55 },
  { year: "2018-19", competitive: 8,  nonCompetitive: 38, other: 54 },
  { year: "2019-20", competitive: 4,  nonCompetitive: 37, other: 59 },
  { year: "2020-21", competitive: 8,  nonCompetitive: 39, other: 53 },
  { year: "2021-22", competitive: 9,  nonCompetitive: 41, other: 50 },
  { year: "2022-23", competitive: 12, nonCompetitive: 42, other: 46 },
  { year: "2023-24", competitive: 9,  nonCompetitive: 44, other: 47 },
  { year: "2024-25", competitive: 8,  nonCompetitive: 45, other: 47 },
];

// ── SME share of MoD procurement ────────────────────────────────────
// Source: MoD Trade, Industry and Contracts / MoD Regional Expenditure bulletins
// directPct = direct MOD expenditure with SMEs; totalPct = including indirect (through primes)
const smeShare = [
  { year: "2016-17", directPct: 4.7, totalPct: null },
  { year: "2017-18", directPct: 4.8, totalPct: null },
  { year: "2018-19", directPct: 4.4, totalPct: null },
  { year: "2019-20", directPct: 3.7, totalPct: 21.0 },
  { year: "2020-21", directPct: 3.5, totalPct: 22.7 },
  { year: "2021-22", directPct: 3.6, totalPct: 25.5 },
  { year: "2022-23", directPct: 3.9, totalPct: null },
  { year: "2023-24", directPct: 4.0, totalPct: null },
];

// ══════════════════════════════════════════════════════════════════════
// SNAPSHOT
// ══════════════════════════════════════════════════════════════════════

const latestPersonnel = personnel[personnel.length - 1];
const totalPersonnel = latestPersonnel.army + latestPersonnel.navy + latestPersonnel.raf;

const snapshot = {
  // Spending
  spendingPctGdp: 2.3,
  spendingYear: 2024,
  natoTarget: 2.0,
  newTarget: 2.5,
  spendingBn: 54.2,
  spendingBnYear: 2024,
  // Personnel
  totalPersonnel: Math.round(totalPersonnel * 10) / 10,
  totalPersonnelUnit: "k",
  personnelYear: 2025,
  personnelPeak: 207.7,
  personnelPeakYear: 2000,
  personnelDecline: Math.round((1 - totalPersonnel / 207.7) * 100),
  reserveStrength: 29.1,
  reserveYear: 2025,
  // Manning
  overallDeficit: 6,
  overallDeficitYear: 2025,
  voluntaryOutflow: 5.9,
  voluntaryOutflowYear: "2024-25",
  // Equipment
  tanks: 288,
  tanksYear: 2025,
  combatAircraft: 170,
  combatAircraftYear: 2025,
  escorts: 13,
  escortsYear: 2025,
  submarines: 10,
  submarinesYear: 2025,
  attackHelicopters: 50,
  attackHelicoptersYear: 2025,
  // Procurement
  equipPlanGap: 16.9,
  equipPlanGapYear: "2023-33",
  equipPlanGapUnit: "£bn",
  nonCompetitivePct: 45,
  nonCompetitiveYear: "2024-25",
  baeSharePct: 16.3,
  baeShareYear: "2024-25",
  top10SharePct: 39,
  top10ShareYear: "2024-25",
  smeDirectPct: 4.0,
  smeDirectYear: "2023-24",
  totalModProcurement: 40.6,
  totalModProcurementYear: "2024-25",
};

// ══════════════════════════════════════════════════════════════════════
// OUTPUT (sob-dataset-v1)
// ══════════════════════════════════════════════════════════════════════

const output = {
  $schema: "sob-dataset-v1",
  id: "defence",
  pillar: "state",
  topic: "defence",
  generated: new Date().toISOString().slice(0, 10),
  sources: [
    {
      id: "nato-defence-expenditure",
      name: "NATO Defence Expenditure",
      url: "https://www.nato.int/cps/en/natohq/topics_49198.htm",
    },
    {
      id: "mod-annual-report-accounts",
      name: "MoD Annual Report & Accounts",
      url: "https://www.gov.uk/government/collections/mod-annual-report-and-accounts",
    },
    {
      id: "mod-armed-forces-personnel-statistics",
      name: "MoD Armed Forces Personnel Statistics",
      url: "https://www.gov.uk/government/collections/uk-armed-forces-quarterly-manning-report",
    },
    {
      id: "mod-equipment-plan",
      name: "MoD Equipment Plan",
      url: "https://www.gov.uk/government/collections/equipment-plan",
    },
    {
      id: "mod-equipment-formations",
      name: "MoD UK Armed Forces Equipment & Formations 2025",
      url: "https://www.gov.uk/government/statistics/uk-armed-forces-equipment-and-formations-2025",
    },
    {
      id: "sipri-military-expenditure",
      name: "SIPRI Military Expenditure",
      url: "https://www.sipri.org/databases/milex",
    },
    {
      id: "hoc-library-defence",
      name: "House of Commons Library Defence Briefings",
      url: "https://commonslibrary.parliament.uk/research-briefings/cbp-7930/",
    },
    {
      id: "intl-defence-ministries",
      name: "National defence ministry publications, House of Commons Library defence briefings, Naval News",
      url: "https://commonslibrary.parliament.uk/research-briefings/cbp-10257/",
      note: "International equipment figures compiled from official national defence publications and parliamentary briefings",
    },
    {
      id: "nao-equipment-plan",
      name: "NAO Equipment Plan Reports",
      url: "https://www.nao.org.uk/reports/equipment-plan-2023-to-2033/",
      note: "Annual NAO affordability assessments of the MoD Equipment Plan",
    },
    {
      id: "nao-major-projects",
      name: "NAO Major Projects Reports, MoD Annual Report, HoC Library Briefings",
      url: "https://www.nao.org.uk/reports/improving-the-performance-of-major-equipment-contracts/",
      note: "Cost and schedule data for major defence programmes",
    },
    {
      id: "mod-trade-industry-contracts",
      name: "MoD Trade, Industry and Contracts 2025",
      url: "https://www.gov.uk/government/statistics/mod-trade-industry-and-contracts-2025/mod-trade-industry-and-contracts-2025",
    },
  ],
  snapshot,
  series: {
    // ── Spending series ─────────────────────────────────────────────
    spendingPctGdp: {
      sourceId: "nato-defence-expenditure",
      timeField: "year",
      data: spendingPctGdp,
    },
    spendingReal: {
      sourceId: "mod-annual-report-accounts",
      timeField: "year",
      data: spendingReal,
    },
    intlComparison: {
      sourceId: "nato-defence-expenditure",
      timeField: "country",
      data: intlComparison,
    },
    equipmentPlan: {
      sourceId: "mod-equipment-plan",
      timeField: "category",
      data: equipmentPlan,
    },
    // ── Personnel series ────────────────────────────────────────────
    personnel: {
      sourceId: "mod-armed-forces-personnel-statistics",
      timeField: "year",
      data: personnel,
    },
    reserves: {
      sourceId: "mod-armed-forces-personnel-statistics",
      timeField: "year",
      data: reserves,
    },
    strengthVsRequirement: {
      sourceId: "mod-armed-forces-personnel-statistics",
      timeField: "service",
      data: strengthVsRequirement,
    },
    intakeOutflow: {
      sourceId: "mod-armed-forces-personnel-statistics",
      timeField: "year",
      data: intakeOutflow,
    },
    voluntaryOutflow: {
      sourceId: "mod-armed-forces-personnel-statistics",
      timeField: "year",
      data: voluntaryOutflow,
    },
    // ── Equipment series ────────────────────────────────────────────
    currentEquipment: {
      sourceId: "mod-equipment-formations",
      timeField: "platform",
      data: currentEquipment,
    },
    escortFleet: {
      sourceId: "hoc-library-defence",
      timeField: "year",
      data: escortFleet,
    },
    combatAircraft: {
      sourceId: "mod-equipment-formations",
      timeField: "year",
      data: combatAircraft,
    },
    intlEquipment: {
      sourceId: "intl-defence-ministries",
      timeField: "country",
      data: intlEquipment,
    },
    // ── Procurement series ─────────────────────────────────────────
    equipmentPlanAffordability: {
      sourceId: "nao-equipment-plan",
      timeField: "year",
      data: equipmentPlanAffordability,
    },
    majorProgrammes: {
      sourceId: "nao-major-projects",
      timeField: "programme",
      data: majorProgrammes,
    },
    industryConcentration: {
      sourceId: "mod-trade-industry-contracts",
      timeField: "supplier",
      data: industryConcentration,
    },
    competitionRate: {
      sourceId: "mod-trade-industry-contracts",
      timeField: "year",
      data: competitionRate,
    },
    smeShare: {
      sourceId: "mod-trade-industry-contracts",
      timeField: "year",
      data: smeShare,
    },
  },
};

writeFileSync("public/data/defence.json", JSON.stringify(output, null, 2));
console.log(
  `  defence.json written (${spendingPctGdp.length} spending years, ` +
  `${personnel.length} personnel years, ${currentEquipment.length} equipment items, ` +
  `${escortFleet.length} escort fleet years, ${intlEquipment.length} countries, ` +
  `${majorProgrammes.length} major programmes, ${industryConcentration.length} suppliers)`
);
