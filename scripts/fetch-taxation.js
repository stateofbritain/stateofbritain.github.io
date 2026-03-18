/**
 * fetch-taxation.js
 *
 * Curated UK taxation data from official sources:
 *  - HMRC Tax Receipts and National Insurance Contributions (annual bulletin)
 *  - OBR Public Finances Databank (tax burden as % GDP)
 *  - HMRC Measuring Tax Gaps (2025 edition, estimates for 2023-24)
 *  - HMRC Income Tax Liabilities Statistics (Table 2.4, percentile shares)
 *  - HMRC/OECD corporation tax rate history and international comparison
 *  - HMRC Rates and Allowances (personal allowance and thresholds)
 *  - OECD Revenue Statistics 2025 (tax-to-GDP international comparison)
 *
 * Outputs: public/data/taxation.json
 */
import { writeFileSync } from "fs";

// ── Tax receipts by type (£bn, financial year) ─────────────────────────
// Source: HMRC Tax Receipts and NICs for the UK (annual bulletin)
// https://www.gov.uk/government/statistics/hmrc-tax-and-nics-receipts-for-the-uk
const receiptsByType = [
  { fy: "2000-01", incomeTax: 108.2, nics: 60.8, vat: 58.5, corpTax: 32.4, councilTax: 14.3, businessRates: 15.8, fuelDuty: 22.0, stampDuty: 6.4 },
  { fy: "2001-02", incomeTax: 109.2, nics: 62.8, vat: 61.0, corpTax: 32.0, councilTax: 15.4, businessRates: 16.4, fuelDuty: 21.9, stampDuty: 6.5 },
  { fy: "2002-03", incomeTax: 111.1, nics: 66.4, vat: 63.3, corpTax: 29.3, councilTax: 17.0, businessRates: 17.4, fuelDuty: 22.1, stampDuty: 7.0 },
  { fy: "2003-04", incomeTax: 117.3, nics: 73.4, vat: 68.5, corpTax: 28.6, councilTax: 18.6, businessRates: 17.8, fuelDuty: 22.5, stampDuty: 7.7 },
  { fy: "2004-05", incomeTax: 125.0, nics: 78.2, vat: 72.9, corpTax: 34.1, councilTax: 20.0, businessRates: 18.5, fuelDuty: 23.2, stampDuty: 9.5 },
  { fy: "2005-06", incomeTax: 131.7, nics: 82.7, vat: 72.9, corpTax: 44.3, councilTax: 21.4, businessRates: 19.1, fuelDuty: 23.5, stampDuty: 10.4 },
  { fy: "2006-07", incomeTax: 141.5, nics: 87.3, vat: 77.4, corpTax: 44.3, councilTax: 22.3, businessRates: 19.9, fuelDuty: 23.6, stampDuty: 13.2 },
  { fy: "2007-08", incomeTax: 152.5, nics: 96.7, vat: 80.6, corpTax: 46.3, councilTax: 23.3, businessRates: 20.8, fuelDuty: 24.9, stampDuty: 14.0 },
  { fy: "2008-09", incomeTax: 147.3, nics: 97.7, vat: 78.4, corpTax: 43.0, councilTax: 24.2, businessRates: 21.4, fuelDuty: 24.6, stampDuty: 8.2 },
  { fy: "2009-10", incomeTax: 141.8, nics: 96.2, vat: 70.0, corpTax: 35.8, councilTax: 25.0, businessRates: 22.0, fuelDuty: 26.2, stampDuty: 7.5 },
  { fy: "2010-11", incomeTax: 150.9, nics: 99.4, vat: 82.4, corpTax: 42.6, councilTax: 25.5, businessRates: 22.7, fuelDuty: 27.3, stampDuty: 8.7 },
  { fy: "2011-12", incomeTax: 151.7, nics: 101.9, vat: 98.3, corpTax: 43.0, councilTax: 25.8, businessRates: 23.5, fuelDuty: 26.8, stampDuty: 8.9 },
  { fy: "2012-13", incomeTax: 151.0, nics: 104.2, vat: 100.7, corpTax: 40.3, councilTax: 26.2, businessRates: 24.9, fuelDuty: 26.6, stampDuty: 9.3 },
  { fy: "2013-14", incomeTax: 155.2, nics: 107.7, vat: 104.7, corpTax: 39.9, councilTax: 26.7, businessRates: 25.2, fuelDuty: 26.9, stampDuty: 10.7 },
  { fy: "2014-15", incomeTax: 163.1, nics: 110.0, vat: 111.3, corpTax: 42.6, councilTax: 27.4, businessRates: 25.7, fuelDuty: 27.2, stampDuty: 13.0 },
  { fy: "2015-16", incomeTax: 168.6, nics: 113.5, vat: 115.5, corpTax: 44.1, councilTax: 28.3, businessRates: 26.1, fuelDuty: 27.6, stampDuty: 13.4 },
  { fy: "2016-17", incomeTax: 175.2, nics: 119.8, vat: 119.5, corpTax: 49.6, councilTax: 29.3, businessRates: 27.0, fuelDuty: 27.9, stampDuty: 13.1 },
  { fy: "2017-18", incomeTax: 180.6, nics: 125.7, vat: 125.3, corpTax: 53.0, councilTax: 30.6, businessRates: 26.0, fuelDuty: 27.9, stampDuty: 13.4 },
  { fy: "2018-19", incomeTax: 188.4, nics: 131.4, vat: 132.2, corpTax: 55.1, councilTax: 32.2, businessRates: 25.4, fuelDuty: 28.0, stampDuty: 12.0 },
  { fy: "2019-20", incomeTax: 191.8, nics: 137.2, vat: 130.8, corpTax: 50.9, councilTax: 33.9, businessRates: 26.1, fuelDuty: 27.6, stampDuty: 11.8 },
  { fy: "2020-21", incomeTax: 188.8, nics: 136.5, vat: 114.1, corpTax: 49.1, councilTax: 34.9, businessRates: 19.9, fuelDuty: 21.5, stampDuty: 11.5 },
  { fy: "2021-22", incomeTax: 224.6, nics: 153.0, vat: 142.8, corpTax: 59.2, councilTax: 36.6, businessRates: 22.8, fuelDuty: 25.7, stampDuty: 18.7 },
  { fy: "2022-23", incomeTax: 248.8, nics: 162.0, vat: 159.8, corpTax: 77.1, councilTax: 38.6, businessRates: 26.2, fuelDuty: 24.8, stampDuty: 14.0 },
  { fy: "2023-24", incomeTax: 277.6, nics: 170.8, vat: 167.7, corpTax: 80.8, councilTax: 41.0, businessRates: 27.4, fuelDuty: 24.7, stampDuty: 11.6 },
  { fy: "2024-25", incomeTax: 310.0, nics: 174.0, vat: 171.0, corpTax: 97.5, councilTax: 43.0, businessRates: 28.0, fuelDuty: 24.5, stampDuty: 10.6 },
];

// ── Tax burden as % GDP (OBR measure) ──────────────────────────────────
// Source: OBR Public Finances Databank, February 2026
// https://obr.uk/data/
const taxBurden = [
  { fy: "1978-79", pct: 30.2 },
  { fy: "1980-81", pct: 33.0 },
  { fy: "1982-83", pct: 33.9 },
  { fy: "1984-85", pct: 33.1 },
  { fy: "1986-87", pct: 32.4 },
  { fy: "1988-89", pct: 32.6 },
  { fy: "1990-91", pct: 31.1 },
  { fy: "1992-93", pct: 28.5 },
  { fy: "1993-94", pct: 27.4 },
  { fy: "1994-95", pct: 28.6 },
  { fy: "1996-97", pct: 29.9 },
  { fy: "1998-99", pct: 31.5 },
  { fy: "1999-00", pct: 32.3 },
  { fy: "2000-01", pct: 33.0 },
  { fy: "2001-02", pct: 32.2 },
  { fy: "2002-03", pct: 31.0 },
  { fy: "2003-04", pct: 31.2 },
  { fy: "2004-05", pct: 32.1 },
  { fy: "2005-06", pct: 33.0 },
  { fy: "2006-07", pct: 33.2 },
  { fy: "2007-08", pct: 33.3 },
  { fy: "2008-09", pct: 32.5 },
  { fy: "2009-10", pct: 31.1 },
  { fy: "2010-11", pct: 32.6 },
  { fy: "2011-12", pct: 33.0 },
  { fy: "2012-13", pct: 32.6 },
  { fy: "2013-14", pct: 32.4 },
  { fy: "2014-15", pct: 32.5 },
  { fy: "2015-16", pct: 32.9 },
  { fy: "2016-17", pct: 33.2 },
  { fy: "2017-18", pct: 33.4 },
  { fy: "2018-19", pct: 33.5 },
  { fy: "2019-20", pct: 33.1 },
  { fy: "2020-21", pct: 32.4 },
  { fy: "2021-22", pct: 33.5 },
  { fy: "2022-23", pct: 34.0 },
  { fy: "2023-24", pct: 34.5 },
  { fy: "2024-25", pct: 35.3 },
  { fy: "2025-26", pct: 36.0, forecast: true },
  { fy: "2026-27", pct: 36.7, forecast: true },
  { fy: "2027-28", pct: 37.7, forecast: true },
  { fy: "2028-29", pct: 37.8, forecast: true },
  { fy: "2029-30", pct: 38.0, forecast: true },
];

// ── Tax-to-GDP international comparison (OECD measure, 2023) ──────────
// Source: OECD Revenue Statistics 2025
// https://www.oecd.org/en/publications/2025/12/revenue-statistics-2025_07ca0a8e.html
const intlTaxBurden = [
  { country: "Denmark", pct: 43.4 },
  { country: "France", pct: 43.8 },
  { country: "Belgium", pct: 42.6 },
  { country: "Austria", pct: 42.7 },
  { country: "Finland", pct: 42.7 },
  { country: "Sweden", pct: 41.3 },
  { country: "Italy", pct: 41.5 },
  { country: "Norway", pct: 39.3 },
  { country: "Netherlands", pct: 39.1 },
  { country: "Germany", pct: 37.6 },
  { country: "Greece", pct: 37.2 },
  { country: "Czech Republic", pct: 35.8 },
  { country: "UK", pct: 35.3 },
  { country: "Poland", pct: 35.2 },
  { country: "Spain", pct: 33.6 },
  { country: "Canada", pct: 33.0 },
  { country: "New Zealand", pct: 32.1 },
  { country: "Japan", pct: 33.5 },
  { country: "Australia", pct: 29.1 },
  { country: "South Korea", pct: 28.8 },
  { country: "Switzerland", pct: 28.5 },
  { country: "USA", pct: 27.7 },
  { country: "Turkey", pct: 27.3 },
  { country: "Ireland", pct: 22.0 },
  { country: "Mexico", pct: 17.7 },
  { country: "OECD average", pct: 33.7 },
];

// ── Tax gap (£bn and %, HMRC Measuring Tax Gaps) ──────────────────────
// Source: HMRC Measuring Tax Gaps 2025 edition
// https://www.gov.uk/government/statistics/measuring-tax-gaps
const taxGap = [
  { fy: "2005-06", gap: 32.5, pct: 7.5 },
  { fy: "2006-07", gap: 33.0, pct: 7.1 },
  { fy: "2007-08", gap: 35.0, pct: 7.1 },
  { fy: "2008-09", gap: 35.5, pct: 7.2 },
  { fy: "2009-10", gap: 33.5, pct: 7.2 },
  { fy: "2010-11", gap: 34.0, pct: 6.8 },
  { fy: "2011-12", gap: 33.0, pct: 6.6 },
  { fy: "2012-13", gap: 33.0, pct: 6.4 },
  { fy: "2013-14", gap: 33.5, pct: 6.2 },
  { fy: "2014-15", gap: 33.5, pct: 5.9 },
  { fy: "2015-16", gap: 33.0, pct: 5.6 },
  { fy: "2016-17", gap: 33.0, pct: 5.3 },
  { fy: "2017-18", gap: 35.0, pct: 5.2 },
  { fy: "2018-19", gap: 35.0, pct: 5.0 },
  { fy: "2019-20", gap: 35.0, pct: 5.0 },
  { fy: "2020-21", gap: 32.0, pct: 5.1 },
  { fy: "2021-22", gap: 36.0, pct: 4.8 },
  { fy: "2022-23", gap: 39.8, pct: 4.8 },
  { fy: "2023-24", gap: 46.8, pct: 5.3 },
];

// ── Tax gap by type (%, 2023-24) ──────────────────────────────────────
// Source: HMRC Measuring Tax Gaps 2025 edition
const taxGapByType = [
  { type: "Corporation Tax", pct: 15.8, amount: 18.7 },
  { type: "VAT", pct: 5.0, amount: 8.9 },
  { type: "IT/NICs/CGT", pct: 3.0, amount: 7.5 },
  { type: "Excise duties", pct: 5.8, amount: 3.9 },
  { type: "Other taxes", pct: 5.1, amount: 7.8 },
];

// ── Income tax concentration (share of total IT paid by percentile) ───
// Source: HMRC Table 2.4 — Shares of total income tax liability
// https://www.gov.uk/government/statistics/shares-of-total-income-before-and-after-tax-and-income-tax-for-percentile-groups
const taxConcentration = [
  { fy: "1999-00", top1: 21.3, top5: 40.0, top10: 52.3, top50: 88.0 },
  { fy: "2002-03", top1: 21.0, top5: 40.2, top10: 52.0, top50: 87.7 },
  { fy: "2004-05", top1: 21.4, top5: 41.0, top10: 53.1, top50: 88.4 },
  { fy: "2006-07", top1: 23.7, top5: 43.3, top10: 54.8, top50: 88.9 },
  { fy: "2007-08", top1: 24.4, top5: 44.5, top10: 55.9, top50: 89.3 },
  { fy: "2009-10", top1: 25.1, top5: 43.5, top10: 55.3, top50: 89.4 },
  { fy: "2010-11", top1: 27.7, top5: 46.4, top10: 57.6, top50: 89.5 },
  { fy: "2012-13", top1: 27.5, top5: 46.1, top10: 57.0, top50: 88.8 },
  { fy: "2014-15", top1: 27.2, top5: 46.4, top10: 57.5, top50: 89.0 },
  { fy: "2016-17", top1: 27.7, top5: 47.0, top10: 58.4, top50: 89.7 },
  { fy: "2017-18", top1: 28.5, top5: 47.3, top10: 58.7, top50: 89.8 },
  { fy: "2018-19", top1: 29.1, top5: 47.6, top10: 59.0, top50: 89.8 },
  { fy: "2019-20", top1: 29.1, top5: 47.5, top10: 58.8, top50: 89.8 },
  { fy: "2020-21", top1: 28.3, top5: 46.6, top10: 58.4, top50: 90.0 },
  { fy: "2021-22", top1: 28.7, top5: 47.3, top10: 59.0, top50: 90.2 },
  { fy: "2022-23", top1: 29.1, top5: 48.0, top10: 59.8, top50: 90.5 },
];

// ── Corporation tax main rate history ─────────────────────────────────
// Source: HMRC Rates and Allowances — Corporation Tax
// https://www.gov.uk/government/publications/rates-and-allowances-corporation-tax
const corpTaxRate = [
  { fy: "1982-83", rate: 52 },
  { fy: "1983-84", rate: 50 },
  { fy: "1984-85", rate: 45 },
  { fy: "1986-87", rate: 35 },
  { fy: "1990-91", rate: 34 },
  { fy: "1991-92", rate: 33 },
  { fy: "1997-98", rate: 31 },
  { fy: "1999-00", rate: 30 },
  { fy: "2008-09", rate: 28 },
  { fy: "2011-12", rate: 26 },
  { fy: "2012-13", rate: 24 },
  { fy: "2013-14", rate: 23 },
  { fy: "2014-15", rate: 21 },
  { fy: "2015-16", rate: 20 },
  { fy: "2017-18", rate: 19 },
  { fy: "2018-19", rate: 19 },
  { fy: "2019-20", rate: 19 },
  { fy: "2020-21", rate: 19 },
  { fy: "2021-22", rate: 19 },
  { fy: "2022-23", rate: 19 },
  { fy: "2023-24", rate: 25 },
  { fy: "2024-25", rate: 25 },
];

// ── Corporation tax rate: international comparison (2024) ─────────────
// Source: OECD Corporate Tax Statistics 2025 / Tax Foundation
// https://www.oecd.org/en/publications/corporate-tax-statistics-2025_6a915941-en.html
const intlCorpTax = [
  { country: "Japan", rate: 29.7 },
  { country: "Germany", rate: 29.9 },
  { country: "France", rate: 25.8 },
  { country: "Australia", rate: 30.0 },
  { country: "Italy", rate: 27.8 },
  { country: "Canada", rate: 26.2 },
  { country: "USA", rate: 25.8 },
  { country: "UK", rate: 25.0 },
  { country: "South Korea", rate: 24.2 },
  { country: "Norway", rate: 22.0 },
  { country: "Netherlands", rate: 25.8 },
  { country: "Spain", rate: 25.0 },
  { country: "Denmark", rate: 22.0 },
  { country: "Sweden", rate: 20.6 },
  { country: "Switzerland", rate: 19.7 },
  { country: "Poland", rate: 19.0 },
  { country: "Czech Republic", rate: 21.0 },
  { country: "Ireland", rate: 12.5 },
  { country: "Hungary", rate: 9.0 },
  { country: "OECD average", rate: 23.6 },
];

// ── Personal allowance and basic rate threshold history ───────────────
// Source: HMRC Rates and Allowances — Income Tax
// https://www.gov.uk/government/publications/rates-and-allowances-income-tax
const thresholds = [
  { fy: "2000-01", personalAllowance: 4385, basicRateLimit: 28400, basicRate: 22, higherRate: 40 },
  { fy: "2001-02", personalAllowance: 4535, basicRateLimit: 29400, basicRate: 22, higherRate: 40 },
  { fy: "2002-03", personalAllowance: 4615, basicRateLimit: 29900, basicRate: 22, higherRate: 40 },
  { fy: "2003-04", personalAllowance: 4615, basicRateLimit: 30500, basicRate: 22, higherRate: 40 },
  { fy: "2004-05", personalAllowance: 4745, basicRateLimit: 31400, basicRate: 22, higherRate: 40 },
  { fy: "2005-06", personalAllowance: 4895, basicRateLimit: 32400, basicRate: 22, higherRate: 40 },
  { fy: "2006-07", personalAllowance: 5035, basicRateLimit: 33300, basicRate: 22, higherRate: 40 },
  { fy: "2007-08", personalAllowance: 5225, basicRateLimit: 34600, basicRate: 22, higherRate: 40 },
  { fy: "2008-09", personalAllowance: 6035, basicRateLimit: 34800, basicRate: 20, higherRate: 40 },
  { fy: "2009-10", personalAllowance: 6475, basicRateLimit: 37400, basicRate: 20, higherRate: 40 },
  { fy: "2010-11", personalAllowance: 6475, basicRateLimit: 37400, basicRate: 20, higherRate: 40, additionalRate: 50 },
  { fy: "2011-12", personalAllowance: 7475, basicRateLimit: 35000, basicRate: 20, higherRate: 40, additionalRate: 50 },
  { fy: "2012-13", personalAllowance: 8105, basicRateLimit: 34370, basicRate: 20, higherRate: 40, additionalRate: 50 },
  { fy: "2013-14", personalAllowance: 9440, basicRateLimit: 32010, basicRate: 20, higherRate: 40, additionalRate: 45 },
  { fy: "2014-15", personalAllowance: 10000, basicRateLimit: 31865, basicRate: 20, higherRate: 40, additionalRate: 45 },
  { fy: "2015-16", personalAllowance: 10600, basicRateLimit: 31785, basicRate: 20, higherRate: 40, additionalRate: 45 },
  { fy: "2016-17", personalAllowance: 11000, basicRateLimit: 32000, basicRate: 20, higherRate: 40, additionalRate: 45 },
  { fy: "2017-18", personalAllowance: 11500, basicRateLimit: 33500, basicRate: 20, higherRate: 40, additionalRate: 45 },
  { fy: "2018-19", personalAllowance: 11850, basicRateLimit: 34500, basicRate: 20, higherRate: 40, additionalRate: 45 },
  { fy: "2019-20", personalAllowance: 12500, basicRateLimit: 37500, basicRate: 20, higherRate: 40, additionalRate: 45 },
  { fy: "2020-21", personalAllowance: 12500, basicRateLimit: 37500, basicRate: 20, higherRate: 40, additionalRate: 45 },
  { fy: "2021-22", personalAllowance: 12570, basicRateLimit: 37700, basicRate: 20, higherRate: 40, additionalRate: 45 },
  { fy: "2022-23", personalAllowance: 12570, basicRateLimit: 37700, basicRate: 20, higherRate: 40, additionalRate: 45 },
  { fy: "2023-24", personalAllowance: 12570, basicRateLimit: 37700, basicRate: 20, higherRate: 40, additionalRate: 45 },
  { fy: "2024-25", personalAllowance: 12570, basicRateLimit: 37700, basicRate: 20, higherRate: 40, additionalRate: 45 },
  { fy: "2025-26", personalAllowance: 12570, basicRateLimit: 37700, basicRate: 20, higherRate: 40, additionalRate: 45 },
];

// ── Number of income taxpayers by rate band (millions) ────────────────
// Source: HMRC Income Tax Liabilities Statistics
// https://www.gov.uk/government/statistics/income-tax-liabilities-statistics-tax-year-2022-to-2023-to-tax-year-2025-to-2026
const taxpayersByBand = [
  { fy: "2010-11", basic: 24.3, higher: 3.3, additional: 0.3, total: 29.9 },
  { fy: "2012-13", basic: 24.5, higher: 3.8, additional: 0.3, total: 30.0 },
  { fy: "2014-15", basic: 24.8, higher: 4.2, additional: 0.4, total: 30.3 },
  { fy: "2016-17", basic: 25.1, higher: 4.3, additional: 0.4, total: 30.7 },
  { fy: "2018-19", basic: 25.5, higher: 4.4, additional: 0.4, total: 31.2 },
  { fy: "2019-20", basic: 25.4, higher: 4.3, additional: 0.4, total: 31.0 },
  { fy: "2020-21", basic: 24.2, higher: 4.3, additional: 0.4, total: 29.7 },
  { fy: "2021-22", basic: 25.3, higher: 4.7, additional: 0.5, total: 31.4 },
  { fy: "2022-23", basic: 26.1, higher: 5.1, additional: 0.6, total: 33.1 },
  { fy: "2023-24", basic: 26.7, higher: 5.5, additional: 0.7, total: 34.0 },
  { fy: "2024-25", basic: 27.1, higher: 5.7, additional: 0.7, total: 34.5 },
];

// ── Snapshot ────────────────────────────────────────────────────────────
const latestReceipts = receiptsByType[receiptsByType.length - 1];
const totalReceipts = Object.entries(latestReceipts)
  .filter(([k]) => k !== "fy")
  .reduce((sum, [, v]) => sum + v, 0);

const snapshot = {
  totalReceipts: Math.round(totalReceipts * 10) / 10,
  totalReceiptsYear: "2024-25",
  taxBurden: 35.3,
  taxBurdenYear: "2024-25",
  taxBurdenForecast: 38.0,
  taxBurdenForecastYear: "2029-30",
  taxGap: 46.8,
  taxGapPct: 5.3,
  taxGapYear: "2023-24",
  top1PctShare: 29.1,
  top1PctShareYear: "2022-23",
  corpTaxRate: 25,
  corpTaxRateYear: "2024-25",
  personalAllowance: 12570,
  personalAllowanceFrozenSince: "2021-22",
  personalAllowanceFrozenUntil: "2030-31",
  incomeTaxpayers: 34.5,
  incomeTaxpayersUnit: "m",
  incomeTaxpayersYear: "2024-25",
};

// ── Output ─────────────────────────────────────────────────────────────
const output = {
  $schema: "sob-dataset-v1",
  id: "taxation",
  pillar: "state",
  topic: "spending",
  generated: new Date().toISOString().slice(0, 10),
  sources: [
    {
      id: "hmrc-receipts",
      name: "HMRC Tax Receipts and NICs for the UK",
      url: "https://www.gov.uk/government/statistics/hmrc-tax-and-nics-receipts-for-the-uk",
      publisher: "HMRC",
      note: "Annual bulletin. Receipts by tax type in £bn, financial year basis."
    },
    {
      id: "obr-public-finances",
      name: "OBR Public Finances Databank",
      url: "https://obr.uk/data/",
      publisher: "OBR",
      note: "Tax burden as % of GDP. Forecast years consistent with OBR EFO November 2025."
    },
    {
      id: "hmrc-tax-gap",
      name: "HMRC Measuring Tax Gaps, 2025 edition",
      url: "https://www.gov.uk/government/statistics/measuring-tax-gaps",
      publisher: "HMRC",
      note: "Tax gap estimates for 2005-06 to 2023-24 in £bn and as % of theoretical liability."
    },
    {
      id: "hmrc-table-2-4",
      name: "HMRC Table 2.4: Shares of Total Income Tax Liability",
      url: "https://www.gov.uk/government/statistics/shares-of-total-income-before-and-after-tax-and-income-tax-for-percentile-groups",
      publisher: "HMRC",
      note: "Percentile group shares of income tax liability, 1999-2000 to 2022-23."
    },
    {
      id: "hmrc-corp-tax-rates",
      name: "HMRC Rates and Allowances: Corporation Tax",
      url: "https://www.gov.uk/government/publications/rates-and-allowances-corporation-tax",
      publisher: "HMRC"
    },
    {
      id: "hmrc-it-rates",
      name: "HMRC Rates and Allowances: Income Tax",
      url: "https://www.gov.uk/government/publications/rates-and-allowances-income-tax",
      publisher: "HMRC",
      note: "Personal allowance and rate thresholds by tax year."
    },
    {
      id: "oecd-revenue-stats",
      name: "OECD Revenue Statistics 2025",
      url: "https://www.oecd.org/en/publications/2025/12/revenue-statistics-2025_07ca0a8e.html",
      publisher: "OECD",
      note: "Tax-to-GDP ratios for OECD countries, 2023 data."
    },
    {
      id: "oecd-corp-tax-stats",
      name: "OECD Corporate Tax Statistics 2025",
      url: "https://www.oecd.org/en/publications/corporate-tax-statistics-2025_6a915941-en.html",
      publisher: "OECD",
      note: "Combined statutory corporate income tax rates, 2024."
    },
    {
      id: "hmrc-it-liabilities",
      name: "HMRC Income Tax Liabilities Statistics",
      url: "https://www.gov.uk/government/statistics/income-tax-liabilities-statistics-tax-year-2022-to-2023-to-tax-year-2025-to-2026",
      publisher: "HMRC",
      note: "Taxpayer counts by rate band. Projections for 2024-25."
    }
  ],
  snapshot,
  series: {
    receiptsByType: {
      sourceId: "hmrc-receipts",
      timeField: "fy",
      data: receiptsByType
    },
    taxBurden: {
      sourceId: "obr-public-finances",
      timeField: "fy",
      data: taxBurden
    },
    intlTaxBurden: {
      sourceId: "oecd-revenue-stats",
      timeField: "country",
      data: intlTaxBurden
    },
    taxGap: {
      sourceId: "hmrc-tax-gap",
      timeField: "fy",
      data: taxGap
    },
    taxGapByType: {
      sourceId: "hmrc-tax-gap",
      timeField: "type",
      data: taxGapByType
    },
    taxConcentration: {
      sourceId: "hmrc-table-2-4",
      timeField: "fy",
      data: taxConcentration
    },
    corpTaxRate: {
      sourceId: "hmrc-corp-tax-rates",
      timeField: "fy",
      data: corpTaxRate
    },
    intlCorpTax: {
      sourceId: "oecd-corp-tax-stats",
      timeField: "country",
      data: intlCorpTax
    },
    thresholds: {
      sourceId: "hmrc-it-rates",
      timeField: "fy",
      data: thresholds
    },
    taxpayersByBand: {
      sourceId: "hmrc-it-liabilities",
      timeField: "fy",
      data: taxpayersByBand
    }
  }
};

writeFileSync("public/data/taxation.json", JSON.stringify(output, null, 2));
console.log("  taxation.json written (" + receiptsByType.length + " receipt years, " + taxBurden.length + " burden years)");
