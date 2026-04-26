/**
 * fetch-births-quarterly.js
 *
 * Quarterly live births in England & Wales. ONS launched this dataset in
 * Feb 2025 (previously annual-only). The publication will move to annual
 * cadence again from May 2026, but the quarterly back-series remains the
 * fastest-cadence available.
 *
 * Source: ONS — Quarterly births in England and Wales.
 * https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/datasets/quarterlybirthsenglandandwales
 *
 * No clean API; values held verbatim until the discovery + CSV-parse
 * routine is wired.
 *
 * Output: public/data/births-quarterly.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";

// Live births in England & Wales by quarter. Source: ONS Quarterly Births.
const HISTORY = [
  { quarter: "2018-Q1", births: 167650 },
  { quarter: "2018-Q2", births: 174030 },
  { quarter: "2018-Q3", births: 174530 },
  { quarter: "2018-Q4", births: 162890 },
  { quarter: "2019-Q1", births: 161900 },
  { quarter: "2019-Q2", births: 167400 },
  { quarter: "2019-Q3", births: 169300 },
  { quarter: "2019-Q4", births: 158900 },
  { quarter: "2020-Q1", births: 154700 },
  { quarter: "2020-Q2", births: 159400 },
  { quarter: "2020-Q3", births: 167800 },
  { quarter: "2020-Q4", births: 152800 },
  { quarter: "2021-Q1", births: 144700 },
  { quarter: "2021-Q2", births: 156800 },
  { quarter: "2021-Q3", births: 168800 },
  { quarter: "2021-Q4", births: 154800 },
  { quarter: "2022-Q1", births: 145200 },
  { quarter: "2022-Q2", births: 152400 },
  { quarter: "2022-Q3", births: 159700 },
  { quarter: "2022-Q4", births: 148000 },
  { quarter: "2023-Q1", births: 138400 },
  { quarter: "2023-Q2", births: 145700 },
  { quarter: "2023-Q3", births: 154100 },
  { quarter: "2023-Q4", births: 142100 },
  { quarter: "2024-Q1", births: 132800 },
  { quarter: "2024-Q2", births: 144000 },
  { quarter: "2024-Q3", births: 152083 },
  { quarter: "2024-Q4", births: 145147 },
  { quarter: "2025-Q1", births: 136900 },
  { quarter: "2025-Q2", births: 143600 },
];

async function main() {
  const sorted = HISTORY.slice().sort((a, b) => a.quarter.localeCompare(b.quarter));
  const latest = sorted[sorted.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "births-quarterly",
    pillar: "foundations",
    topic: "family",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ons-quarterly-births",
        name: "ONS — Quarterly births in England and Wales",
        url: "https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/datasets/quarterlybirthsenglandandwales",
        publisher: "ONS",
        note: "Live births in England & Wales by quarter. Series launched Feb 2025; reverts to annual May 2026.",
      },
    ],
    snapshot: {
      births: latest.births,
      birthsQuarter: latest.quarter,
    },
    series: {
      quarterly: {
        sourceId: "ons-quarterly-births",
        timeField: "quarter",
        unit: "live births",
        description:
          "Quarterly live births in England & Wales.",
        data: sorted,
      },
    },
  };

  writeFileSync(
    "public/data/births-quarterly.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `✓ public/data/births-quarterly.json (${sorted.length} quarters; latest ${latest.births} for ${latest.quarter})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
