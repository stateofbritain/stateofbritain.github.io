/**
 * fetch-local-government.js
 *
 * Curated UK local government finance data from official sources:
 *  - DLUHC Local Authority Revenue Expenditure and Financing (RO outturn)
 *  - DLUHC Council Tax Levels Statistics
 *  - NAO Financial Sustainability of Local Authorities (2025)
 *  - ONS Quarterly Public Sector Employment Survey
 *  - IFS "How have English councils' funding and spending changed? 2010–2024"
 *
 * Outputs: public/data/local-government.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";

// ── Service spending (net current expenditure, £bn, cash terms) ──────────
// Source: DLUHC RO outturn, multi-year dataset & annual releases
// Excludes education from 2013-14 onwards due to academy transfers
// making education figures non-comparable over time
const serviceSpending = [
  { year: "2010-11", adultSocialCare: 17.1, childrenSocialCare: 8.1, highways: 4.9, housing: 2.3, environment: 5.6, cultural: 3.4, planning: 2.6, publicHealth: 0, fire: 2.1, central: 4.2, police: 12.1 },
  { year: "2011-12", adultSocialCare: 16.9, childrenSocialCare: 8.0, highways: 4.4, housing: 2.2, environment: 5.3, cultural: 3.1, planning: 2.2, publicHealth: 0, fire: 2.1, central: 4.0, police: 11.7 },
  { year: "2012-13", adultSocialCare: 16.8, childrenSocialCare: 8.1, highways: 4.1, housing: 2.0, environment: 5.1, cultural: 2.9, planning: 2.0, publicHealth: 0, fire: 2.1, central: 3.9, police: 11.4 },
  { year: "2013-14", adultSocialCare: 16.7, childrenSocialCare: 8.3, highways: 3.8, housing: 1.8, environment: 4.9, cultural: 2.7, planning: 1.8, publicHealth: 2.8, fire: 2.1, central: 3.7, police: 11.2 },
  { year: "2014-15", adultSocialCare: 16.8, childrenSocialCare: 8.6, highways: 3.6, housing: 1.7, environment: 4.7, cultural: 2.5, planning: 1.7, publicHealth: 2.9, fire: 2.1, central: 3.5, police: 11.0 },
  { year: "2015-16", adultSocialCare: 16.9, childrenSocialCare: 8.9, highways: 3.4, housing: 1.6, environment: 4.6, cultural: 2.4, planning: 1.6, publicHealth: 3.0, fire: 2.1, central: 3.4, police: 10.9 },
  { year: "2016-17", adultSocialCare: 17.4, childrenSocialCare: 9.2, highways: 3.3, housing: 1.6, environment: 4.5, cultural: 2.3, planning: 1.5, publicHealth: 3.1, fire: 2.2, central: 3.4, police: 11.0 },
  { year: "2017-18", adultSocialCare: 17.9, childrenSocialCare: 9.7, highways: 3.4, housing: 1.7, environment: 4.5, cultural: 2.3, planning: 1.6, publicHealth: 3.1, fire: 2.3, central: 3.5, police: 11.4 },
  { year: "2018-19", adultSocialCare: 18.5, childrenSocialCare: 10.3, highways: 3.3, housing: 1.8, environment: 4.6, cultural: 2.3, planning: 1.7, publicHealth: 3.2, fire: 2.4, central: 3.6, police: 12.0 },
  { year: "2019-20", adultSocialCare: 19.2, childrenSocialCare: 11.0, highways: 3.3, housing: 2.0, environment: 4.7, cultural: 2.4, planning: 1.8, publicHealth: 3.3, fire: 2.5, central: 3.7, police: 12.8 },
  { year: "2020-21", adultSocialCare: 20.3, childrenSocialCare: 11.7, highways: 3.4, housing: 2.5, environment: 5.0, cultural: 2.3, planning: 1.9, publicHealth: 4.5, fire: 2.6, central: 4.2, police: 13.8 },
  { year: "2021-22", adultSocialCare: 20.9, childrenSocialCare: 12.5, highways: 3.8, housing: 2.7, environment: 5.4, cultural: 2.5, planning: 2.1, publicHealth: 4.1, fire: 2.7, central: 4.1, police: 14.6 },
  { year: "2022-23", adultSocialCare: 22.1, childrenSocialCare: 13.5, highways: 4.3, housing: 3.0, environment: 5.9, cultural: 2.6, planning: 2.3, publicHealth: 3.8, fire: 2.7, central: 4.3, police: 15.4 },
  { year: "2023-24", adultSocialCare: 23.3, childrenSocialCare: 14.7, highways: 4.5, housing: 3.1, environment: 6.3, cultural: 2.6, planning: 2.4, publicHealth: 3.9, fire: 2.7, central: 4.4, police: 16.1 },
  { year: "2024-25", adultSocialCare: 25.2, childrenSocialCare: 15.6, highways: 5.4, housing: 3.2, environment: 6.6, cultural: 2.7, planning: 2.5, publicHealth: 4.1, fire: 2.8, central: 4.5, police: 16.9 },
];

// ── Funding sources (% of total revenue, England) ────────────────────────
// Source: DLUHC RO financing tables, IFS analysis, Institute for Government
const fundingSources = [
  { year: "2010-11", councilTax: 34, govGrants: 49, businessRates: 13, other: 4 },
  { year: "2011-12", councilTax: 36, govGrants: 46, businessRates: 14, other: 4 },
  { year: "2012-13", councilTax: 38, govGrants: 43, businessRates: 14, other: 5 },
  { year: "2013-14", councilTax: 40, govGrants: 40, businessRates: 15, other: 5 },
  { year: "2014-15", councilTax: 42, govGrants: 37, businessRates: 16, other: 5 },
  { year: "2015-16", councilTax: 44, govGrants: 34, businessRates: 17, other: 5 },
  { year: "2016-17", councilTax: 46, govGrants: 31, businessRates: 18, other: 5 },
  { year: "2017-18", councilTax: 48, govGrants: 29, businessRates: 18, other: 5 },
  { year: "2018-19", councilTax: 50, govGrants: 27, businessRates: 18, other: 5 },
  { year: "2019-20", councilTax: 52, govGrants: 25, businessRates: 18, other: 5 },
  { year: "2020-21", councilTax: 47, govGrants: 31, businessRates: 17, other: 5 },
  { year: "2021-22", councilTax: 47, govGrants: 30, businessRates: 18, other: 5 },
  { year: "2022-23", councilTax: 48, govGrants: 28, businessRates: 19, other: 5 },
  { year: "2023-24", councilTax: 47, govGrants: 30, businessRates: 18, other: 5 },
  { year: "2024-25", councilTax: 46, govGrants: 32, businessRates: 17, other: 5 },
];

// ── Council tax (average Band D, England) ────────────────────────────────
// Source: DLUHC Council Tax Levels Statistics
const councilTax = [
  { year: "2010-11", bandD: 1439 },
  { year: "2011-12", bandD: 1439 },
  { year: "2012-13", bandD: 1444 },
  { year: "2013-14", bandD: 1456 },
  { year: "2014-15", bandD: 1468 },
  { year: "2015-16", bandD: 1484 },
  { year: "2016-17", bandD: 1530 },
  { year: "2017-18", bandD: 1591 },
  { year: "2018-19", bandD: 1671 },
  { year: "2019-20", bandD: 1750 },
  { year: "2020-21", bandD: 1818 },
  { year: "2021-22", bandD: 1898 },
  { year: "2022-23", bandD: 1966 },
  { year: "2023-24", bandD: 2065 },
  { year: "2024-25", bandD: 2171 },
  { year: "2025-26", bandD: 2280 },
];

// ── Council tax by region (2025-26 Band D) ───────────────────────────────
// Source: DLUHC Council Tax Levels 2025-26
const councilTaxByRegion = [
  { region: "London", bandD: 1982 },
  { region: "Metropolitan areas", bandD: 2289 },
  { region: "Unitary authorities", bandD: 2366 },
  { region: "Shire areas", bandD: 2344 },
];

// ── Section 114 notices ──────────────────────────────────────────────────
// Source: NAO, Institute for Government, House of Commons Library
// A section 114 notice is issued by a council's chief finance officer
// when expenditure is likely to exceed resources in a financial year.
const section114 = [
  { council: "Northamptonshire", date: "2018-02-02", note: "First notice; a second was issued in July 2018" },
  { council: "Croydon", date: "2020-11-11", note: "Further notice issued in 2022" },
  { council: "Slough", date: "2021-07-02", note: "Related to accounting irregularities and asset disposals" },
  { council: "Thurrock", date: "2022-12-19", note: "Related to investment losses in solar energy bonds" },
  { council: "Woking", date: "2023-06-07", note: "Linked to commercial property investments" },
  { council: "Birmingham", date: "2023-09-05", note: "Equal pay liabilities and Oracle IT system costs" },
  { council: "Nottingham", date: "2023-11-29", note: "Losses from Robin Hood Energy municipal energy company" },
];

// ── Financial health indicators ──────────────────────────────────────────
// Source: NAO Financial Sustainability reports, DLUHC RO outturn
const reserves = [
  { year: "2010-11", usable: 13.0 },
  { year: "2011-12", usable: 15.2 },
  { year: "2012-13", usable: 17.0 },
  { year: "2013-14", usable: 18.8 },
  { year: "2014-15", usable: 20.2 },
  { year: "2015-16", usable: 21.5 },
  { year: "2016-17", usable: 22.4 },
  { year: "2017-18", usable: 23.1 },
  { year: "2018-19", usable: 23.5 },
  { year: "2019-20", usable: 24.8 },
  { year: "2020-21", usable: 30.1 },
  { year: "2021-22", usable: 31.2 },
  { year: "2022-23", usable: 29.8 },
  { year: "2023-24", usable: 28.5 },
  { year: "2024-25", usable: 27.0 },
];

// ── Audit backlog ────────────────────────────────────────────────────────
// Source: NAO, DLUHC local audit reform consultation
const auditBacklog = [
  { year: "2017-18", outstanding: 29 },
  { year: "2018-19", outstanding: 75 },
  { year: "2019-20", outstanding: 166 },
  { year: "2020-21", outstanding: 294 },
  { year: "2021-22", outstanding: 632 },
  { year: "2022-23", outstanding: 918 },
  { year: "2023-24", outstanding: 771 },
  { year: "2024-25", outstanding: 100 },
];

// ── Workforce (local authority FTE, thousands, England) ──────────────────
// Source: ONS Quarterly Public Sector Employment Survey (QPSES)
// Excludes police, fire, and centrally-funded teachers
const workforce = [
  { year: 2010, fte: 1510 },
  { year: 2011, fte: 1420 },
  { year: 2012, fte: 1340 },
  { year: 2013, fte: 1280 },
  { year: 2014, fte: 1210 },
  { year: 2015, fte: 1170 },
  { year: 2016, fte: 1130 },
  { year: 2017, fte: 1100 },
  { year: 2018, fte: 1080 },
  { year: 2019, fte: 1070 },
  { year: 2020, fte: 1060 },
  { year: 2021, fte: 1050 },
  { year: 2022, fte: 1040 },
  { year: 2023, fte: 1010 },
  { year: 2024, fte: 990 },
  { year: 2025, fte: 970 },
];

// ── Social care share of spending (excluding education) ──────────────────
// Source: Derived from DLUHC RO outturn & IFS analysis
const socialCareShare = serviceSpending.map(row => {
  const totalExEd = row.adultSocialCare + row.childrenSocialCare + row.highways
    + row.housing + row.environment + row.cultural + row.planning
    + row.publicHealth + row.fire + row.central + row.police;
  const socialCare = row.adultSocialCare + row.childrenSocialCare;
  return {
    year: row.year,
    socialCarePct: Math.round((socialCare / totalExEd) * 1000) / 10,
    adultPct: Math.round((row.adultSocialCare / totalExEd) * 1000) / 10,
    childrenPct: Math.round((row.childrenSocialCare / totalExEd) * 1000) / 10,
  };
});

// ── Core spending power per person (real terms, indexed 2010-11 = 100) ───
// Source: IFS, DLUHC Local Government Finance Settlement
const coreSpendingPower = [
  { year: "2010-11", index: 100 },
  { year: "2011-12", index: 93 },
  { year: "2012-13", index: 87 },
  { year: "2013-14", index: 82 },
  { year: "2014-15", index: 78 },
  { year: "2015-16", index: 73 },
  { year: "2016-17", index: 74 },
  { year: "2017-18", index: 75 },
  { year: "2018-19", index: 76 },
  { year: "2019-20", index: 78 },
  { year: "2020-21", index: 80 },
  { year: "2021-22", index: 79 },
  { year: "2022-23", index: 77 },
  { year: "2023-24", index: 79 },
  { year: "2024-25", index: 82 },
];

// ── Exceptional financial support ────────────────────────────────────────
// Source: NAO Financial Sustainability of Local Authorities (2025)
const exceptionalSupport = {
  totalAuthorities: 42,
  totalValue: 5.0,
  valueUnit: "£bn",
  authoritiesIn2025: 30,
  year: "2024-25",
};

// ── Snapshot ─────────────────────────────────────────────────────────────
const latestSpending = serviceSpending[serviceSpending.length - 1];
const totalExEd = latestSpending.adultSocialCare + latestSpending.childrenSocialCare
  + latestSpending.highways + latestSpending.housing + latestSpending.environment
  + latestSpending.cultural + latestSpending.planning + latestSpending.publicHealth
  + latestSpending.fire + latestSpending.central + latestSpending.police;
const latestTax = councilTax[councilTax.length - 1];
const latestCSP = coreSpendingPower[coreSpendingPower.length - 1];
const latestReserves = reserves[reserves.length - 1];

const snapshot = {
  totalServiceSpend: Math.round(totalExEd * 10) / 10,
  totalServiceSpendUnit: "£bn",
  totalServiceSpendYear: "2024-25",
  avgBandD: latestTax.bandD,
  avgBandDYear: latestTax.year,
  avgBandDChange: Math.round(((latestTax.bandD / councilTax[0].bandD) - 1) * 1000) / 10,
  cspIndex: latestCSP.index,
  cspIndexYear: latestCSP.year,
  section114Count: section114.length,
  section114Period: "2018-2023",
  socialCarePct: socialCareShare[socialCareShare.length - 1].socialCarePct,
  socialCarePctYear: "2024-25",
  workforceFte: workforce[workforce.length - 1].fte,
  workforceFteYear: workforce[workforce.length - 1].year,
  workforceFteChange: Math.round(((workforce[workforce.length - 1].fte / workforce[0].fte) - 1) * 1000) / 10,
  usableReserves: latestReserves.usable,
  usableReservesYear: latestReserves.year,
  exceptionalSupportAuthorities: exceptionalSupport.totalAuthorities,
};

// ── Output ───────────────────────────────────────────────────────────────
const output = {
  $schema: "sob-dataset-v1",
  id: "local-government",
  pillar: "state",
  topic: "local-government",
  generated: new Date().toISOString().slice(0, 10),

  sources: [
    {
      id: "dluhc-ro-outturn",
      name: "DLUHC Local Authority Revenue Expenditure and Financing",
      url: "https://www.gov.uk/government/collections/local-authority-revenue-expenditure-and-financing",
      publisher: "DLUHC",
      note: "Revenue Outturn (RO) returns, multi-year dataset",
    },
    {
      id: "dluhc-council-tax",
      name: "DLUHC Council Tax Levels Statistics",
      url: "https://www.gov.uk/government/statistics/council-tax-levels-set-by-local-authorities-in-england-2025-to-2026",
      publisher: "DLUHC",
    },
    {
      id: "nao-financial-sustainability",
      name: "NAO Financial Sustainability of Local Authorities",
      url: "https://www.nao.org.uk/reports/local-government-financial-sustainability-2025/",
      publisher: "National Audit Office",
      note: "February 2025 report",
    },
    {
      id: "ons-pse",
      name: "ONS Quarterly Public Sector Employment Survey",
      url: "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/publicsectorpersonnel",
      publisher: "ONS",
    },
    {
      id: "ifs-councils-2024",
      name: "IFS: How have English councils' funding and spending changed? 2010–2024",
      url: "https://ifs.org.uk/publications/how-have-english-councils-funding-and-spending-changed-2010-2024",
      publisher: "Institute for Fiscal Studies",
    },
    {
      id: "dluhc-local-audit",
      name: "DLUHC Local Audit Reform",
      url: "https://www.gov.uk/government/publications/local-audit-reform",
      publisher: "DLUHC",
      note: "Audit backstop programme and backlog data",
    },
  ],

  snapshot,

  series: {
    serviceSpending: {
      sourceId: "dluhc-ro-outturn",
      timeField: "year",
      data: serviceSpending,
    },
    fundingSources: {
      sourceId: "dluhc-ro-outturn",
      timeField: "year",
      data: fundingSources,
    },
    councilTax: {
      sourceId: "dluhc-council-tax",
      timeField: "year",
      data: councilTax,
    },
    councilTaxByRegion: {
      sourceId: "dluhc-council-tax",
      timeField: "region",
      data: councilTaxByRegion,
    },
    section114: {
      sourceId: "nao-financial-sustainability",
      timeField: "date",
      data: section114,
    },
    reserves: {
      sourceId: "nao-financial-sustainability",
      timeField: "year",
      data: reserves,
    },
    auditBacklog: {
      sourceId: "dluhc-local-audit",
      timeField: "year",
      data: auditBacklog,
      methodologyBreaks: [
        {
          at: "2024-25",
          label: "Backstop deadline",
          description: "Statutory backstop of 13 December 2024 set for all accounts up to 2022-23, substantially clearing the backlog.",
          severity: "major",
        },
      ],
    },
    workforce: {
      sourceId: "ons-pse",
      timeField: "year",
      data: workforce,
    },
    socialCareShare: {
      sourceId: "dluhc-ro-outturn",
      timeField: "year",
      data: socialCareShare,
    },
    coreSpendingPower: {
      sourceId: "ifs-councils-2024",
      timeField: "year",
      data: coreSpendingPower,
    },
  },
};

writeFileSync("public/data/local-government.json", JSON.stringify(output, null, 2));
console.log(
  `  local-government.json written (${serviceSpending.length} spending years, ` +
  `${councilTax.length} council tax years, ${section114.length} s114 notices)`
);
