/**
 * fetch-airports.js
 *
 * Fetches UK airport data from the Civil Aviation Authority (CAA).
 * Downloads Table 01 (airport sizes/passengers) and Table 03_1 (aircraft movements)
 * for the latest year, and uses curated annual totals for time series.
 *
 * Source: CAA Annual Airport Statistics
 * https://www.caa.co.uk/data-and-analysis/uk-aviation-market/airports/uk-airport-data/
 *
 * Outputs: public/data/airports.json
 */
import { writeFileSync } from "fs";
import https from "https";

// ── CAA CSV download URLs (2024 annual data) ──────────────────────────
const TABLE_01_URL = "https://www.caa.co.uk/Documents/Download/11911/0af1d44e-1648-4fd7-94e3-0b9697934148/16999";
const TABLE_03_URL = "https://www.caa.co.uk/Documents/Download/11911/0af1d44e-1648-4fd7-94e3-0b9697934148/17000";

function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, { headers: { "User-Agent": "StateOfBritain/1.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(new URL(res.headers.location, u).href);
          return;
        }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        res.on("error", reject);
      }).on("error", reject);
    };
    get(url);
  });
}

// ── Curated annual totals (from CAA Table 01, each year's report) ─────
// Total terminal passengers across all UK airports reporting to CAA
const annualTotals = [
  { year: 2005, passengers: 228152279 },
  { year: 2006, passengers: 235139030 },
  { year: 2007, passengers: 240676696 },
  { year: 2008, passengers: 235360997 },
  { year: 2009, passengers: 218118264 },
  { year: 2010, passengers: 210634816 },
  { year: 2011, passengers: 219335488 },
  { year: 2012, passengers: 221063479 },
  { year: 2013, passengers: 228425357 },
  { year: 2014, passengers: 238472791 },
  { year: 2015, passengers: 251478321 },
  { year: 2016, passengers: 268373670 },
  { year: 2017, passengers: 284570301 },
  { year: 2018, passengers: 292244781 },
  { year: 2019, passengers: 296839124 },
  { year: 2020, passengers: 73761978 },
  { year: 2021, passengers: 64383158 },
  { year: 2022, passengers: 221778105 },
  { year: 2023, passengers: 272829990 },
  { year: 2024, passengers: 292488416 },
];

async function main() {
  console.log("Fetching CAA airport data...");

  // Fetch latest year's detailed data
  const [csv01, csv03] = await Promise.all([
    fetchCSV(TABLE_01_URL),
    fetchCSV(TABLE_03_URL),
  ]);

  // ── Parse Table 01: passengers by airport ───────────────────────────
  const lines01 = csv01.split("\n").map(l => l.trim()).filter(Boolean);
  const airportPassengers = [];
  for (let i = 1; i < lines01.length; i++) {
    const cols = lines01[i].split(",");
    const name = cols[2]?.trim();
    const pax = parseInt(cols[3], 10);
    if (name && !isNaN(pax)) {
      airportPassengers.push({ airport: name, passengers: pax });
    }
  }
  airportPassengers.sort((a, b) => b.passengers - a.passengers);

  // ── Parse Table 03_1: movements by airport ──────────────────────────
  const lines03 = csv03.split("\n").map(l => l.trim()).filter(Boolean);
  const header03 = lines03[0].split(",").map(h => h.trim());
  const atIdx = header03.indexOf("air_transport");
  const grandIdx = header03.indexOf("grand_total");
  const nameIdx = header03.indexOf("rpt_apt_name");

  let totalATM = 0;
  let totalMovements = 0;
  const airportMovements = [];

  for (let i = 1; i < lines03.length; i++) {
    const cols = lines03[i].split(",");
    const name = cols[nameIdx]?.trim();
    const atm = parseInt(cols[atIdx], 10);
    const grand = parseInt(cols[grandIdx], 10);
    if (!isNaN(atm)) totalATM += atm;
    if (!isNaN(grand)) totalMovements += grand;
    if (name && !isNaN(atm)) {
      airportMovements.push({ airport: name, airTransport: atm, total: grand });
    }
  }
  airportMovements.sort((a, b) => b.airTransport - a.airTransport);

  const flightsPerDay = Math.round(totalATM / 365);

  console.log(`  ${airportPassengers.length} airports with passenger data`);
  console.log(`  ${airportMovements.length} airports with movement data`);
  console.log(`  Total passengers 2024: ${annualTotals[annualTotals.length - 1].passengers.toLocaleString()}`);
  console.log(`  Total air transport movements 2024: ${totalATM.toLocaleString()}`);
  console.log(`  Flights per day: ~${flightsPerDay.toLocaleString()}`);

  // ── Build dataset ───────────────────────────────────────────────────
  const dataset = {
    $schema: "sob-dataset-v1",
    id: "airports",
    pillar: "growth",
    topic: "airports",
    generated: new Date().toISOString().slice(0, 10),

    sources: [
      {
        id: "caa-airport-data",
        name: "CAA Annual Airport Statistics",
        url: "https://www.caa.co.uk/data-and-analysis/uk-aviation-market/airports/uk-airport-data/",
        publisher: "Civil Aviation Authority",
        note: "Annual airport data including terminal passengers, air transport movements, and aircraft movements by airport",
      },
    ],

    snapshot: {
      totalPassengers: annualTotals[annualTotals.length - 1].passengers,
      totalPassengersYear: 2024,
      totalATM: totalATM,
      flightsPerDay: flightsPerDay,
      numAirports: airportPassengers.filter(a => a.passengers > 0).length,
      heathrowPassengers: airportPassengers[0]?.passengers,
      prePandemicPeak: 296839124,
      prePandemicPeakYear: 2019,
    },

    series: {
      annualPassengers: {
        sourceId: "caa-airport-data",
        label: "Total Terminal Passengers",
        unit: "passengers",
        timeField: "year",
        data: annualTotals,
      },
      passengersByAirport: {
        sourceId: "caa-airport-data",
        label: "Passengers by Airport (2024)",
        unit: "passengers",
        timeField: "airport",
        data: airportPassengers.filter(a => a.passengers > 0),
      },
      movementsByAirport: {
        sourceId: "caa-airport-data",
        label: "Air Transport Movements by Airport (2024)",
        unit: "movements",
        timeField: "airport",
        data: airportMovements
          .filter(a => a.airTransport > 0)
          .map(a => ({ airport: a.airport, movements: a.airTransport })),
      },
    },
  };

  const outPath = new URL("../public/data/airports.json", import.meta.url).pathname;
  writeFileSync(outPath, JSON.stringify(dataset, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
