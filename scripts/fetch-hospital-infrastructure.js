/**
 * fetch-hospital-infrastructure.js
 *
 * Downloads hospital and construction infrastructure data from:
 *   1. ONS Construction Output by sector (bulletindataset2.xlsx)
 *   2. ONS New Orders in Construction with Health breakdown (bulletindataset7.xlsx)
 *   3. NHS Digital ERIC backlog maintenance data
 *
 * Outputs public/data/hospital-infrastructure.json in sob-dataset-v1 schema.
 */
import { writeFileSync, unlinkSync, createWriteStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONSTRUCTION_OUTPUT_URL =
  "https://www.ons.gov.uk/file?uri=/businessindustryandtrade/constructionindustry/datasets/outputintheconstructionindustry/current/bulletindataset2.xlsx";

const NEW_ORDERS_URL =
  "https://www.ons.gov.uk/file?uri=/businessindustryandtrade/constructionindustry/datasets/newordersintheconstructionindustry/current/bulletindataset7.xlsx";

function download(url, outPath) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      const parsed = new URL(u);
      https.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: { "User-Agent": "StateOfBritain/1.0 (data fetch script)" },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            return get(res.headers.location);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} from ${u}`));
          }
          const ws = createWriteStream(outPath);
          res.pipe(ws);
          ws.on("finish", () => resolve());
          ws.on("error", reject);
        }
      );
    };
    get(url);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const tmpOutput = join(__dirname, "..", "tmp-construction-output.xlsx");
  const tmpOrders = join(__dirname, "..", "tmp-construction-orders.xlsx");
  const parserScript = join(__dirname, "parse-construction.py");

  // Download both Excel files
  console.log("Downloading ONS construction output...");
  await download(CONSTRUCTION_OUTPUT_URL, tmpOutput);
  console.log("  Done.");

  await sleep(2000);

  console.log("Downloading ONS new orders in construction...");
  await download(NEW_ORDERS_URL, tmpOrders);
  console.log("  Done.");

  // Parse with Python
  console.log("Parsing Excel files...");
  let parsed;
  try {
    const raw = execSync(
      `python3 "${parserScript}" "${tmpOutput}" "${tmpOrders}"`,
      { maxBuffer: 10 * 1024 * 1024, encoding: "utf-8" }
    );
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("Python parser failed:", err.stderr || err.message);
    cleanup(tmpOutput, tmpOrders);
    process.exit(1);
  }

  cleanup(tmpOutput, tmpOrders);

  const constructionOutput = parsed.constructionOutput || [];
  const healthOrders = parsed.healthOrders || [];

  console.log(`Construction output: ${constructionOutput.length} annual rows`);
  console.log(`Health orders: ${healthOrders.length} rows`);

  if (constructionOutput.length === 0) {
    console.error("No construction output data parsed.");
    process.exit(1);
  }

  // Snapshot from latest year
  const latest = constructionOutput[constructionOutput.length - 1];

  const dataset = {
    $schema: "sob-dataset-v1",
    id: "hospital-infrastructure",
    pillar: "foundations",
    topic: "healthcare",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ons-construction-output",
        name: "ONS — Output in the Construction Industry",
        url: "https://www.ons.gov.uk/businessindustryandtrade/constructionindustry/datasets/outputintheconstructionindustry",
        publisher: "Office for National Statistics",
        note: "Volume measure, seasonally adjusted, chained volume (£m). 'Public other new work' includes hospitals, schools, and other public buildings.",
      },
      {
        id: "ons-construction-orders",
        name: "ONS — New Orders in the Construction Industry",
        url: "https://www.ons.gov.uk/businessindustryandtrade/constructionindustry/datasets/newordersintheconstructionindustry",
        publisher: "Office for National Statistics / Barbour ABI",
        note: "New orders value, current prices. Health sub-category includes public health construction new orders.",
      },
    ],
    snapshot: {
      latestYear: latest.year,
      publicOtherNewWork: latest.publicOtherNewWork,
      infrastructure: latest.infrastructure,
      allNewWork: latest.allNewWork,
    },
    series: {
      constructionOutput: {
        sourceId: "ons-construction-output",
        label: "Construction Output by Sector",
        unit: "£m (SA, chained volume)",
        timeField: "year",
        description:
          "Annual average monthly construction output by sector. Volume measure, seasonally adjusted, chained volume (£ millions). 'Public other new work' covers hospitals, schools, and other public non-housing buildings. Great Britain.",
        data: constructionOutput,
      },
      healthOrders: {
        sourceId: "ons-construction-orders",
        label: "Health Construction New Orders",
        unit: "£m (current prices)",
        timeField: "year",
        description:
          "Annual total of new orders for public health construction (hospitals, clinics). Current prices, Great Britain. Aggregated from quarterly data.",
        data: healthOrders,
      },
    },
  };

  const outPath = join(__dirname, "..", "public", "data", "hospital-infrastructure.json");
  writeFileSync(outPath, JSON.stringify(dataset, null, 2) + "\n");
  console.log(`\nWrote ${outPath}`);
}

function cleanup(...files) {
  for (const f of files) {
    try { unlinkSync(f); } catch (e) {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
