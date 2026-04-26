/**
 * fetch-battery-storage-neso.js
 *
 * NESO Capacity Market Register — battery storage component listings.
 * Aggregates de-rated capacity (MW) by delivery year for "Storage - Battery"
 * fuel class.
 *
 * Source: NESO CKAN data portal.
 * Endpoint: https://api.neso.energy/api/3/action/datastore_search_sql
 * Resource ID: 790f5fa0-f8eb-4d82-b98d-0d34d3e404e8
 *
 * Output: public/data/battery-storage.json
 */
import { writeFileSync } from "fs";
import { fetchJson } from "./lib/ons-fetch.js";

const RESOURCE_ID = "790f5fa0-f8eb-4d82-b98d-0d34d3e404e8";
const SQL = `
  SELECT "Delivery Year" AS year, SUM("De-Rated Capacity") AS mw
  FROM "${RESOURCE_ID}"
  WHERE "Primary Fuel" = 'Storage - Battery'
  GROUP BY "Delivery Year"
  ORDER BY "Delivery Year"
`;

async function main() {
  console.log("Querying NESO Capacity Market Register for battery storage…");
  const url =
    "https://api.neso.energy/api/3/action/datastore_search_sql?sql=" +
    encodeURIComponent(SQL);
  const json = await fetchJson(url);

  const records = json.result?.records || [];
  if (records.length === 0) throw new Error("No records returned");

  const annual = records
    .map((r) => ({
      year: r.year, // can be a financial-year string like "2026/2027"
      mw: Math.round(Number.parseFloat(r.mw) || 0),
    }))
    .filter((r) => r.year != null && Number.isFinite(r.mw))
    .sort((a, b) => String(a.year).localeCompare(String(b.year)));

  // Snapshot: latest delivery year's de-rated MW
  const latest = annual[annual.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "battery-storage",
    pillar: "foundations",
    topic: "energy",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "neso-cmr",
        name: "NESO Capacity Market Register — Components",
        url: "https://www.neso.energy/data-portal/capacity-market-register",
        publisher: "NESO",
        note: "De-rated battery capacity by delivery year. Filtered to Primary Fuel = 'Storage - Battery'.",
      },
    ],
    snapshot: {
      latestMw: latest.mw,
      latestDeliveryYear: latest.year,
    },
    series: {
      annual: {
        sourceId: "neso-cmr",
        timeField: "year",
        unit: "MW (de-rated)",
        description:
          "Aggregate battery storage de-rated capacity by delivery year, from the NESO Capacity Market Register.",
        data: annual,
      },
    },
  };

  writeFileSync(
    "public/data/battery-storage.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `✓ public/data/battery-storage.json (${annual.length} delivery years; latest ${latest.mw} MW for ${latest.year})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
