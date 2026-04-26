/**
 * fetch-steel-trade.js
 *
 * UK monthly iron & steel trade (HS chapter 72), in tonnes. The headline
 * metric is gross imports — ~50-60% of UK apparent steel consumption is
 * imported, so imports are a sharper construction-demand proxy than
 * domestic production alone (which is in long structural decline).
 *
 * The dataset also exposes exports and net imports so the same JSON can
 * later feed a "% domestic" tile on Sovereign Capability.
 *
 * Source: HMRC Overseas Trade in Goods OData API (uktradeinfo.com).
 * Endpoint: https://api.uktradeinfo.com/OTS
 * FlowTypeId: 1=EU imports, 2=EU exports, 3=Non-EU imports, 4=Non-EU exports.
 *
 * Output: public/data/steel-trade.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import https from "https";

const BASE = "https://api.uktradeinfo.com/OTS";
const HS_CHAPTER = "72";
const MONTHS_BACK = 36;
const REQUEST_DELAY_MS = 750;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    https
      .get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: {
            Accept: "application/json",
            "User-Agent": "StateOfBritain/1.0 (+dashboard)",
          },
        },
        (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            res.resume();
            return fetchJson(res.headers.location).then(resolve, reject);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
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
      )
      .on("error", reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function lastNMonthIds(n) {
  const out = [];
  const now = new Date();
  // HMRC trade data lags ~2 months; start from now-2 and go back.
  for (let i = 2; i < 2 + n; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    out.push(`${y}${m}`);
  }
  return out.reverse();
}

function monthIdToPeriod(id) {
  const s = String(id);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}`;
}

async function fetchTonnes(monthId, flowTypeIds) {
  const flowFilter = flowTypeIds.map((f) => `FlowTypeId eq ${f}`).join(" or ");
  const filter = `Commodity/Hs2Code eq '${HS_CHAPTER}' and (${flowFilter}) and MonthId eq ${monthId}`;
  const url = `${BASE}?${new URLSearchParams({ "$filter": filter, "$top": "10000" })}`;
  const json = await fetchJson(url);
  const rows = json.value || [];
  // NetMass is in kg; convert to tonnes.
  const totalKg = rows.reduce((s, r) => s + (r.NetMass || 0), 0);
  const totalGbp = rows.reduce((s, r) => s + (r.Value || 0), 0);
  return { tonnes: Math.round(totalKg / 1000), gbp: Math.round(totalGbp), rows: rows.length };
}

async function main() {
  const monthIds = lastNMonthIds(MONTHS_BACK);
  const data = [];

  for (const id of monthIds) {
    try {
      const imports = await fetchTonnes(id, [1, 3]);
      await sleep(REQUEST_DELAY_MS);
      const exports = await fetchTonnes(id, [2, 4]);
      await sleep(REQUEST_DELAY_MS);

      if (imports.rows === 0 && exports.rows === 0) {
        console.warn(`  ${id}: no rows — likely too recent for HMRC publication`);
        continue;
      }

      const period = monthIdToPeriod(id);
      data.push({
        month: period,
        imports: imports.tonnes,
        exports: exports.tonnes,
        netImports: imports.tonnes - exports.tonnes,
        importValueGbp: imports.gbp,
        exportValueGbp: exports.gbp,
      });
      console.log(
        `  ${period}: imports ${imports.tonnes.toLocaleString()}t / exports ${exports.tonnes.toLocaleString()}t / net ${(imports.tonnes - exports.tonnes).toLocaleString()}t`
      );
    } catch (err) {
      console.warn(`  ${id} failed: ${err.message}`);
      await sleep(REQUEST_DELAY_MS * 2);
    }
  }

  if (data.length === 0) {
    writeEmpty("HMRC API returned no rows this run; series empty.");
    return;
  }

  const latest = data[data.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "steel-trade",
    pillar: "foundations",
    topic: "housing",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "hmrc-ots-72",
        name: "HMRC Overseas Trade in Goods — HS chapter 72 (iron & steel)",
        url: "https://www.uktradeinfo.com/trade-data/ots-custom-table/",
        publisher: "HMRC",
        note:
          "Monthly UK iron & steel trade in tonnes and £, all HS-72 commodities aggregated. ~50-60% of UK apparent steel consumption is imported.",
      },
    ],
    snapshot: {
      imports: latest.imports,
      exports: latest.exports,
      netImports: latest.netImports,
      tradeMonth: latest.month,
      tradeUnit: "tonnes / month",
    },
    series: {
      monthly: {
        sourceId: "hmrc-ots-72",
        timeField: "month",
        unit: "tonnes / month",
        description:
          "Monthly UK iron & steel imports, exports, and net imports (HS chapter 72). Net imports = imports - exports.",
        data,
      },
    },
  };

  writeFileSync("public/data/steel-trade.json", JSON.stringify(output, null, 2) + "\n");
  console.log(
    `✓ public/data/steel-trade.json (${data.length} months; latest imports ${latest.imports.toLocaleString()}t for ${latest.month})`
  );
}

function writeEmpty(note) {
  const output = {
    $schema: "sob-dataset-v1",
    id: "steel-trade",
    pillar: "foundations",
    topic: "housing",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "hmrc-ots-72",
        name: "HMRC Overseas Trade in Goods — HS chapter 72 (iron & steel)",
        url: "https://www.uktradeinfo.com/trade-data/ots-custom-table/",
        publisher: "HMRC",
        note,
      },
    ],
    snapshot: {},
    series: {
      monthly: {
        sourceId: "hmrc-ots-72",
        timeField: "month",
        unit: "tonnes / month",
        description: "Monthly UK iron & steel trade.",
        data: [],
      },
    },
  };
  writeFileSync("public/data/steel-trade.json", JSON.stringify(output, null, 2) + "\n");
  console.log(`⚠ public/data/steel-trade.json (empty; ${note})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
