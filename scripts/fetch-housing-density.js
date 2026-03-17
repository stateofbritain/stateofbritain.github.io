/**
 * fetch-housing-density.js
 *
 * UK housing density & geography data:
 *  - ONS: Population density by UK city/urban area
 *  - International city density comparison
 *  - Land Registry: Average house price by region
 *
 * Outputs: public/data/housing-density.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";

// ── UK city population density (persons/km²) ──────────────────────────
// Source: ONS mid-year population estimates, built-up area boundaries
const ukCityDensity = [
  { city: "London",           density: 5598, population: 8866000 },
  { city: "Manchester",       density: 4735, population: 553000 },
  { city: "Birmingham",       density: 4274, population: 1145000 },
  { city: "Liverpool",        density: 4150, population: 486000 },
  { city: "Bristol",          density: 4019, population: 472000 },
  { city: "Leicester",        density: 3846, population: 355000 },
  { city: "Nottingham",       density: 3680, population: 323000 },
  { city: "Newcastle",        density: 3327, population: 300000 },
  { city: "Leeds",            density: 3246, population: 812000 },
  { city: "Sheffield",        density: 2947, population: 557000 },
  { city: "Edinburgh",        density: 1991, population: 527000 },
  { city: "Cardiff",          density: 1846, population: 363000 },
  { city: "Belfast",          density: 1632, population: 345000 },
  { city: "Plymouth",         density: 1522, population: 264000 },
  { city: "England avg",      density: 434,  population: 57000000 },
];

// ── International city density comparison (persons/km²) ───────────────
// Source: Demographia World Urban Areas, national statistics
const intlCityDensity = [
  { city: "Paris",       country: "France",    density: 20700 },
  { city: "Barcelona",   country: "Spain",     density: 15800 },
  { city: "Tokyo",       country: "Japan",     density: 14500 },
  { city: "New York",    country: "USA",       density: 11300 },
  { city: "Singapore",   country: "Singapore", density: 7800 },
  { city: "Milan",       country: "Italy",     density: 7400 },
  { city: "London",      country: "UK",        density: 5598 },
  { city: "Berlin",      country: "Germany",   density: 4100 },
  { city: "Amsterdam",   country: "Netherlands", density: 3600 },
  { city: "Sydney",      country: "Australia", density: 2100 },
  { city: "Los Angeles", country: "USA",       density: 2900 },
];

// ── Average house price by region (England + devolved) ────────────────
// Source: HM Land Registry UK HPI, December 2024 (latest available)
const regionalPrices = [
  { region: "London",                  avgPrice: 523000 },
  { region: "South East",             avgPrice: 375000 },
  { region: "East of England",        avgPrice: 330000 },
  { region: "South West",             avgPrice: 305000 },
  { region: "West Midlands",          avgPrice: 248000 },
  { region: "East Midlands",          avgPrice: 240000 },
  { region: "England",                avgPrice: 290000 },
  { region: "North West",             avgPrice: 210000 },
  { region: "Yorkshire & Humber",     avgPrice: 205000 },
  { region: "Wales",                  avgPrice: 198000 },
  { region: "Scotland",               avgPrice: 190000 },
  { region: "North East",             avgPrice: 160000 },
  { region: "Northern Ireland",       avgPrice: 175000 },
];

// ── Snapshot ───────────────────────────────────────────────────────────
const london = ukCityDensity.find(d => d.city === "London");
const national = ukCityDensity.find(d => d.city === "England avg");
const londonPrice = regionalPrices.find(d => d.region === "London");
const cheapest = regionalPrices
  .filter(d => d.region !== "England")
  .reduce((a, b) => b.avgPrice < a.avgPrice ? b : a);

const snapshot = {
  londonDensity: london.density,
  nationalDensity: national.density,
  londonAvgPrice: londonPrice.avgPrice,
  cheapestRegion: cheapest.region,
  cheapestRegionPrice: cheapest.avgPrice,
};

// ── Output (sob-dataset-v1) ───────────────────────────────────────────
const output = {
  $schema: "sob-dataset-v1",
  id: "housing-density",
  pillar: "foundations",
  topic: "housing",
  generated: new Date().toISOString().slice(0, 10),
  sources: [
    {
      id: "ons-density",
      name: "ONS Mid-Year Population Estimates & Urban Area Boundaries",
      url: "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates",
      publisher: "ONS",
    },
    {
      id: "demographia",
      name: "Demographia World Urban Areas",
      url: "http://www.demographia.com/db-worldua.pdf",
      publisher: "Demographia",
      note: "International urban area density comparison",
    },
    {
      id: "land-registry-regional",
      name: "HM Land Registry UK House Price Index by Region",
      url: "https://landregistry.data.gov.uk/app/ukhpi",
      publisher: "HM Land Registry",
      note: "Average house prices, December 2024",
    },
  ],
  snapshot,
  series: {
    ukCityDensity: {
      sourceId: "ons-density",
      timeField: "city",
      data: ukCityDensity,
    },
    intlCityDensity: {
      sourceId: "demographia",
      timeField: "city",
      data: intlCityDensity,
    },
    regionalPrices: {
      sourceId: "land-registry-regional",
      timeField: "region",
      data: regionalPrices,
    },
  },
};

writeFileSync("public/data/housing-density.json", JSON.stringify(output, null, 2));
console.log(
  `  housing-density.json written (${ukCityDensity.length} UK cities, ` +
  `${intlCityDensity.length} intl cities, ${regionalPrices.length} regions)`
);
