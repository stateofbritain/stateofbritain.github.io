/**
 * fetch-safety.js
 *
 * Curated UK personal safety data from official sources:
 *  - ONS Crime in England and Wales (police recorded crime)
 *  - Home Office "Offences involving the use of weapons" (knife + firearms)
 *  - ONS Homicide Index
 *  - ONS Crime by police force area (city comparison)
 *  - ONS Sexual offences (police recorded)
 *  - ONS/CSEW Domestic abuse
 *  - ONS/CSEW Fraud estimates + police recorded
 *  - ONS ASB incidents
 *  - Home Office Crime outcomes
 *  - MoJ Proven reoffending statistics
 *  - CSEW Fear of crime / perceptions
 *
 * Outputs: public/data/safety.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";

// ── Violent crime — violence against the person (thousands, E&W) ─────
// Source: ONS Police recorded crime, year ending March
const violentCrime = [
  { year: "2002-03", total: 846 },
  { year: "2003-04", total: 853 },
  { year: "2004-05", total: 816 },
  { year: "2005-06", total: 793 },
  { year: "2006-07", total: 790 },
  { year: "2007-08", total: 785 },
  { year: "2008-09", total: 765 },
  { year: "2009-10", total: 740 },
  { year: "2010-11", total: 822 },
  { year: "2011-12", total: 780 },
  { year: "2012-13", total: 737 },
  { year: "2013-14", total: 710 },
  { year: "2014-15", total: 785 },
  { year: "2015-16", total: 998 },
  { year: "2016-17", total: 1163 },
  { year: "2017-18", total: 1421 },
  { year: "2018-19", total: 1657 },
  { year: "2019-20", total: 1744 },
  { year: "2020-21", total: 1593 },
  { year: "2021-22", total: 1793 },
  { year: "2022-23", total: 2023 },
  { year: "2023-24", total: 2060 },
];

// ── Knife / sharp instrument offences (E&W) ─────────────────────────
// Source: Home Office, Police recorded offences involving knives or
// sharp instruments, England & Wales (year ending March)
const knifeCrime = [
  { year: "2010-11", offences: 33774 },
  { year: "2011-12", offences: 31104 },
  { year: "2012-13", offences: 26244 },
  { year: "2013-14", offences: 25459 },
  { year: "2014-15", offences: 26370 },
  { year: "2015-16", offences: 28664 },
  { year: "2016-17", offences: 32468 },
  { year: "2017-18", offences: 39332 },
  { year: "2018-19", offences: 47318 },
  { year: "2019-20", offences: 46265 },
  { year: "2020-21", offences: 41103 },
  { year: "2021-22", offences: 49027 },
  { year: "2022-23", offences: 48716 },
  { year: "2023-24", offences: 47870 },
];

// ── Firearms offences (E&W) ─────────────────────────────────────────
// Source: Home Office, Offences involving the use of firearms,
// England & Wales (year ending March)
const firearmsCrime = [
  { year: "2010-11", offences: 7024 },
  { year: "2011-12", offences: 5911 },
  { year: "2012-13", offences: 5158 },
  { year: "2013-14", offences: 4846 },
  { year: "2014-15", offences: 4746 },
  { year: "2015-16", offences: 5106 },
  { year: "2016-17", offences: 5918 },
  { year: "2017-18", offences: 6492 },
  { year: "2018-19", offences: 6759 },
  { year: "2019-20", offences: 5945 },
  { year: "2020-21", offences: 4752 },
  { year: "2021-22", offences: 5704 },
  { year: "2022-23", offences: 5523 },
  { year: "2023-24", offences: 5370 },
];

// ── Homicides (E&W, ONS Homicide Index) ─────────────────────────────
// Source: ONS Homicide in England and Wales, year ending March
const homicide = [
  { year: "2002-03", total: 1048, knife: 229 },
  { year: "2003-04", total: 904, knife: 222 },
  { year: "2004-05", total: 868, knife: 231 },
  { year: "2005-06", total: 765, knife: 222 },
  { year: "2006-07", total: 759, knife: 249 },
  { year: "2007-08", total: 774, knife: 270 },
  { year: "2008-09", total: 651, knife: 252 },
  { year: "2009-10", total: 619, knife: 210 },
  { year: "2010-11", total: 636, knife: 206 },
  { year: "2011-12", total: 553, knife: 198 },
  { year: "2012-13", total: 552, knife: 195 },
  { year: "2013-14", total: 537, knife: 189 },
  { year: "2014-15", total: 538, knife: 186 },
  { year: "2015-16", total: 571, knife: 213 },
  { year: "2016-17", total: 649, knife: 216 },
  { year: "2017-18", total: 726, knife: 285 },
  { year: "2018-19", total: 671, knife: 259 },
  { year: "2019-20", total: 695, knife: 275 },
  { year: "2020-21", total: 594, knife: 235 },
  { year: "2021-22", total: 611, knife: 261 },
  { year: "2022-23", total: 602, knife: 244 },
  { year: "2023-24", total: 590, knife: 229 },
];

// ── Hospital admissions for assault by sharp object (E) ─────────────
// Source: NHS Digital Hospital Episode Statistics (HES), England only
// Finished admission episodes with external cause code X99
const hospitalAdmissions = [
  { year: "2012-13", admissions: 3849 },
  { year: "2013-14", admissions: 3643 },
  { year: "2014-15", admissions: 3744 },
  { year: "2015-16", admissions: 4074 },
  { year: "2016-17", admissions: 4535 },
  { year: "2017-18", admissions: 5177 },
  { year: "2018-19", admissions: 4986 },
  { year: "2019-20", admissions: 4506 },
  { year: "2020-21", admissions: 3640 },
  { year: "2021-22", admissions: 4139 },
  { year: "2022-23", admissions: 4076 },
  { year: "2023-24", admissions: 3880 },
];

// ── Sexual offences — police recorded (thousands, E&W) ──────────────
// Source: ONS Police recorded crime, sexual offences
const sexualOffences = [
  { year: "2002-03", total: 49, rape: 12, other: 37 },
  { year: "2003-04", total: 50, rape: 13, other: 37 },
  { year: "2004-05", total: 48, rape: 13, other: 35 },
  { year: "2005-06", total: 44, rape: 13, other: 31 },
  { year: "2006-07", total: 43, rape: 13, other: 30 },
  { year: "2007-08", total: 41, rape: 12, other: 29 },
  { year: "2008-09", total: 40, rape: 12, other: 28 },
  { year: "2009-10", total: 42, rape: 14, other: 28 },
  { year: "2010-11", total: 43, rape: 15, other: 28 },
  { year: "2011-12", total: 44, rape: 16, other: 28 },
  { year: "2012-13", total: 47, rape: 17, other: 30 },
  { year: "2013-14", total: 55, rape: 21, other: 34 },
  { year: "2014-15", total: 80, rape: 30, other: 50 },
  { year: "2015-16", total: 106, rape: 36, other: 70 },
  { year: "2016-17", total: 121, rape: 42, other: 79 },
  { year: "2017-18", total: 150, rape: 54, other: 96 },
  { year: "2018-19", total: 162, rape: 59, other: 103 },
  { year: "2019-20", total: 164, rape: 59, other: 105 },
  { year: "2020-21", total: 156, rape: 61, other: 95 },
  { year: "2021-22", total: 194, rape: 70, other: 124 },
  { year: "2022-23", total: 199, rape: 68, other: 131 },
  { year: "2023-24", total: 193, rape: 65, other: 128 },
];

// ── Domestic abuse (E&W) ────────────────────────────────────────────
// Source: ONS/CSEW — prevalence (% adults 16-74 experiencing DA in
// past year) + police flagged DA incidents (thousands, from 2015-16)
const domesticAbuse = [
  { year: "2004-05", prevalencePct: 7.0 },
  { year: "2005-06", prevalencePct: 6.7 },
  { year: "2006-07", prevalencePct: 6.6 },
  { year: "2007-08", prevalencePct: 6.2 },
  { year: "2008-09", prevalencePct: 6.0 },
  { year: "2009-10", prevalencePct: 6.5 },
  { year: "2010-11", prevalencePct: 6.4 },
  { year: "2011-12", prevalencePct: 6.1 },
  { year: "2012-13", prevalencePct: 6.0 },
  { year: "2013-14", prevalencePct: 5.7 },
  { year: "2014-15", prevalencePct: 5.5 },
  { year: "2015-16", prevalencePct: 5.5, policeFlagged: 419 },
  { year: "2016-17", prevalencePct: 5.9, policeFlagged: 489 },
  { year: "2017-18", prevalencePct: 5.7, policeFlagged: 599 },
  { year: "2018-19", prevalencePct: 5.7, policeFlagged: 746 },
  { year: "2019-20", prevalencePct: 5.5, policeFlagged: 798 },
  { year: "2020-21", prevalencePct: 6.5, policeFlagged: 845 },
  { year: "2021-22", prevalencePct: 5.7, policeFlagged: 910 },
  { year: "2022-23", prevalencePct: 5.7, policeFlagged: 897 },
  { year: "2023-24", prevalencePct: 5.4, policeFlagged: 888 },
];

// ── Fraud (E&W) — CSEW estimate vs police recorded ─────────────────
// Source: ONS/CSEW fraud module (from 2015-16) + police recorded fraud
// csewEstimate in millions, policeRecorded in thousands
const fraud = [
  { year: "2015-16", csewEstimate: 5.4, policeRecorded: 622 },
  { year: "2016-17", csewEstimate: 5.0, policeRecorded: 651 },
  { year: "2017-18", csewEstimate: 3.8, policeRecorded: 683 },
  { year: "2018-19", csewEstimate: 3.7, policeRecorded: 734 },
  { year: "2019-20", csewEstimate: 3.7, policeRecorded: 822 },
  { year: "2020-21", csewEstimate: 3.5, policeRecorded: 398 },
  { year: "2021-22", csewEstimate: 3.7, policeRecorded: 447 },
  { year: "2022-23", csewEstimate: 3.5, policeRecorded: 404 },
  { year: "2023-24", csewEstimate: 3.2, policeRecorded: 369 },
];

// ── Anti-social behaviour — police recorded incidents (thousands) ───
// Source: ONS, Police recorded ASB incidents, E&W
const asb = [
  { year: "2007-08", incidents: 3673 },
  { year: "2008-09", incidents: 3485 },
  { year: "2009-10", incidents: 3271 },
  { year: "2010-11", incidents: 2997 },
  { year: "2011-12", incidents: 2707 },
  { year: "2012-13", incidents: 2338 },
  { year: "2013-14", incidents: 2130 },
  { year: "2014-15", incidents: 1862 },
  { year: "2015-16", incidents: 1766 },
  { year: "2016-17", incidents: 1679 },
  { year: "2017-18", incidents: 1480 },
  { year: "2018-19", incidents: 1364 },
  { year: "2019-20", incidents: 1301 },
  { year: "2020-21", incidents: 1843 },
  { year: "2021-22", incidents: 1442 },
  { year: "2022-23", incidents: 1381 },
  { year: "2023-24", incidents: 1308 },
];

// ── Crime outcomes — charge/summons rate by crime type (%, E&W) ─────
// Source: Home Office Crime outcomes in England and Wales
const crimeOutcomes = [
  { year: "2014-15", overall: 16.3, violent: 15.2, sexual: 9.1, theft: 10.8, robbery: 10.4 },
  { year: "2015-16", overall: 14.0, violent: 13.4, sexual: 7.7, theft: 9.0, robbery: 9.1 },
  { year: "2016-17", overall: 11.7, violent: 11.5, sexual: 6.9, theft: 7.2, robbery: 7.8 },
  { year: "2017-18", overall: 10.0, violent: 10.0, sexual: 5.4, theft: 6.0, robbery: 6.8 },
  { year: "2018-19", overall: 8.4, violent: 8.8, sexual: 3.8, theft: 5.2, robbery: 5.5 },
  { year: "2019-20", overall: 7.8, violent: 8.3, sexual: 3.6, theft: 4.8, robbery: 5.2 },
  { year: "2020-21", overall: 7.0, violent: 7.9, sexual: 3.1, theft: 3.9, robbery: 4.7 },
  { year: "2021-22", overall: 5.9, violent: 6.8, sexual: 2.5, theft: 3.4, robbery: 3.5 },
  { year: "2022-23", overall: 5.7, violent: 7.1, sexual: 2.3, theft: 3.2, robbery: 3.2 },
  { year: "2023-24", overall: 5.5, violent: 7.0, sexual: 2.4, theft: 3.1, robbery: 3.0 },
];

// ── Reoffending — proven reoffending rate (%, E&W) ──────────────────
// Source: MoJ Proven reoffending statistics quarterly bulletin
const reoffending = [
  { year: "2010", overall: 29.6, juvenile: 37.3, adult: 28.2 },
  { year: "2011", overall: 27.9, juvenile: 35.6, adult: 26.7 },
  { year: "2012", overall: 26.5, juvenile: 37.9, adult: 25.1 },
  { year: "2013", overall: 26.0, juvenile: 37.8, adult: 24.6 },
  { year: "2014", overall: 25.4, juvenile: 37.7, adult: 24.0 },
  { year: "2015", overall: 25.0, juvenile: 38.4, adult: 23.5 },
  { year: "2016", overall: 25.2, juvenile: 39.0, adult: 23.7 },
  { year: "2017", overall: 25.3, juvenile: 38.1, adult: 23.9 },
  { year: "2018", overall: 25.6, juvenile: 38.5, adult: 24.2 },
  { year: "2019", overall: 24.4, juvenile: 33.4, adult: 23.3 },
  { year: "2020", overall: 25.3, juvenile: 33.2, adult: 24.2 },
  { year: "2021", overall: 25.1, juvenile: 33.1, adult: 24.0 },
  { year: "2022", overall: 24.7, juvenile: 32.4, adult: 23.7 },
];

// ── Fear of crime — CSEW perceptions (%, E&W) ──────────────────────
// Source: CSEW, ONS Crime in England and Wales
const fearOfCrime = [
  { year: "2006-07", unsafeAlone: 33, highWorryViolent: 15, highWorryBurglary: 13 },
  { year: "2007-08", unsafeAlone: 32, highWorryViolent: 14, highWorryBurglary: 12 },
  { year: "2008-09", unsafeAlone: 32, highWorryViolent: 14, highWorryBurglary: 12 },
  { year: "2009-10", unsafeAlone: 31, highWorryViolent: 13, highWorryBurglary: 12 },
  { year: "2010-11", unsafeAlone: 30, highWorryViolent: 12, highWorryBurglary: 11 },
  { year: "2011-12", unsafeAlone: 30, highWorryViolent: 12, highWorryBurglary: 12 },
  { year: "2012-13", unsafeAlone: 31, highWorryViolent: 11, highWorryBurglary: 11 },
  { year: "2013-14", unsafeAlone: 30, highWorryViolent: 11, highWorryBurglary: 10 },
  { year: "2014-15", unsafeAlone: 29, highWorryViolent: 10, highWorryBurglary: 10 },
  { year: "2015-16", unsafeAlone: 28, highWorryViolent: 10, highWorryBurglary: 9 },
  { year: "2016-17", unsafeAlone: 29, highWorryViolent: 10, highWorryBurglary: 9 },
  { year: "2017-18", unsafeAlone: 29, highWorryViolent: 10, highWorryBurglary: 9 },
  { year: "2018-19", unsafeAlone: 30, highWorryViolent: 10, highWorryBurglary: 9 },
  { year: "2019-20", unsafeAlone: 30, highWorryViolent: 10, highWorryBurglary: 9 },
  { year: "2020-21", unsafeAlone: 33, highWorryViolent: 11, highWorryBurglary: 10 },
  { year: "2021-22", unsafeAlone: 38, highWorryViolent: 12, highWorryBurglary: 10 },
  { year: "2022-23", unsafeAlone: 38, highWorryViolent: 12, highWorryBurglary: 10 },
  { year: "2023-24", unsafeAlone: 37, highWorryViolent: 12, highWorryBurglary: 10 },
];

// ── Crime rate per 1,000 by police force area (2023-24) ─────────────
// Source: ONS Police recorded crime by community safety partnership /
// police force area, year ending March 2024
const cityRates = [
  { area: "Cleveland",           city: "Middlesbrough",  rate: 131, population: 0.57 },
  { area: "Greater Manchester",  city: "Manchester",     rate: 121, population: 2.87 },
  { area: "West Yorkshire",      city: "Leeds",          rate: 115, population: 2.35 },
  { area: "South Yorkshire",     city: "Sheffield",      rate: 112, population: 1.41 },
  { area: "West Midlands",       city: "Birmingham",     rate: 108, population: 2.95 },
  { area: "Humberside",          city: "Hull",           rate: 107, population: 0.93 },
  { area: "Merseyside",          city: "Liverpool",      rate: 104, population: 1.44 },
  { area: "Nottinghamshire",     city: "Nottingham",     rate: 103, population: 1.17 },
  { area: "Metropolitan Police", city: "London",         rate: 101, population: 8.87 },
  { area: "Avon & Somerset",     city: "Bristol",        rate: 94,  population: 1.74 },
  { area: "England & Wales",     city: "National avg",   rate: 92,  population: 59.6 },
  { area: "South Wales",         city: "Cardiff",        rate: 84,  population: 1.34 },
  { area: "Hampshire",           city: "Southampton",    rate: 79,  population: 2.09 },
  { area: "Northumbria",         city: "Newcastle",      rate: 78,  population: 1.47 },
  { area: "Thames Valley",       city: "Oxford/Reading", rate: 76,  population: 2.43 },
  { area: "Surrey",              city: "Surrey",         rate: 55,  population: 1.20 },
];

// ── Knife crime per 100,000 by police force area (2023-24) ──────────
// Source: Home Office, Offences involving the use of weapons by PFA
const cityKnife = [
  { area: "Metropolitan Police", city: "London",       rate: 182 },
  { area: "West Midlands",       city: "Birmingham",   rate: 158 },
  { area: "Greater Manchester",  city: "Manchester",   rate: 151 },
  { area: "West Yorkshire",      city: "Leeds",        rate: 138 },
  { area: "Merseyside",          city: "Liverpool",    rate: 124 },
  { area: "South Yorkshire",     city: "Sheffield",    rate: 118 },
  { area: "Nottinghamshire",     city: "Nottingham",   rate: 115 },
  { area: "Cleveland",           city: "Middlesbrough",rate: 110 },
  { area: "Humberside",          city: "Hull",         rate: 102 },
  { area: "England & Wales",     city: "National avg", rate: 80 },
  { area: "Avon & Somerset",     city: "Bristol",      rate: 78 },
  { area: "South Wales",         city: "Cardiff",      rate: 72 },
  { area: "Northumbria",         city: "Newcastle",    rate: 68 },
  { area: "Hampshire",           city: "Southampton",  rate: 62 },
  { area: "Thames Valley",       city: "Oxford/Reading",rate: 58 },
  { area: "Surrey",              city: "Surrey",       rate: 32 },
];

// ── Snapshot ─────────────────────────────────────────────────────────
const snapshot = {
  violentCrime: 2060,
  violentCrimeUnit: "k",
  violentCrimeYear: "2023-24",
  knifeCrime: 47870,
  knifeCrimeYear: "2023-24",
  knifeCrimePeak: 49027,
  knifeCrimePeakYear: "2022-23",
  homicides: 590,
  homicidesYear: "2023-24",
  knifeHomicides: 229,
  knifeHomicidesYear: "2023-24",
  hospitalAdmissions: 3880,
  hospitalAdmissionsYear: "2023-24",
  nationalCrimeRate: 92,
  nationalCrimeRateYear: "2023-24",
  highestCrimeRate: 131,
  highestCrimeRateArea: "Cleveland",
  lowestCrimeRate: 55,
  lowestCrimeRateArea: "Surrey",
  // New snapshots
  firearms: 5370,
  firearmsYear: "2023-24",
  sexualOffences: 193,
  sexualOffencesYear: "2023-24",
  domesticAbusePrevalence: 5.4,
  domesticAbuse: 888,
  domesticAbuseYear: "2023-24",
  fraudEstimate: 3.2,
  fraudRecorded: 369,
  fraudYear: "2023-24",
  asbIncidents: 1308,
  asbYear: "2023-24",
  chargeRateOverall: 5.5,
  chargeRateViolent: 7.0,
  chargeRateSexual: 2.4,
  chargeRateYear: "2023-24",
  reoffendingRate: 24.7,
  reoffendingYear: "2022",
  unsafeAtNight: 37,
  unsafeAtNightYear: "2023-24",
};

// ── Output (sob-dataset-v1) ──────────────────────────────────────────
const output = {
  $schema: "sob-dataset-v1",
  id: "safety",
  pillar: "foundations",
  topic: "safety",
  generated: new Date().toISOString().slice(0, 10),
  sources: [
    {
      id: "ons-crime",
      name: "ONS Crime in England and Wales",
      url: "https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice",
    },
    {
      id: "home-office-weapons",
      name: "Home Office Offences involving the use of weapons",
      url: "https://www.gov.uk/government/statistics/offences-involving-the-use-of-weapons-open-data-tables",
    },
    {
      id: "ons-homicide",
      name: "ONS Homicide in England and Wales",
      url: "https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/articles/homicideinenglandandwales/latest",
    },
    {
      id: "nhs-hes",
      name: "NHS Digital Hospital Episode Statistics",
      url: "https://digital.nhs.uk/data-and-information/publications/statistical/hospital-admitted-patient-care-activity",
    },
    {
      id: "ons-crime-pfa",
      name: "ONS Police recorded crime by police force area",
      url: "https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/datasets/policeforceareadatatables",
    },
    {
      id: "ons-csew",
      name: "ONS Crime Survey for England and Wales",
      url: "https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/bulletins/crimeinenglandandwales/latest",
    },
    {
      id: "home-office-outcomes",
      name: "Home Office Crime outcomes in England and Wales",
      url: "https://www.gov.uk/government/statistics/crime-outcomes-in-england-and-wales-2023-to-2024",
    },
    {
      id: "moj-reoffending",
      name: "MoJ Proven reoffending statistics",
      url: "https://www.gov.uk/government/statistics/proven-reoffending-statistics-quarterly-bulletin",
    },
  ],
  snapshot,
  series: {
    violentCrime: {
      sourceId: "ons-crime",
      timeField: "year",
      data: violentCrime,
    },
    knifeCrime: {
      sourceId: "home-office-weapons",
      timeField: "year",
      methodologyBreaks: [
        {
          at: "2020-21",
          label: "COVID lockdowns",
          description: "Sharp fall in recorded offences during national lockdowns.",
          severity: "minor",
        },
      ],
      data: knifeCrime,
    },
    firearmsCrime: {
      sourceId: "home-office-weapons",
      timeField: "year",
      methodologyBreaks: [
        {
          at: "2020-21",
          label: "COVID lockdowns",
          description: "Sharp fall in recorded offences during national lockdowns.",
          severity: "minor",
        },
      ],
      data: firearmsCrime,
    },
    homicide: {
      sourceId: "ons-homicide",
      timeField: "year",
      data: homicide,
    },
    hospitalAdmissions: {
      sourceId: "nhs-hes",
      timeField: "year",
      data: hospitalAdmissions,
    },
    sexualOffences: {
      sourceId: "ons-crime",
      timeField: "year",
      methodologyBreaks: [
        {
          at: "2014-15",
          label: "Recording & reporting change",
          description: "Sharp rise driven by improved recording practices (HMIC inspection) and increased willingness to report, including historic offences.",
          severity: "major",
        },
      ],
      data: sexualOffences,
    },
    domesticAbuse: {
      sourceId: "ons-csew",
      timeField: "year",
      data: domesticAbuse,
    },
    fraud: {
      sourceId: "ons-csew",
      timeField: "year",
      data: fraud,
    },
    asb: {
      sourceId: "ons-crime",
      timeField: "year",
      methodologyBreaks: [
        {
          at: "2020-21",
          label: "COVID lockdowns",
          description: "Spike in ASB incidents driven by COVID regulation breaches (e.g. unlawful gatherings).",
          severity: "minor",
        },
      ],
      data: asb,
    },
    crimeOutcomes: {
      sourceId: "home-office-outcomes",
      timeField: "year",
      data: crimeOutcomes,
    },
    reoffending: {
      sourceId: "moj-reoffending",
      timeField: "year",
      data: reoffending,
    },
    fearOfCrime: {
      sourceId: "ons-csew",
      timeField: "year",
      data: fearOfCrime,
    },
    cityRates: {
      sourceId: "ons-crime-pfa",
      timeField: "area",
      data: cityRates,
    },
    cityKnife: {
      sourceId: "home-office-weapons",
      timeField: "area",
      data: cityKnife,
    },
  },
};

writeFileSync("public/data/safety.json", JSON.stringify(output, null, 2));
console.log(
  `  safety.json written (${violentCrime.length} violent crime, ` +
  `${knifeCrime.length} knife, ${firearmsCrime.length} firearms, ` +
  `${sexualOffences.length} sexual offences, ${domesticAbuse.length} domestic abuse, ` +
  `${fraud.length} fraud, ${asb.length} ASB, ${crimeOutcomes.length} outcomes, ` +
  `${reoffending.length} reoffending, ${fearOfCrime.length} fear of crime, ` +
  `${cityRates.length} city rates)`
);
