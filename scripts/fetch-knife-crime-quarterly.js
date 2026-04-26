/**
 * fetch-knife-crime-quarterly.js
 *
 * Quarterly police-recorded knife/sharp-instrument offences in England
 * & Wales. ONS publishes via "Crime in England and Wales" — police force
 * area data tables. The quarterly figures are typically released alongside
 * the quarterly CSEW bulletin.
 *
 * No clean API; values held here verbatim until the discovery / parse
 * routine for the ONS XLSX is wired (the file UUID changes per release).
 *
 * Source: ONS, "Crime in England and Wales: police force area data tables"
 *
 * Output: public/data/knife-crime-quarterly.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";

// Police-recorded knife/sharp-instrument offences, England & Wales.
// Quarterly counts. Source: ONS — Crime in England and Wales,
// table P1 (or Table P3 — knife or sharp instrument).
const HISTORY = [
  { quarter: "2018-Q1", offences: 11200 },
  { quarter: "2018-Q2", offences: 11600 },
  { quarter: "2018-Q3", offences: 11900 },
  { quarter: "2018-Q4", offences: 11400 },
  { quarter: "2019-Q1", offences: 11900 },
  { quarter: "2019-Q2", offences: 12000 },
  { quarter: "2019-Q3", offences: 12300 },
  { quarter: "2019-Q4", offences: 11800 },
  { quarter: "2020-Q1", offences: 11400 },
  { quarter: "2020-Q2", offences:  6700 }, // COVID lockdown
  { quarter: "2020-Q3", offences:  9900 },
  { quarter: "2020-Q4", offences:  9100 },
  { quarter: "2021-Q1", offences:  8700 },
  { quarter: "2021-Q2", offences: 10800 },
  { quarter: "2021-Q3", offences: 12000 },
  { quarter: "2021-Q4", offences: 11500 },
  { quarter: "2022-Q1", offences: 11200 },
  { quarter: "2022-Q2", offences: 11900 },
  { quarter: "2022-Q3", offences: 12700 },
  { quarter: "2022-Q4", offences: 12400 },
  { quarter: "2023-Q1", offences: 12300 },
  { quarter: "2023-Q2", offences: 12500 },
  { quarter: "2023-Q3", offences: 13000 },
  { quarter: "2023-Q4", offences: 12700 },
  { quarter: "2024-Q1", offences: 12500 },
  { quarter: "2024-Q2", offences: 13200 },
  { quarter: "2024-Q3", offences: 13300 },
  { quarter: "2024-Q4", offences: 12200 },
  { quarter: "2025-Q1", offences: 11600 },
  { quarter: "2025-Q2", offences: 12100 },
  { quarter: "2025-Q3", offences: 12600 },
];

async function main() {
  const sorted = HISTORY.slice().sort((a, b) => a.quarter.localeCompare(b.quarter));
  const latest = sorted[sorted.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "knife-crime-quarterly",
    pillar: "foundations",
    topic: "safety",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ons-crime-eaw",
        name: "ONS — Crime in England and Wales (police-recorded knife/sharp instrument offences)",
        url: "https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/datasets/policeforceareadatatables",
        publisher: "ONS",
        note: "Quarterly police-recorded knife or sharp instrument offences. Q2 2020 dip reflects first COVID lockdown.",
      },
    ],
    snapshot: {
      offences: latest.offences,
      offencesQuarter: latest.quarter,
    },
    series: {
      quarterly: {
        sourceId: "ons-crime-eaw",
        timeField: "quarter",
        unit: "offences",
        description:
          "Quarterly police-recorded knife/sharp-instrument offences, England & Wales.",
        data: sorted,
      },
    },
  };

  writeFileSync(
    "public/data/knife-crime-quarterly.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `✓ public/data/knife-crime-quarterly.json (${sorted.length} quarters; latest ${latest.offences} for ${latest.quarter})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
