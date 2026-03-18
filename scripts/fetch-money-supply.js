/**
 * fetch-money-supply.js
 *
 * Curated UK money supply, inflation, and related data from official sources:
 *  - Bank of England Statistical Interactive Database (M4 broad money, APF holdings)
 *  - ONS Consumer Price Indices (CPI/CPIH annual rates, D7G7/L55O series)
 *  - ONS Average Weekly Earnings (KAB9 total pay, A2FC real pay)
 *  - OBR Public Finances Databank (public sector net debt, nominal and % GDP)
 *  - BIS Central Bank Total Assets dataset (international balance sheet comparison)
 *
 * Outputs: public/data/money-supply.json
 */
import { writeFileSync } from "fs";

// ── M4 money supply (£bn, end-Q4 each year, seasonally adjusted) ────────
// Source: Bank of England series LPMAUYN / ONS series AUYN
// https://www.bankofengland.co.uk/statistics/details/further-details-about-m4-data
// Values are end-December outstanding amounts in £bn, rounded to nearest bn
const m4Supply = [
  { year: 2000, m4: 867 },
  { year: 2001, m4: 925 },
  { year: 2002, m4: 985 },
  { year: 2003, m4: 1048 },
  { year: 2004, m4: 1132 },
  { year: 2005, m4: 1236 },
  { year: 2006, m4: 1399 },
  { year: 2007, m4: 1629 },
  { year: 2008, m4: 1810 },
  { year: 2009, m4: 2020 },
  { year: 2010, m4: 2099 },
  { year: 2011, m4: 2072 },
  { year: 2012, m4: 2050 },
  { year: 2013, m4: 2016 },
  { year: 2014, m4: 2063 },
  { year: 2015, m4: 2083 },
  { year: 2016, m4: 2167 },
  { year: 2017, m4: 2257 },
  { year: 2018, m4: 2345 },
  { year: 2019, m4: 2422 },
  { year: 2020, m4: 2741 },
  { year: 2021, m4: 2936 },
  { year: 2022, m4: 2988 },
  { year: 2023, m4: 3029 },
  { year: 2024, m4: 3139 },
  { year: 2025, m4: 3213 },
];

// ── M4 relative to nominal GDP ──────────────────────────────────────────
// GDP source: ONS series YBHA (nominal GDP at market prices, £bn)
// M4/GDP ratio calculated from end-year M4 and calendar-year nominal GDP
const nominalGdp = {
  2000: 1010, 2001: 1046, 2002: 1095, 2003: 1152, 2004: 1216,
  2005: 1285, 2006: 1368, 2007: 1449, 2008: 1473, 2009: 1413,
  2010: 1503, 2011: 1559, 2012: 1610, 2013: 1680, 2014: 1770,
  2015: 1847, 2016: 1919, 2017: 2002, 2018: 2068, 2019: 2121,
  2020: 1976, 2021: 2227, 2022: 2403, 2023: 2540, 2024: 2674,
  2025: 2780,
};

const m4ToGdp = m4Supply.map(d => ({
  year: d.year,
  m4: d.m4,
  gdp: nominalGdp[d.year],
  ratio: Math.round((d.m4 / nominalGdp[d.year]) * 1000) / 10,
}));

// ── Bank of England Asset Purchase Facility (APF) holdings ──────────────
// Source: Bank of England APF Quarterly Reports
// https://www.bankofengland.co.uk/asset-purchase-facility
// Gilt holdings at end of period (£bn). Key QE rounds marked.
const apfHoldings = [
  { year: 2009, quarter: "Q1", date: "2009-03", holdings: 0, note: "QE1 announced March 2009" },
  { year: 2009, quarter: "Q4", date: "2009-12", holdings: 198 },
  { year: 2010, quarter: "Q4", date: "2010-12", holdings: 200 },
  { year: 2011, quarter: "Q4", date: "2011-12", holdings: 275, note: "QE2 Oct 2011" },
  { year: 2012, quarter: "Q4", date: "2012-12", holdings: 375, note: "QE3 completed" },
  { year: 2013, quarter: "Q4", date: "2013-12", holdings: 375 },
  { year: 2014, quarter: "Q4", date: "2014-12", holdings: 375 },
  { year: 2015, quarter: "Q4", date: "2015-12", holdings: 375 },
  { year: 2016, quarter: "Q4", date: "2016-12", holdings: 435, note: "Post-Brexit vote Aug 2016" },
  { year: 2017, quarter: "Q4", date: "2017-12", holdings: 435 },
  { year: 2018, quarter: "Q4", date: "2018-12", holdings: 435 },
  { year: 2019, quarter: "Q4", date: "2019-12", holdings: 435 },
  { year: 2020, quarter: "Q2", date: "2020-06", holdings: 645, note: "COVID QE Mar 2020" },
  { year: 2020, quarter: "Q4", date: "2020-12", holdings: 875 },
  { year: 2021, quarter: "Q4", date: "2021-12", holdings: 875 },
  { year: 2022, quarter: "Q1", date: "2022-01", holdings: 895, note: "Peak holdings ~£895bn" },
  { year: 2022, quarter: "Q4", date: "2022-12", holdings: 838, note: "QT begins" },
  { year: 2023, quarter: "Q4", date: "2023-12", holdings: 722 },
  { year: 2024, quarter: "Q4", date: "2024-12", holdings: 588 },
  { year: 2025, quarter: "Q4", date: "2025-12", holdings: 488 },
];

// ── APF financial summary ───────────────────────────────────────────────
// Source: OBR fiscal impact of QE/QT box; Bank of England APF reports
// Cumulative cash flows between HMT and APF
const apfCashFlows = [
  { fy: "2012-13", netToHmt: 11.8 },
  { fy: "2013-14", netToHmt: 12.5 },
  { fy: "2014-15", netToHmt: 6.8 },
  { fy: "2015-16", netToHmt: 6.2 },
  { fy: "2016-17", netToHmt: 2.1 },
  { fy: "2017-18", netToHmt: 1.3 },
  { fy: "2018-19", netToHmt: 0.8 },
  { fy: "2019-20", netToHmt: 0.6 },
  { fy: "2020-21", netToHmt: 0.3 },
  { fy: "2021-22", netToHmt: 0.1 },
  { fy: "2022-23", netToHmt: -11.2 },
  { fy: "2023-24", netToHmt: -22.0 },
  { fy: "2024-25", netToHmt: -22.0 },
  { fy: "2025-26", netToHmt: -20.0, forecast: true },
];

// ── CPI annual average rate (%) ─────────────────────────────────────────
// Source: ONS series D7G7 (CPI annual rate, all items, 2015=100)
// https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g7/mm23
// Annual average rates
const cpiRate = [
  { year: 2000, cpi: 0.8 },
  { year: 2001, cpi: 1.2 },
  { year: 2002, cpi: 1.3 },
  { year: 2003, cpi: 1.4 },
  { year: 2004, cpi: 1.3 },
  { year: 2005, cpi: 2.1 },
  { year: 2006, cpi: 2.3 },
  { year: 2007, cpi: 2.3 },
  { year: 2008, cpi: 3.6 },
  { year: 2009, cpi: 2.2 },
  { year: 2010, cpi: 3.3 },
  { year: 2011, cpi: 4.5 },
  { year: 2012, cpi: 2.8 },
  { year: 2013, cpi: 2.6 },
  { year: 2014, cpi: 1.5 },
  { year: 2015, cpi: 0.0 },
  { year: 2016, cpi: 0.7 },
  { year: 2017, cpi: 2.7 },
  { year: 2018, cpi: 2.5 },
  { year: 2019, cpi: 1.8 },
  { year: 2020, cpi: 0.9 },
  { year: 2021, cpi: 2.6 },
  { year: 2022, cpi: 9.1 },
  { year: 2023, cpi: 7.3 },
  { year: 2024, cpi: 2.5 },
  { year: 2025, cpi: 3.2 },
];

// ── Real wage growth (nominal AWE total pay growth minus CPI) ───────────
// Source: ONS Average Weekly Earnings (KAB9 nominal growth, A2FC real growth)
// https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours
// Annual average growth rates (%)
const realWages = [
  { year: 2001, nominal: 4.5, cpi: 1.2, real: 3.3 },
  { year: 2002, nominal: 3.6, cpi: 1.3, real: 2.3 },
  { year: 2003, nominal: 3.4, cpi: 1.4, real: 2.0 },
  { year: 2004, nominal: 4.3, cpi: 1.3, real: 3.0 },
  { year: 2005, nominal: 4.1, cpi: 2.1, real: 2.0 },
  { year: 2006, nominal: 4.0, cpi: 2.3, real: 1.7 },
  { year: 2007, nominal: 3.9, cpi: 2.3, real: 1.6 },
  { year: 2008, nominal: 3.4, cpi: 3.6, real: -0.2 },
  { year: 2009, nominal: 0.8, cpi: 2.2, real: -1.4 },
  { year: 2010, nominal: 2.1, cpi: 3.3, real: -1.2 },
  { year: 2011, nominal: 1.6, cpi: 4.5, real: -2.9 },
  { year: 2012, nominal: 1.6, cpi: 2.8, real: -1.2 },
  { year: 2013, nominal: 1.0, cpi: 2.6, real: -1.6 },
  { year: 2014, nominal: 1.3, cpi: 1.5, real: -0.2 },
  { year: 2015, nominal: 2.5, cpi: 0.0, real: 2.5 },
  { year: 2016, nominal: 2.4, cpi: 0.7, real: 1.7 },
  { year: 2017, nominal: 2.6, cpi: 2.7, real: -0.1 },
  { year: 2018, nominal: 3.0, cpi: 2.5, real: 0.5 },
  { year: 2019, nominal: 3.5, cpi: 1.8, real: 1.7 },
  { year: 2020, nominal: 1.3, cpi: 0.9, real: 0.4 },
  { year: 2021, nominal: 5.8, cpi: 2.6, real: 3.2 },
  { year: 2022, nominal: 5.8, cpi: 9.1, real: -3.3 },
  { year: 2023, nominal: 6.7, cpi: 7.3, real: -0.6 },
  { year: 2024, nominal: 5.2, cpi: 2.5, real: 2.7 },
  { year: 2025, nominal: 4.2, cpi: 3.2, real: 1.0 },
];

// ── Purchasing power index (what £1 in 2000 buys, CPI-based) ────────────
// Calculated from CPI annual rates above
// Base: 2000 = 100
let ppIndex = 100;
const purchasingPower = [{ year: 2000, index: 100.0 }];
for (let i = 1; i < cpiRate.length; i++) {
  ppIndex = ppIndex / (1 + cpiRate[i].cpi / 100);
  purchasingPower.push({
    year: cpiRate[i].year,
    index: Math.round(ppIndex * 10) / 10,
  });
}

// ── Public sector net debt (nominal £bn and % GDP) ──────────────────────
// Source: ONS series HF6X (PSND ex public sector banks, % GDP)
// and OBR Public Finances Databank (nominal levels)
// https://obr.uk/forecasts-in-depth/brief-guides-and-explainers/public-finances/
const publicDebt = [
  { fy: "2000-01", nominal: 311, pctGdp: 30.7 },
  { fy: "2001-02", nominal: 314, pctGdp: 29.7 },
  { fy: "2002-03", nominal: 346, pctGdp: 31.1 },
  { fy: "2003-04", nominal: 381, pctGdp: 32.4 },
  { fy: "2004-05", nominal: 422, pctGdp: 34.0 },
  { fy: "2005-06", nominal: 462, pctGdp: 35.2 },
  { fy: "2006-07", nominal: 498, pctGdp: 35.5 },
  { fy: "2007-08", nominal: 527, pctGdp: 35.6 },
  { fy: "2008-09", nominal: 618, pctGdp: 41.0 },
  { fy: "2009-10", nominal: 760, pctGdp: 52.5 },
  { fy: "2010-11", nominal: 902, pctGdp: 58.8 },
  { fy: "2011-12", nominal: 1015, pctGdp: 63.7 },
  { fy: "2012-13", nominal: 1105, pctGdp: 67.1 },
  { fy: "2013-14", nominal: 1191, pctGdp: 69.3 },
  { fy: "2014-15", nominal: 1270, pctGdp: 70.2 },
  { fy: "2015-16", nominal: 1345, pctGdp: 71.5 },
  { fy: "2016-17", nominal: 1395, pctGdp: 71.3 },
  { fy: "2017-18", nominal: 1462, pctGdp: 71.7 },
  { fy: "2018-19", nominal: 1542, pctGdp: 73.2 },
  { fy: "2019-20", nominal: 1655, pctGdp: 76.5 },
  { fy: "2020-21", nominal: 2107, pctGdp: 101.8 },
  { fy: "2021-22", nominal: 2186, pctGdp: 94.5 },
  { fy: "2022-23", nominal: 2370, pctGdp: 96.1 },
  { fy: "2023-24", nominal: 2567, pctGdp: 97.5 },
  { fy: "2024-25", nominal: 2805, pctGdp: 97.2 },
];

// Calculate real debt (deflated by cumulative CPI from 2000-01 base)
// Using March-to-March CPI to match financial years
const cpiIndex = { "2000-01": 100 };
const fyToCpiYear = fy => parseInt(fy.split("-")[0]);
for (let i = 1; i < publicDebt.length; i++) {
  const prevFy = publicDebt[i - 1].fy;
  const cpiYear = fyToCpiYear(publicDebt[i].fy);
  const rate = cpiRate.find(c => c.year === cpiYear)?.cpi ?? 2.0;
  cpiIndex[publicDebt[i].fy] = cpiIndex[prevFy] * (1 + rate / 100);
}

const debtNominalVsReal = publicDebt.map(d => ({
  fy: d.fy,
  nominal: d.nominal,
  real: Math.round(d.nominal / (cpiIndex[d.fy] / 100)),
  pctGdp: d.pctGdp,
}));

// ── International central bank balance sheets (% of GDP) ────────────────
// Source: BIS Central Bank Total Assets dataset; FRED (St. Louis Fed)
// https://data.bis.org/topics/CBTA
// Peak and current (latest available) values
const intlBalanceSheets = [
  { bank: "Bank of Japan", country: "Japan", peak: 136.7, peakYear: 2023, current: 110.0, currentYear: 2025 },
  { bank: "ECB", country: "Eurozone", peak: 60.3, peakYear: 2022, current: 40.0, currentYear: 2025 },
  { bank: "Bank of England", country: "UK", peak: 44.3, peakYear: 2021, current: 27.0, currentYear: 2025 },
  { bank: "Federal Reserve", country: "US", peak: 34.8, peakYear: 2022, current: 22.0, currentYear: 2025 },
];

// Time series for balance sheet comparison (% of GDP, end-year)
const balanceSheetTimeSeries = [
  { year: 2007, boe: 5.3, fed: 6.4, ecb: 12.6, boj: 22.2 },
  { year: 2008, boe: 8.2, fed: 15.2, ecb: 16.3, boj: 22.6 },
  { year: 2009, boe: 14.0, fed: 15.5, ecb: 17.5, boj: 24.2 },
  { year: 2010, boe: 15.8, fed: 15.8, ecb: 18.9, boj: 26.1 },
  { year: 2011, boe: 19.8, fed: 18.6, ecb: 24.9, boj: 30.2 },
  { year: 2012, boe: 24.3, fed: 18.3, ecb: 26.0, boj: 32.8 },
  { year: 2013, boe: 23.6, fed: 22.2, ecb: 19.4, boj: 47.0 },
  { year: 2014, boe: 21.8, fed: 25.3, ecb: 18.3, boj: 60.4 },
  { year: 2015, boe: 21.1, fed: 24.5, ecb: 23.2, boj: 73.5 },
  { year: 2016, boe: 23.9, fed: 23.7, ecb: 30.5, boj: 89.0 },
  { year: 2017, boe: 22.6, fed: 22.5, ecb: 35.2, boj: 95.8 },
  { year: 2018, boe: 21.7, fed: 20.2, ecb: 34.9, boj: 100.2 },
  { year: 2019, boe: 21.4, fed: 18.9, ecb: 34.6, boj: 102.8 },
  { year: 2020, boe: 39.8, fed: 33.4, ecb: 50.8, boj: 127.1 },
  { year: 2021, boe: 44.3, fed: 34.8, ecb: 57.6, boj: 133.4 },
  { year: 2022, boe: 38.2, fed: 30.8, ecb: 60.3, boj: 136.7 },
  { year: 2023, boe: 33.5, fed: 27.0, ecb: 49.5, boj: 130.0 },
  { year: 2024, boe: 29.5, fed: 24.0, ecb: 43.0, boj: 118.0 },
  { year: 2025, boe: 27.0, fed: 22.0, ecb: 40.0, boj: 110.0 },
];

// ── Build v1 output ─────────────────────────────────────────────────────
const output = {
  $schema: "sob-dataset-v1",
  id: "money-supply",
  pillar: "state",
  topic: "spending",
  generated: new Date().toISOString().slice(0, 10),
  sources: [
    {
      id: "boe-m4",
      name: "Bank of England M4 Money Supply Statistics",
      url: "https://www.bankofengland.co.uk/statistics/details/further-details-about-m4-data",
      publisher: "Bank of England",
      note: "M4 broad money, seasonally adjusted end-period levels (LPMAUYN series)",
    },
    {
      id: "boe-apf",
      name: "Bank of England Asset Purchase Facility Quarterly Reports",
      url: "https://www.bankofengland.co.uk/asset-purchase-facility",
      publisher: "Bank of England",
      note: "APF gilt holdings and financial summaries",
    },
    {
      id: "ons-cpi",
      name: "ONS Consumer Price Indices",
      url: "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g7/mm23",
      publisher: "Office for National Statistics",
      note: "CPI annual rate, all items (D7G7 series)",
    },
    {
      id: "ons-awe",
      name: "ONS Average Weekly Earnings",
      url: "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours",
      publisher: "Office for National Statistics",
      note: "Total pay annual growth rates, nominal and real (CPI-adjusted)",
    },
    {
      id: "ons-gdp",
      name: "ONS Gross Domestic Product",
      url: "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ybha/ukea",
      publisher: "Office for National Statistics",
      note: "Nominal GDP at market prices, seasonally adjusted (YBHA series)",
    },
    {
      id: "obr-debt",
      name: "OBR Public Finances Databank",
      url: "https://obr.uk/forecasts-in-depth/brief-guides-and-explainers/public-finances/",
      publisher: "Office for Budget Responsibility",
      note: "Public sector net debt (ex public sector banks), nominal levels and % GDP",
    },
    {
      id: "bis-cbta",
      name: "BIS Central Bank Total Assets",
      url: "https://data.bis.org/topics/CBTA",
      publisher: "Bank for International Settlements",
      note: "Central bank balance sheet size as % of GDP, international comparison",
    },
  ],
  snapshot: {
    m4Latest: 3213,
    m4LatestYear: 2025,
    m4Growth2020: 32.6,
    m4GrowthPeriod: "2019-2021",
    cpiLatest: 3.2,
    cpiLatestYear: 2025,
    cpiPeak: 9.1,
    cpiPeakYear: 2022,
    purchasingPower: purchasingPower[purchasingPower.length - 1].index,
    purchasingPowerBase: 2000,
    apfPeak: 895,
    apfPeakYear: 2022,
    apfCurrent: 488,
    apfCurrentYear: 2025,
    apfLifetimeCost: 133.7,
    debtLatest: 2805,
    debtLatestYear: "2024-25",
    debtPctGdp: 97.2,
  },
  series: {
    m4ToGdp: {
      sourceId: "boe-m4",
      timeField: "year",
      data: m4ToGdp,
    },
    apfHoldings: {
      sourceId: "boe-apf",
      timeField: "date",
      data: apfHoldings,
    },
    apfCashFlows: {
      sourceId: "boe-apf",
      timeField: "fy",
      data: apfCashFlows,
    },
    cpiRate: {
      sourceId: "ons-cpi",
      timeField: "year",
      data: cpiRate,
    },
    realWages: {
      sourceId: "ons-awe",
      timeField: "year",
      data: realWages,
    },
    purchasingPower: {
      sourceId: "ons-cpi",
      timeField: "year",
      data: purchasingPower,
    },
    debtNominalVsReal: {
      sourceId: "obr-debt",
      timeField: "fy",
      data: debtNominalVsReal,
    },
    balanceSheets: {
      sourceId: "bis-cbta",
      timeField: "year",
      data: balanceSheetTimeSeries,
    },
  },
};

const outPath = new URL("../public/data/money-supply.json", import.meta.url).pathname;
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${outPath}`);
