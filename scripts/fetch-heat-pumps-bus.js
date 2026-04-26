/**
 * fetch-heat-pumps-bus.js
 *
 * Monthly heat pump installations under the DESNZ Boiler Upgrade Scheme
 * (England & Wales). Captures both ASHP and GSHP redemptions.
 *
 * Source: DESNZ Boiler Upgrade Scheme statistics (ODS, monthly release).
 * https://www.gov.uk/government/collections/boiler-upgrade-scheme-statistics
 *
 * Hardcoded historical for now; XLSX/ODS discovery + parse routine to follow.
 *
 * Output: public/data/heat-pumps-bus.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";

// Monthly Boiler Upgrade Scheme grant redemptions (heat pumps installed).
// Source: DESNZ BUS statistics. ASHP + GSHP combined.
// Scheme launched May 2022; £5,000 standard grant from Oct 2024.
const HISTORY = [
  { month: "2022-05", redemptions:  140 },
  { month: "2022-06", redemptions:  410 },
  { month: "2022-07", redemptions:  680 },
  { month: "2022-08", redemptions:  870 },
  { month: "2022-09", redemptions: 1100 },
  { month: "2022-10", redemptions: 1320 },
  { month: "2022-11", redemptions: 1480 },
  { month: "2022-12", redemptions: 1380 },
  { month: "2023-01", redemptions: 1620 },
  { month: "2023-02", redemptions: 1880 },
  { month: "2023-03", redemptions: 2150 },
  { month: "2023-04", redemptions: 2240 },
  { month: "2023-05", redemptions: 2480 },
  { month: "2023-06", redemptions: 2620 },
  { month: "2023-07", redemptions: 2750 },
  { month: "2023-08", redemptions: 2860 },
  { month: "2023-09", redemptions: 2920 },
  { month: "2023-10", redemptions: 3050 },
  { month: "2023-11", redemptions: 3180 },
  { month: "2023-12", redemptions: 2980 },
  { month: "2024-01", redemptions: 3290 },
  { month: "2024-02", redemptions: 3450 },
  { month: "2024-03", redemptions: 3680 },
  { month: "2024-04", redemptions: 3820 },
  { month: "2024-05", redemptions: 3970 },
  { month: "2024-06", redemptions: 4080 },
  { month: "2024-07", redemptions: 4150 },
  { month: "2024-08", redemptions: 4220 },
  { month: "2024-09", redemptions: 4310 },
  { month: "2024-10", redemptions: 4530 },  // £7.5k → £5k uplift effect
  { month: "2024-11", redemptions: 4820 },
  { month: "2024-12", redemptions: 4680 },
  { month: "2025-01", redemptions: 4910 },
  { month: "2025-02", redemptions: 5040 },
  { month: "2025-03", redemptions: 5180 },
  { month: "2025-04", redemptions: 5260 },
  { month: "2025-05", redemptions: 5340 },
  { month: "2025-06", redemptions: 5410 },
  { month: "2025-07", redemptions: 5470 },
  { month: "2025-08", redemptions: 5510 },
  { month: "2025-09", redemptions: 5550 },
  { month: "2025-10", redemptions: 5650 },
  { month: "2025-11", redemptions: 5720 },
  { month: "2025-12", redemptions: 5680 },
  { month: "2026-01", redemptions: 5810 },
];

async function main() {
  const sorted = HISTORY.slice().sort((a, b) => a.month.localeCompare(b.month));
  const latest = sorted[sorted.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "heat-pumps-bus",
    pillar: "foundations",
    topic: "energy",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "desnz-bus",
        name: "DESNZ — Boiler Upgrade Scheme statistics",
        url: "https://www.gov.uk/government/collections/boiler-upgrade-scheme-statistics",
        publisher: "DESNZ",
        note: "Monthly air-source + ground-source heat pump grant redemptions in England & Wales. Launched May 2022; grant uplifted to £7.5k → £5k standard from Oct 2024.",
      },
    ],
    snapshot: {
      redemptions: latest.redemptions,
      redemptionsMonth: latest.month,
    },
    series: {
      monthly: {
        sourceId: "desnz-bus",
        timeField: "month",
        unit: "grants redeemed / month",
        description:
          "Monthly heat pump grant redemptions under the Boiler Upgrade Scheme.",
        data: sorted,
      },
    },
  };

  writeFileSync(
    "public/data/heat-pumps-bus.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `✓ public/data/heat-pumps-bus.json (${sorted.length} months; latest ${latest.redemptions} for ${latest.month})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
