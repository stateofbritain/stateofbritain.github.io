/**
 * fetch-court-backlog-quarterly.js
 *
 * Quarterly Crown Court outstanding (open) cases in England & Wales.
 * Source: MoJ Criminal Court Statistics, Crown Court Receipts/Disposals/
 * Open Cases tool (XLSX, file UUID changes per release).
 *
 * Hardcoded historical for now; replace with discovery + XLSX parse when
 * the routine is wired.
 *
 * Output: public/data/court-backlog-quarterly.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";

// Outstanding Crown Court cases at end of quarter. England & Wales.
// Source: MoJ Criminal Court Statistics Quarterly.
const HISTORY = [
  { quarter: "2018-Q1", outstanding: 38900 },
  { quarter: "2018-Q2", outstanding: 39400 },
  { quarter: "2018-Q3", outstanding: 38700 },
  { quarter: "2018-Q4", outstanding: 33700 },
  { quarter: "2019-Q1", outstanding: 33000 },
  { quarter: "2019-Q2", outstanding: 36300 },
  { quarter: "2019-Q3", outstanding: 37400 },
  { quarter: "2019-Q4", outstanding: 39300 },
  { quarter: "2020-Q1", outstanding: 41100 },
  { quarter: "2020-Q2", outstanding: 47500 }, // COVID disruption
  { quarter: "2020-Q3", outstanding: 53300 },
  { quarter: "2020-Q4", outstanding: 57000 },
  { quarter: "2021-Q1", outstanding: 59500 },
  { quarter: "2021-Q2", outstanding: 60200 },
  { quarter: "2021-Q3", outstanding: 60100 },
  { quarter: "2021-Q4", outstanding: 58700 },
  { quarter: "2022-Q1", outstanding: 58100 },
  { quarter: "2022-Q2", outstanding: 60400 },
  { quarter: "2022-Q3", outstanding: 62500 },
  { quarter: "2022-Q4", outstanding: 64700 },
  { quarter: "2023-Q1", outstanding: 65000 },
  { quarter: "2023-Q2", outstanding: 67700 },
  { quarter: "2023-Q3", outstanding: 67400 },
  { quarter: "2023-Q4", outstanding: 67500 },
  { quarter: "2024-Q1", outstanding: 67700 },
  { quarter: "2024-Q2", outstanding: 70500 },
  { quarter: "2024-Q3", outstanding: 73100 },
  { quarter: "2024-Q4", outstanding: 76500 },
  { quarter: "2025-Q1", outstanding: 78200 },
  { quarter: "2025-Q2", outstanding: 79100 },
  { quarter: "2025-Q3", outstanding: 80200 },
];

async function main() {
  const sorted = HISTORY.slice().sort((a, b) => a.quarter.localeCompare(b.quarter));
  const latest = sorted[sorted.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "court-backlog-quarterly",
    pillar: "state",
    topic: "justice",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "moj-ccs",
        name: "Ministry of Justice — Criminal Court Statistics Quarterly",
        url: "https://www.gov.uk/government/collections/criminal-court-statistics",
        publisher: "MoJ",
        note: "Crown Court outstanding cases at quarter end.",
      },
    ],
    snapshot: {
      outstanding: latest.outstanding,
      outstandingQuarter: latest.quarter,
    },
    series: {
      quarterly: {
        sourceId: "moj-ccs",
        timeField: "quarter",
        unit: "cases outstanding",
        description:
          "Quarterly Crown Court outstanding cases at end of period, England & Wales.",
        data: sorted,
      },
    },
  };

  writeFileSync(
    "public/data/court-backlog-quarterly.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `✓ public/data/court-backlog-quarterly.json (${sorted.length} quarters; latest ${latest.outstanding} for ${latest.quarter})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
