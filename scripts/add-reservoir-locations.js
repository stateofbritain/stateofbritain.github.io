#!/usr/bin/env node
/**
 * add-reservoir-locations.js
 *
 * Adds a curated `reservoirLocations` series to public/data/reservoirs.json
 * with lat/lng coordinates and capacity for the ~50 largest UK reservoirs.
 *
 * Coordinates sourced from public reference data (Wikipedia, OS maps).
 * Capacity figures from UKCEH Inventory of Reservoirs.
 *
 * Run: node scripts/add-reservoir-locations.js
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Curated reservoir data: name, lat, lng, capacity (megalitres), use, completion year
// Covers the largest reservoirs in the UKCEH inventory plus notable regional ones
const RESERVOIRS = [
  // ── Scottish Highlands (hydro-electric) ────────────────────────────
  { name: "Loch Ericht",     lat: 56.805, lng: -4.380, capacityMl: 1291596, use: "Hydro-electric", year: 1962 },
  { name: "Loch Quoich",     lat: 57.050, lng: -5.350, capacityMl: 556677, use: "Hydro-electric", year: 1955 },
  { name: "Loch Earn",       lat: 56.385, lng: -4.215, capacityMl: 397630, use: "Hydro-electric", year: 1958 },
  { name: "Mullardoch",      lat: 57.280, lng: -5.120, capacityMl: 165226, use: "Hydro-electric", year: 1951 },
  { name: "Loch Garry",      lat: 57.025, lng: -5.125, capacityMl: 163272, use: "Hydro-electric", year: 1956 },
  { name: "Loch Luichart",   lat: 57.618, lng: -4.855, capacityMl: 128124, use: "Hydro-electric", year: 1954 },
  { name: "Blackwater",      lat: 57.710, lng: -4.795, capacityMl: 214977, use: "Hydro-electric", year: 1909 },
  { name: "Loch Sloy",       lat: 56.270, lng: -4.775, capacityMl: 33800,  use: "Hydro-electric", year: 1950 },
  { name: "Loch Monar",      lat: 57.385, lng: -5.170, capacityMl: 97000,  use: "Hydro-electric", year: 1960 },
  { name: "Loch Fannich",    lat: 57.690, lng: -5.100, capacityMl: 79000,  use: "Hydro-electric", year: 1952 },

  // ── Scottish water supply ─────────────────────────────────────────
  { name: "Loch Katrine",    lat: 56.250, lng: -4.580, capacityMl: 804704, use: "Water supply", year: 1859 },
  { name: "Loch Lomond",     lat: 56.110, lng: -4.580, capacityMl: 91000,  use: "Water supply", year: 1971 },
  { name: "Megget",          lat: 55.490, lng: -3.260, capacityMl: 64000,  use: "Water supply", year: 1983 },
  { name: "Talla",           lat: 55.520, lng: -3.345, capacityMl: 29000,  use: "Water supply", year: 1905 },
  { name: "Carron Valley",   lat: 56.020, lng: -4.050, capacityMl: 25000,  use: "Water supply", year: 1939 },

  // ── Northern England ──────────────────────────────────────────────
  { name: "Kielder Water",   lat: 55.200, lng: -2.590, capacityMl: 199000, use: "Water supply", year: 1981 },
  { name: "Cow Green",       lat: 54.665, lng: -2.290, capacityMl: 40920,  use: "Water supply", year: 1971 },
  { name: "Haweswater",      lat: 54.510, lng: -2.800, capacityMl: 84500,  use: "Water supply", year: 1941 },
  { name: "Thirlmere",       lat: 54.540, lng: -3.065, capacityMl: 41000,  use: "Water supply", year: 1894 },
  { name: "Ennerdale Water", lat: 54.530, lng: -3.380, capacityMl: 26000,  use: "Water supply", year: 1902 },

  // ── Yorkshire / Lancashire ────────────────────────────────────────
  { name: "Scammonden",      lat: 53.635, lng: -1.895, capacityMl: 7750,   use: "Water supply", year: 1971 },
  { name: "Grimwith",        lat: 54.060, lng: -1.920, capacityMl: 21360,  use: "Water supply", year: 1983 },
  { name: "Scar House",      lat: 54.165, lng: -1.940, capacityMl: 22500,  use: "Water supply", year: 1936 },
  { name: "Stocks",          lat: 54.000, lng: -2.505, capacityMl: 13450,  use: "Water supply", year: 1932 },
  { name: "Rivington",       lat: 53.620, lng: -2.545, capacityMl: 11200,  use: "Water supply", year: 1857 },

  // ── Peak District / Pennines ──────────────────────────────────────
  { name: "Derwent Reservoir",    lat: 53.405, lng: -1.745, capacityMl: 9630,  use: "Water supply", year: 1916 },
  { name: "Ladybower",            lat: 53.380, lng: -1.730, capacityMl: 27500, use: "Water supply", year: 1945 },
  { name: "Longdendale",          lat: 53.455, lng: -1.870, capacityMl: 15500, use: "Water supply", year: 1877 },
  { name: "Carsington Water",     lat: 53.050, lng: -1.630, capacityMl: 36000, use: "Water supply", year: 1991 },

  // ── East Midlands / East ──────────────────────────────────────────
  { name: "Rutland Water",        lat: 52.655, lng: -0.645, capacityMl: 124000, use: "Water supply", year: 1976 },
  { name: "Grafham Water",        lat: 52.310, lng: -0.320, capacityMl: 58600,  use: "Water supply", year: 1966 },
  { name: "Pitsford Water",       lat: 52.340, lng: -0.900, capacityMl: 17800,  use: "Water supply", year: 1956 },

  // ── Wales ─────────────────────────────────────────────────────────
  { name: "Llyn Brianne",         lat: 52.130, lng: -3.760, capacityMl: 62140, use: "Water supply", year: 1972 },
  { name: "Claerwen",             lat: 52.290, lng: -3.650, capacityMl: 48300, use: "Water supply", year: 1952 },
  { name: "Llyn Celyn",           lat: 52.870, lng: -3.725, capacityMl: 72700, use: "Water supply", year: 1965 },
  { name: "Lake Vyrnwy",          lat: 52.780, lng: -3.465, capacityMl: 59700, use: "Water supply", year: 1888 },
  { name: "Elan Valley",          lat: 52.280, lng: -3.580, capacityMl: 99000, use: "Water supply", year: 1904 },
  { name: "Llandegfedd",          lat: 51.700, lng: -3.000, capacityMl: 24000, use: "Water supply", year: 1963 },
  { name: "Llyn Clywedog",        lat: 52.510, lng: -3.560, capacityMl: 50000, use: "Water supply", year: 1967 },

  // ── South West ────────────────────────────────────────────────────
  { name: "Roadford Lake",        lat: 50.700, lng: -4.170, capacityMl: 34500, use: "Water supply", year: 1989 },
  { name: "Wimbleball Lake",      lat: 51.055, lng: -3.475, capacityMl: 21300, use: "Water supply", year: 1979 },
  { name: "Colliford Lake",       lat: 50.505, lng: -4.590, capacityMl: 28540, use: "Water supply", year: 1983 },
  { name: "Stithians",            lat: 50.185, lng: -5.190, capacityMl: 5200,  use: "Water supply", year: 1965 },

  // ── South East / Thames ───────────────────────────────────────────
  { name: "Bewl Water",           lat: 51.090, lng: 0.405,  capacityMl: 31300, use: "Water supply", year: 1975 },
  { name: "Ardingly",             lat: 51.050, lng: -0.080, capacityMl: 4680,  use: "Water supply", year: 1978 },
  { name: "Farmoor",              lat: 51.730, lng: -1.355, capacityMl: 13850, use: "Water supply", year: 1967 },

  // ── West Midlands / North West ────────────────────────────────────
  { name: "Blithfield",           lat: 52.770, lng: -1.870, capacityMl: 18200, use: "Water supply", year: 1953 },
  { name: "Tittesworth",          lat: 53.120, lng: -1.960, capacityMl: 6300,  use: "Water supply", year: 1963 },
  { name: "Vyrnwy",               lat: 52.780, lng: -3.465, capacityMl: 59700, use: "Water supply", year: 1888 },
  { name: "Lake Bala (Llyn Tegid)", lat: 52.900, lng: -3.605, capacityMl: 43000, use: "Water supply", year: 1955 },

  // ── Planned (future) ─────────────────────────────────────────────
  { name: "Havant Thicket (2031)",   lat: 50.910, lng: -0.950, capacityMl: 8700,  use: "Planned", year: 2031 },
  { name: "SESRO Abingdon (2040)",   lat: 51.650, lng: -1.330, capacityMl: 150000, use: "Planned", year: 2040 },
  { name: "Fens Reservoir (2036)",   lat: 52.500, lng:  0.130, capacityMl: 55000, use: "Planned", year: 2036 },
];

// Remove duplicate (Vyrnwy = Lake Vyrnwy)
const seen = new Set();
const deduped = RESERVOIRS.filter(r => {
  const key = r.lat.toFixed(2) + "," + r.lng.toFixed(2);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const dataPath = join(__dirname, "..", "public", "data", "reservoirs.json");
const dataset = JSON.parse(readFileSync(dataPath, "utf-8"));

// Build locations series
const locations = deduped.map(r => ({
  id: r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
  name: r.name,
  lat: r.lat,
  lng: r.lng,
  capacityMl: r.capacityMl,
  capacityBnL: +(r.capacityMl / 1e3).toFixed(1),
  use: r.use,
  year: r.year,
}));

dataset.series.reservoirLocations = {
  sourceId: "ukceh-reservoirs",
  timeField: "id",
  label: "UK Reservoir Locations with Capacity",
  unit: "megalitres",
  description: "Geographic coordinates and storage capacity for ~50 largest UK reservoirs, curated from UKCEH inventory and public reference data.",
  data: locations,
};

writeFileSync(dataPath, JSON.stringify(dataset, null, 2));
console.log("Added " + locations.length + " reservoir locations to reservoirs.json");
console.log("Breakdown: " + locations.filter(l => l.use === "Water supply").length + " water supply, "
  + locations.filter(l => l.use === "Hydro-electric").length + " hydro, "
  + locations.filter(l => l.use === "Planned").length + " planned");
