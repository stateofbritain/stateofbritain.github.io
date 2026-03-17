/**
 * fetch-housing-stock.js
 *
 * UK housing stock data from official sources:
 *  - EHS: Housing stock by period built
 *  - EHS: Dwelling type breakdown
 *  - EHS/DLUHC: Tenure split over time
 *  - EHS: EPC ratings by dwelling age
 *
 * Outputs: public/data/housing-stock.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";

// ── Housing stock by period built, England ────────────────────────────
// Source: English Housing Survey (EHS), DLUHC — dwelling age
const stockByAge = [
  { period: "Pre-1919",   pct: 20.2, dwellingsK: 4950 },
  { period: "1919–1944",  pct: 15.3, dwellingsK: 3750 },
  { period: "1945–1964",  pct: 18.4, dwellingsK: 4510 },
  { period: "1965–1980",  pct: 18.7, dwellingsK: 4580 },
  { period: "1981–1990",  pct: 8.6,  dwellingsK: 2110 },
  { period: "1991–2002",  pct: 9.4,  dwellingsK: 2300 },
  { period: "Post-2002",  pct: 9.4,  dwellingsK: 2310 },
];

// ── Dwelling type breakdown, England ──────────────────────────────────
// Source: English Housing Survey — dwelling type
const stockByType = [
  { type: "Semi-detached",       pct: 25.7 },
  { type: "Terraced",            pct: 24.8 },
  { type: "Detached",            pct: 17.0 },
  { type: "Purpose-built flat",  pct: 17.3 },
  { type: "Converted flat",      pct: 4.3 },
  { type: "Bungalow",            pct: 8.8 },
  { type: "Other",               pct: 2.1 },
];

// ── Tenure split over time, England ───────────────────────────────────
// Source: EHS/DLUHC — tenure trend (%)
const tenureTrend = [
  { year: "1980", ownerOccupied: 57.5, privateRented: 10.6, socialRented: 31.9 },
  { year: "1985", ownerOccupied: 62.4, privateRented: 8.6,  socialRented: 29.0 },
  { year: "1990", ownerOccupied: 65.9, privateRented: 9.1,  socialRented: 25.0 },
  { year: "1995", ownerOccupied: 67.1, privateRented: 10.0, socialRented: 22.9 },
  { year: "2000", ownerOccupied: 69.3, privateRented: 10.1, socialRented: 20.6 },
  { year: "2003-04", ownerOccupied: 70.5, privateRented: 11.0, socialRented: 18.5 },
  { year: "2004-05", ownerOccupied: 70.1, privateRented: 11.3, socialRented: 18.6 },
  { year: "2005-06", ownerOccupied: 69.7, privateRented: 11.9, socialRented: 18.4 },
  { year: "2006-07", ownerOccupied: 69.1, privateRented: 12.4, socialRented: 18.5 },
  { year: "2007-08", ownerOccupied: 68.2, privateRented: 13.2, socialRented: 18.6 },
  { year: "2008-09", ownerOccupied: 67.4, privateRented: 14.2, socialRented: 18.4 },
  { year: "2009-10", ownerOccupied: 66.8, privateRented: 15.1, socialRented: 18.1 },
  { year: "2010-11", ownerOccupied: 66.0, privateRented: 16.3, socialRented: 17.7 },
  { year: "2011-12", ownerOccupied: 65.3, privateRented: 17.4, socialRented: 17.3 },
  { year: "2012-13", ownerOccupied: 64.6, privateRented: 18.2, socialRented: 17.2 },
  { year: "2013-14", ownerOccupied: 63.3, privateRented: 19.4, socialRented: 17.3 },
  { year: "2014-15", ownerOccupied: 63.5, privateRented: 19.4, socialRented: 17.1 },
  { year: "2015-16", ownerOccupied: 63.0, privateRented: 19.9, socialRented: 17.1 },
  { year: "2016-17", ownerOccupied: 63.0, privateRented: 19.9, socialRented: 17.1 },
  { year: "2017-18", ownerOccupied: 63.5, privateRented: 19.5, socialRented: 17.0 },
  { year: "2018-19", ownerOccupied: 64.1, privateRented: 19.0, socialRented: 16.9 },
  { year: "2019-20", ownerOccupied: 64.6, privateRented: 18.6, socialRented: 16.8 },
  { year: "2020-21", ownerOccupied: 65.2, privateRented: 18.1, socialRented: 16.7 },
  { year: "2021-22", ownerOccupied: 64.7, privateRented: 18.4, socialRented: 16.9 },
  { year: "2022-23", ownerOccupied: 64.9, privateRented: 18.4, socialRented: 16.7 },
  { year: "2023-24", ownerOccupied: 64.5, privateRented: 18.9, socialRented: 16.6 },
];

// ── EPC ratings by dwelling age, England ──────────────────────────────
// Source: EHS — energy performance by dwelling age (%)
const epcByAge = [
  { period: "Pre-1919",   a_b: 2,  c: 17, d: 36, e_below: 45 },
  { period: "1919–1944",  a_b: 3,  c: 24, d: 41, e_below: 32 },
  { period: "1945–1964",  a_b: 4,  c: 33, d: 39, e_below: 24 },
  { period: "1965–1980",  a_b: 7,  c: 44, d: 35, e_below: 14 },
  { period: "1981–1990",  a_b: 12, c: 52, d: 27, e_below: 9 },
  { period: "1991–2002",  a_b: 22, c: 55, d: 18, e_below: 5 },
  { period: "Post-2002",  a_b: 55, c: 37, d: 6,  e_below: 2 },
];

// ── Snapshot ───────────────────────────────────────────────────────────
const latestTenure = tenureTrend[tenureTrend.length - 1];
const totalStockK = stockByAge.reduce((s, d) => s + d.dwellingsK, 0);

const snapshot = {
  totalStock: Math.round(totalStockK / 100) / 10,
  totalStockUnit: "m",
  pre1919Pct: stockByAge[0].pct,
  privateRentedPct: latestTenure.privateRented,
  privateRentedPctYear: latestTenure.year,
  socialRentedPct: latestTenure.socialRented,
  ownerOccupiedPct: latestTenure.ownerOccupied,
};

// ── Output (sob-dataset-v1) ───────────────────────────────────────────
const output = {
  $schema: "sob-dataset-v1",
  id: "housing-stock",
  pillar: "foundations",
  topic: "housing",
  generated: new Date().toISOString().slice(0, 10),
  sources: [
    {
      id: "ehs",
      name: "English Housing Survey",
      url: "https://www.gov.uk/government/collections/english-housing-survey",
      publisher: "DLUHC",
      note: "Dwelling age, type, tenure, and EPC data from latest available EHS report",
    },
    {
      id: "dluhc-tenure",
      name: "DLUHC Tenure Trends (Table FA1201)",
      url: "https://www.gov.uk/government/statistical-data-sets/live-tables-on-dwelling-stock-including-vacants",
      publisher: "DLUHC",
    },
  ],
  snapshot,
  series: {
    stockByAge: {
      sourceId: "ehs",
      timeField: "period",
      data: stockByAge,
    },
    stockByType: {
      sourceId: "ehs",
      timeField: "type",
      data: stockByType,
    },
    tenureTrend: {
      sourceId: "dluhc-tenure",
      timeField: "year",
      data: tenureTrend,
    },
    epcByAge: {
      sourceId: "ehs",
      timeField: "period",
      data: epcByAge,
    },
  },
};

writeFileSync("public/data/housing-stock.json", JSON.stringify(output, null, 2));
console.log(
  `  housing-stock.json written (${stockByAge.length} age bands, ` +
  `${stockByType.length} types, ${tenureTrend.length} tenure trend, ` +
  `${epcByAge.length} EPC by age)`
);
