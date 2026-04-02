#!/usr/bin/env node
/**
 * fetch-buses.js
 *
 * Downloads DfT bus statistics ODS files and parses them via a Python helper
 * to extract passenger journeys, fares index, and fleet size time series.
 *
 * Source: DfT Annual Bus Statistics
 * https://www.gov.uk/government/statistical-data-sets/bus-statistics-data-tables
 *
 * Outputs: public/data/buses.json
 */
import { writeFileSync } from "fs";
import https from "https";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DOWNLOADS = [
  {
    url: "https://assets.publishing.service.gov.uk/media/69c11f97cfa346b9d4704a50/bus01.ods",
    dest: "/tmp/dft-bus01.ods",
    label: "BUS01 (passenger journeys by region)",
  },
  {
    url: "https://assets.publishing.service.gov.uk/media/63d781e28fa8f518895a6251/bus01_hist.ods",
    dest: "/tmp/dft-bus01-hist.ods",
    label: "BUS01 historical (1950-2005)",
  },
  {
    url: "https://assets.publishing.service.gov.uk/media/69b7e17bcf4af9cad362b44a/bus0415.ods",
    dest: "/tmp/dft-bus0415.ods",
    label: "BUS0415 (quarterly fares index)",
  },
  {
    url: "https://assets.publishing.service.gov.uk/media/69c11f97b920af63be1c7632/bus06.ods",
    dest: "/tmp/dft-bus06.ods",
    label: "BUS06 (fleet size)",
  },
  {
    url: "https://assets.publishing.service.gov.uk/media/69c040b61263ce46c3690c77/bus08.ods",
    dest: "/tmp/dft-bus08.ods",
    label: "BUS08 (concessionary travel)",
  },
];

const OUT_PATH = join(__dirname, "..", "public", "data", "buses.json");

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, { headers: { "User-Agent": "StateOfBritain/1.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(new URL(res.headers.location, u).href);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error("HTTP " + res.statusCode + " for " + url));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          writeFileSync(dest, Buffer.concat(chunks));
          resolve();
        });
        res.on("error", reject);
      }).on("error", reject);
    };
    get(url);
  });
}

async function main() {
  // Download all ODS files
  for (const dl of DOWNLOADS) {
    console.log("Downloading " + dl.label + "...");
    await download(dl.url, dl.dest);
    console.log("  -> " + dl.dest);
  }

  // Parse via Python
  console.log("\nParsing ODS files...");
  const pyScript = join(__dirname, "parse-bus-ods.py");
  const args = DOWNLOADS.map((dl) => JSON.stringify(dl.dest)).join(" ");
  const raw = execSync("python3 " + JSON.stringify(pyScript) + " " + args, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const parsed = JSON.parse(raw);

  console.log("  journeysByRegion: " + parsed.journeysByRegion.length + " rows");
  console.log("  journeysHistorical: " + parsed.journeysHistorical.length + " rows");
  console.log("  faresIndex: " + parsed.faresIndex.length + " rows");
  console.log("  fleetSize: " + parsed.fleetSize.length + " rows");
  console.log("  concessionaryPct: " + parsed.concessionaryPct.length + " rows");
  console.log("  passHolders: " + parsed.passHolders.length + " rows");
  console.log("  expenditure: " + parsed.expenditure.length + " rows");
  console.log("  Latest year: " + parsed.latestYear);
  console.log("  Latest total journeys: " + parsed.latestTotal + "m");
  console.log("  Latest London journeys: " + parsed.latestLondon + "m");
  console.log("  Latest fleet size: " + parsed.latestFleet);
  console.log("  Latest concessionary %: " + parsed.latestConcessionaryPct);
  console.log("  Latest pass holders: " + parsed.latestPassHolders + "k");

  // Build sob-dataset-v1 output
  const dataset = {
    $schema: "sob-dataset-v1",
    id: "buses",
    pillar: "growth",
    topic: "transport",
    generated: new Date().toISOString().slice(0, 10),

    sources: [
      {
        id: "dft-bus-statistics",
        name: "DfT Annual Bus Statistics (England)",
        url: "https://www.gov.uk/government/statistical-data-sets/bus-statistics-data-tables",
        publisher: "Department for Transport",
        note: "Annual and quarterly bus statistics. England data from 2004/05; Scotland and Wales from respective transport bodies. Fleet data is GB-wide.",
      },
    ],

    snapshot: {
      latestYear: parsed.latestYear,
      latestTotal: parsed.latestTotal,
      latestLondon: parsed.latestLondon,
      latestFleet: parsed.latestFleet,
      latestConcessionaryPct: parsed.latestConcessionaryPct,
      latestPassHolders: parsed.latestPassHolders,
    },

    series: {
      journeysByRegion: {
        sourceId: "dft-bus-statistics",
        label: "Passenger Journeys by Region",
        unit: "millions",
        timeField: "year",
        description:
          "Annual bus passenger journeys (millions) by region: London, English metropolitan areas, English non-metropolitan areas, Scotland, Wales, and GB total.",
        data: parsed.journeysByRegion,
      },
      journeysHistorical: {
        sourceId: "dft-bus-statistics",
        label: "Historical GB Bus Passenger Journeys",
        unit: "millions",
        timeField: "year",
        description:
          "Long-run Great Britain total bus passenger journeys from 1950, combining local authority and private operator data.",
        data: parsed.journeysHistorical,
      },
      faresIndex: {
        sourceId: "dft-bus-statistics",
        label: "Bus Fares Index",
        unit: "index (March 2005 = 100)",
        timeField: "quarter",
        description:
          "Quarterly bus fares index for London, England outside London, and Great Britain, with CPI comparator. Base: March 2005 = 100.",
        data: parsed.faresIndex,
      },
      fleetSize: {
        sourceId: "dft-bus-statistics",
        label: "Bus Fleet Size by Region",
        unit: "vehicles",
        timeField: "year",
        description:
          "Number of buses by region: London, English metropolitan areas, English non-metropolitan areas, Scotland, Wales, and GB total.",
        data: parsed.fleetSize,
      },
      concessionaryPct: {
        sourceId: "dft-bus-statistics",
        label: "Concessionary Journeys as % of Total",
        unit: "percent",
        timeField: "year",
        description:
          "Total concessionary bus journeys as a percentage of all bus journeys, by region: England, London, England outside London, Scotland, Wales, and GB total.",
        data: parsed.concessionaryPct,
      },
      passHolders: {
        sourceId: "dft-bus-statistics",
        label: "Concessionary Pass Holders",
        unit: "thousands",
        timeField: "year",
        description:
          "Number of concessionary bus passes (older persons and disabled) in England, and average journeys per pass.",
        data: parsed.passHolders,
      },
      expenditure: {
        sourceId: "dft-bus-statistics",
        label: "Concessionary Travel Expenditure",
        unit: "£ millions",
        timeField: "year",
        description:
          "Net current expenditure on concessionary travel in England at current prices, including reimbursement to operators and cost per journey.",
        data: parsed.expenditure,
      },
    },
  };

  writeFileSync(OUT_PATH, JSON.stringify(dataset, null, 2));
  console.log("\nWrote " + OUT_PATH);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
