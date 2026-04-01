/**
 * fetch-airports.js
 *
 * Fetches UK airport data from the Civil Aviation Authority (CAA).
 * Downloads Table 01 (airport sizes/passengers) and Table 03_1 (aircraft movements)
 * for the latest year, and uses curated annual totals for time series.
 *
 * Source: CAA Annual Airport Statistics + DfT AVI0101
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

// ── Curated annual air transport movements (DfT AVI0101, source: CAA) ─
// Full reporting airports, UK (excl. Channel Islands; excl. Isle of Man from 1990)
// Unit: thousands → converted to absolute numbers
const annualATMs = [
  { year: 2000, movements: 1927468 },
  { year: 2001, movements: 1972155 },
  { year: 2002, movements: 1967298 },
  { year: 2003, movements: 2026870 },
  { year: 2004, movements: 2138609 },
  { year: 2005, movements: 2266205 },
  { year: 2006, movements: 2313943 },
  { year: 2007, movements: 2345525 },
  { year: 2008, movements: 2294881 },
  { year: 2009, movements: 2092277 },
  { year: 2010, movements: 1972495 },
  { year: 2011, movements: 2020951 },
  { year: 2012, movements: 1993711 },
  { year: 2013, movements: 2012652 },
  { year: 2014, movements: 2043274 },
  { year: 2015, movements: 2091774 },
  { year: 2016, movements: 2180311 },
  { year: 2017, movements: 2233004 },
  { year: 2018, movements: 2215180 },
  { year: 2019, movements: 2214451 },
  { year: 2020, movements: 812103 },
  { year: 2021, movements: 779996 },
  { year: 2022, movements: 1675143 },
  { year: 2023, movements: 1925815 },
  { year: 2024, movements: 2013491 },
];

// ── Curated per-airport movements (DfT AVI0102b, 2014-2024, thousands) ─
// Top airports + notable closures. Values from DfT published ODS.
const airportMovementsTrend = [
  { year: 2014, heathrow: 470708, gatwick: 254540, manchester: 162919, stansted: 143230, edinburgh: 101407, luton: 75616, birmingham: 89056, bristol: 52574 },
  { year: 2015, heathrow: 472060, gatwick: 262571, manchester: 164709, stansted: 154478, edinburgh: 107211, luton: 87440, birmingham: 89837, bristol: 54741 },
  { year: 2016, heathrow: 473199, gatwick: 275577, manchester: 183550, stansted: 163990, edinburgh: 115564, luton: 102948, birmingham: 104158, bristol: 60764 },
  { year: 2017, heathrow: 474015, gatwick: 281851, manchester: 194493, stansted: 171965, edinburgh: 121788, luton: 106074, birmingham: 111784, bristol: 63336 },
  { year: 2018, heathrow: 475608, gatwick: 279772, manchester: 192208, stansted: 183840, edinburgh: 123758, luton: 105884, birmingham: 103248, bristol: 65220 },
  { year: 2019, heathrow: 475859, gatwick: 280713, manchester: 194135, stansted: 183090, edinburgh: 126377, luton: 112230, birmingham: 101738, bristol: 62286 },
  { year: 2020, heathrow: 200937, gatwick: 76477, manchester: 60465, stansted: 72908, edinburgh: 42570, luton: 46147, birmingham: 29844, bristol: 21087 },
  { year: 2021, heathrow: 190021, gatwick: 52137, manchester: 59286, stansted: 77001, edinburgh: 39092, luton: 40809, birmingham: 28172, bristol: 20832 },
  { year: 2022, heathrow: 376822, gatwick: 214018, manchester: 149465, stansted: 158754, edinburgh: 91632, luton: 86848, birmingham: 70998, bristol: 55674 },
  { year: 2023, heathrow: 454065, gatwick: 253011, manchester: 171369, stansted: 178049, edinburgh: 109587, luton: 99323, birmingham: 80101, bristol: 67759 },
  { year: 2024, heathrow: 473799, gatwick: 261522, manchester: 188116, stansted: 187505, edinburgh: 115302, luton: 101998, birmingham: 87472, bristol: 70661 },
];

// ── Active airport count (CAA Table 02.2 / Table 03.1, 1990-2024) ────
// Airports reporting commercial air transport movements to the CAA.
// 1997-2000 interpolated (source ZIPs contain XLS only). Notable openings
// and closures annotated for tooltip display.
const activeAirports = [
  { year: 1990, count: 60 },
  { year: 1991, count: 60 },
  { year: 1992, count: 59, closed: "Swansea" },
  { year: 1993, count: 61, opened: "Biggin Hill, Sheffield City" },
  { year: 1994, count: 61, opened: "Barra", closed: "Bembridge" },
  { year: 1995, count: 60 },
  { year: 1996, count: 61, opened: "Campbeltown" },
  { year: 1997, count: 61 },
  { year: 1998, count: 61 },
  { year: 1999, count: 62 },
  { year: 2000, count: 62 },
  { year: 2001, count: 62 },
  { year: 2002, count: 62 },
  { year: 2003, count: 61 },
  { year: 2004, count: 63, opened: "Newquay, Swansea" },
  { year: 2005, count: 64, opened: "Doncaster Sheffield" },
  { year: 2006, count: 63 },
  { year: 2007, count: 62 },
  { year: 2008, count: 62 },
  { year: 2009, count: 63, opened: "Oxford (Kidlington)" },
  { year: 2010, count: 63 },
  { year: 2011, count: 63 },
  { year: 2012, count: 62 },
  { year: 2013, count: 60 },
  { year: 2014, count: 60 },
  { year: 2015, count: 58, closed: "Manston, Plymouth" },
  { year: 2016, count: 59 },
  { year: 2017, count: 58, closed: "Cambridge, Coventry" },
  { year: 2018, count: 58 },
  { year: 2019, count: 58 },
  { year: 2020, count: 56 },
  { year: 2021, count: 54 },
  { year: 2022, count: 55 },
  { year: 2023, count: 55, closed: "Doncaster Sheffield" },
  { year: 2024, count: 55 },
];

// ── Airport coordinates (WGS84, curated from published IATA/ICAO data) ─
const AIRPORT_COORDS = {
  "HEATHROW":                     { lat: 51.4700, lng: -0.4543 },
  "GATWICK":                      { lat: 51.1537, lng: -0.1821 },
  "MANCHESTER":                   { lat: 53.3537, lng: -2.2750 },
  "STANSTED":                     { lat: 51.8860, lng:  0.2389 },
  "LUTON":                        { lat: 51.8747, lng: -0.3684 },
  "EDINBURGH":                    { lat: 55.9502, lng: -3.3725 },
  "BIRMINGHAM":                   { lat: 52.4539, lng: -1.7480 },
  "BRISTOL":                      { lat: 51.3827, lng: -2.7191 },
  "GLASGOW":                      { lat: 55.8642, lng: -4.4331 },
  "BELFAST INTERNATIONAL":        { lat: 54.6575, lng: -6.2158 },
  "NEWCASTLE":                    { lat: 55.0374, lng: -1.6917 },
  "LIVERPOOL (JOHN LENNON)":      { lat: 53.3336, lng: -2.8497 },
  "LEEDS BRADFORD":               { lat: 53.8659, lng: -1.6606 },
  "EAST MIDLANDS INTERNATIONAL":  { lat: 52.8311, lng: -1.3281 },
  "LONDON CITY":                  { lat: 51.5048, lng:  0.0495 },
  "BELFAST CITY (GEORGE BEST)":   { lat: 54.6181, lng: -5.8725 },
  "ABERDEEN":                     { lat: 57.2019, lng: -2.1978 },
  "BOURNEMOUTH":                  { lat: 50.7800, lng: -1.8425 },
  "CARDIFF WALES":                { lat: 51.3967, lng: -3.3433 },
  "SOUTHAMPTON":                  { lat: 50.9503, lng: -1.3568 },
  "INVERNESS":                    { lat: 57.5425, lng: -4.0475 },
  "PRESTWICK":                    { lat: 55.5094, lng: -4.5867 },
  "EXETER":                       { lat: 50.7344, lng: -3.4139 },
  "NEWQUAY":                      { lat: 50.4406, lng: -4.9954 },
  "NORWICH":                      { lat: 52.6758, lng:  1.2828 },
  "SOUTHEND":                     { lat: 51.5714, lng:  0.6956 },
  "SUMBURGH":                     { lat: 59.8789, lng: -1.2956 },
  "TEESSIDE INTERNATIONAL AIRPORT": { lat: 54.5092, lng: -1.4294 },
  "CITY OF DERRY (EGLINTON)":     { lat: 55.0428, lng: -7.1611 },
  "HUMBERSIDE":                   { lat: 53.5744, lng: -0.3508 },
  "KIRKWALL":                     { lat: 58.9578, lng: -2.9050 },
  "STORNOWAY":                    { lat: 58.2156, lng: -6.3314 },
  "ISLES OF SCILLY (ST.MARYS)":   { lat: 49.9133, lng: -6.2917 },
  "LANDS END (ST JUST)":          { lat: 50.1028, lng: -5.6706 },
  "FARNBOROUGH":                  { lat: 51.2758, lng: -0.7764 },
  "ISLAY":                        { lat: 55.6819, lng: -6.2567 },
  "DUNDEE":                       { lat: 56.4525, lng: -3.0258 },
  "BENBECULA":                    { lat: 57.4811, lng: -7.3628 },
  "BLACKPOOL":                    { lat: 53.7717, lng: -3.0286 },
  "BARRA":                        { lat: 57.0228, lng: -7.4472 },
  "WICK JOHN O GROATS":           { lat: 58.4589, lng: -3.0931 },
  "TIREE":                        { lat: 56.4992, lng: -6.8692 },
  "BIGGIN HILL":                  { lat: 51.3308, lng:  0.0325 },
  "CAMPBELTOWN":                  { lat: 55.4372, lng: -5.6864 },
  "LERWICK (TINGWALL)":           { lat: 60.1922, lng: -1.2436 },
  "LYDD":                         { lat: 50.9561, lng:  0.9392 },
  "OXFORD (KIDLINGTON)":          { lat: 51.8369, lng: -1.3200 },
};

// ── Heathrow declared capacity (ATMs/year) ───────────────────────────
// Heathrow's two-runway system has a practical cap of ~480,000 ATMs/year
// set by planning conditions and air traffic control constraints.
const heathrowCap = 480000;

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

  // ── Compute passengers per flight for trend ─────────────────────────
  const paxMap = Object.fromEntries(annualTotals.map(d => [d.year, d.passengers]));
  const paxPerFlight = annualATMs
    .filter(d => paxMap[d.year])
    .map(d => ({
      year: d.year,
      paxPerFlight: Math.round(paxMap[d.year] / d.movements),
    }));

  // ── Build airportLocations (merged pax + movements + coordinates) ────
  const movementsMap = Object.fromEntries(
    airportMovements.map(a => [a.airport, a.airTransport])
  );
  const airportLocations = airportPassengers
    .filter(a => a.passengers > 0 && AIRPORT_COORDS[a.airport])
    .map(a => ({
      id: a.airport.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
      airport: a.airport.split(" ").map(w =>
        w.length <= 2 ? w : w.charAt(0) + w.slice(1).toLowerCase()
      ).join(" ").replace(/\(([a-z])/g, (_, c) => "(" + c.toUpperCase()),
      lat: AIRPORT_COORDS[a.airport].lat,
      lng: AIRPORT_COORDS[a.airport].lng,
      passengers: a.passengers,
      movements: movementsMap[a.airport] || 0,
    }));

  console.log(`  ${airportPassengers.length} airports with passenger data`);
  console.log(`  ${airportMovements.length} airports with movement data`);
  console.log(`  ${airportLocations.length} airports with coordinates`);
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
      {
        id: "dft-avi0101",
        name: "DfT Aviation Statistics AVI0101",
        url: "https://www.gov.uk/government/statistical-data-sets/aviation-statistics-data-tables-avi",
        publisher: "Department for Transport",
        note: "Air traffic at UK airports: 2000 onwards. Full reporting airports, UK (excl. Channel Islands; excl. Isle of Man from 1990).",
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
      peakATM: 2345525,
      peakATMYear: 2007,
      heathrowCap: heathrowCap,
      heathrowATM: airportMovementsTrend[airportMovementsTrend.length - 1].heathrow,
      heathrowUtilPct: Math.round(airportMovementsTrend[airportMovementsTrend.length - 1].heathrow / heathrowCap * 100),
    },

    series: {
      annualPassengers: {
        sourceId: "caa-airport-data",
        label: "Total Terminal Passengers",
        unit: "passengers",
        timeField: "year",
        data: annualTotals,
      },
      annualMovements: {
        sourceId: "dft-avi0101",
        label: "Air Transport Movements",
        unit: "movements",
        timeField: "year",
        data: annualATMs,
      },
      paxPerFlight: {
        sourceId: "dft-avi0101",
        label: "Passengers per Flight",
        unit: "passengers/movement",
        timeField: "year",
        data: paxPerFlight,
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
      airportMovementsTrend: {
        sourceId: "dft-avi0101",
        label: "Air Transport Movements by Airport (2014-2024)",
        unit: "movements",
        timeField: "year",
        data: airportMovementsTrend,
      },
      activeAirports: {
        sourceId: "dft-avi0101",
        label: "Number of Active UK Airports",
        unit: "airports",
        timeField: "year",
        data: activeAirports,
      },
      airportLocations: {
        sourceId: "caa-airport-data",
        label: "UK Airport Locations with Traffic Data (2024)",
        unit: "mixed",
        timeField: "id",
        data: airportLocations,
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
