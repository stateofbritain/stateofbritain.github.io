/**
 * fetch-justice.js
 *
 * Curated UK justice & policing data from official sources:
 *  - ONS Crime Survey for England & Wales (CSEW)
 *  - Home Office Police Workforce Statistics
 *  - MoJ Criminal Court Statistics / Prison Population
 *  - MoJ Proven Reoffending Statistics
 *
 * Outputs: public/data/justice.json
 */
import { writeFileSync } from "fs";

// ── Police recorded crime (England & Wales, millions) ───────────────────
// Source: ONS Crime in England and Wales bulletin
const recordedCrime = [
  { year: "2002-03", total: 5.90 },
  { year: "2003-04", total: 5.94 },
  { year: "2004-05", total: 5.56 },
  { year: "2005-06", total: 5.56 },
  { year: "2006-07", total: 5.43 },
  { year: "2007-08", total: 4.95 },
  { year: "2008-09", total: 4.70 },
  { year: "2009-10", total: 4.34 },
  { year: "2010-11", total: 4.15 },
  { year: "2011-12", total: 3.99 },
  { year: "2012-13", total: 3.74 },
  { year: "2013-14", total: 3.78 },
  { year: "2014-15", total: 4.28 },
  { year: "2015-16", total: 4.62 },
  { year: "2016-17", total: 4.95 },
  { year: "2017-18", total: 5.52 },
  { year: "2018-19", total: 5.85 },
  { year: "2019-20", total: 5.74 },
  { year: "2020-21", total: 5.18 },
  { year: "2021-22", total: 5.64 },
  { year: "2022-23", total: 5.64 },
  { year: "2023-24", total: 5.44 },
];

// ── CSEW estimated crime (England & Wales, millions) ────────────────────
// Household and personal crime estimates — covers unreported crime
// Source: ONS CSEW
const csewCrime = [
  { year: "2002-03", total: 11.7 },
  { year: "2003-04", total: 11.3 },
  { year: "2004-05", total: 10.9 },
  { year: "2005-06", total: 10.8 },
  { year: "2006-07", total: 10.3 },
  { year: "2007-08", total: 9.8 },
  { year: "2008-09", total: 9.5 },
  { year: "2009-10", total: 9.2 },
  { year: "2010-11", total: 9.0 },
  { year: "2011-12", total: 8.9 },
  { year: "2012-13", total: 8.1 },
  { year: "2013-14", total: 7.3 },
  { year: "2014-15", total: 6.8 },
  { year: "2015-16", total: 6.4 },
  { year: "2016-17", total: 5.9 },
  { year: "2017-18", total: 5.8 },
  { year: "2018-19", total: 5.4 },
  { year: "2019-20", total: 5.1 },
  { year: "2020-21", total: 4.2 },
  { year: "2021-22", total: 4.9 },
  { year: "2022-23", total: 4.7 },
  { year: "2023-24", total: 4.3 },
];

// Merge into one series
const crimeSeries = recordedCrime.map((r, i) => ({
  year: r.year,
  recorded: r.total,
  csew: csewCrime[i]?.total ?? null,
}));

// ── Crime breakdown (2023-24, thousands) ────────────────────────────────
// Source: ONS Police recorded crime, year ending March 2024
const crimeBreakdown = [
  { category: "Violence against the person", value: 2060 },
  { category: "Theft", value: 820 },
  { category: "Criminal damage & arson", value: 480 },
  { category: "Public order offences", value: 430 },
  { category: "Drug offences", value: 147 },
  { category: "Sexual offences", value: 200 },
  { category: "Robbery", value: 67 },
  { category: "Possession of weapons", value: 51 },
  { category: "Fraud", value: 430 },
  { category: "Other", value: 755 },
];

// ── Police workforce (England & Wales, FTE thousands) ───────────────────
// Source: Home Office Police Workforce Statistics
const policeWorkforce = [
  { year: 2003, officers: 139.2, staff: 70.5, pcsos: 1.2 },
  { year: 2004, officers: 141.2, staff: 72.0, pcsos: 3.4 },
  { year: 2005, officers: 141.6, staff: 74.1, pcsos: 6.3 },
  { year: 2006, officers: 141.9, staff: 76.5, pcsos: 13.5 },
  { year: 2007, officers: 140.5, staff: 77.3, pcsos: 16.0 },
  { year: 2008, officers: 141.9, staff: 78.7, pcsos: 16.7 },
  { year: 2009, officers: 143.8, staff: 79.6, pcsos: 16.5 },
  { year: 2010, officers: 143.7, staff: 79.6, pcsos: 16.9 },
  { year: 2011, officers: 135.8, staff: 72.3, pcsos: 15.8 },
  { year: 2012, officers: 129.6, staff: 65.9, pcsos: 14.4 },
  { year: 2013, officers: 127.9, staff: 63.0, pcsos: 13.0 },
  { year: 2014, officers: 126.8, staff: 61.5, pcsos: 12.3 },
  { year: 2015, officers: 126.8, staff: 60.3, pcsos: 11.9 },
  { year: 2016, officers: 123.1, staff: 60.2, pcsos: 10.6 },
  { year: 2017, officers: 122.4, staff: 60.6, pcsos: 10.2 },
  { year: 2018, officers: 122.4, staff: 61.4, pcsos: 10.1 },
  { year: 2019, officers: 123.2, staff: 63.1, pcsos: 9.8 },
  { year: 2020, officers: 129.1, staff: 63.5, pcsos: 9.8 },
  { year: 2021, officers: 135.3, staff: 67.5, pcsos: 9.3 },
  { year: 2022, officers: 142.5, staff: 70.5, pcsos: 9.4 },
  { year: 2023, officers: 148.4, staff: 72.0, pcsos: 8.9 },
  { year: 2024, officers: 146.4, staff: 71.5, pcsos: 8.5 },
];

// ── Prison population & capacity (England & Wales, thousands) ───────────
// Source: MoJ Offender Management Statistics / HMPPS Capacity
const prisonPopulation = [
  { year: 2000, population: 64.6, capacity: 65.0 },
  { year: 2002, population: 70.8, capacity: 72.5 },
  { year: 2004, population: 74.7, capacity: 76.0 },
  { year: 2006, population: 79.0, capacity: 80.0 },
  { year: 2008, population: 83.2, capacity: 84.5 },
  { year: 2010, population: 85.0, capacity: 86.5 },
  { year: 2011, population: 86.0, capacity: 87.0 },
  { year: 2012, population: 86.6, capacity: 87.5 },
  { year: 2013, population: 83.8, capacity: 87.0 },
  { year: 2014, population: 85.4, capacity: 86.5 },
  { year: 2015, population: 85.6, capacity: 86.0 },
  { year: 2016, population: 84.4, capacity: 85.5 },
  { year: 2017, population: 85.9, capacity: 86.0 },
  { year: 2018, population: 82.8, capacity: 86.0 },
  { year: 2019, population: 83.4, capacity: 86.5 },
  { year: 2020, population: 79.8, capacity: 87.0 },
  { year: 2021, population: 78.8, capacity: 87.5 },
  { year: 2022, population: 80.6, capacity: 88.0 },
  { year: 2023, population: 85.6, capacity: 88.5 },
  { year: 2024, population: 87.5, capacity: 88.9 },
];

// ── Crown Court backlog (outstanding cases, thousands) ──────────────────
// Source: MoJ Criminal Court Statistics Quarterly
const courtBacklog = [
  { year: 2019, outstanding: 39.0 },
  { year: 2020, outstanding: 54.0 },
  { year: 2021, outstanding: 60.7 },
  { year: 2022, outstanding: 62.8 },
  { year: 2023, outstanding: 67.6 },
  { year: 2024, outstanding: 73.0 },
];

// ── Charge rate (% of recorded crimes resulting in charge/summons) ──────
// Source: Home Office Crime Outcomes in England and Wales
const chargeRate = [
  { year: "2014-15", rate: 16.1 },
  { year: "2015-16", rate: 14.8 },
  { year: "2016-17", rate: 12.6 },
  { year: "2017-18", rate: 10.1 },
  { year: "2018-19", rate: 8.0 },
  { year: "2019-20", rate: 7.8 },
  { year: "2020-21", rate: 7.1 },
  { year: "2021-22", rate: 6.3 },
  { year: "2022-23", rate: 5.7 },
  { year: "2023-24", rate: 5.5 },
];

// ── Snapshot ─────────────────────────────────────────────────────────────
const snapshot = {
  recordedCrime: 5.44,
  recordedCrimeYear: "2023-24",
  csewCrime: 4.3,
  policeOfficers: 146.4,
  policeOfficersUnit: "k",
  policeOfficersYear: 2024,
  policePeak: 143.8,
  policePeakYear: 2009,
  prisonPop: 87.5,
  prisonPopUnit: "k",
  prisonPopYear: 2024,
  prisonCapacity: 88.9,
  courtBacklog: 73.0,
  courtBacklogUnit: "k",
  courtBacklogYear: 2024,
  chargeRate: 5.5,
  chargeRateYear: "2023-24",
};

// ── Output ───────────────────────────────────────────────────────────────
const output = {
  snapshot,
  crimeSeries,
  crimeBreakdown,
  policeWorkforce,
  prisonPopulation,
  courtBacklog,
  chargeRate,
  meta: {
    generated: new Date().toISOString(),
    sources: [
      { name: "ONS Crime in England and Wales", url: "https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice" },
      { name: "Home Office Police Workforce Statistics", url: "https://www.gov.uk/government/collections/police-workforce-england-and-wales" },
      { name: "MoJ Prison Population Statistics", url: "https://www.gov.uk/government/collections/prison-population-statistics" },
      { name: "MoJ Criminal Court Statistics", url: "https://www.gov.uk/government/collections/criminal-court-statistics" },
      { name: "Home Office Crime Outcomes", url: "https://www.gov.uk/government/collections/crime-outcomes-in-england-and-wales-statistics" },
    ],
  },
};

writeFileSync("public/data/justice.json", JSON.stringify(output, null, 2));
console.log("  justice.json written (" + crimeSeries.length + " crime years, " + policeWorkforce.length + " workforce years)");
