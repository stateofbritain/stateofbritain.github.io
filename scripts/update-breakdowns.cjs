#!/usr/bin/env node
// One-shot script to convert flat breakdown arrays to year-keyed objects
// Using data from departmental annual reports research

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
  // Verify totals
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

// Helper: given named items and a total, compute "Other" as residual
function withOther(items, total, otherName = "Other") {
  const named = items.reduce((s, d) => s + d.value, 0);
  const other = total - named;
  if (other > 0) items.push({ name: otherName, value: other });
  return items;
}

// ── MINISTRY OF JUSTICE (high confidence – from MoJ ARA core tables) ──
setBreakdown("Justice", {
  "2020-21": withOther([
    { name: "HM Prison & Probation Service", value: 4600 },
    { name: "HM Courts & Tribunals Service", value: 1866 },
    { name: "Legal Aid Agency", value: 1550 },
    { name: "Youth Justice Board", value: 86 },
  ], 10049, "Other (admin, judicial, CICA)"),
  "2021-22": withOther([
    { name: "HM Prison & Probation Service", value: 4241 },
    { name: "HM Courts & Tribunals Service", value: 2040 },
    { name: "Legal Aid Agency", value: 1787 },
    { name: "Youth Justice Board", value: 94 },
  ], 10677, "Other (admin, judicial, CICA)"),
  "2022-23": withOther([
    { name: "HM Prison & Probation Service", value: 4642 },
    { name: "HM Courts & Tribunals Service", value: 2117 },
    { name: "Legal Aid Agency", value: 1912 },
    { name: "Youth Justice Board", value: 101 },
  ], 10903, "Other (admin, judicial, CICA)"),
  "2023-24": withOther([
    { name: "HM Prison & Probation Service", value: 5306 },
    { name: "HM Courts & Tribunals Service", value: 2294 },
    { name: "Legal Aid Agency", value: 2155 },
    { name: "Youth Justice Board", value: 105 },
  ], 12554, "Other (admin, judicial, CICA)"),
  "2024-25": withOther([
    { name: "HM Prison & Probation Service", value: 5676 },
    { name: "HM Courts & Tribunals Service", value: 2397 },
    { name: "Legal Aid Agency", value: 2279 },
    { name: "Youth Justice Board", value: 104 },
  ], 13576, "Other (admin, judicial, CICA)"),
});

// ── HOME OFFICE (estimates from ARAs, IFS, NAO) ──
setBreakdown("Home Office", {
  "2020-21": withOther([
    { name: "Police & counter-terrorism", value: 10700 },
    { name: "Immigration & asylum", value: 2100 },
    { name: "Border Force", value: 800 },
    { name: "Fire & rescue", value: 520 },
  ], 17680, "Other (passports, admin)"),
  "2021-22": withOther([
    { name: "Police & counter-terrorism", value: 11200 },
    { name: "Immigration & asylum", value: 2500 },
    { name: "Border Force", value: 900 },
    { name: "Fire & rescue", value: 700 },
  ], 17716, "Other (passports, admin)"),
  "2022-23": withOther([
    { name: "Police & counter-terrorism", value: 11600 },
    { name: "Immigration & asylum", value: 4400 },
    { name: "Border Force", value: 950 },
    { name: "Fire & rescue", value: 420 },
  ], 20000, "Other (passports, admin)"),
  "2023-24": withOther([
    { name: "Police & counter-terrorism", value: 12200 },
    { name: "Immigration & asylum", value: 7000 },
    { name: "Border Force", value: 1000 },
    { name: "Fire & rescue", value: 430 },
  ], 23363, "Other (passports, admin)"),
  "2024-25": withOther([
    { name: "Police & counter-terrorism", value: 12500 },
    { name: "Immigration & asylum", value: 5800 },
    { name: "Border Force", value: 1050 },
    { name: "Fire & rescue", value: 440 },
  ], 22508, "Other (passports, admin)"),
});

// ── FCDO (from Estimates Memoranda) ──
setBreakdown("Foreign, Commonwealth and Development Office", {
  "2020-21": withOther([
    { name: "Official Development Assistance", value: 6800 },
    { name: "Diplomatic network & estates", value: 1624 },
    { name: "Conflict, stability & security", value: 928 },
    { name: "Multilateral subscriptions", value: 314 },
    { name: "British Council", value: 283 },
  ], 13865, "Other (EU aid, admin, AME)"),
  "2021-22": withOther([
    { name: "Official Development Assistance", value: 4500 },
    { name: "Diplomatic network & estates", value: 1827 },
    { name: "Conflict, stability & security", value: 702 },
    { name: "Multilateral subscriptions", value: 323 },
    { name: "British Council", value: 203 },
  ], 9687, "Other (EU aid, admin, AME)"),
  "2022-23": withOther([
    { name: "Official Development Assistance", value: 3600 },
    { name: "Diplomatic network & estates", value: 2323 },
    { name: "Conflict, stability & security", value: 673 },
    { name: "Multilateral subscriptions", value: 334 },
    { name: "EU Attributed Aid", value: 552 },
    { name: "British Council", value: 246 },
  ], 10103, "Other (admin, AME)"),
  "2023-24": withOther([
    { name: "Official Development Assistance", value: 4700 },
    { name: "Diplomatic network & estates", value: 2210 },
    { name: "Conflict, stability & security", value: 741 },
    { name: "Multilateral subscriptions", value: 368 },
    { name: "EU Attributed Aid", value: 434 },
    { name: "British Council", value: 231 },
  ], 11763, "Other (admin, AME)"),
  "2024-25": withOther([
    { name: "Official Development Assistance", value: 5600 },
    { name: "Diplomatic network & estates", value: 1595 },
    { name: "Conflict, stability & security", value: 739 },
    { name: "Multilateral subscriptions", value: 388 },
    { name: "EU Attributed Aid", value: 251 },
    { name: "British Council", value: 166 },
  ], 12099, "Other (admin, AME)"),
});

// ── HMRC (from SOPS, Annual Reports, NAO) ──
setBreakdown("HM Revenue and Customs", {
  "2020-21": [
    { name: "COVID support (CJRS, SEISS, EOTHO)", value: 81200 },
    { name: "Tax credits (legacy)", value: 15600 },
    { name: "Child Benefit", value: 11600 },
    { name: "Tax reliefs & allowances", value: 6500 },
    { name: "HMRC running costs", value: 5300 },
    { name: "Other", value: 1367 },
  ],
  "2021-22": [
    { name: "COVID support (CJRS, SEISS)", value: 16500 },
    { name: "Tax reliefs & allowances", value: 11700 },
    { name: "Child Benefit", value: 11400 },
    { name: "Tax credits (legacy)", value: 10600 },
    { name: "HMRC running costs", value: 6400 },
    { name: "Other", value: 1709 },
  ],
  "2022-23": [
    { name: "Tax reliefs & allowances", value: 12600 },
    { name: "Child Benefit", value: 11600 },
    { name: "Tax credits (legacy)", value: 8800 },
    { name: "HMRC running costs", value: 6900 },
    { name: "Other", value: 637 },
  ],
  "2023-24": [
    { name: "Tax reliefs & allowances", value: 13300 },
    { name: "Child Benefit", value: 12500 },
    { name: "Tax credits (legacy)", value: 7300 },
    { name: "HMRC running costs", value: 6500 },
    { name: "Other", value: 368 },
  ],
  "2024-25": [
    { name: "Child Benefit", value: 13300 },
    { name: "Tax reliefs & allowances", value: 10100 },
    { name: "HMRC running costs", value: 6600 },
    { name: "Tax credits (legacy)", value: 2700 },
    { name: "Other", value: 1412 },
  ],
});

// ── DEFENCE (from MOD Departmental Resources, scaled to PESA TME) ──
setBreakdown("Defence", {
  "2020-21": withOther([
    { name: "Personnel", value: 13400 },
    { name: "Equipment procurement", value: 7700 },
    { name: "Equipment support", value: 7500 },
    { name: "Defence Nuclear Enterprise", value: 5600 },
    { name: "Infrastructure", value: 4500 },
    { name: "R&D", value: 1100 },
    { name: "Operations & peacekeeping", value: 500 },
  ], 50980, "Other (war pensions, AME, admin)"),
  "2021-22": withOther([
    { name: "Personnel", value: 13700 },
    { name: "Equipment procurement", value: 8500 },
    { name: "Equipment support", value: 7800 },
    { name: "Defence Nuclear Enterprise", value: 6200 },
    { name: "Infrastructure", value: 5200 },
    { name: "R&D", value: 1300 },
    { name: "Operations & peacekeeping", value: 800 },
  ], 63431, "Other (war pensions, AME, admin)"),
  "2022-23": withOther([
    { name: "Personnel", value: 13800 },
    { name: "Equipment procurement", value: 9200 },
    { name: "Equipment support", value: 8200 },
    { name: "Defence Nuclear Enterprise", value: 6500 },
    { name: "Infrastructure", value: 5000 },
    { name: "Operations & peacekeeping", value: 2900 },
    { name: "R&D", value: 1848 },
  ], 47448, "Other (war pensions, AME, admin)"),
  "2023-24": withOther([
    { name: "Personnel", value: 14500 },
    { name: "Equipment procurement", value: 9700 },
    { name: "Defence Nuclear Enterprise", value: 9400 },
    { name: "Equipment support", value: 8500 },
    { name: "Infrastructure", value: 5000 },
    { name: "R&D", value: 2600 },
    { name: "Operations & peacekeeping", value: 2600 },
  ], 57627, "Other (war pensions, AME, admin)"),
  "2024-25": withOther([
    { name: "Personnel", value: 15800 },
    { name: "Defence Nuclear Enterprise", value: 10900 },
    { name: "Equipment procurement", value: 10600 },
    { name: "Equipment support", value: 9300 },
    { name: "Infrastructure", value: 5200 },
    { name: "Operations & peacekeeping", value: 3400 },
    { name: "R&D", value: 3100 },
  ], 71534, "Other (war pensions, AME, admin)"),
});

// ── SCOTTISH GOVERNMENT ──
setBreakdown("Scottish Government", {
  "2020-21": withOther([
    { name: "Health & Social Care", value: 15500 },
    { name: "Local government", value: 11600 },
    { name: "Social Security & benefits", value: 3800 },
    { name: "Transport", value: 3700 },
    { name: "Education & Skills", value: 3200 },
    { name: "Justice", value: 2900 },
  ], 61653, "Other portfolios"),
  "2021-22": withOther([
    { name: "Health & Social Care", value: 17100 },
    { name: "Local government", value: 11800 },
    { name: "Social Security & benefits", value: 3900 },
    { name: "Transport", value: 3800 },
    { name: "Education & Skills", value: 3400 },
    { name: "Justice", value: 2900 },
  ], 61641, "Other portfolios"),
  "2022-23": withOther([
    { name: "Health & Social Care", value: 18200 },
    { name: "Local government", value: 12200 },
    { name: "Transport", value: 4300 },
    { name: "Social Security & benefits", value: 4200 },
    { name: "Education & Skills", value: 3500 },
    { name: "Justice", value: 3000 },
  ], 65283, "Other portfolios"),
  "2023-24": withOther([
    { name: "Health & Social Care", value: 19100 },
    { name: "Local government", value: 12400 },
    { name: "Social Security & benefits", value: 4800 },
    { name: "Transport", value: 3900 },
    { name: "Education & Skills", value: 3600 },
    { name: "Justice", value: 3100 },
  ], 64668, "Other portfolios"),
  "2024-25": withOther([
    { name: "Health & Social Care", value: 20600 },
    { name: "Local government", value: 13000 },
    { name: "Social Security & benefits", value: 5700 },
    { name: "Transport", value: 4200 },
    { name: "Education & Skills", value: 3900 },
    { name: "Justice", value: 3600 },
  ], 70986, "Other portfolios"),
});

// ── WELSH GOVERNMENT ──
setBreakdown("Welsh Government", {
  "2020-21": withOther([
    { name: "Health & Social Services", value: 9800 },
    { name: "Local government settlement", value: 5100 },
    { name: "Education & Welsh Language", value: 2500 },
    { name: "Climate Change (transport, housing)", value: 2500 },
    { name: "Economy", value: 600 },
  ], 24304, "Other portfolios"),
  "2021-22": withOther([
    { name: "Health & Social Services", value: 9600 },
    { name: "Local government settlement", value: 4700 },
    { name: "Education & Welsh Language", value: 2400 },
    { name: "Climate Change (transport, housing)", value: 2200 },
    { name: "Economy", value: 500 },
  ], 22865, "Other portfolios"),
  "2022-23": withOther([
    { name: "Health & Social Services", value: 10200 },
    { name: "Local government settlement", value: 4300 },
    { name: "Education & Welsh Language", value: 2300 },
    { name: "Climate Change (transport, housing)", value: 1700 },
    { name: "Economy", value: 500 },
  ], 21638, "Other portfolios"),
  "2023-24": withOther([
    { name: "Health & Social Services", value: 11200 },
    { name: "Local government settlement", value: 4600 },
    { name: "Education & Welsh Language", value: 2600 },
    { name: "Climate Change (transport, housing)", value: 2100 },
    { name: "Economy", value: 500 },
  ], 24095, "Other portfolios"),
  "2024-25": withOther([
    { name: "Health & Social Services", value: 12200 },
    { name: "Local government settlement", value: 4900 },
    { name: "Education & Welsh Language", value: 2800 },
    { name: "Climate Change (transport, housing)", value: 2400 },
    { name: "Economy", value: 600 },
  ], 25370, "Other portfolios"),
});

// ── NORTHERN IRELAND EXECUTIVE ──
setBreakdown("Northern Ireland Executive", {
  "2020-21": withOther([
    { name: "Health", value: 6900 },
    { name: "Communities", value: 3500 },
    { name: "Finance & economy", value: 2800 },
    { name: "Education", value: 2400 },
    { name: "Infrastructure", value: 1600 },
    { name: "Justice", value: 1200 },
  ], 27350, "Other departments"),
  "2021-22": withOther([
    { name: "Health", value: 7000 },
    { name: "Communities", value: 3400 },
    { name: "Finance & economy", value: 2600 },
    { name: "Education", value: 2500 },
    { name: "Infrastructure", value: 1500 },
    { name: "Justice", value: 1200 },
  ], 27026, "Other departments"),
  "2022-23": withOther([
    { name: "Health", value: 7300 },
    { name: "Communities", value: 3300 },
    { name: "Finance & economy", value: 2800 },
    { name: "Education", value: 2600 },
    { name: "Infrastructure", value: 1400 },
    { name: "Justice", value: 1200 },
  ], 27690, "Other departments"),
  "2023-24": withOther([
    { name: "Health", value: 7600 },
    { name: "Communities", value: 3200 },
    { name: "Finance & economy", value: 2900 },
    { name: "Education", value: 2700 },
    { name: "Infrastructure", value: 1500 },
    { name: "Justice", value: 1300 },
  ], 28951, "Other departments"),
  "2024-25": withOther([
    { name: "Health", value: 8200 },
    { name: "Communities", value: 3300 },
    { name: "Finance & economy", value: 3200 },
    { name: "Education", value: 2900 },
    { name: "Infrastructure", value: 1600 },
    { name: "Justice", value: 1400 },
  ], 31617, "Other departments"),
});

// Write back
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log('\nDone. Written to', file);
