/**
 * fetch-infrastructure.js
 *
 * Downloads and assembles UK infrastructure data from multiple sources:
 *
 *  1. Ofcom Connected Nations (curated from annual reports)
 *     - Full-fibre (FTTP) coverage time series, 2018-2025
 *     - Gigabit-capable coverage time series, 2019-2025
 *     - Average broadband speeds, 2018-2023
 *     - 4G mobile coverage
 *
 *  2. ORR Table 3103 (downloaded) — Historic PPM by operator, quarterly
 *     - Weighted-average PPM across all operators, 1997-2025
 *
 *  3. ORR Table 1220 (downloaded) — Passenger journeys
 *     - Annual passenger journeys in millions, 1984-2025
 *
 *  4. DfT TRA0101 (downloaded) — Road traffic by vehicle type
 *     - Billion vehicle miles, 2000-2024
 *
 *  5. DfT Road Condition (curated from RDC0120)
 *     - % of roads where maintenance should be considered
 *
 *  6. DfT RDL0203 (downloaded) — Road length by type (km)
 *     - Total road network length, motorways, A roads, etc.
 *
 *  7. ORR Table 6320 (downloaded) — Rail infrastructure on mainline
 *     - Route-km, electrified route-km, new electrification track-km
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

// ── ORR Table 3103: Historic PPM by operator (quarterly) ────────
// Compute weighted-average PPM across all operators per financial year
const ORR_PPM_URL =
  "https://dataportal.orr.gov.uk/media/1811/table-3103-historic-passenger-trains-planned-ppm-and-casl-quarterly-by-operator.ods";

function parseORRPunctuality(buf) {
  const wb = XLSX.read(buf);
  const rowsA = XLSX.utils.sheet_to_json(wb.Sheets["3103a"], { header: 1 }); // trains planned
  const rowsB = XLSX.utils.sheet_to_json(wb.Sheets["3103b"], { header: 1 }); // PPM %
  const headers = rowsA[3];

  // Map each quarterly column to a financial year
  const qCols = [];
  for (let c = 4; c < headers.length; c++) {
    const h = String(headers[c]);
    const m = h.match(/(Apr|Jul|Oct|Jan) to (Jun|Sep|Dec|Mar) (\d{4})/);
    if (!m) continue;
    const month = m[1];
    const yr = parseInt(m[3], 10);
    let fy;
    if (month === "Apr" || month === "Jul" || month === "Oct") {
      fy = yr + "-" + String(yr + 1).slice(2);
    } else {
      fy = (yr - 1) + "-" + String(yr).slice(2);
    }
    qCols.push({ col: c, fy, year: parseInt(fy, 10) });
  }

  // Sum trains_planned * PPM across all operators for each FY
  const fyData = {};
  for (let r = 4; r < rowsA.length; r++) {
    for (const { col, fy, year } of qCols) {
      const planned = rowsA[r]?.[col];
      const ppm = rowsB[r]?.[col];
      if (typeof planned === "number" && typeof ppm === "number" && planned > 0) {
        if (!fyData[fy]) fyData[fy] = { year, totalPlanned: 0, weightedPPM: 0 };
        fyData[fy].totalPlanned += planned;
        fyData[fy].weightedPPM += planned * (ppm / 100);
      }
    }
  }

  return Object.entries(fyData)
    .map(([fy, d]) => ({
      fy,
      year: d.year,
      ppm: Math.round((d.weightedPPM / d.totalPlanned) * 1000) / 10,
    }))
    .filter((r) => r.year <= 2024) // exclude partial current year
    .sort((a, b) => a.year - b.year);
}

// ── ORR Passenger Journeys (Table 1220) ─────────────────────────
const ORR_JOURNEYS_URL =
  "https://dataportal.orr.gov.uk/media/1652/table-1220-passenger-journeys.ods";

function parseORRJourneys(buf) {
  const wb = XLSX.read(buf);
  let sheetName = wb.SheetNames.find((s) => s.includes("1220")) || wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

  const series = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row[0]) continue;
    const label = String(row[0]).trim();
    const fyMatch = label.match(/^Apr (\d{4}) to Mar (\d{4})/);
    if (fyMatch) {
      const startYear = parseInt(fyMatch[1], 10);
      const fy = `${startYear}-${String(parseInt(fyMatch[2], 10)).slice(2)}`;
      for (let c = 1; c < row.length; c++) {
        if (typeof row[c] === "number" && row[c] > 100) {
          series.push({ fy, year: startYear, journeysMn: Math.round(row[c] * 10) / 10 });
          break;
        }
      }
    }
  }
  return series;
}

// ── DfT Road Traffic (TRA0101) ──────────────────────────────────
const DFT_TRAFFIC_URL =
  "https://assets.publishing.service.gov.uk/media/684963fd3a2aa5ba84d1dede/tra0101-miles-by-vehicle-type.ods";

function parseDfTTraffic(buf) {
  const wb = XLSX.read(buf);
  let sheetName = wb.SheetNames.find((s) => s.includes("TRA0101")) || wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

  const series = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const yr = row[0];
    if (typeof yr === "number" && yr >= 2000 && yr <= 2030) {
      const entry = { year: yr };
      if (typeof row[3] === "number") entry.cars = Math.round(row[3] * 10) / 10;
      if (typeof row[5] === "number") entry.lcvs = Math.round(row[5] * 10) / 10;
      if (typeof row[7] === "number") entry.hgvs = Math.round(row[7] * 10) / 10;
      if (typeof row[4] === "number") entry.buses = Math.round(row[4] * 10) / 10;
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

// ── DfT RDL0203: Road length by type (km) ───────────────────────
const DFT_ROAD_LENGTH_URL =
  "https://assets.publishing.service.gov.uk/media/697b622d043a4ade0f7b4fcd/rdl0203.ods";

function parseDfTRoadLength(buf) {
  const wb = XLSX.read(buf);
  const sheetName = wb.SheetNames.find((s) => s.includes("RDL")) || wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

  // Col layout: 0=Year, 2=Total motorways (km), 5=Total A roads (km), 7=All major roads
  const series = [];
  for (let r = 5; r < rows.length; r++) {
    const yr = rows[r]?.[0];
    if (typeof yr !== "number" || yr < 1990) continue;
    const motorways = typeof rows[r][3] === "number" ? Math.round(rows[r][3]) : null;
    const aRoads = typeof rows[r][6] === "number" ? Math.round(rows[r][6]) : null;
    const allMajor = typeof rows[r][7] === "number" ? Math.round(rows[r][7]) : null;
    if (allMajor) {
      series.push({ year: yr, motorwaysKm: motorways, aRoadsKm: aRoads, allMajorKm: allMajor });
    }
  }
  return series;
}

// ── ORR Table 6320: Rail infrastructure on mainline ─────────────
const ORR_INFRA_URL =
  "https://dataportal.orr.gov.uk/media/1528/table-6320-infrastructure-on-the-mainline.ods";

function parseORRInfrastructure(buf) {
  const wb = XLSX.read(buf);
  const sheetName = wb.SheetNames.find((s) => s.includes("6320")) || wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

  const series = [];
  for (let r = 5; r < rows.length; r++) {
    const nation = rows[r]?.[0];
    const period = String(rows[r]?.[1] || "");
    if (nation !== "Great Britain") continue;
    const m = period.match(/(\d{4})/);
    if (!m) continue;
    const yr = parseInt(m[1], 10);
    if (yr < 1990) continue;

    const routeKm = typeof rows[r][2] === "number" ? Math.round(rows[r][2]) : null;
    const electRouteKm = typeof rows[r][3] === "number" ? Math.round(rows[r][3]) : null;
    const newElectKm = typeof rows[r][6] === "number" ? Math.round(rows[r][6] * 10) / 10 : null;

    if (routeKm) {
      series.push({ year: yr, routeKm, electRouteKm, newElectKm });
    }
  }
  return series;
}

// ── DfT Road Condition (curated from RDC0120) ───────────────────
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

// ── Pothole repairs (England, local authority managed roads) ─────
// Source: DfT RDC0130 / Annual Local Authority Road Maintenance Survey (ALARM)
// Potholes filled (millions) and estimated local authority road maintenance backlog (£bn)
const POTHOLES = [
  { year: 2010, filled: 1.6, backlogBn: 8.5 },
  { year: 2011, filled: 2.0, backlogBn: 9.1 },
  { year: 2012, filled: 1.9, backlogBn: 10.5 },
  { year: 2013, filled: 1.7, backlogBn: 11.0 },
  { year: 2014, filled: 2.4, backlogBn: 11.8 },
  { year: 2015, filled: 1.8, backlogBn: 12.0 },
  { year: 2016, filled: 1.7, backlogBn: 11.8 },
  { year: 2017, filled: 1.6, backlogBn: 12.1 },
  { year: 2018, filled: 1.9, backlogBn: 9.3 },
  { year: 2019, filled: 1.7, backlogBn: 9.8 },
  { year: 2020, filled: 1.4, backlogBn: 10.2 },
  { year: 2021, filled: 1.5, backlogBn: 11.0 },
  { year: 2022, filled: 1.6, backlogBn: 12.6 },
  { year: 2023, filled: 2.0, backlogBn: 14.0 },
  { year: 2024, filled: 2.1, backlogBn: 16.3 },
];

async function main() {
  console.log("Broadband data: curated from Ofcom Connected Nations reports");
  console.log(`  → FTTP: ${BROADBAND.fttp.length} data points (${BROADBAND.fttp[0].year}-${BROADBAND.fttp[BROADBAND.fttp.length - 1].year})`);
  console.log(`  → Gigabit: ${BROADBAND.gigabit.length} data points`);
  console.log(`  → Speeds: ${BROADBAND.speeds.length} years`);
  console.log(`  → Mobile 4G: ${BROADBAND.mobile4g.length} years`);

  // Download ORR punctuality (Table 3103)
  let railPunctuality = [];
  try {
    console.log("\nDownloading ORR Table 3103 (historic PPM by operator)...");
    const orrPpmBuf = await download(ORR_PPM_URL);
    railPunctuality = parseORRPunctuality(orrPpmBuf);
    console.log(`  → ${railPunctuality.length} financial years of PPM data (${railPunctuality[0]?.fy} to ${railPunctuality[railPunctuality.length - 1]?.fy})`);
  } catch (err) {
    console.warn("  Warning: Could not download ORR PPM:", err.message);
  }

  // Download ORR journeys (Table 1220)
  let railJourneys = [];
  try {
    console.log("\nDownloading ORR Table 1220 (passenger journeys)...");
    const orrBuf = await download(ORR_JOURNEYS_URL);
    railJourneys = parseORRJourneys(orrBuf);
    console.log(`  → ${railJourneys.length} years of journey data`);
  } catch (err) {
    console.warn("  Warning: Could not download ORR journeys:", err.message);
  }

  // Download DfT traffic (TRA0101)
  let roadTraffic = [];
  try {
    console.log("\nDownloading DfT TRA0101 (road traffic by vehicle type)...");
    const dftBuf = await download(DFT_TRAFFIC_URL);
    roadTraffic = parseDfTTraffic(dftBuf);
    console.log(`  → ${roadTraffic.length} years of traffic data`);
  } catch (err) {
    console.warn("  Warning: Could not download DfT traffic:", err.message);
  }

  // Download DfT road length (RDL0203)
  let roadLength = [];
  try {
    console.log("\nDownloading DfT RDL0203 (road length by type)...");
    const rdlBuf = await download(DFT_ROAD_LENGTH_URL);
    roadLength = parseDfTRoadLength(rdlBuf);
    console.log(`  → ${roadLength.length} years of road length data`);
  } catch (err) {
    console.warn("  Warning: Could not download DfT road length:", err.message);
  }

  // Download ORR infrastructure (Table 6320)
  let railInfra = [];
  try {
    console.log("\nDownloading ORR Table 6320 (rail infrastructure)...");
    const orrInfraBuf = await download(ORR_INFRA_URL);
    railInfra = parseORRInfrastructure(orrInfraBuf);
    console.log(`  → ${railInfra.length} years of rail infrastructure data`);
  } catch (err) {
    console.warn("  Warning: Could not download ORR infrastructure:", err.message);
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
          name: "ORR Data Portal - Tables 3103, 1220, 6320",
          url: "https://dataportal.orr.gov.uk/",
          note: "PPM from Table 3103, journeys from Table 1220, route/track length from Table 6320.",
        },
        {
          name: "DfT Road Traffic (TRA0101), Road Length (RDL0203) & Road Conditions (RDC0120)",
          url: "https://www.gov.uk/government/statistical-data-sets/road-traffic-statistics-tra",
          note: "Traffic from TRA0101, road length from RDL0203, road condition curated from published tables.",
        },
      ],
      generated: new Date().toISOString().slice(0, 10),
    },
    broadband: BROADBAND,
    rail: {
      punctuality: railPunctuality,
      journeys: railJourneys,
      infrastructure: railInfra,
    },
    roads: {
      condition: ROAD_CONDITION,
      potholes: POTHOLES,
      traffic: roadTraffic,
      length: roadLength,
    },
  };

  writeFileSync("public/data/infrastructure.json", JSON.stringify(output, null, 2));
  console.log("\n✓ Written public/data/infrastructure.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
