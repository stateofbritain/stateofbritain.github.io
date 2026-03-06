/**
 * fetch-infrastructure.js
 *
 * Curates and assembles UK infrastructure data from multiple sources:
 *
 *  1. Ofcom Connected Nations (curated from annual reports)
 *     - Full-fibre (FTTP) coverage time series, 2018-2025
 *     - Gigabit-capable coverage time series, 2019-2025
 *     - Average broadband speeds, 2018-2023
 *     - 4G/5G mobile coverage
 *
 *  2. ORR Passenger Journeys (downloaded, Table 1220)
 *     - Annual passenger journeys in millions
 *
 *  3. ORR Rail Punctuality (curated from ORR published statistics)
 *     - PPM and On Time percentages by financial year
 *
 *  4. DfT Road Traffic (downloaded, TRA0101)
 *     - Billion vehicle miles by type
 *
 *  5. DfT Road Condition (curated from RDC0120)
 *     - % of roads where maintenance should be considered
 *
 * Outputs: public/data/infrastructure.json
 */
import { writeFileSync } from "fs";
import { Buffer } from "buffer";
import https from "https";
import http from "http";
import XLSX from "xlsx";

function download(url) {
  return new Promise((resolve, reject) => {
    const get = (u, redirects = 0) => {
      if (redirects > 5) return reject(new Error("Too many redirects"));
      const parsed = new URL(u);
      const mod = parsed.protocol === "http:" ? http : https;
      mod.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: { "User-Agent": "StateOfBritain/1.0 (data fetch script)" },
        },
        (res) => {
          if ([301, 302, 303, 307].includes(res.statusCode)) {
            res.resume();
            return get(res.headers.location, redirects + 1);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} from ${u}`));
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
          res.on("error", reject);
        }
      );
    };
    get(url);
  });
}

// ── Ofcom Broadband (curated from Connected Nations reports) ─────
// Source: Ofcom Connected Nations 2018-2025 annual + spring updates
// Each data point is the September snapshot unless noted
const BROADBAND = {
  fttp: [
    { date: "Sep 2018", year: 2018, pct: 6, premises: 1.5 },
    { date: "Sep 2019", year: 2019, pct: 10, premises: 3.0 },
    { date: "Sep 2020", year: 2020, pct: 18, premises: 5.1 },
    { date: "Sep 2021", year: 2021, pct: 28, premises: 8.2 },
    { date: "Sep 2022", year: 2022, pct: 42, premises: 12.4 },
    { date: "Sep 2023", year: 2023, pct: 57, premises: 17.1 },
    { date: "Jul 2024", year: 2024, pct: 69, premises: 20.7 },
    { date: "Jul 2025", year: 2025, pct: 78, premises: 23.7 },
  ],
  gigabit: [
    { date: "Sep 2019", year: 2019, pct: 10 },
    { date: "Sep 2020", year: 2020, pct: 27 },
    { date: "Sep 2021", year: 2021, pct: 47 },
    { date: "Sep 2022", year: 2022, pct: 70 },
    { date: "Sep 2023", year: 2023, pct: 78 },
    { date: "Jul 2024", year: 2024, pct: 84 },
    { date: "Jul 2025", year: 2025, pct: 87 },
  ],
  speeds: [
    { year: 2018, medianDown: 37.0, medianUp: 6.0 },
    { year: 2019, medianDown: 42.1, medianUp: 9.3 },
    { year: 2020, medianDown: 50.0, medianUp: 9.8 },
    { year: 2021, medianDown: 50.4, medianUp: 9.8 },
    { year: 2022, medianDown: 59.4, medianUp: 10.7 },
    { year: 2023, medianDown: 69.4, medianUp: 18.4 },
  ],
  mobile4g: [
    { year: 2019, landmassPct: 91 },
    { year: 2020, landmassPct: 92 },
    { year: 2021, landmassPct: 92 },
    { year: 2022, landmassPct: 93 },
    { year: 2023, landmassPct: 95 },
    { year: 2024, landmassPct: 96 },
    { year: 2025, landmassPct: 96 },
  ],
};

// ── ORR Rail Punctuality (curated from ORR published statistics) ─
// Source: ORR Passenger rail performance statistics
// PPM = Public Performance Measure (within 5 min for commuter, 10 min for long-distance)
// On Time = within 1 minute of scheduled time
// "All operators" figures, financial year averages
const RAIL_PUNCTUALITY = [
  { fy: "2013-14", year: 2013, ppm: 90.1, onTime: null },
  { fy: "2014-15", year: 2014, ppm: 89.7, onTime: null },
  { fy: "2015-16", year: 2015, ppm: 89.1, onTime: null },
  { fy: "2016-17", year: 2016, ppm: 87.8, onTime: null },
  { fy: "2017-18", year: 2017, ppm: 87.7, onTime: null },
  { fy: "2018-19", year: 2018, ppm: 86.4, onTime: 65.2 },
  { fy: "2019-20", year: 2019, ppm: 87.8, onTime: 67.2 },
  { fy: "2020-21", year: 2020, ppm: 93.9, onTime: 74.0 },
  { fy: "2021-22", year: 2021, ppm: 88.4, onTime: 67.0 },
  { fy: "2022-23", year: 2022, ppm: 85.9, onTime: 61.4 },
  { fy: "2023-24", year: 2023, ppm: 87.8, onTime: 65.5 },
  { fy: "2024-25", year: 2024, ppm: 88.6, onTime: 67.5 },
];

// ── ORR Passenger Journeys ──────────────────────────────────────
// Source: ORR Data Portal Table 1220
const ORR_JOURNEYS_URL =
  "https://dataportal.orr.gov.uk/media/1652/table-1220-passenger-journeys.ods";

function parseORRJourneys(buf) {
  const wb = XLSX.read(buf);
  const sheetNames = wb.SheetNames;
  console.log("  ORR Journeys sheets:", sheetNames.join(", "));

  // Find the sheet with passenger journeys
  let sheetName = sheetNames.find((s) => s.includes("1220")) || sheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

  const series = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row[0]) continue;
    const label = String(row[0]).trim();
    // Match "Apr YYYY to Mar YYYY" pattern
    const fyMatch = label.match(/^Apr (\d{4}) to Mar (\d{4})/);
    if (fyMatch) {
      const startYear = parseInt(fyMatch[1], 10);
      const fy = `${startYear}-${String(parseInt(fyMatch[2], 10)).slice(2)}`;
      // Total journeys — look for a numeric value in millions
      for (let c = 1; c < row.length; c++) {
        if (typeof row[c] === "number" && row[c] > 100) {
          series.push({
            fy,
            year: startYear,
            journeysMn: Math.round(row[c] * 10) / 10,
          });
          break;
        }
      }
    }
  }
  return series;
}

// ── DfT Road Traffic (billion vehicle miles) ─────────────────────
// Source: DfT TRA0101 — Road traffic by vehicle type
const DFT_TRAFFIC_URL =
  "https://assets.publishing.service.gov.uk/media/684963fd3a2aa5ba84d1dede/tra0101-miles-by-vehicle-type.ods";

function parseDfTTraffic(buf) {
  const wb = XLSX.read(buf);
  const sheetNames = wb.SheetNames;
  console.log("  DfT Traffic sheets:", sheetNames.join(", "));

  // Find the TRA0101 sheet
  let sheetName = sheetNames.find((s) => s.includes("TRA0101")) || sheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

  const series = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const yr = row[0];
    if (typeof yr === "number" && yr >= 2000 && yr <= 2030) {
      // Column layout from TRA0101:
      // 0=Year, 1=Pedal cycles, 2=Motorcycles, 3=Cars&taxis, 4=Buses&coaches,
      // 5=LCVs, 6=HGVs, 7=All HGVs, 8=Other, 9=All motor vehicles
      const entry = { year: yr };
      if (typeof row[3] === "number") entry.cars = Math.round(row[3] * 10) / 10;
      if (typeof row[5] === "number") entry.lcvs = Math.round(row[5] * 10) / 10;
      if (typeof row[7] === "number") entry.hgvs = Math.round(row[7] * 10) / 10;
      if (typeof row[4] === "number") entry.buses = Math.round(row[4] * 10) / 10;
      // All motor vehicles — try col 9, fall back to last numeric
      let total = null;
      if (typeof row[9] === "number" && row[9] > 100) {
        total = Math.round(row[9] * 10) / 10;
      } else {
        for (let c = row.length - 1; c >= 1; c--) {
          if (typeof row[c] === "number" && row[c] > 100) {
            total = Math.round(row[c] * 10) / 10;
            break;
          }
        }
      }
      if (total) {
        entry.totalBnMiles = total;
        series.push(entry);
      }
    }
  }
  return series;
}

// ── DfT Road Condition ───────────────────────────────────────────
// Source: DfT Road Conditions in England, Table RDC0120
// "% of roads where maintenance should be considered"
const ROAD_CONDITION = [
  { year: 2010, aRoadsPoor: 6, bAndcPoor: 8, unclassifiedPoor: 14 },
  { year: 2011, aRoadsPoor: 5, bAndcPoor: 7, unclassifiedPoor: 15 },
  { year: 2012, aRoadsPoor: 4, bAndcPoor: 6, unclassifiedPoor: 15 },
  { year: 2013, aRoadsPoor: 3, bAndcPoor: 6, unclassifiedPoor: 16 },
  { year: 2014, aRoadsPoor: 3, bAndcPoor: 6, unclassifiedPoor: 17 },
  { year: 2015, aRoadsPoor: 3, bAndcPoor: 6, unclassifiedPoor: 16 },
  { year: 2016, aRoadsPoor: 3, bAndcPoor: 6, unclassifiedPoor: 17 },
  { year: 2017, aRoadsPoor: 4, bAndcPoor: 6, unclassifiedPoor: 17 },
  { year: 2018, aRoadsPoor: 4, bAndcPoor: 6, unclassifiedPoor: 17 },
  { year: 2019, aRoadsPoor: 4, bAndcPoor: 7, unclassifiedPoor: 17 },
  { year: 2020, aRoadsPoor: 3, bAndcPoor: 6, unclassifiedPoor: 16 },
  { year: 2021, aRoadsPoor: 3, bAndcPoor: 6, unclassifiedPoor: 16 },
  { year: 2022, aRoadsPoor: 4, bAndcPoor: 7, unclassifiedPoor: 17 },
  { year: 2023, aRoadsPoor: 4, bAndcPoor: 7, unclassifiedPoor: 18 },
  { year: 2024, aRoadsPoor: 4, bAndcPoor: 7, unclassifiedPoor: 19 },
];

async function main() {
  console.log("Broadband data: curated from Ofcom Connected Nations reports");
  console.log(`  → FTTP: ${BROADBAND.fttp.length} data points (${BROADBAND.fttp[0].year}-${BROADBAND.fttp[BROADBAND.fttp.length - 1].year})`);
  console.log(`  → Gigabit: ${BROADBAND.gigabit.length} data points`);
  console.log(`  → Speeds: ${BROADBAND.speeds.length} years`);
  console.log(`  → Mobile 4G: ${BROADBAND.mobile4g.length} years`);

  console.log(`\nRail punctuality: ${RAIL_PUNCTUALITY.length} years (curated from ORR)`);

  // Download ORR journeys
  let railJourneys = [];
  try {
    console.log("\nDownloading ORR passenger journeys (Table 1220)...");
    const orrBuf = await download(ORR_JOURNEYS_URL);
    railJourneys = parseORRJourneys(orrBuf);
    console.log(`  → ${railJourneys.length} years of journey data`);
  } catch (err) {
    console.warn("  Warning: Could not download ORR journeys:", err.message);
  }

  // Download DfT traffic data
  let roadTraffic = [];
  try {
    console.log("\nDownloading DfT road traffic (TRA0101)...");
    const dftBuf = await download(DFT_TRAFFIC_URL);
    roadTraffic = parseDfTTraffic(dftBuf);
    console.log(`  → ${roadTraffic.length} years of traffic data`);
  } catch (err) {
    console.warn("  Warning: Could not download DfT traffic:", err.message);
  }

  console.log(`\nRoad condition: ${ROAD_CONDITION.length} years (curated from DfT RDC0120)`);

  const output = {
    meta: {
      sources: [
        {
          name: "Ofcom Connected Nations 2018-2025",
          url: "https://www.ofcom.org.uk/research-and-data/telecoms-research/connected-nations",
          note: "FTTP, gigabit, speeds, and mobile coverage curated from annual and spring update reports.",
        },
        {
          name: "ORR Data Portal - Passenger Journeys (Table 1220) & Rail Performance",
          url: "https://dataportal.orr.gov.uk/",
          note: "Journeys downloaded from Table 1220 ODS. Punctuality (PPM, On Time) curated from ORR published statistics.",
        },
        {
          name: "DfT Road Traffic (TRA0101) & Road Conditions (RDC0120)",
          url: "https://www.gov.uk/government/statistical-data-sets/road-traffic-statistics-tra",
          note: "Traffic downloaded from TRA0101 ODS. Road condition curated from published tables.",
        },
      ],
      generated: new Date().toISOString().slice(0, 10),
    },
    broadband: BROADBAND,
    rail: {
      punctuality: RAIL_PUNCTUALITY,
      journeys: railJourneys,
    },
    roads: {
      condition: ROAD_CONDITION,
      traffic: roadTraffic,
    },
  };

  writeFileSync("public/data/infrastructure.json", JSON.stringify(output, null, 2));
  console.log("\n✓ Written public/data/infrastructure.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
