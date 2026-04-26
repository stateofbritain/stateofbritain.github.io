/**
 * fetch-ofgem-price-cap.js
 *
 * Quarterly Ofgem default-tariff price cap (typical dual-fuel household,
 * direct debit). The published cap series began Q1 2019.
 *
 * Ofgem does not provide a public CSV/API for the historical series; values
 * are announced ~2 months before each quarter and published on the cap
 * landing page. This script holds the historical record verbatim and writes
 * v1 JSON. Update the HISTORY array when a new cap is announced (next
 * announcement: 27 May for Q3, 26 Aug for Q4, 25 Nov for Q1, 27 Feb for Q2).
 *
 * Source: https://www.ofgem.gov.uk/energy-policy-and-regulation/policy-and-regulatory-programmes/energy-price-cap-default-tariff-policy/energy-price-cap-default-tariff-levels
 *
 * Output: public/data/ofgem-price-cap.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";

// Each entry: typical-household annual £ (Ofgem methodology, direct debit).
// Note: 2022-Q4 onward, the EPG (Energy Price Guarantee) capped consumer
// bills below the cap; the cap value here is Ofgem's underlying cap, not
// the user-paid amount during EPG.
const HISTORY = [
  { quarter: "2019-Q1", annual: 1137 },
  { quarter: "2019-Q2", annual: 1254 },
  { quarter: "2019-Q3", annual: 1254 },
  { quarter: "2019-Q4", annual: 1179 },
  { quarter: "2020-Q1", annual: 1179 },
  { quarter: "2020-Q2", annual: 1162 },
  { quarter: "2020-Q3", annual: 1162 },
  { quarter: "2020-Q4", annual: 1042 },
  { quarter: "2021-Q1", annual: 1042 },
  { quarter: "2021-Q2", annual: 1138 },
  { quarter: "2021-Q3", annual: 1138 },
  { quarter: "2021-Q4", annual: 1277 },
  { quarter: "2022-Q1", annual: 1277 },
  { quarter: "2022-Q2", annual: 1971 },
  { quarter: "2022-Q3", annual: 1971 },
  { quarter: "2022-Q4", annual: 3549 },
  { quarter: "2023-Q1", annual: 4279 },
  { quarter: "2023-Q2", annual: 3280 },
  { quarter: "2023-Q3", annual: 2074 },
  { quarter: "2023-Q4", annual: 1923 },
  { quarter: "2024-Q1", annual: 1928 },
  { quarter: "2024-Q2", annual: 1690 },
  { quarter: "2024-Q3", annual: 1568 },
  { quarter: "2024-Q4", annual: 1717 },
  { quarter: "2025-Q1", annual: 1738 },
  { quarter: "2025-Q2", annual: 1849 },
  { quarter: "2025-Q3", annual: 1720 },
  { quarter: "2025-Q4", annual: 1755 },
  { quarter: "2026-Q1", annual: 1738 },
  { quarter: "2026-Q2", annual: 1641 },
];

async function main() {
  const sorted = HISTORY.slice().sort((a, b) => a.quarter.localeCompare(b.quarter));
  const latest = sorted[sorted.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "ofgem-price-cap",
    pillar: "foundations",
    topic: "energy",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ofgem-cap",
        name: "Ofgem default tariff cap (typical dual-fuel direct-debit household)",
        url: "https://www.ofgem.gov.uk/energy-policy-and-regulation/policy-and-regulatory-programmes/energy-price-cap-default-tariff-policy/energy-price-cap-default-tariff-levels",
        publisher: "Ofgem",
        note: "Annual £/year for a typical household (3,100 kWh electricity + 12,000 kWh gas).",
      },
    ],
    snapshot: {
      annualBill: latest.annual,
      annualBillQuarter: latest.quarter,
      annualBillUnit: "£/year",
    },
    series: {
      quarterly: {
        sourceId: "ofgem-cap",
        timeField: "quarter",
        unit: "£/year",
        description:
          "Ofgem default-tariff cap for a typical dual-fuel direct-debit household.",
        data: sorted,
      },
    },
  };

  writeFileSync(
    "public/data/ofgem-price-cap.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `✓ public/data/ofgem-price-cap.json (${sorted.length} quarters; latest £${latest.annual} for ${latest.quarter})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
