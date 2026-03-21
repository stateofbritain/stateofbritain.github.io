/**
 * fetch-adult-social-care.js
 *
 * Curated adult social care data for England from official sources:
 *  - NHS Digital SALT / CLD: requests for support, long-term support recipients
 *  - DLUHC Revenue Outturn: adult social care spending
 *  - Skills for Care: workforce, vacancies, pay
 *  - CQC State of Care: provider ratings
 *  - Census 2021 (ONS): unpaid carers
 *  - Various: self-funders estimates
 *
 * Outputs: public/data/adult-social-care.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";

// ── Requests for support — new requests, England ────────────────────
// Source: NHS Digital SALT / CLD, year ending 31 March (millions)
// Note: CLD replaced SALT from April 2024; figures broadly comparable
const requestsForSupport = [
  { year: "2015-16", newRequestsM: 1.80 },
  { year: "2016-17", newRequestsM: 1.82 },
  { year: "2017-18", newRequestsM: 1.86 },
  { year: "2018-19", newRequestsM: 1.90 },
  { year: "2019-20", newRequestsM: 1.87 },
  { year: "2020-21", newRequestsM: 1.67 },
  { year: "2021-22", newRequestsM: 1.87 },
  { year: "2022-23", newRequestsM: 1.93 },
  { year: "2023-24", newRequestsM: 1.97 },
  { year: "2024-25", newRequestsM: 2.02 },
];

// ── People receiving long-term support — England ────────────────────
// Source: NHS Digital SALT / CLD, as at 31 March (thousands)
const longTermSupport = [
  { year: "2015-16", total: 653, aged18to64: 230, aged65plus: 423 },
  { year: "2016-17", total: 641, aged18to64: 232, aged65plus: 409 },
  { year: "2017-18", total: 637, aged18to64: 235, aged65plus: 402 },
  { year: "2018-19", total: 633, aged18to64: 238, aged65plus: 395 },
  { year: "2019-20", total: 628, aged18to64: 239, aged65plus: 389 },
  { year: "2020-21", total: 621, aged18to64: 237, aged65plus: 384 },
  { year: "2021-22", total: 625, aged18to64: 240, aged65plus: 385 },
  { year: "2022-23", total: 635, aged18to64: 244, aged65plus: 391 },
  { year: "2023-24", total: 650, aged18to64: 250, aged65plus: 400 },
  { year: "2024-25", total: 672, aged18to64: 258, aged65plus: 414 },
];

// ── Spending — adult social care, England ────────────────────────────
// Source: DLUHC Revenue Outturn / DHSC (net current expenditure, £bn, cash terms)
const spending = [
  { year: "2010-11", totalBn: 17.1 },
  { year: "2011-12", totalBn: 16.9 },
  { year: "2012-13", totalBn: 16.5 },
  { year: "2013-14", totalBn: 16.3 },
  { year: "2014-15", totalBn: 16.2 },
  { year: "2015-16", totalBn: 16.5 },
  { year: "2016-17", totalBn: 17.1 },
  { year: "2017-18", totalBn: 17.8 },
  { year: "2018-19", totalBn: 18.5 },
  { year: "2019-20", totalBn: 19.4 },
  { year: "2020-21", totalBn: 21.1 },
  { year: "2021-22", totalBn: 22.2 },
  { year: "2022-23", totalBn: 23.1 },
  { year: "2023-24", totalBn: 25.2 },
  { year: "2024-25", totalBn: 27.6 },
];

// ── Workforce — adult social care, England ──────────────────────────
// Source: Skills for Care, year ending March (vacancies, turnover in %)
const workforce = [
  { year: "2016-17", filledPostsK: 1490, vacancyRate: 6.6, turnoverRate: 27.3, zeroHoursPct: 34 },
  { year: "2017-18", filledPostsK: 1520, vacancyRate: 7.8, turnoverRate: 30.7, zeroHoursPct: 35 },
  { year: "2018-19", filledPostsK: 1540, vacancyRate: 8.0, turnoverRate: 30.4, zeroHoursPct: 34 },
  { year: "2019-20", filledPostsK: 1520, vacancyRate: 7.3, turnoverRate: 30.4, zeroHoursPct: 34 },
  { year: "2020-21", filledPostsK: 1540, vacancyRate: 6.8, turnoverRate: 28.5, zeroHoursPct: 24 },
  { year: "2021-22", filledPostsK: 1520, vacancyRate: 10.6, turnoverRate: 29.0, zeroHoursPct: 24 },
  { year: "2022-23", filledPostsK: 1540, vacancyRate: 9.9, turnoverRate: 28.3, zeroHoursPct: 24 },
  { year: "2023-24", filledPostsK: 1550, vacancyRate: 8.3, turnoverRate: 26.0, zeroHoursPct: 24 },
  { year: "2024-25", filledPostsK: 1600, vacancyRate: 5.9, turnoverRate: 24.0, zeroHoursPct: 24 },
];

// ── Pay — care worker hourly pay vs NLW, England ────────────────────
// Source: Skills for Care / ONS ASHE (median hourly pay, independent sector)
const pay = [
  { year: 2018, careWorker: 8.00, nlw: 7.83, medianUK: 12.10 },
  { year: 2019, careWorker: 8.50, nlw: 8.21, medianUK: 12.59 },
  { year: 2020, careWorker: 9.01, nlw: 8.72, medianUK: 13.04 },
  { year: 2021, careWorker: 9.36, nlw: 8.91, medianUK: 13.57 },
  { year: 2022, careWorker: 9.90, nlw: 9.50, medianUK: 14.00 },
  { year: 2023, careWorker: 10.40, nlw: 10.42, medianUK: 14.90 },
  { year: 2024, careWorker: 11.20, nlw: 11.44, medianUK: 15.45 },
  { year: 2025, careWorker: 12.60, nlw: 12.21, medianUK: 16.30 },
];

// ── CQC ratings — adult social care providers, England ──────────────
// Source: CQC State of Care, as at 31 March (% of rated providers)
const cqcRatings = [
  { year: 2017, outstanding: 3, good: 74, reqImprovement: 21, inadequate: 2 },
  { year: 2018, outstanding: 3, good: 77, reqImprovement: 18, inadequate: 2 },
  { year: 2019, outstanding: 4, good: 78, reqImprovement: 17, inadequate: 1 },
  { year: 2020, outstanding: 4, good: 79, reqImprovement: 16, inadequate: 1 },
  { year: 2021, outstanding: 4, good: 79, reqImprovement: 16, inadequate: 1 },
  { year: 2022, outstanding: 4, good: 79, reqImprovement: 16, inadequate: 1 },
  { year: 2023, outstanding: 4, good: 79, reqImprovement: 16, inadequate: 1 },
  { year: 2024, outstanding: 4, good: 78, reqImprovement: 16, inadequate: 1 },
];

// ── Unpaid carers — Census 2021, England ────────────────────────────
// Source: ONS Census 2021
const unpaidCarers = [
  { category: "No unpaid care", count: 46170000, pct: 91.1 },
  { category: "9 hours or less/week", count: 1700000, pct: 3.4 },
  { category: "10-19 hours/week", count: 530000, pct: 1.0 },
  { category: "20-49 hours/week", count: 970000, pct: 1.9 },
  { category: "50+ hours/week", count: 1400000, pct: 2.6 },
];

// ── Self-funders — estimated proportion, England ────────────────────
// Source: ONS / IFS / Health Foundation estimates
const selfFunders = [
  { setting: "Care homes", selfFundedPct: 37, councilFundedPct: 53, nhsFundedPct: 10 },
  { setting: "Community care", selfFundedPct: 26, councilFundedPct: 69, nhsFundedPct: 5 },
];

const output = {
  $schema: "sob-dataset-v1",
  id: "adult-social-care",
  pillar: "foundations",
  topic: "socialCare",
  generated: new Date().toISOString().slice(0, 10),
  sources: [
    {
      id: "nhs-digital-salt-cld",
      name: "NHS England Adult Social Care Activity Report (SALT/CLD)",
      url: "https://www.gov.uk/government/statistics/adult-social-care-activity-report-england-2024-to-2025",
      publisher: "NHS England / DHSC",
    },
    {
      id: "dluhc-revenue-outturn",
      name: "DLUHC Local Authority Revenue Expenditure and Financing, England",
      url: "https://www.gov.uk/government/statistics/local-authority-revenue-expenditure-and-financing-england-2024-to-2025-first-release",
      publisher: "DLUHC",
    },
    {
      id: "skills-for-care-2025",
      name: "Skills for Care: State of the Adult Social Care Sector and Workforce, 2025",
      url: "https://www.skillsforcare.org.uk/Adult-Social-Care-Workforce-Data/Workforce-intelligence/publications/national-information/The-state-of-the-adult-social-care-sector-and-workforce-in-England.aspx",
      publisher: "Skills for Care",
    },
    {
      id: "cqc-state-of-care-2024",
      name: "CQC State of Health Care and Adult Social Care in England, 2024/25",
      url: "https://www.cqc.org.uk/publications/major-report/state-care/2024-2025",
      publisher: "Care Quality Commission",
    },
    {
      id: "ons-census-2021-unpaid-care",
      name: "ONS Unpaid Care, England and Wales: Census 2021",
      url: "https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandwellbeing/bulletins/unpaidcareenglandandwales/census2021",
      publisher: "ONS",
    },
    {
      id: "skills-for-care-pay-2025",
      name: "Skills for Care: Pay in the Adult Social Care Sector in England, December 2024",
      url: "https://www.skillsforcare.org.uk/Adult-Social-Care-Workforce-Data/workforceintelligence/resources/Reports/Topics/Pay-in-the-adult-social-care-sector-in-England-as-at-December-2024.pdf",
      publisher: "Skills for Care",
    },
  ],
  snapshot: {
    requestsM: 2.02,
    requestsYear: "2024-25",
    longTermSupport: 672000,
    longTermSupportYear: "2024-25",
    totalSpendingBn: 27.6,
    totalSpendingYear: "2024-25",
    filledPostsK: 1600,
    filledPostsYear: "2024-25",
    vacancyRate: 5.9,
    vacancyRateYear: "2024-25",
    turnoverRate: 24.0,
    turnoverRateYear: "2024-25",
    careWorkerPay: 12.60,
    careWorkerPayYear: 2025,
    nlw: 12.21,
    nlwYear: 2025,
    cqcGoodOrOutstanding: 82,
    cqcGoodOrOutstandingYear: 2024,
    unpaidCarers: 4700000,
    unpaidCarersYear: 2021,
    selfFunderCareHomePct: 37,
    selfFunderCareHomeYear: "2019-20",
    zeroHoursPct: 24,
  },
  series: {
    requestsForSupport: {
      sourceId: "nhs-digital-salt-cld",
      timeField: "year",
      data: requestsForSupport,
      methodologyBreaks: [
        {
          at: "2020-21",
          label: "COVID-19",
          description: "COVID-19 pandemic reduced new requests for support in 2020-21",
          severity: "minor",
        },
        {
          at: "2024-25",
          label: "SALT to CLD transition",
          description: "Data collection changed from SALT (aggregate) to CLD (client-level) from April 2024. Figures broadly comparable but methodology differs.",
          severity: "minor",
        },
      ],
    },
    longTermSupport: {
      sourceId: "nhs-digital-salt-cld",
      timeField: "year",
      data: longTermSupport,
    },
    spending: {
      sourceId: "dluhc-revenue-outturn",
      timeField: "year",
      data: spending,
    },
    workforce: {
      sourceId: "skills-for-care-2025",
      timeField: "year",
      data: workforce,
    },
    pay: {
      sourceId: "skills-for-care-pay-2025",
      timeField: "year",
      data: pay,
    },
    cqcRatings: {
      sourceId: "cqc-state-of-care-2024",
      timeField: "year",
      data: cqcRatings,
    },
    unpaidCarers: {
      sourceId: "ons-census-2021-unpaid-care",
      timeField: "category",
      data: unpaidCarers,
    },
    selfFunders: {
      sourceId: "nhs-digital-salt-cld",
      timeField: "setting",
      data: selfFunders,
    },
  },
};

const outPath = new URL("../public/data/adult-social-care.json", import.meta.url).pathname;
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${outPath}`);
