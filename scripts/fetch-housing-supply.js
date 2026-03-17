/**
 * fetch-housing-supply.js
 *
 * UK housebuilding data from official sources:
 *  - DLUHC Live Table 120: Net additional dwellings, England
 *  - DLUHC Live Table 213: New build completions by tenure
 *  - NHBC/LABC: Average new build floor area
 *  - International comparison of new build sizes
 *
 * Outputs: public/data/housing-supply.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";

// ── Net additional dwellings, England ─────────────────────────────────
// Source: DLUHC Live Table 120 — net additional dwellings
const netAdditions = [
  { year: "2001-02", dwellings: 129860 },
  { year: "2002-03", dwellings: 137740 },
  { year: "2003-04", dwellings: 143960 },
  { year: "2004-05", dwellings: 155890 },
  { year: "2005-06", dwellings: 163400 },
  { year: "2006-07", dwellings: 185030 },
  { year: "2007-08", dwellings: 207370 },
  { year: "2008-09", dwellings: 182770 },
  { year: "2009-10", dwellings: 144870 },
  { year: "2010-11", dwellings: 137280 },
  { year: "2011-12", dwellings: 134900 },
  { year: "2012-13", dwellings: 124720 },
  { year: "2013-14", dwellings: 136610 },
  { year: "2014-15", dwellings: 170690 },
  { year: "2015-16", dwellings: 189650 },
  { year: "2016-17", dwellings: 217350 },
  { year: "2017-18", dwellings: 222190 },
  { year: "2018-19", dwellings: 241880 },
  { year: "2019-20", dwellings: 243770 },
  { year: "2020-21", dwellings: 216490 },
  { year: "2021-22", dwellings: 232820 },
  { year: "2022-23", dwellings: 234400 },
  { year: "2023-24", dwellings: 221070 },
  { year: "2024-25", dwellings: 208600 },
];

// ── New build completions by tenure, England ──────────────────────────
// Source: DLUHC Live Table 213 — permanent dwellings completed by tenure
const completionsByTenure = [
  { year: "2001-02", private: 129550, housingAssociation: 17990, localAuthority: 220,  total: 147760 },
  { year: "2002-03", private: 131680, housingAssociation: 16670, localAuthority: 310,  total: 148660 },
  { year: "2003-04", private: 137280, housingAssociation: 16060, localAuthority: 210,  total: 153550 },
  { year: "2004-05", private: 145410, housingAssociation: 18700, localAuthority: 150,  total: 164260 },
  { year: "2005-06", private: 143760, housingAssociation: 21830, localAuthority: 300,  total: 165890 },
  { year: "2006-07", private: 147820, housingAssociation: 21630, localAuthority: 280,  total: 169730 },
  { year: "2007-08", private: 148900, housingAssociation: 24230, localAuthority: 440,  total: 173570 },
  { year: "2008-09", private: 113340, housingAssociation: 24740, localAuthority: 560,  total: 138640 },
  { year: "2009-10", private: 93320,  housingAssociation: 25290, localAuthority: 690,  total: 119300 },
  { year: "2010-11", private: 88530,  housingAssociation: 27370, localAuthority: 2440, total: 118340 },
  { year: "2011-12", private: 90380,  housingAssociation: 23010, localAuthority: 2030, total: 115420 },
  { year: "2012-13", private: 84490,  housingAssociation: 23220, localAuthority: 1360, total: 109070 },
  { year: "2013-14", private: 94770,  housingAssociation: 19160, localAuthority: 1090, total: 115020 },
  { year: "2014-15", private: 112350, housingAssociation: 23810, localAuthority: 1070, total: 137230 },
  { year: "2015-16", private: 115900, housingAssociation: 26300, localAuthority: 1840, total: 144040 },
  { year: "2016-17", private: 121230, housingAssociation: 28810, localAuthority: 1760, total: 151800 },
  { year: "2017-18", private: 131420, housingAssociation: 30550, localAuthority: 2060, total: 164030 },
  { year: "2018-19", private: 138620, housingAssociation: 30380, localAuthority: 2500, total: 171500 },
  { year: "2019-20", private: 128340, housingAssociation: 30910, localAuthority: 2460, total: 161710 },
  { year: "2020-21", private: 124220, housingAssociation: 26990, localAuthority: 2780, total: 153990 },
  { year: "2021-22", private: 140410, housingAssociation: 27680, localAuthority: 3420, total: 171510 },
  { year: "2022-23", private: 131500, housingAssociation: 27560, localAuthority: 3660, total: 162720 },
  { year: "2023-24", private: 117700, housingAssociation: 22490, localAuthority: 3280, total: 143470 },
  { year: "2024-25", private: 135330, housingAssociation: 47650, localAuthority: 7620,  total: 190600 },
];

// ── Average new build floor area (sqm), UK ────────────────────────────
// Source: NHBC/LABC data; RIBA report "Space Standards for Homes"
const newBuildSize = [
  { year: 2003, avgSqm: 83 },
  { year: 2004, avgSqm: 82 },
  { year: 2005, avgSqm: 81 },
  { year: 2006, avgSqm: 80 },
  { year: 2007, avgSqm: 79 },
  { year: 2008, avgSqm: 79 },
  { year: 2009, avgSqm: 80 },
  { year: 2010, avgSqm: 79 },
  { year: 2011, avgSqm: 79 },
  { year: 2012, avgSqm: 78 },
  { year: 2013, avgSqm: 79 },
  { year: 2014, avgSqm: 79 },
  { year: 2015, avgSqm: 78 },
  { year: 2016, avgSqm: 78 },
  { year: 2017, avgSqm: 77 },
  { year: 2018, avgSqm: 77 },
  { year: 2019, avgSqm: 77 },
  { year: 2020, avgSqm: 77 },
  { year: 2021, avgSqm: 76 },
  { year: 2022, avgSqm: 76 },
  { year: 2023, avgSqm: 76 },
];

// ── International new build floor area comparison (sqm) ───────────────
// Source: Various national statistics agencies; CommSec Home Size Reports
const sizeIntl = [
  { country: "Australia", avgSqm: 229 },
  { country: "United States", avgSqm: 201 },
  { country: "New Zealand", avgSqm: 173 },
  { country: "Canada", avgSqm: 162 },
  { country: "Denmark", avgSqm: 137 },
  { country: "France", avgSqm: 112 },
  { country: "Germany", avgSqm: 109 },
  { country: "Japan", avgSqm: 95 },
  { country: "Ireland", avgSqm: 87 },
  { country: "United Kingdom", avgSqm: 76 },
  { country: "Hong Kong", avgSqm: 45 },
];

// ── Snapshot ───────────────────────────────────────────────────────────
const latestNet = netAdditions[netAdditions.length - 1];
const peakNet = netAdditions.reduce((a, b) => b.dwellings > a.dwellings ? b : a);
const latestComp = completionsByTenure[completionsByTenure.length - 1];
const latestSize = newBuildSize[newBuildSize.length - 1];

const snapshot = {
  netAdditions: latestNet.dwellings,
  netAdditionsYear: latestNet.year,
  netAdditionsPeak: peakNet.dwellings,
  netAdditionsPeakYear: peakNet.year,
  completionTotal: latestComp.total,
  completionTotalYear: latestComp.year,
  avgNewBuildSqm: latestSize.avgSqm,
  avgNewBuildSqmYear: latestSize.year,
};

// ── Output (sob-dataset-v1) ───────────────────────────────────────────
const output = {
  $schema: "sob-dataset-v1",
  id: "housing-supply",
  pillar: "foundations",
  topic: "housing",
  generated: new Date().toISOString().slice(0, 10),
  sources: [
    {
      id: "dluhc-table120",
      name: "DLUHC Live Table 120: Net additional dwellings",
      url: "https://www.gov.uk/government/statistical-data-sets/live-tables-on-net-supply-of-housing",
      publisher: "DLUHC",
    },
    {
      id: "dluhc-table213",
      name: "DLUHC Live Table 213: House building — permanent dwellings completed by tenure",
      url: "https://www.gov.uk/government/statistical-data-sets/live-tables-on-house-building",
      publisher: "DLUHC",
    },
    {
      id: "nhbc-labc",
      name: "NHBC/LABC new build floor area data",
      url: "https://www.nhbc.co.uk/",
      publisher: "NHBC",
      note: "Average internal floor area of new build dwellings",
    },
    {
      id: "commsec-intl",
      name: "CommSec Home Size Reports & national statistics agencies",
      url: "https://www.commsec.com.au/",
      publisher: "Various",
      note: "International comparison of average new build dwelling sizes",
    },
  ],
  snapshot,
  series: {
    netAdditions: {
      sourceId: "dluhc-table120",
      timeField: "year",
      data: netAdditions,
    },
    completionsByTenure: {
      sourceId: "dluhc-table213",
      timeField: "year",
      data: completionsByTenure,
    },
    newBuildSize: {
      sourceId: "nhbc-labc",
      timeField: "year",
      data: newBuildSize,
    },
    sizeIntl: {
      sourceId: "commsec-intl",
      timeField: "country",
      data: sizeIntl,
    },
  },
};

writeFileSync("public/data/housing-supply.json", JSON.stringify(output, null, 2));
console.log(
  `  housing-supply.json written (${netAdditions.length} net additions, ` +
  `${completionsByTenure.length} completions by tenure, ` +
  `${newBuildSize.length} new build size, ${sizeIntl.length} intl comparison)`
);
