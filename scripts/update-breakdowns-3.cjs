#!/usr/bin/env node
// Batch 3: MHCLG Local Gov, MHCLG Housing, Cabinet Office, DSIT, DCMS, Defra, Small Bodies, Law Officers
// Data from departmental ARAs, PESA, NAO overviews, LG Finance Settlement, estimates memoranda

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

// ── MHCLG - LOCAL GOVERNMENT ──
// Sources: MHCLG ARA 2024-25 Core Tables (pp 97-98), SoPS 1.1, LG Finance Settlement.
// Business rates retained by LAs is the largest item (AME, non-cash).
// Section 31 BR relief grants reclassified from DEL to AME in 2024-25.
// "Other Grants" = Social Care Grant + iBCF + MSIF + Discharge Fund + NHB + etc.
// Agent returned more granular data from LG Finance Settlement, NNDR Accounts, Core Spending Power.
// Adjusted to our spending.json TME totals (differ from agent's PESA vintage).
setBreakdown("MHCLG - Local", {
  "2020-21": withOther([
    { name: "Business rates: local share retained", value: 16345 },
    { name: "Business rates: s.31 relief grants", value: 10700 },
    { name: "Improved Better Care Fund", value: 2077 },
    { name: "Revenue Support Grant", value: 1613 },
    { name: "Social Care Grant", value: 1410 },
    { name: "COVID-19 local government grants", value: 1426 },
    { name: "New Homes Bonus", value: 907 },
  ], 37611, "Other (top-ups/tariffs, adjustments)"),
  "2021-22": withOther([
    { name: "Business rates: s.31 relief & on-account grants", value: 12500 },
    { name: "Business rates: local share retained", value: 7482 },
    { name: "Improved Better Care Fund", value: 2077 },
    { name: "Social Care Grant", value: 1710 },
    { name: "Revenue Support Grant", value: 1622 },
    { name: "New Homes Bonus", value: 622 },
  ], 29788, "Other (top-ups/tariffs, COVID grants, adjustments)"),
  "2022-23": withOther([
    { name: "Business rates: local share retained", value: 11744 },
    { name: "Business rates: s.31 relief grants", value: 4943 },
    { name: "Social Care Grant", value: 2346 },
    { name: "Improved Better Care Fund", value: 2140 },
    { name: "Revenue Support Grant", value: 1700 },
  ], 22873, "Other (NHB, Services Grant, top-ups, adjustments)"),
  "2023-24": withOther([
    { name: "Business rates: local share retained", value: 14730 },
    { name: "Business rates: s.31 relief grants", value: 4997 },
    { name: "Social Care Grant", value: 3852 },
    { name: "Improved Better Care Fund", value: 2140 },
    { name: "Revenue Support Grant", value: 1900 },
    { name: "ASC Market Sustainability & Improvement", value: 562 },
    { name: "Services Grant", value: 464 },
  ], 30451, "Other (NHB, Discharge Fund, top-ups, adjustments)"),
  "2024-25": withOther([
    { name: "Business rates: local share retained", value: 16344 },
    { name: "Business rates: s.31 relief grants (AME)", value: 5550 },
    { name: "Social Care Grant", value: 5044 },
    { name: "Revenue Support Grant", value: 2118 },
    { name: "Improved Better Care Fund", value: 2140 },
    { name: "ASC Market Sustainability & Improvement", value: 1050 },
    { name: "Homelessness grants", value: 700 },
    { name: "ASC Discharge Fund", value: 500 },
  ], 34435, "Other (NHB, Services Grant, top-ups, adjustments)"),
});

// ── MHCLG - HOUSING AND COMMUNITIES ──
// Sources: MHCLG/DLUHC ARAs, NAO overview, estimates memoranda.
// Affordable housing (Homes England), building safety/Grenfell remediation,
// homelessness, planning, community programmes. Some Help to Buy AME.
setBreakdown("MHCLG - Housing", {
  "2020-21": withOther([
    { name: "Affordable housing (Homes England)", value: 3200 },
    { name: "Building safety & Grenfell remediation", value: 1800 },
    { name: "Homelessness & rough sleeping", value: 800 },
    { name: "Help to Buy (AME)", value: 2500 },
    { name: "Planning & community programmes", value: 600 },
  ], 11578, "Other (admin, ALB revaluations)"),
  "2021-22": withOther([
    { name: "Affordable housing (Homes England)", value: 3400 },
    { name: "Help to Buy (AME)", value: 1200 },
    { name: "Building safety & Grenfell remediation", value: 1500 },
    { name: "Homelessness & rough sleeping", value: 800 },
    { name: "Planning & community programmes", value: 500 },
  ], 7871, "Other (admin, ALB revaluations)"),
  "2022-23": withOther([
    { name: "Affordable housing (Homes England)", value: 4200 },
    { name: "Building safety & Grenfell remediation", value: 2400 },
    { name: "Help to Buy (AME)", value: 900 },
    { name: "Homelessness & rough sleeping", value: 900 },
    { name: "Planning & community programmes", value: 600 },
  ], 10145, "Other (admin, ALB revaluations)"),
  "2023-24": withOther([
    { name: "Affordable housing (Homes England)", value: 3800 },
    { name: "Building safety & Grenfell remediation", value: 2700 },
    { name: "Homelessness & rough sleeping", value: 1000 },
    { name: "Help to Buy (AME)", value: 500 },
    { name: "Planning & community programmes", value: 700 },
  ], 9973, "Other (admin, ALB revaluations)"),
  "2024-25": withOther([
    { name: "Affordable housing (Homes England)", value: 4500 },
    { name: "Building safety & Grenfell remediation", value: 3200 },
    { name: "Homelessness & rough sleeping", value: 1200 },
    { name: "Planning & community programmes", value: 800 },
    { name: "Help to Buy (AME)", value: 300 },
  ], 12907, "Other (admin, ALB revaluations)"),
});

// ── CABINET OFFICE ──
// Sources: Cabinet Office ARAs, NAO overview.
// Civil Superannuation (pensions AME) is the dominant item (~£10-13bn).
// COVID Test & Trace was under CO in 2020-21 (moved to DHSC later).
// Government Property Agency, Crown Commercial Service, cyber security.
setBreakdown("Cabinet Office", {
  "2020-21": withOther([
    { name: "Civil Superannuation (pensions AME)", value: 10200 },
    { name: "Core department & admin", value: 1500 },
    { name: "Government Property Agency", value: 800 },
    { name: "Crown Commercial Service", value: 400 },
    { name: "Cyber & digital", value: 300 },
  ], 14034, "Other (elections, civil contingencies)"),
  "2021-22": withOther([
    { name: "Civil Superannuation (pensions AME)", value: 10500 },
    { name: "Core department & admin", value: 1200 },
    { name: "Government Property Agency", value: 800 },
    { name: "Crown Commercial Service", value: 400 },
    { name: "Cyber & digital", value: 300 },
  ], 13414, "Other (elections, civil contingencies)"),
  "2022-23": withOther([
    { name: "Civil Superannuation (pensions AME)", value: 14500 },
    { name: "Core department & admin", value: 1200 },
    { name: "Government Property Agency", value: 900 },
    { name: "Crown Commercial Service", value: 400 },
    { name: "Cyber & digital", value: 400 },
  ], 17809, "Other (elections, civil contingencies)"),
  "2023-24": withOther([
    { name: "Civil Superannuation (pensions AME)", value: 8500 },
    { name: "Core department & admin", value: 1300 },
    { name: "Government Property Agency", value: 900 },
    { name: "Crown Commercial Service", value: 500 },
    { name: "Cyber & digital", value: 400 },
  ], 11999, "Other (elections, civil contingencies)"),
  "2024-25": withOther([
    { name: "Civil Superannuation (pensions AME)", value: 22500 },
    { name: "Core department & admin", value: 1500 },
    { name: "Government Property Agency", value: 1000 },
    { name: "Crown Commercial Service", value: 600 },
    { name: "Cyber & digital", value: 500 },
  ], 26813, "Other (elections, civil contingencies)"),
});

// ── SCIENCE, INNOVATION AND TECHNOLOGY (DSIT) ──
// Sources: BEIS R&D Budget Allocations, DSIT Estimates Memoranda, UKRI/UKSA ARAs, NAO overviews.
// Pre-Feb 2023: science/research portion of BEIS (retrospective allocation).
// UKRI (~£8-9bn allocation) is the largest component. EU Horizon programme significant.
setBreakdown("Science, Innovation", {
  "2020-21": withOther([
    { name: "UKRI (research councils + Innovate UK)", value: 8447 },
    { name: "EU R&D programmes (Horizon 2020)", value: 1093 },
    { name: "UK Space Agency", value: 547 },
    { name: "National Academies", value: 230 },
    { name: "BDUK (digital infrastructure)", value: 190 },
    { name: "UK Atomic Energy Authority", value: 187 },
  ], 10694, "Other (Met Office, NMS, admin, digital)"),
  "2021-22": withOther([
    { name: "UKRI (research councils + Innovate UK)", value: 7908 },
    { name: "EU R&D programmes (Horizon transition)", value: 1200 },
    { name: "UK Space Agency", value: 497 },
    { name: "BDUK (digital infrastructure)", value: 250 },
    { name: "UK Atomic Energy Authority", value: 217 },
    { name: "National Academies", value: 207 },
  ], 10388, "Other (Met Office, NMS, admin, digital)"),
  "2022-23": withOther([
    { name: "UKRI (research councils + Innovate UK)", value: 7908 },
    { name: "EU R&D programmes (Horizon guarantee)", value: 1500 },
    { name: "UK Space Agency", value: 648 },
    { name: "BDUK (digital infrastructure)", value: 300 },
    { name: "Met Office", value: 235 },
    { name: "UK Atomic Energy Authority", value: 233 },
    { name: "National Academies", value: 207 },
    { name: "ARIA", value: 125 },
  ], 11412, "Other (NMS, admin, digital, geospatial)"),
  "2023-24": withOther([
    { name: "UKRI (research councils + Innovate UK)", value: 8373 },
    { name: "EU R&D programmes (Horizon/Copernicus)", value: 1500 },
    { name: "UK Space Agency", value: 643 },
    { name: "BDUK (digital infrastructure)", value: 350 },
    { name: "Met Office", value: 296 },
    { name: "UK Atomic Energy Authority", value: 261 },
    { name: "National Academies", value: 212 },
    { name: "ARIA", value: 150 },
    { name: "Geospatial Commission", value: 148 },
  ], 13018, "Other (NMS, admin, digital)"),
  "2024-25": withOther([
    { name: "UKRI (research councils + Innovate UK)", value: 9132 },
    { name: "EU R&D programmes (Horizon/Copernicus)", value: 1803 },
    { name: "UK Space Agency", value: 618 },
    { name: "BDUK (digital infrastructure)", value: 430 },
    { name: "Met Office", value: 382 },
    { name: "Geospatial Commission", value: 149 },
    { name: "National Measurement System", value: 137 },
    { name: "Science & Society", value: 112 },
    { name: "ARIA", value: 40 },
  ], 13899, "Other (admin, depreciation, digital)"),
});

// ── CULTURE, MEDIA AND SPORT (DCMS) ──
// Sources: DCMS ARAs, NAO overview, BBC Trust Statement.
// BBC licence fee (~£3.8bn) passed through DCMS accounts.
// Arts Council, Sport England, Heritage, museums, Channel 4.
// 2020-21 inflated by COVID cultural recovery funds.
setBreakdown("Culture, Media", {
  "2020-21": withOther([
    { name: "BBC (licence fee)", value: 3750 },
    { name: "COVID cultural recovery & support", value: 1500 },
    { name: "Arts Council England", value: 640 },
    { name: "Museums & galleries", value: 500 },
    { name: "Sport England", value: 350 },
    { name: "Historic England & Heritage", value: 250 },
    { name: "Channel 4 & S4C", value: 100 },
  ], 8610, "Other (Gambling Commission, OFCOM, admin, broadband)"),
  "2021-22": withOther([
    { name: "BBC (licence fee)", value: 3750 },
    { name: "Arts Council England", value: 640 },
    { name: "Museums & galleries", value: 500 },
    { name: "COVID cultural recovery (wind-down)", value: 500 },
    { name: "Sport England", value: 350 },
    { name: "Historic England & Heritage", value: 250 },
    { name: "Channel 4 & S4C", value: 100 },
  ], 7696, "Other (Gambling Commission, OFCOM, admin, broadband)"),
  "2022-23": withOther([
    { name: "BBC (licence fee)", value: 3800 },
    { name: "Arts Council England", value: 640 },
    { name: "Museums & galleries", value: 500 },
    { name: "Sport England", value: 350 },
    { name: "Historic England & Heritage", value: 250 },
    { name: "Channel 4 & S4C", value: 100 },
  ], 8941, "Other (Gambling Commission, OFCOM, admin, broadband, AME)"),
  "2023-24": withOther([
    { name: "BBC (licence fee)", value: 3800 },
    { name: "Arts Council England", value: 640 },
    { name: "Museums & galleries", value: 480 },
    { name: "Sport England", value: 350 },
    { name: "Historic England & Heritage", value: 250 },
    { name: "Channel 4 & S4C", value: 100 },
  ], 7624, "Other (Gambling Commission, OFCOM, admin)"),
  "2024-25": withOther([
    { name: "BBC (licence fee)", value: 3900 },
    { name: "Arts Council England", value: 730 },
    { name: "Museums & galleries", value: 480 },
    { name: "Sport England", value: 350 },
    { name: "Historic England & Heritage", value: 250 },
    { name: "Channel 4 & S4C", value: 100 },
  ], 9049, "Other (Gambling Commission, OFCOM, admin, broadband)"),
});

// ── ENVIRONMENT, FOOD AND RURAL AFFAIRS (DEFRA) ──
// Sources: Defra ARAs, NAO overview, RPA farm payments data.
// Farm payments transitioning from EU CAP to domestic ELM schemes.
// Environment Agency (flood defence) is ~£1.5bn.
setBreakdown("Environment, Food", {
  "2020-21": withOther([
    { name: "Farm payments (BPS/ELM)", value: 2400 },
    { name: "Environment Agency (flood defence)", value: 1200 },
    { name: "Natural England", value: 250 },
    { name: "Rural Payments Agency", value: 200 },
    { name: "Animal & Plant Health Agency", value: 180 },
    { name: "Forestry Commission", value: 120 },
  ], 4721, "Other (water, waste, marine, admin)"),
  "2021-22": withOther([
    { name: "Farm payments (BPS/ELM)", value: 2500 },
    { name: "Environment Agency (flood defence)", value: 1500 },
    { name: "Natural England", value: 260 },
    { name: "Rural Payments Agency", value: 200 },
    { name: "Animal & Plant Health Agency", value: 200 },
    { name: "Forestry Commission", value: 130 },
  ], 5854, "Other (water, waste, marine, admin)"),
  "2022-23": withOther([
    { name: "Farm payments (BPS/ELM transition)", value: 2500 },
    { name: "Environment Agency (flood defence)", value: 1500 },
    { name: "Natural England", value: 270 },
    { name: "Rural Payments Agency", value: 200 },
    { name: "Animal & Plant Health Agency", value: 200 },
    { name: "Forestry Commission", value: 130 },
  ], 5481, "Other (water, waste, marine, admin)"),
  "2023-24": withOther([
    { name: "Farm payments (ELM/delinked)", value: 2600 },
    { name: "Environment Agency (flood defence)", value: 1700 },
    { name: "Natural England", value: 300 },
    { name: "Animal & Plant Health Agency", value: 220 },
    { name: "Rural Payments Agency", value: 200 },
    { name: "Forestry Commission", value: 140 },
  ], 8188, "Other (water, waste, marine, admin, AME provisions)"),
  "2024-25": withOther([
    { name: "Farm payments (ELM/delinked)", value: 2600 },
    { name: "Environment Agency (flood defence)", value: 1700 },
    { name: "Natural England", value: 300 },
    { name: "Animal & Plant Health Agency", value: 230 },
    { name: "Rural Payments Agency", value: 200 },
    { name: "Forestry Commission", value: 140 },
  ], 6012, "Other (water, waste, marine, admin)"),
});

// ── LAW OFFICERS' DEPARTMENTS ──
// Sources: CPS ARAs 2020-25, SFO ARAs, GLD/HM Procurator General ARAs, PESA.
// CPS dominates. GLD operates on cost-recovery (declining net TME). SFO growing.
setBreakdown("Law Officers", {
  "2020-21": [
    { name: "Crown Prosecution Service", value: 442 },
    { name: "Government Legal Department", value: 169 },
    { name: "Attorney General's Office & HMCPSI", value: 7 },
  ],
  "2021-22": [
    { name: "Crown Prosecution Service", value: 465 },
    { name: "Government Legal Department", value: 161 },
    { name: "Serious Fraud Office", value: 49 },
    { name: "Attorney General's Office & HMCPSI", value: 7 },
  ],
  "2022-23": [
    { name: "Crown Prosecution Service", value: 569 },
    { name: "Government Legal Department", value: 149 },
    { name: "Serious Fraud Office", value: 51 },
    { name: "Attorney General's Office & HMCPSI", value: 8 },
  ],
  "2023-24": [
    { name: "Crown Prosecution Service", value: 686 },
    { name: "Government Legal Department", value: 134 },
    { name: "Serious Fraud Office", value: 72 },
    { name: "Attorney General's Office & HMCPSI", value: 8 },
  ],
  "2024-25": [
    { name: "Crown Prosecution Service", value: 751 },
    { name: "Government Legal Department", value: 97 },
    { name: "Serious Fraud Office", value: 90 },
    { name: "Attorney General's Office & HMCPSI", value: 8 },
  ],
});

// ── SMALL AND INDEPENDENT BODIES ──
// Sources: PESA Chapter 4, individual body ARAs.
// Aggregates ~30+ small bodies. UKEF is volatile (AME provisions).
// NCA is under Home Office, not here.
setBreakdown("Small and Independent", {
  "2020-21": withOther([
    { name: "UK Export Finance", value: 1252 },
    { name: "UK Statistics Authority (ONS)", value: 467 },
    { name: "Electoral Commission", value: 145 },
    { name: "Food Standards Agency", value: 133 },
    { name: "Competition & Markets Authority", value: 95 },
    { name: "Ofwat", value: 36 },
    { name: "Charity Commission", value: 30 },
  ], 4365, "Other (tribunals, ombudsmen, small bodies)"),
  "2021-22": withOther([
    { name: "UK Export Finance", value: 1203 },
    { name: "UK Statistics Authority (ONS)", value: 516 },
    { name: "Food Standards Agency", value: 144 },
    { name: "Competition & Markets Authority", value: 102 },
    { name: "Ofwat", value: 38 },
    { name: "Electoral Commission", value: 33 },
    { name: "Charity Commission", value: 31 },
  ], 2877, "Other (tribunals, ombudsmen, small bodies)"),
  "2022-23": withOther([
    { name: "UK Export Finance", value: 1068 },
    { name: "UK Statistics Authority (ONS)", value: 478 },
    { name: "Food Standards Agency", value: 149 },
    { name: "Competition & Markets Authority", value: 110 },
    { name: "Ofwat", value: 40 },
    { name: "Charity Commission", value: 32 },
    { name: "Electoral Commission", value: 31 },
  ], 2466, "Other (tribunals, ombudsmen, small bodies)"),
  "2023-24": withOther([
    { name: "UK Export Finance", value: 1002 },
    { name: "UK Statistics Authority (ONS)", value: 395 },
    { name: "Electoral Commission", value: 167 },
    { name: "Food Standards Agency", value: 153 },
    { name: "Competition & Markets Authority", value: 122 },
    { name: "Ofwat", value: 43 },
    { name: "Charity Commission", value: 34 },
  ], 3124, "Other (tribunals, ombudsmen, small bodies)"),
  "2024-25": withOther([
    { name: "UK Export Finance", value: 834 },
    { name: "UK Statistics Authority (ONS)", value: 401 },
    { name: "Food Standards Agency", value: 161 },
    { name: "Competition & Markets Authority", value: 130 },
    { name: "Ofwat", value: 45 },
    { name: "Electoral Commission", value: 42 },
    { name: "Charity Commission", value: 36 },
  ], 2921, "Other (tribunals, ombudsmen, small bodies)"),
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('\nDone. Written to', file);
