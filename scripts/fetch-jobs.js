/**
 * fetch-jobs.js
 *
 * UK employment, occupation, and earnings data from official sources:
 *  - ONS Labour Force Survey / Annual Population Survey (employment trends)
 *  - ONS Business Register and Employment Survey (employment by industry)
 *  - ONS Annual Survey of Hours and Earnings (earnings by occupation/industry)
 *  - Nomis API for BRES industry data (NM_189_1)
 *
 * Outputs: public/data/jobs.json
 */
import { writeFileSync } from "fs";

const NOMIS_BRES = "https://www.nomisweb.co.uk/api/v01/dataset/NM_189_1.jsonstat.json";

async function fetchBRES() {
  // Employment by SIC industry section, UK, latest year
  const url = `${NOMIS_BRES}?geography=2092957699&industry=150994945...150994965&measures=20100&time=latest`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    return json;
  } catch (e) {
    console.warn("BRES fetch failed, using curated data:", e.message);
    return null;
  }
}

function parseBRES(json) {
  if (!json?.value) return null;
  const labels = json.dimension?.industry?.category?.label;
  const indices = json.dimension?.industry?.category?.index;
  if (!labels || !indices) return null;

  const results = [];
  for (const [code, label] of Object.entries(labels)) {
    const idx = indices[code];
    const value = json.value[idx];
    if (value != null) {
      results.push({ sic: code, label, employeesK: Math.round(value / 1000) });
    }
  }
  return results.sort((a, b) => b.employeesK - a.employeesK);
}

// ── Headline trends: UK employment/unemployment/inactivity rate ─────
// Source: ONS Labour Market Statistics (LMS), series LF24 (emp rate),
// MGSX (unemp rate), LF2S (inactivity rate). Three-month averages.
// https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/summaryoflabourmarketstatistics
const headlineTrend = [
  { year: 1992, empRate: 68.2, unempRate: 9.8, inactRate: 24.4 },
  { year: 1993, empRate: 68.0, unempRate: 10.3, inactRate: 24.2 },
  { year: 1994, empRate: 68.5, unempRate: 9.3, inactRate: 24.4 },
  { year: 1995, empRate: 69.2, unempRate: 8.5, inactRate: 24.5 },
  { year: 1996, empRate: 69.8, unempRate: 8.1, inactRate: 24.0 },
  { year: 1997, empRate: 70.8, unempRate: 7.0, inactRate: 23.8 },
  { year: 1998, empRate: 71.3, unempRate: 6.2, inactRate: 24.0 },
  { year: 1999, empRate: 71.7, unempRate: 5.9, inactRate: 23.7 },
  { year: 2000, empRate: 72.4, unempRate: 5.4, inactRate: 23.5 },
  { year: 2001, empRate: 72.5, unempRate: 5.0, inactRate: 23.6 },
  { year: 2002, empRate: 72.5, unempRate: 5.1, inactRate: 23.5 },
  { year: 2003, empRate: 72.6, unempRate: 5.0, inactRate: 23.6 },
  { year: 2004, empRate: 72.7, unempRate: 4.7, inactRate: 23.7 },
  { year: 2005, empRate: 72.6, unempRate: 4.8, inactRate: 23.7 },
  { year: 2006, empRate: 72.5, unempRate: 5.4, inactRate: 23.4 },
  { year: 2007, empRate: 72.5, unempRate: 5.3, inactRate: 23.5 },
  { year: 2008, empRate: 72.5, unempRate: 5.6, inactRate: 23.2 },
  { year: 2009, empRate: 70.9, unempRate: 7.6, inactRate: 23.3 },
  { year: 2010, empRate: 70.4, unempRate: 7.9, inactRate: 23.6 },
  { year: 2011, empRate: 70.3, unempRate: 8.1, inactRate: 23.5 },
  { year: 2012, empRate: 71.0, unempRate: 7.9, inactRate: 22.9 },
  { year: 2013, empRate: 71.5, unempRate: 7.6, inactRate: 22.6 },
  { year: 2014, empRate: 72.7, unempRate: 6.1, inactRate: 22.5 },
  { year: 2015, empRate: 73.5, unempRate: 5.3, inactRate: 22.3 },
  { year: 2016, empRate: 74.0, unempRate: 4.8, inactRate: 22.2 },
  { year: 2017, empRate: 74.6, unempRate: 4.4, inactRate: 22.0 },
  { year: 2018, empRate: 75.0, unempRate: 4.0, inactRate: 21.8 },
  { year: 2019, empRate: 75.8, unempRate: 3.8, inactRate: 21.2 },
  { year: 2020, empRate: 74.8, unempRate: 4.5, inactRate: 21.7 },
  { year: 2021, empRate: 74.7, unempRate: 4.5, inactRate: 21.8 },
  { year: 2022, empRate: 75.5, unempRate: 3.7, inactRate: 21.6 },
  { year: 2023, empRate: 75.7, unempRate: 4.0, inactRate: 21.2 },
  { year: 2024, empRate: 74.9, unempRate: 4.4, inactRate: 21.7 },
  { year: 2025, empRate: 75.1, unempRate: 4.4, inactRate: 21.5 },
];

// ── Employment by industry (SIC 2007 sections) ─────────────────────
// Source: ONS BRES via Nomis (NM_189_1), England, 2024
// https://www.nomisweb.co.uk/datasets/newbres6pub
// Fallback curated from published BRES 2024 provisional data
const bySectorFallback = [
  { sic: "G", label: "Wholesale & retail trade", employeesK: 3885 },
  { sic: "Q", label: "Human health & social work", employeesK: 3834 },
  { sic: "M", label: "Professional, scientific & technical", employeesK: 2747 },
  { sic: "N", label: "Administrative & support services", employeesK: 2474 },
  { sic: "P", label: "Education", employeesK: 2373 },
  { sic: "I", label: "Accommodation & food services", employeesK: 2171 },
  { sic: "C", label: "Manufacturing", employeesK: 1989 },
  { sic: "F", label: "Construction", employeesK: 1556 },
  { sic: "O", label: "Public administration & defence", employeesK: 1379 },
  { sic: "J", label: "Information & communication", employeesK: 1376 },
  { sic: "H", label: "Transport & storage", employeesK: 1307 },
  { sic: "K", label: "Financial & insurance", employeesK: 1027 },
  { sic: "S", label: "Other service activities", employeesK: 622 },
  { sic: "L", label: "Real estate", employeesK: 534 },
  { sic: "R", label: "Arts, entertainment & recreation", employeesK: 521 },
  { sic: "E", label: "Water supply & waste management", employeesK: 202 },
  { sic: "D", label: "Electricity, gas & air conditioning", employeesK: 136 },
  { sic: "A", label: "Agriculture, forestry & fishing", employeesK: 115 },
  { sic: "B", label: "Mining & quarrying", employeesK: 42 },
];

// ── Sector change over time (selected major sectors) ────────────────
// Source: ONS Workforce Jobs (JOBS02), UK, seasonally adjusted, thousands
// https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/workforcejobsbyindustryjobs02
const sectorTrend = [
  { year: 1996, manufacturing: 4274, construction: 1804, retail: 4546, health: 2815, finance: 1026, ict: 684, hospitality: 1604, profServices: 1832 },
  { year: 2000, manufacturing: 4034, construction: 1884, retail: 4738, health: 3048, finance: 1081, ict: 866, hospitality: 1745, profServices: 2188 },
  { year: 2004, manufacturing: 3410, construction: 2118, retail: 4828, health: 3424, finance: 1078, ict: 782, hospitality: 1855, profServices: 2323 },
  { year: 2008, manufacturing: 3023, construction: 2350, retail: 4787, health: 3778, finance: 1124, ict: 844, hospitality: 1949, profServices: 2628 },
  { year: 2010, manufacturing: 2646, construction: 2061, retail: 4682, health: 3984, finance: 1093, ict: 826, hospitality: 1924, profServices: 2618 },
  { year: 2012, manufacturing: 2579, construction: 2024, retail: 4783, health: 4126, finance: 1080, ict: 859, hospitality: 1997, profServices: 2748 },
  { year: 2014, manufacturing: 2588, construction: 2115, retail: 4903, health: 4228, finance: 1076, ict: 952, hospitality: 2102, profServices: 2931 },
  { year: 2016, manufacturing: 2565, construction: 2268, retail: 4935, health: 4384, finance: 1102, ict: 1070, hospitality: 2194, profServices: 3051 },
  { year: 2018, manufacturing: 2559, construction: 2337, retail: 4851, health: 4440, finance: 1114, ict: 1161, hospitality: 2239, profServices: 3182 },
  { year: 2020, manufacturing: 2406, construction: 2198, retail: 4602, health: 4519, finance: 1089, ict: 1216, hospitality: 1664, profServices: 3134 },
  { year: 2022, manufacturing: 2438, construction: 2267, retail: 4638, health: 4704, finance: 1117, ict: 1375, hospitality: 2179, profServices: 3394 },
  { year: 2024, manufacturing: 2369, construction: 2224, retail: 4581, health: 4771, finance: 1104, ict: 1402, hospitality: 2183, profServices: 3462 },
];

// ── Employment by occupation (SOC 2020 major groups) ────────────────
// Source: ONS Annual Population Survey via Nomis, UK, Oct 2024 – Sep 2025
// https://www.nomisweb.co.uk/datasets/apsnew
const byOccupation = [
  { soc: 1, label: "Managers, directors & senior officials", employedK: 3160, pctTotal: 10.2 },
  { soc: 2, label: "Professional occupations", employedK: 8420, pctTotal: 27.2 },
  { soc: 3, label: "Associate professional & technical", employedK: 4650, pctTotal: 15.0 },
  { soc: 4, label: "Administrative & secretarial", employedK: 2850, pctTotal: 9.2 },
  { soc: 5, label: "Skilled trades", employedK: 2580, pctTotal: 8.3 },
  { soc: 6, label: "Caring, leisure & other services", employedK: 2640, pctTotal: 8.5 },
  { soc: 7, label: "Sales & customer service", employedK: 1740, pctTotal: 5.6 },
  { soc: 8, label: "Process, plant & machine operatives", employedK: 1730, pctTotal: 5.6 },
  { soc: 9, label: "Elementary occupations", employedK: 2740, pctTotal: 8.8 },
];

// ── Median annual earnings by occupation (full-time, gross) ─────────
// Source: ASHE Table 2, provisional 2025 data (survey date April 2025)
// https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/occupation2digitsocashetable2
const earningsByOccupation = [
  { soc: 1, label: "Managers, directors & senior officials", medianAnnual: 54398, p10: 25272, p25: 35286, p75: 78715, p90: 109851 },
  { soc: 2, label: "Professional occupations", medianAnnual: 47966, p10: 27154, p25: 35384, p75: 63428, p90: 84760 },
  { soc: 3, label: "Associate professional & technical", medianAnnual: 39100, p10: 22108, p25: 29750, p75: 52230, p90: 69840 },
  { soc: 4, label: "Administrative & secretarial", medianAnnual: 27183, p10: 17582, p25: 22040, p75: 33780, p90: 41570 },
  { soc: 5, label: "Skilled trades", medianAnnual: 34012, p10: 21036, p25: 26676, p75: 42510, p90: 52100 },
  { soc: 6, label: "Caring, leisure & other services", medianAnnual: 24690, p10: 14318, p25: 19710, p75: 30210, p90: 36130 },
  { soc: 7, label: "Sales & customer service", medianAnnual: 23868, p10: 15192, p25: 19190, p75: 29970, p90: 37150 },
  { soc: 8, label: "Process, plant & machine operatives", medianAnnual: 30368, p10: 20408, p25: 25092, p75: 37410, p90: 44740 },
  { soc: 9, label: "Elementary occupations", medianAnnual: 23434, p10: 15014, p25: 19010, p75: 28260, p90: 33010 },
];

// ── Median annual earnings by industry (full-time, gross) ───────────
// Source: ASHE Table 4, provisional 2025 data (survey date April 2025)
const earningsBySector = [
  { sic: "B", label: "Mining & quarrying", medianAnnual: 48310 },
  { sic: "K", label: "Financial & insurance", medianAnnual: 47250 },
  { sic: "J", label: "Information & communication", medianAnnual: 46580 },
  { sic: "D", label: "Electricity, gas & air conditioning", medianAnnual: 45890 },
  { sic: "M", label: "Professional, scientific & technical", medianAnnual: 42300 },
  { sic: "O", label: "Public administration & defence", medianAnnual: 38140 },
  { sic: "E", label: "Water supply & waste management", medianAnnual: 37260 },
  { sic: "F", label: "Construction", medianAnnual: 36880 },
  { sic: "H", label: "Transport & storage", medianAnnual: 35920 },
  { sic: "C", label: "Manufacturing", medianAnnual: 35490 },
  { sic: "P", label: "Education", medianAnnual: 34870 },
  { sic: "Q", label: "Human health & social work", medianAnnual: 33720 },
  { sic: "L", label: "Real estate", medianAnnual: 33150 },
  { sic: "G", label: "Wholesale & retail trade", medianAnnual: 28360 },
  { sic: "N", label: "Administrative & support services", medianAnnual: 27410 },
  { sic: "A", label: "Agriculture, forestry & fishing", medianAnnual: 26780 },
  { sic: "S", label: "Other service activities", medianAnnual: 26470 },
  { sic: "R", label: "Arts, entertainment & recreation", medianAnnual: 26350 },
  { sic: "I", label: "Accommodation & food services", medianAnnual: 22980 },
];

// ── Median earnings trend (full-time, annual gross) ─────────────────
// Source: ASHE Table 1.1a, UK, all employees (full-time)
// https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/allemployeesashetable1
const earningsTrend = [
  { year: 1997, median: 17636, medianMale: 20216, medianFemale: 13948 },
  { year: 1999, median: 18880, medianMale: 21486, medianFemale: 15210 },
  { year: 2001, median: 20456, medianMale: 23276, medianFemale: 16524 },
  { year: 2003, median: 21866, medianMale: 24880, medianFemale: 17620 },
  { year: 2005, median: 23230, medianMale: 26376, medianFemale: 18934 },
  { year: 2007, median: 24932, medianMale: 28250, medianFemale: 20484 },
  { year: 2008, median: 25844, medianMale: 29214, medianFemale: 21308 },
  { year: 2009, median: 26040, medianMale: 29398, medianFemale: 21596 },
  { year: 2010, median: 26364, medianMale: 29616, medianFemale: 21832 },
  { year: 2011, median: 26536, medianMale: 29726, medianFemale: 22054 },
  { year: 2012, median: 26884, medianMale: 30092, medianFemale: 22412 },
  { year: 2013, median: 27156, medianMale: 30456, medianFemale: 22568 },
  { year: 2014, median: 27196, medianMale: 30300, medianFemale: 22828 },
  { year: 2015, median: 27656, medianMale: 30810, medianFemale: 23278 },
  { year: 2016, median: 28200, medianMale: 31368, medianFemale: 23768 },
  { year: 2017, median: 28760, medianMale: 31766, medianFemale: 24392 },
  { year: 2018, median: 29574, medianMale: 32578, medianFemale: 25266 },
  { year: 2019, median: 30420, medianMale: 33508, medianFemale: 26028 },
  { year: 2020, median: 31490, medianMale: 34370, medianFemale: 27144 },
  { year: 2021, median: 31772, medianMale: 34596, medianFemale: 27594 },
  { year: 2022, median: 33402, medianMale: 36354, medianFemale: 29118 },
  { year: 2023, median: 35048, medianMale: 37892, medianFemale: 30820 },
  { year: 2024, median: 37430, medianMale: 40268, medianFemale: 33102 },
  { year: 2025, median: 39866, medianMale: 42758, medianFemale: 35380 },
];

// ── Gender pay gap trend ────────────────────────────────────────────
// Source: ASHE Table 8.9a, median gender pay gap (%), full-time employees
const genderPayGap = [
  { year: 1997, gap: 17.4 },
  { year: 1999, gap: 16.4 },
  { year: 2001, gap: 15.4 },
  { year: 2003, gap: 14.4 },
  { year: 2005, gap: 13.1 },
  { year: 2007, gap: 12.5 },
  { year: 2009, gap: 12.2 },
  { year: 2011, gap: 10.5 },
  { year: 2013, gap: 10.0 },
  { year: 2015, gap: 9.4 },
  { year: 2016, gap: 9.4 },
  { year: 2017, gap: 9.1 },
  { year: 2018, gap: 8.6 },
  { year: 2019, gap: 7.0 },
  { year: 2020, gap: 7.0 },
  { year: 2021, gap: 7.7 },
  { year: 2022, gap: 8.3 },
  { year: 2023, gap: 7.7 },
  { year: 2024, gap: 7.0 },
  { year: 2025, gap: 6.8 },
];

// ── Self-employment and employment type ─────────────────────────────
// Source: ONS Labour Force Survey, UK
const employmentType = [
  { year: 2000, employees: 24970, selfEmployed: 3266, unpaidFamily: 110 },
  { year: 2005, employees: 25610, selfEmployed: 3794, unpaidFamily: 101 },
  { year: 2010, employees: 25363, selfEmployed: 4106, unpaidFamily: 99 },
  { year: 2015, employees: 26778, selfEmployed: 4656, unpaidFamily: 108 },
  { year: 2018, employees: 27657, selfEmployed: 4810, unpaidFamily: 113 },
  { year: 2019, employees: 27894, selfEmployed: 4935, unpaidFamily: 116 },
  { year: 2020, employees: 27511, selfEmployed: 4395, unpaidFamily: 92 },
  { year: 2021, employees: 27722, selfEmployed: 4261, unpaidFamily: 87 },
  { year: 2022, employees: 28054, selfEmployed: 4257, unpaidFamily: 90 },
  { year: 2023, employees: 28278, selfEmployed: 4290, unpaidFamily: 85 },
  { year: 2024, employees: 28350, selfEmployed: 4150, unpaidFamily: 82 },
  { year: 2025, employees: 28410, selfEmployed: 4095, unpaidFamily: 78 },
];

async function main() {
  // Try live BRES fetch
  let sectorData;
  const bres = await fetchBRES();
  const parsed = parseBRES(bres);
  if (parsed && parsed.length > 0) {
    console.log(`Fetched ${parsed.length} sectors from Nomis BRES`);
    sectorData = parsed;
  } else {
    console.log("Using curated BRES fallback data");
    sectorData = bySectorFallback;
  }

  const totalEmployedK = sectorData.reduce((s, d) => s + d.employeesK, 0);

  const dataset = {
    "$schema": "sob-dataset-v1",
    id: "jobs",
    pillar: "growth",
    topic: "jobs",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ons-lfs",
        name: "ONS Labour Force Survey / Labour Market Statistics",
        url: "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/summaryoflabourmarketstatistics",
        publisher: "ONS",
      },
      {
        id: "ons-bres",
        name: "ONS Business Register and Employment Survey (BRES) via Nomis",
        url: "https://www.nomisweb.co.uk/datasets/newbres6pub",
        publisher: "ONS / Nomis",
      },
      {
        id: "ons-ashe",
        name: "ONS Annual Survey of Hours and Earnings (ASHE)",
        url: "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/bulletins/annualsurveyofhoursandearnings/latest",
        publisher: "ONS",
      },
    ],
    snapshot: {
      totalEmployedM: 33.1,
      employmentRate: 75.1,
      unemploymentRate: 4.4,
      economicInactivityRate: 21.5,
      unemployedK: 1540,
      vacanciesK: 818,
      medianAnnualPayFT: 39866,
      genderPayGapPct: 6.8,
      selfEmployedK: 4095,
      latestPeriod: "Nov 2024 – Jan 2025",
    },
    series: {
      headlineTrend: {
        sourceId: "ons-lfs",
        timeField: "year",
        description: "UK employment rate (16-64), unemployment rate, and economic inactivity rate, annual averages from Labour Force Survey",
        unit: "percent",
        data: headlineTrend,
      },
      bySector: {
        sourceId: "ons-bres",
        timeField: null,
        description: "Employment by SIC 2007 industry section, England, 2024 (BRES provisional)",
        unit: "thousands",
        data: sectorData.map(d => ({
          ...d,
          pctTotal: Math.round(d.employeesK / totalEmployedK * 1000) / 10,
        })),
      },
      sectorTrend: {
        sourceId: "ons-lfs",
        timeField: "year",
        description: "Workforce jobs in selected major industries, UK, seasonally adjusted, thousands. From ONS JOBS02.",
        unit: "thousands",
        data: sectorTrend,
      },
      byOccupation: {
        sourceId: "ons-lfs",
        timeField: null,
        description: "Employment by SOC 2020 major occupation group, UK, Oct 2024 – Sep 2025, from Annual Population Survey",
        unit: "thousands / percent",
        data: byOccupation,
      },
      earningsByOccupation: {
        sourceId: "ons-ashe",
        timeField: null,
        description: "Median annual gross pay (full-time employees) by SOC 2020 major group, UK, provisional April 2025, from ASHE Table 2",
        unit: "GBP",
        data: earningsByOccupation,
      },
      earningsBySector: {
        sourceId: "ons-ashe",
        timeField: null,
        description: "Median annual gross pay (full-time employees) by SIC 2007 section, UK, provisional April 2025, from ASHE Table 4",
        unit: "GBP",
        data: earningsBySector,
      },
      earningsTrend: {
        sourceId: "ons-ashe",
        timeField: "year",
        description: "Median annual gross pay (full-time employees), UK, by sex, from ASHE Table 1",
        unit: "GBP",
        data: earningsTrend,
      },
      genderPayGap: {
        sourceId: "ons-ashe",
        timeField: "year",
        description: "Median gender pay gap (%), full-time employees, UK, from ASHE Table 8.9a",
        unit: "percent",
        data: genderPayGap,
      },
      employmentType: {
        sourceId: "ons-lfs",
        timeField: "year",
        description: "Employment by type (employees, self-employed, unpaid family workers), UK, thousands, from Labour Force Survey",
        unit: "thousands",
        data: employmentType,
      },
    },
  };

  const outPath = "public/data/jobs.json";
  writeFileSync(outPath, JSON.stringify(dataset, null, 2) + "\n");
  console.log(`Wrote ${outPath}`);
}

main().catch(console.error);
