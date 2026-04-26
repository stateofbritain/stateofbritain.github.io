/**
 * fetch-house-price-index.js
 *
 * UK House Price Index — monthly average price (UK aggregate). Sourced from
 * HM Land Registry's open Linked-Data SPARQL endpoint.
 *
 * Output: public/data/house-price-index.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import https from "https";

const SPARQL_ENDPOINT = "https://landregistry.data.gov.uk/landregistry/query";

// SPARQL query: monthly UK average price + index from December 2004 (start of HPI).
const QUERY = `
PREFIX  hpi:  <http://landregistry.data.gov.uk/def/hpi/>
PREFIX  rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?date ?avgPrice ?indexValue
WHERE {
  ?obs a hpi:MonthlyIndicesByRegion ;
       hpi:refRegion <http://landregistry.data.gov.uk/id/region/united-kingdom> ;
       hpi:refMonth ?date ;
       hpi:averagePrice ?avgPrice ;
       hpi:housePriceIndex ?indexValue .
}
ORDER BY ?date
`;

function postJson(url, body, contentType) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          "Content-Type": contentType,
          "Accept": "application/sparql-results+json",
          "User-Agent": "StateOfBritain/1.0 (+dashboard)",
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
          } catch (e) {
            reject(e);
          }
        });
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log("Querying HM Land Registry HPI…");
  const body = `query=${encodeURIComponent(QUERY)}`;
  const json = await postJson(SPARQL_ENDPOINT, body, "application/x-www-form-urlencoded");

  const bindings = json.results?.bindings || [];
  if (bindings.length === 0) throw new Error("No results from SPARQL query");

  const monthly = bindings
    .map((b) => {
      const dateStr = b.date?.value; // e.g. "2024-12-01"
      const period = dateStr ? dateStr.slice(0, 7) : null;
      const avgPrice = Number.parseFloat(b.avgPrice?.value);
      const indexValue = Number.parseFloat(b.indexValue?.value);
      return period && Number.isFinite(avgPrice)
        ? { period, avgPrice: Math.round(avgPrice), index: Number(indexValue.toFixed(2)) }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.period.localeCompare(b.period));

  // Annual averages for longSeries
  const byYear = new Map();
  for (const m of monthly) {
    const yr = parseInt(m.period.slice(0, 4), 10);
    if (!byYear.has(yr)) byYear.set(yr, []);
    byYear.get(yr).push(m.avgPrice);
  }
  const annual = [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, vs]) => ({
      year,
      avgPrice: Math.round(vs.reduce((s, v) => s + v, 0) / vs.length),
    }));

  const latest = monthly[monthly.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "house-price-index",
    pillar: "foundations",
    topic: "housing",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "hmlr-ukhpi",
        name: "HM Land Registry — UK House Price Index",
        url: "https://landregistry.data.gov.uk/app/ukhpi/",
        publisher: "HM Land Registry / ONS / Registers of Scotland / LPS NI",
      },
    ],
    snapshot: {
      avgPrice: latest.avgPrice,
      avgPricePeriod: latest.period,
      hpi: latest.index,
      hpiPeriod: latest.period,
    },
    series: {
      monthly: {
        sourceId: "hmlr-ukhpi",
        timeField: "period",
        unit: "£",
        description:
          "Monthly UK average house price (Land Registry HPI methodology).",
        data: monthly,
      },
      annual: {
        sourceId: "hmlr-ukhpi",
        timeField: "year",
        unit: "£",
        description: "Annual mean of monthly UK average house prices.",
        data: annual,
      },
    },
  };

  writeFileSync(
    "public/data/house-price-index.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `✓ public/data/house-price-index.json (${monthly.length} months, ${annual.length} years; latest £${latest.avgPrice.toLocaleString()} for ${latest.period})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
