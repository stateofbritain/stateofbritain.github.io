/**
 * fetch-ofgem-price-cap.js
 *
 * Quarterly Ofgem default-tariff price cap (typical dual-fuel household,
 * direct debit). Series began Q1 2019.
 *
 * Strategy:
 *   1. Try to scrape Ofgem's cap landing page for the latest typical
 *      annual bill (regex on the page HTML).
 *   2. If the scraped value names a quarter newer than our HISTORY, append it.
 *   3. Always write the (possibly updated) HISTORY to JSON.
 *
 * Source: https://www.ofgem.gov.uk/energy-policy-and-regulation/policy-and-regulatory-programmes/energy-price-cap-default-tariff-policy/energy-price-cap-default-tariff-levels
 *
 * Output: public/data/ofgem-price-cap.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import { fetchHtml } from "./lib/xlsx-fetch.js";

const OFGEM_URL =
  "https://www.ofgem.gov.uk/energy-policy-and-regulation/policy-and-regulatory-programmes/energy-price-cap-default-tariff-policy/energy-price-cap-default-tariff-levels";

const MONTH_TO_QUARTER = {
  january: 1, february: 1, march: 1,
  april: 2, may: 2, june: 2,
  july: 3, august: 3, september: 3,
  october: 4, november: 4, december: 4,
};

function inferLatestQuarter(html) {
  // Try to find "1 April to 30 June 2026" / "April to June 2026" type phrases.
  const m = html.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:to|–|-)?\s*[A-Za-z]+\s+(\d{4})/i);
  if (m) {
    const month = m[1].toLowerCase();
    const year = m[2];
    const q = MONTH_TO_QUARTER[month];
    if (q) return `${year}-Q${q}`;
  }
  return null;
}

function extractAnnualBill(html) {
  // Look for "£1,641" near "typical" / "household" / "year".
  const re = /£\s?([0-9],?[0-9]{3})\s*(?:a year|per year|annual|household|typical|\/year)/gi;
  const matches = [...html.matchAll(re)];
  if (matches.length === 0) return null;
  // Pick the smallest plausible household-bill value (between £700 and £4,500).
  const candidates = matches
    .map((m) => Number.parseFloat(m[1].replace(",", "")))
    .filter((n) => Number.isFinite(n) && n >= 700 && n <= 4500)
    .sort((a, b) => a - b);
  return candidates[0] ?? null;
}

// No hardcoded historical — only Ofgem-page-scraped values are admissible.
// The dashboard prefers "no data" over partially-recalled cap values that
// can't be auto-verified against the live page on each refresh.
const HISTORY = [];

async function main() {
  const merged = HISTORY.slice();
  let liveSourceNote = "";

  try {
    const html = await fetchHtml(OFGEM_URL);
    const quarter = inferLatestQuarter(html);
    const annual = extractAnnualBill(html);
    if (quarter && annual) {
      const existing = merged.find((r) => r.quarter === quarter);
      if (!existing) {
        merged.push({ quarter, annual });
        liveSourceNote = ` (added ${quarter} = £${annual} from live Ofgem page)`;
      } else if (existing.annual !== annual) {
        liveSourceNote = ` (Ofgem page shows £${annual} for ${quarter}; HISTORY records £${existing.annual} — leaving HISTORY in place)`;
      } else {
        liveSourceNote = ` (Ofgem page confirms ${quarter} = £${annual})`;
      }
    } else {
      liveSourceNote = " (live scrape did not yield a new quarter; using HISTORY)";
    }
  } catch (err) {
    liveSourceNote = ` (live scrape failed: ${err.message}; using HISTORY)`;
  }

  const sorted = merged.sort((a, b) => a.quarter.localeCompare(b.quarter));
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
    `✓ public/data/ofgem-price-cap.json (${sorted.length} quarters; latest £${latest.annual} for ${latest.quarter})${liveSourceNote}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
