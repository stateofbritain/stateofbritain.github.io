#!/usr/bin/env node
/**
 * add-reservoir-locations.js
 *
 * Builds a reservoirLocations series for public/data/reservoirs.json by:
 * 1. Querying Wikidata for all UK reservoirs with coordinates
 * 2. Merging with curated capacity data from UKCEH inventory
 * 3. Using Wikidata surface area as fallback size indicator
 *
 * Run: node scripts/add-reservoir-locations.js
 */
import { readFileSync, writeFileSync } from "fs";
import https from "https";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Curated capacity data (megalitres) from UKCEH inventory ─────────
// These are the major reservoirs where we know capacity from published sources
const CURATED_CAPACITY = {
  "Loch Ericht":        { capacityMl: 1291596, use: "Hydro-electric", year: 1962 },
  "Loch Katrine":       { capacityMl: 804704,  use: "Water supply", year: 1859 },
  "Loch Quoich":        { capacityMl: 556677,  use: "Hydro-electric", year: 1955 },
  "Loch Earn":          { capacityMl: 397630,  use: "Hydro-electric", year: 1958 },
  "Blackwater Reservoir": { capacityMl: 214977, use: "Hydro-electric", year: 1909 },
  "Kielder Water":      { capacityMl: 199000,  use: "Water supply", year: 1981 },
  "Mullardoch":         { capacityMl: 165226,  use: "Hydro-electric", year: 1951 },
  "Loch Garry":         { capacityMl: 163272,  use: "Hydro-electric", year: 1956 },
  "Loch Luichart":      { capacityMl: 128124,  use: "Hydro-electric", year: 1954 },
  "Rutland Water":      { capacityMl: 124000,  use: "Water supply", year: 1976 },
  "Loch Monar":         { capacityMl: 97000,   use: "Hydro-electric", year: 1960 },
  "Elan Valley Reservoirs": { capacityMl: 99000, use: "Water supply", year: 1904 },
  "Loch Lomond":        { capacityMl: 91000,   use: "Water supply", year: 1971 },
  "Haweswater Reservoir": { capacityMl: 84500,  use: "Water supply", year: 1941 },
  "Loch Fannich":       { capacityMl: 79000,   use: "Hydro-electric", year: 1952 },
  "Llyn Celyn":         { capacityMl: 72700,   use: "Water supply", year: 1965 },
  "Megget Reservoir":   { capacityMl: 64000,   use: "Water supply", year: 1983 },
  "Llyn Brianne":       { capacityMl: 62140,   use: "Water supply", year: 1972 },
  "Lake Vyrnwy":        { capacityMl: 59700,   use: "Water supply", year: 1888 },
  "Grafham Water":      { capacityMl: 58600,   use: "Water supply", year: 1966 },
  "Llyn Clywedog":      { capacityMl: 50000,   use: "Water supply", year: 1967 },
  "Claerwen Reservoir": { capacityMl: 48300,   use: "Water supply", year: 1952 },
  "Bala Lake":          { capacityMl: 43000,   use: "Water supply", year: 1955 },
  "Cow Green Reservoir": { capacityMl: 40920,  use: "Water supply", year: 1971 },
  "Thirlmere":          { capacityMl: 41000,   use: "Water supply", year: 1894 },
  "Carsington Water":   { capacityMl: 36000,   use: "Water supply", year: 1991 },
  "Roadford Lake":      { capacityMl: 34500,   use: "Water supply", year: 1989 },
  "Loch Sloy":          { capacityMl: 33800,   use: "Hydro-electric", year: 1950 },
  "Bewl Water":         { capacityMl: 31300,   use: "Water supply", year: 1975 },
  "Colliford Lake":     { capacityMl: 28540,   use: "Water supply", year: 1983 },
  "Ladybower Reservoir": { capacityMl: 27500,  use: "Water supply", year: 1945 },
  "Ennerdale Water":    { capacityMl: 26000,   use: "Water supply", year: 1902 },
  "Carron Valley Reservoir": { capacityMl: 25000, use: "Water supply", year: 1939 },
  "Llandegfedd Reservoir": { capacityMl: 24000, use: "Water supply", year: 1963 },
  "Scar House Reservoir": { capacityMl: 22500,  use: "Water supply", year: 1936 },
  "Grimwith Reservoir": { capacityMl: 21360,   use: "Water supply", year: 1983 },
  "Wimbleball Lake":    { capacityMl: 21300,   use: "Water supply", year: 1979 },
  "Pitsford Reservoir": { capacityMl: 17800,   use: "Water supply", year: 1956 },
  "Blithfield Reservoir": { capacityMl: 18200, use: "Water supply", year: 1953 },
  "Longdendale Chain":  { capacityMl: 15500,   use: "Water supply", year: 1877 },
  "Farmoor Reservoir":  { capacityMl: 13850,   use: "Water supply", year: 1967 },
  "Stocks Reservoir":   { capacityMl: 13450,   use: "Water supply", year: 1932 },
  "Rivington Reservoir": { capacityMl: 11200,  use: "Water supply", year: 1857 },
  "Derwent Reservoir":  { capacityMl: 9630,    use: "Water supply", year: 1916 },
  "Scammonden Reservoir": { capacityMl: 7750,  use: "Water supply", year: 1971 },
  "Tittesworth Reservoir": { capacityMl: 6300, use: "Water supply", year: 1963 },
  "Talla Reservoir":    { capacityMl: 29000,   use: "Water supply", year: 1905 },
  "Stithians Reservoir": { capacityMl: 5200,   use: "Water supply", year: 1965 },
  "Ardingly Reservoir": { capacityMl: 4680,    use: "Water supply", year: 1978 },
  "Chew Valley Lake":   { capacityMl: 20400,   use: "Water supply", year: 1956 },
  "Abberton Reservoir": { capacityMl: 41300,   use: "Water supply", year: 1940 },
  "Hanningfield Reservoir": { capacityMl: 27000, use: "Water supply", year: 1957 },
  "Derwent Reservoir, Northumberland": { capacityMl: 21000, use: "Water supply", year: 1967 },
  "Balderhead Reservoir": { capacityMl: 19800, use: "Water supply", year: 1965 },
  "Selset Reservoir":   { capacityMl: 15600,   use: "Water supply", year: 1960 },
  "Catcleugh Reservoir": { capacityMl: 8100,   use: "Water supply", year: 1905 },
  "Thornton Steward Reservoir": { capacityMl: 3400, use: "Water supply", year: 1905 },
  "Pontsticill Reservoir": { capacityMl: 3500, use: "Water supply", year: 1927 },
  "Llwyn-on Reservoir": { capacityMl: 5900,    use: "Water supply", year: 1926 },
  "Cantref Reservoir":  { capacityMl: 6000,    use: "Water supply", year: 1892 },
  "Loch Doon":          { capacityMl: 117000,  use: "Hydro-electric", year: 1936 },
  "Loch Glascarnoch":   { capacityMl: 43000,   use: "Hydro-electric", year: 1957 },
  "Clywedog Reservoir": { capacityMl: 50000,   use: "Water supply", year: 1967 },
};

// Alternate name mappings (Wikidata name → curated name)
const NAME_ALIASES = {
  "Haweswater": "Haweswater Reservoir",
  "Loch Quoich (Lochaber)": "Loch Quoich",
  "Llyn Tegid": "Bala Lake",
  "Elan Valley": "Elan Valley Reservoirs",
  "Blackwater": "Blackwater Reservoir",
  "Megget": "Megget Reservoir",
  "Claerwen": "Claerwen Reservoir",
  "Longdendale": "Longdendale Chain",
};

// Planned reservoirs (not in Wikidata)
const PLANNED = [
  { name: "Havant Thicket (planned)", lat: 50.910, lng: -0.950, capacityMl: 8700, use: "Planned", year: 2031 },
  { name: "SESRO Abingdon (planned)", lat: 51.650, lng: -1.330, capacityMl: 150000, use: "Planned", year: 2040 },
  { name: "Fens Reservoir (planned)", lat: 52.500, lng: 0.130, capacityMl: 55000, use: "Planned", year: 2036 },
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "StateOfBritain/1.0" } }, (res) => {
      if (res.statusCode !== 200) { reject(new Error("HTTP " + res.statusCode)); return; }
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function main() {
  console.log("Querying Wikidata for UK reservoirs...");

  const query = `
SELECT ?item ?itemLabel ?lat ?lon ?area WHERE {
  ?item wdt:P31/wdt:P279* wd:Q131681 .
  ?item wdt:P17 wd:Q145 .
  ?item p:P625 ?coordStatement .
  ?coordStatement ps:P625 ?coord .
  BIND(geof:latitude(?coord) AS ?lat)
  BIND(geof:longitude(?coord) AS ?lon)
  OPTIONAL { ?item wdt:P2046 ?area . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}`;

  const url = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(query);
  const raw = await fetch(url);
  const data = JSON.parse(raw);
  const results = data.results.bindings;

  // Deduplicate by name, keeping first occurrence
  const byName = new Map();
  for (const r of results) {
    const name = r.itemLabel.value;
    if (name.startsWith("Q")) continue; // unnamed items
    if (byName.has(name)) continue;
    byName.set(name, {
      name,
      lat: +r.lat.value,
      lng: +r.lon.value,
      areaSqKm: r.area ? +r.area.value / 1e6 : null, // Wikidata area is in sq metres
    });
  }

  console.log("  " + byName.size + " unique named reservoirs from Wikidata");

  // Filter to UK bounding box (some Wikidata results may be misclassified)
  const ukReservoirs = [...byName.values()].filter(r =>
    r.lat >= 49.9 && r.lat <= 61.0 && r.lng >= -8.5 && r.lng <= 2.0
  );
  console.log("  " + ukReservoirs.length + " within UK bounds");

  // Merge with curated capacity data
  let matched = 0;
  const locations = ukReservoirs.map(r => {
    const curatedName = NAME_ALIASES[r.name] || r.name;
    const curated = CURATED_CAPACITY[curatedName] || CURATED_CAPACITY[r.name];
    if (curated) matched++;
    return {
      id: r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
      name: r.name,
      lat: Math.round(r.lat * 1000) / 1000,
      lng: Math.round(r.lng * 1000) / 1000,
      capacityMl: curated?.capacityMl || null,
      areaSqKm: r.areaSqKm ? Math.round(r.areaSqKm * 100) / 100 : null,
      use: curated?.use || "Water supply",
      year: curated?.year || null,
    };
  });

  // Add planned reservoirs
  for (const p of PLANNED) {
    locations.push({
      id: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
      ...p,
      areaSqKm: null,
    });
  }

  console.log("  " + matched + " matched with curated capacity data");
  console.log("  " + locations.length + " total locations (including " + PLANNED.length + " planned)");

  // Write to dataset
  const dataPath = join(__dirname, "..", "public", "data", "reservoirs.json");
  const dataset = JSON.parse(readFileSync(dataPath, "utf-8"));

  dataset.series.reservoirLocations = {
    sourceId: "ukceh-reservoirs",
    timeField: "id",
    label: "UK Reservoir Locations",
    unit: "megalitres",
    description: "Geographic coordinates for UK reservoirs from Wikidata, with capacity data from UKCEH inventory where available. Covers " + locations.length + " reservoirs.",
    data: locations,
  };

  writeFileSync(dataPath, JSON.stringify(dataset, null, 2));
  console.log("\nWrote " + locations.length + " reservoir locations to reservoirs.json");
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
