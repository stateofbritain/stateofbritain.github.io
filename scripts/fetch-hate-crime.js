/**
 * fetch-hate-crime.js
 *
 * Downloads Home Office hate crime data tables (ODS) and parses via Python.
 * Outputs public/data/hate-crime.json in sob-dataset-v1 schema.
 *
 * Source: Home Office "Hate crime, England and Wales" annual release.
 * Data covers police-recorded hate crimes by monitored strand from 2011/12.
 * Time series excludes Metropolitan Police for comparability across years.
 */
import { writeFileSync, unlinkSync, createWriteStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_TABLES_URL =
  "https://assets.publishing.service.gov.uk/media/68e4bbbb8c1db6022d0ca16e/hate-crime-england-and-wales-2024-to-2025-data-tables.ods";

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

async function main() {
  const tmpOds = join(__dirname, "..", "tmp-hate-crime-data.ods");
  const parserScript = join(__dirname, "parse-hate-crime.py");

  // Download the ODS file
  console.log("Downloading hate crime data tables...");
  await download(DATA_TABLES_URL, tmpOds);
  console.log("  Downloaded.");

  // Parse with Python
  console.log("Parsing ODS with Python...");
  let parsed;
  try {
    const raw = execSync(`python3 "${parserScript}" "${tmpOds}"`, {
      maxBuffer: 10 * 1024 * 1024,
      encoding: "utf-8",
    });
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("Python parser failed:", err.stderr || err.message);
    try { unlinkSync(tmpOds); } catch (e) {}
    process.exit(1);
  }

  // Clean up temp file
  try { unlinkSync(tmpOds); } catch (e) {}

  const byStrand = parsed.byStrand || [];
  const byReligion = parsed.byReligion || [];

  console.log(`  Strand time series: ${byStrand.length} years`);
  console.log(`  Religion breakdown: ${byReligion.length} entries`);

  if (byStrand.length === 0) {
    console.error("No strand data parsed. Check ODS structure.");
    process.exit(1);
  }

  // Snapshot from latest year
  const latest = byStrand[byStrand.length - 1];

  const dataset = {
    $schema: "sob-dataset-v1",
    id: "hate-crime",
    pillar: "state",
    topic: "justice",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "home-office-hate-crime",
        name: "Home Office — Hate crime, England and Wales",
        url: "https://www.gov.uk/government/statistics/hate-crime-england-and-wales-year-ending-march-2025",
        publisher: "Home Office",
        note: "Police-recorded hate crimes, England and Wales. Time series excludes Metropolitan Police for year-on-year comparability. One offence can have multiple motivating strands.",
      },
    ],
    snapshot: {
      latestYear: latest.year,
      raceHateCrimes: latest.race,
      religionHateCrimes: latest.religion,
      sexualOrientationHateCrimes: latest.sexualOrientation,
      disabilityHateCrimes: latest.disability,
      transgenderHateCrimes: latest.transgender,
      totalOffences: latest.total,
    },
    series: {
      byStrand: {
        sourceId: "home-office-hate-crime",
        label: "Hate Crimes by Strand",
        unit: "offences",
        timeField: "year",
        description:
          "Police-recorded hate crimes by monitored strand (race, religion, sexual orientation, disability, transgender). Excludes Metropolitan Police for comparability. One offence may be counted under multiple strands. England and Wales.",
        methodologyBreaks: [
          {
            at: "2014/15",
            label: "Recording improvements",
            description:
              "Police forces improved their recording of hate crimes following HMIC inspections in 2014, leading to increases in recorded numbers that do not necessarily reflect changes in underlying prevalence.",
            severity: "major",
          },
        ],
        data: byStrand,
      },
      byReligion: {
        sourceId: "home-office-hate-crime",
        label: "Religious Hate Crimes by Perceived Religion",
        unit: "offences",
        timeField: "religion",
        description:
          "Police-recorded religious hate crimes broken down by the perceived religion of the victim. Excludes Metropolitan Police. England and Wales.",
        data: byReligion,
      },
    },
  };

  const outPath = join(__dirname, "..", "public", "data", "hate-crime.json");
  writeFileSync(outPath, JSON.stringify(dataset, null, 2) + "\n");
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
