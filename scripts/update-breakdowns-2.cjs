#!/usr/bin/env node
// Batch 2: Education, Transport, HM Treasury, DESNZ, Business & Trade
// Data from DfE/DfT/HMT/BEIS annual reports, NAO overviews, PESA, ORR, HS2 reports

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'data', 'spending.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

function findDept(name) {
  return data.departments.items.find(d => d.name.includes(name));
}

function setBreakdown(name, breakdown) {
  const dept = findDept(name);
  if (!dept) { console.error('NOT FOUND:', name); return; }
  for (const [fy, items] of Object.entries(breakdown)) {
    const sum = items.reduce((s, d) => s + d.value, 0);
    const actual = dept.values[fy];
    if (actual && Math.abs(sum - actual) > 1) {
      console.warn(`  ${name} ${fy}: breakdown=${sum} actual=${actual} diff=${actual - sum}`);
    }
  }
  dept.breakdown = breakdown;
  console.log(`Updated: ${name} (${Object.keys(breakdown).length} years)`);
}

function withOther(items, total, otherName = "Other") {
  const named = items.reduce((s, d) => s + d.value, 0);
  const other = total - named;
  if (other > 0) items.push({ name: otherName, value: other });
  return items;
}

// ── DEPARTMENT FOR EDUCATION ──
// Sources: DfE ARAs 2023-24 & 2024-25 (business group breakdowns), school funding statistics,
// estimates memoranda. Schools = DSG + Pupil Premium + other school grants.
// Higher ed = student loan RAB charge + maintenance grants (volatile due to interest rates).
// Capital AME = new student loan issuance (shown as "Student loans issued").
setBreakdown("Education", {
  "2020-21": withOther([
    { name: "Schools (DSG, Pupil Premium, grants)", value: 55200 },
    { name: "Higher education (RAB charge)", value: 20800 },
    { name: "Student loans issued (Capital AME)", value: 17563 },
    { name: "16-19 & apprenticeships", value: 9800 },
    { name: "Capital (school buildings, FE)", value: 5500 },
    { name: "Children's social care & families", value: 4800 },
    { name: "Early years", value: 3500 },
  ], 118363, "Other (admin, delivery)"),
  "2021-22": withOther([
    { name: "Schools (DSG, Pupil Premium, grants)", value: 56800 },
    { name: "Higher education (RAB charge)", value: 21300 },
    { name: "Student loans issued (Capital AME)", value: 15154 },
    { name: "16-19 & apprenticeships", value: 10100 },
    { name: "Capital (school buildings, FE)", value: 5700 },
    { name: "Children's social care & families", value: 4900 },
    { name: "Early years", value: 3400 },
  ], 118754, "Other (admin, delivery)"),
  "2022-23": withOther([
    { name: "Schools (DSG, Pupil Premium, grants)", value: 58400 },
    { name: "Student loans issued (Capital AME)", value: 13902 },
    { name: "16-19 & apprenticeships", value: 10400 },
    { name: "Capital (school buildings, FE)", value: 5800 },
    { name: "Children's social care & families", value: 5100 },
    { name: "Early years", value: 3700 },
    { name: "Higher education (RAB charge)", value: 3100 },
  ], 101602, "Other (admin, delivery)"),
  "2023-24": withOther([
    { name: "Schools (DSG, Pupil Premium, grants)", value: 61100 },
    { name: "Higher education (RAB charge)", value: 22100 },
    { name: "16-19 & apprenticeships", value: 13700 },
    { name: "Student loans issued (Capital AME)", value: 13310 },
    { name: "Capital (school buildings, FE)", value: 6200 },
    { name: "Children's social care & families", value: 5500 },
    { name: "Early years", value: 4000 },
  ], 127010, "Other (admin, delivery)"),
  "2024-25": withOther([
    { name: "Schools (DSG, Pupil Premium, grants)", value: 63700 },
    { name: "Higher education (RAB charge)", value: 24200 },
    { name: "16-19 & apprenticeships", value: 14600 },
    { name: "Student loans issued (Capital AME)", value: 11310 },
    { name: "Early years", value: 6200 },
    { name: "Children's social care & families", value: 6200 },
    { name: "Capital (school buildings, FE)", value: 5600 },
  ], 132915, "Other (admin, delivery)"),
});

// ── DEPARTMENT FOR TRANSPORT ──
// Sources: DfT ARAs, NAO DfT overview 2024-25, DfT estimates memoranda,
// ORR Network Rail data, HS2 parliamentary reports.
// COVID rail support (ERMA/EMA/TfL): explicit DfT ARA breakdown 2020-22.
setBreakdown("Transport", {
  "2020-21": withOther([
    { name: "Network Rail", value: 13400 },
    { name: "COVID rail & bus support", value: 8300 },
    { name: "National Highways", value: 5200 },
    { name: "HS2", value: 3900 },
    { name: "Local transport grants", value: 2100 },
  ], 34883, "Other (admin, maritime, motoring agencies)"),
  "2021-22": withOther([
    { name: "Network Rail", value: 13900 },
    { name: "National Highways", value: 5600 },
    { name: "HS2", value: 5600 },
    { name: "COVID rail & bus support", value: 5100 },
    { name: "Local transport grants", value: 2200 },
  ], 33137, "Other (admin, maritime, motoring agencies)"),
  "2022-23": withOther([
    { name: "Network Rail", value: 14400 },
    { name: "HS2", value: 6900 },
    { name: "National Highways", value: 5200 },
    { name: "Local transport grants", value: 2100 },
    { name: "COVID rail & bus support (wind-down)", value: 1500 },
  ], 32524, "Other (passenger rail, buses, admin)"),
  "2023-24": [
    { name: "Network Rail", value: 16100 },
    { name: "HS2", value: 8500 },
    { name: "National Highways", value: 7000 },
    { name: "Local transport grants", value: 2200 },
    { name: "Passenger rail services", value: 1600 },
    { name: "Other (AME write-downs, buses, admin)", value: -2762 },
  ],
  "2024-25": [
    { name: "Network Rail", value: 16100 },
    { name: "HS2", value: 6800 },
    { name: "National Highways", value: 6400 },
    { name: "Local transport grants", value: 1900 },
    { name: "Passenger rail services", value: 1500 },
    { name: "Other (AME adjustments, buses, admin)", value: -2242 },
  ],
});

// ── HM TREASURY ──
// Sources: HMT ARAs 2022-23 & 2023-24, NAO HMT overviews 2023-24 & 2024-25.
// Dominated by Bank of England Asset Purchase Facility (BEAPFF) indemnity.
// 2020-21/2021-22: APF was profitable (paying HMT), but non-cash fair value
// changes on the indemnity derivative drove large resource AME.
// First HMT-to-APF cash transfer: October 2022. Cumulative since: £85.9bn+
setBreakdown("HM Treasury", {
  "2020-21": withOther([
    { name: "BoE APF indemnity (non-cash)", value: 33300 },
    { name: "Core department & agencies", value: 215 },
    { name: "EU withdrawal settlement", value: 200 },
    { name: "Debt Management Office", value: 100 },
    { name: "UKGI & other ALBs", value: 100 },
  ], 34001, "Other (fiscal items, reserves)"),
  "2021-22": withOther([
    { name: "BoE APF indemnity (non-cash)", value: 47800 },
    { name: "Core department & agencies", value: 252 },
    { name: "EU withdrawal settlement", value: 200 },
    { name: "UKGI & other ALBs", value: 150 },
    { name: "Debt Management Office", value: 114 },
  ], 48609, "Other (fiscal items, reserves)"),
  "2022-23": [
    { name: "BoE APF indemnity (cash + fair value)", value: 135200 },
    { name: "Core department & agencies", value: 311 },
    { name: "EU withdrawal settlement", value: 200 },
    { name: "UKGI & other ALBs", value: 150 },
    { name: "Debt Management Office", value: 108 },
    { name: "Other (fiscal items)", value: -82 },
  ],
  "2023-24": [
    { name: "BoE APF indemnity", value: 84300 },
    { name: "EU withdrawal settlement", value: 1763 },
    { name: "Treasury-owned companies (NWF)", value: 726 },
    { name: "Core department & agencies", value: 643 },
    { name: "UKGI & other ALBs", value: 184 },
    { name: "Debt Management Office", value: 100 },
    { name: "NatWest share sales & income", value: -7252 },
  ],
  "2024-25": [
    { name: "BoE APF indemnity", value: 71000 },
    { name: "Treasury-owned companies (NWF)", value: 1404 },
    { name: "Core department & agencies", value: 959 },
    { name: "UKGI & other ALBs", value: 184 },
    { name: "Debt Management Office", value: 100 },
    { name: "EU withdrawal settlement", value: 39 },
    { name: "NatWest share sales & income", value: -8546 },
  ],
});

// ── ENERGY SECURITY AND NET ZERO (DESNZ) ──
// Sources: BEIS ARA 2022-23 performance report, DESNZ ARAs 2023-24 & 2024-25.
// Pre-2023: energy/nuclear portion of BEIS (estimated).
// AME is wildly volatile: CfD derivative fair value, nuclear decommissioning provisions.
// Negative totals in 2022-23 and 2023-24 driven by massive favourable provision movements.
setBreakdown("Energy Security", {
  "2020-21": withOther([
    { name: "Nuclear decommissioning (NDA)", value: 2800 },
    { name: "Clean energy & net zero", value: 600 },
    { name: "Energy efficiency (homes)", value: 400 },
    { name: "Energy bills support", value: 300 },
    { name: "UKAEA & other nuclear", value: 300 },
  ], 12636, "Other (AME provisions, admin)"),
  "2021-22": withOther([
    { name: "Nuclear decommissioning (NDA)", value: 2700 },
    { name: "Clean energy & net zero", value: 700 },
    { name: "Energy bills support", value: 700 },
    { name: "Energy efficiency (homes)", value: 400 },
    { name: "UKAEA & other nuclear", value: 300 },
  ], 128108, "Other (AME: decommissioning provisions, CfD)"),
  "2022-23": [
    { name: "Energy bills support (EPG, EBSS)", value: 12989 },
    { name: "Nuclear decommissioning (NDA)", value: 2699 },
    { name: "Clean energy & net zero", value: 1999 },
    { name: "Admin & capability", value: 577 },
    { name: "UKAEA & other nuclear", value: 297 },
    { name: "Energy efficiency (homes)", value: 350 },
    { name: "AME (provisions, CfD, decommissioning)", value: -95048 },
  ],
  "2023-24": [
    { name: "Nuclear decommissioning (NDA)", value: 3003 },
    { name: "Sizewell C", value: 1103 },
    { name: "Energy bills support", value: 845 },
    { name: "Clean energy & net zero", value: 755 },
    { name: "Admin & capability", value: 516 },
    { name: "UKAEA & other nuclear", value: 469 },
    { name: "Energy efficiency (homes)", value: 350 },
    { name: "AME (provisions, CfD, decommissioning)", value: -13976 },
  ],
  "2024-25": withOther([
    { name: "Nuclear decommissioning (NDA)", value: 2975 },
    { name: "Sizewell C", value: 1672 },
    { name: "Clean energy & net zero", value: 1450 },
    { name: "Energy bills support", value: 880 },
    { name: "Net Zero North Sea", value: 439 },
    { name: "UKAEA & other nuclear", value: 422 },
    { name: "Admin & capability", value: 412 },
    { name: "Energy efficiency (homes)", value: 350 },
  ], 15017, "Other (AME provisions, CfD)"),
});

// ── BUSINESS AND TRADE (DBT) ──
// Sources: BEIS ARA 2022-23, DBT ARA 2023-24, PESA.
// Pre-2023: business/trade portion of BEIS. Dominated by COVID loan provisions in 2020-21.
// Science (UKRI £9.4bn, UKSA) transferred to DSIT, not DBT.
setBreakdown("Business and Trade", {
  "2020-21": withOther([
    { name: "COVID business loans (BBLS/CBILS)", value: 29500 },
    { name: "Business support & regulation", value: 1200 },
    { name: "Trade promotion & UKEF", value: 800 },
    { name: "British Business Bank", value: 300 },
    { name: "CMA & regulators", value: 150 },
  ], 32040, "Other (admin)"),
  "2021-22": [
    { name: "COVID business loans (provisions)", value: 1500 },
    { name: "Trade promotion & UKEF", value: 900 },
    { name: "Business support & regulation", value: 700 },
    { name: "British Business Bank", value: 350 },
    { name: "CMA & regulators", value: 150 },
    { name: "Other (admin)", value: -94 },
  ],
  "2022-23": withOther([
    { name: "Trade promotion & UKEF", value: 900 },
    { name: "Business support & regulation", value: 700 },
    { name: "COVID business loans (provisions)", value: 500 },
    { name: "British Business Bank", value: 380 },
    { name: "CMA & regulators", value: 150 },
  ], 3374, "Other (admin)"),
  "2023-24": [
    { name: "Trade promotion & UKEF", value: 900 },
    { name: "Business support & regulation", value: 700 },
    { name: "British Business Bank", value: 350 },
    { name: "CMA & regulators", value: 150 },
    { name: "Admin & other", value: 2078 },
    { name: "COVID loan provision release", value: -893 },
  ],
  "2024-25": withOther([
    { name: "Trade promotion & UKEF", value: 900 },
    { name: "Business support & regulation", value: 500 },
    { name: "British Business Bank", value: 300 },
    { name: "CMA & regulators", value: 150 },
  ], 1862, "Other (admin)"),
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('\nDone. Written to', file);
