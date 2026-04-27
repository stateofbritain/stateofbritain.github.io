/**
 * fetch-unga-alignment.js
 *
 * UK alignment with every other UN member state at the General Assembly,
 * computed from Erik Voeten / Bailey-Strezhnev's "Agreement Scores"
 * dataset (Harvard Dataverse).
 *
 * Method:
 *   1. Stream the AgreementScores CSV. Each row is (ccode1, ccode2,
 *      year, agree). agree is the share of roll-call votes in that
 *      year on which the two countries voted the same way.
 *   2. Filter to rows where one of the two countries is the UK (COW
 *      code 200), and the year is within the last 5 calendar years
 *      available in the dataset.
 *   3. Average each counterpart country's agreement across those years.
 *   4. Pair with country names + ISO3 codes from the IdealPoint
 *      estimates file.
 *
 * Source: Voeten, "United Nations General Assembly Voting Data"
 * https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/LEJUQZ
 *
 * Citation: Bailey, Strezhnev, Voeten (2017), "Estimating Dynamic State
 * Preferences from United Nations Voting Data", Journal of Conflict
 * Resolution 61(2): 430-456.
 *
 * Output: public/data/unga-alignment.json (sob-dataset-v1)
 *
 * This dataset updates ~annually — schedule monthly anyway as the file
 * is stable between updates. Run is one-off heavy (~142MB stream); the
 * resulting JSON is tiny.
 */
import { writeFileSync, createWriteStream, createReadStream, existsSync, statSync, mkdirSync } from "fs";
import { createInterface } from "readline";
import https from "https";
import path from "path";

const AGREEMENT_FILE_ID = 11837234; // AgreementScores.csv (no date suffix = current)
const IDEALPOINT_FILE_ID = 13642025; // Idealpointestimates1946-2025.tab
const UK_COW = 200;
const YEARS_WINDOW = 5;

const CACHE_DIR = "data/manual-uploads/voeten";
const AGREEMENT_PATH = path.join(CACHE_DIR, "AgreementScores.csv");
const IDEALPOINT_PATH = path.join(CACHE_DIR, "Idealpointestimates.tab");
const OUTPUT_PATH = "public/data/unga-alignment.json";

const DATAVERSE_URL = (fileId) =>
  `https://dataverse.harvard.edu/api/access/datafile/${fileId}`;

function downloadIfMissing(url, dest) {
  if (existsSync(dest) && statSync(dest).size > 1000) {
    console.log(`  cache hit: ${dest} (${(statSync(dest).size / 1024 / 1024).toFixed(1)} MB)`);
    return Promise.resolve();
  }
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  console.log(`  downloading ${url} → ${dest}`);
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume();
          const next = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, u).toString();
          return get(next);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        const out = createWriteStream(dest);
        res.pipe(out);
        out.on("finish", () => out.close(resolve));
        out.on("error", reject);
      }).on("error", reject);
    };
    get(url);
  });
}

function unquote(s) {
  if (typeof s !== "string") return s;
  return s.replace(/^"(.*)"$/, "$1");
}

/**
 * Stream the agreement CSV; for each UK row, append { other, year, agree }.
 * Header: "","session.x","ccode1","ccode2","agree","year",IdealPointFP.x,NVotesFP.x,IdealPointFP.y,NVotesFP.y,IdealPointDistance
 */
async function streamUkRows() {
  const rl = createInterface({
    input: createReadStream(AGREEMENT_PATH, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });
  let header = null;
  const rows = [];
  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (!line) continue;
    if (!header) {
      header = line.split(",").map(unquote);
      continue;
    }
    const cells = line.split(",");
    const ccode1 = Number.parseInt(unquote(cells[2]), 10);
    const ccode2 = Number.parseInt(unquote(cells[3]), 10);
    if (ccode1 !== UK_COW && ccode2 !== UK_COW) continue;
    const other = ccode1 === UK_COW ? ccode2 : ccode1;
    if (other === UK_COW) continue;
    const agree = Number.parseFloat(unquote(cells[4]));
    const year = Number.parseInt(unquote(cells[5]), 10);
    if (!Number.isFinite(agree) || !Number.isFinite(year)) continue;
    rows.push({ other, year, agree });
  }
  console.log(`  parsed ${lineCount.toLocaleString()} lines, ${rows.length.toLocaleString()} UK rows`);
  return rows;
}

/**
 * Build a ccode → { iso3, name } lookup from the ideal-point file.
 * Header (TSV): ccode\tiso3c\tCountryname\tyear\tNVotesFP\tIdealPointFP\tQ5%FP\tQ10%FP\tQ50%FP\tQ90%FP\tQ95%FP
 */
async function buildCountryLookup() {
  const rl = createInterface({
    input: createReadStream(IDEALPOINT_PATH, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });
  const map = new Map();
  let header = null;
  for await (const line of rl) {
    if (!line) continue;
    if (!header) {
      header = line.split("\t");
      continue;
    }
    const cells = line.split("\t");
    const cc = Number.parseInt(cells[0], 10);
    const iso3 = unquote((cells[1] || "").trim());
    const name = unquote((cells[2] || "").trim());
    if (Number.isFinite(cc) && !map.has(cc)) {
      map.set(cc, { iso3, name });
    }
  }
  return map;
}

async function main() {
  console.log("Downloading Voeten data files (cached after first run)…");
  await downloadIfMissing(DATAVERSE_URL(AGREEMENT_FILE_ID), AGREEMENT_PATH);
  await downloadIfMissing(DATAVERSE_URL(IDEALPOINT_FILE_ID), IDEALPOINT_PATH);

  console.log("Streaming UK agreement rows…");
  const rows = await streamUkRows();
  if (rows.length === 0) throw new Error("No UK rows found — check ccode mapping");

  const latestYear = Math.max(...rows.map((r) => r.year));
  const minYear = latestYear - YEARS_WINDOW + 1;
  const recent = rows.filter((r) => r.year >= minYear);
  console.log(`  latest year=${latestYear}; window ${minYear}-${latestYear}; ${recent.length.toLocaleString()} rows`);

  // Aggregate by counterpart country
  const byCountry = new Map();
  for (const r of recent) {
    if (!byCountry.has(r.other)) byCountry.set(r.other, []);
    byCountry.get(r.other).push(r.agree);
  }

  console.log("Building country lookup…");
  const lookup = await buildCountryLookup();

  const data = [];
  for (const [cc, scores] of byCountry) {
    const entry = lookup.get(cc) || { iso3: null, name: `COW ${cc}` };
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    data.push({
      ccode: cc,
      iso3: entry.iso3,
      country: entry.name,
      alignmentPct: Math.round(mean * 1000) / 10, // 0-100, one decimal
      yearsObserved: scores.length,
    });
  }
  data.sort((a, b) => b.alignmentPct - a.alignmentPct);

  const output = {
    $schema: "sob-dataset-v1",
    id: "unga-alignment",
    pillar: "state",
    topic: "diplomacy",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "voeten-unga",
        name: "Voeten — United Nations General Assembly Voting Data",
        url: "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/LEJUQZ",
        publisher: "Harvard Dataverse (Erik Voeten)",
        note:
          "UK roll-call vote agreement with each UN member state, averaged over the most recent 5 calendar years available. Cite Bailey, Strezhnev & Voeten (2017), 'Estimating Dynamic State Preferences from United Nations Voting Data', Journal of Conflict Resolution 61(2): 430-456.",
      },
    ],
    snapshot: {
      window: `${minYear}-${latestYear}`,
      countriesObserved: data.length,
      alignmentUnit: "% of roll-call votes the UK and counterpart cast the same way",
    },
    series: {
      countries: {
        sourceId: "voeten-unga",
        timeField: "country",
        unit: "% agreement",
        description: `UK vote-agreement % with each UN member state, mean across UNGA roll-call votes ${minYear}-${latestYear}.`,
        data,
      },
    },
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(`✓ ${OUTPUT_PATH} — ${data.length} countries, latest year ${latestYear}`);
  console.log(`  Top 5 (most aligned): ${data.slice(0, 5).map((c) => `${c.country} ${c.alignmentPct}%`).join(", ")}`);
  console.log(`  Bottom 5 (least aligned): ${data.slice(-5).map((c) => `${c.country} ${c.alignmentPct}%`).reverse().join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
