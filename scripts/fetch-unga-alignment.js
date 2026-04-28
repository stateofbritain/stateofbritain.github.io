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
import { writeFileSync, readFileSync, createWriteStream, createReadStream, existsSync, statSync, mkdirSync } from "fs";
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
const TOPO_PATH = "public/data/geo/world-countries-50m.topo.json";
const OUTPUT_PATH = "public/data/unga-alignment.json";

// Voeten country name → world-atlas-50m country name overrides where
// they differ. Maps Voeten's "Countryname" to the topo's properties.name.
const NAME_OVERRIDES = {
  "United States": "United States of America",
  "Cape Verde": "Cabo Verde",
  "São Tomé & Príncipe": "São Tomé and Principe",
  "Czech Republic": "Czechia",
  "Cote d'Ivoire": "Côte d'Ivoire",
  "Côte d'Ivoire": "Côte d'Ivoire", // straight quote
  "Côte d’Ivoire": "Côte d'Ivoire", // curly apostrophe (U+2019)
  "Korea, North": "North Korea",
  "Korea, South": "South Korea",
  "Myanmar (Burma)": "Myanmar",
  "Bosnia & Herzegovina": "Bosnia and Herz.",
  "Bosnia and Herzegovina": "Bosnia and Herz.",
  "Central African Republic": "Central African Rep.",
  "Dominican Republic": "Dominican Rep.",
  "Equatorial Guinea": "Eq. Guinea",
  "Solomon Islands": "Solomon Is.",
  "South Sudan": "S. Sudan",
  "Eswatini (Swaziland)": "eSwatini",
  "North Macedonia": "Macedonia",
  "Macedonia": "Macedonia",
  "Congo - Brazzaville": "Congo",
  "Congo, Republic of": "Congo",
  "Congo - Kinshasa": "Dem. Rep. Congo",
  "Congo, Democratic Republic": "Dem. Rep. Congo",
  "Democratic Republic of the Congo": "Dem. Rep. Congo",
  "Türkiye": "Turkey",
  "Antigua & Barbuda": "Antigua and Barb.",
  "St. Kitts & Nevis": "St. Kitts and Nevis",
  "St. Lucia": "Saint Lucia",
  "St. Vincent & Grenadines": "St. Vin. and Gren.",
  "Trinidad & Tobago": "Trinidad and Tobago",
  "Micronesia (Federated States of)": "Micronesia",
  "Brunei": "Brunei",
};

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

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * OLS slope of agreement % over time, expressed as %-points per decade.
 * Returns null if fewer than 3 points.
 */
function topMovers(data, key, n, dir = "desc") {
  return [...data]
    .filter((d) => d[key] != null && Number.isFinite(d[key]))
    .sort((a, b) => (dir === "asc" ? a[key] - b[key] : b[key] - a[key]))
    .slice(0, n)
    .map((d) => ({ country: d.country, iso3: d.iso3, alignmentPct: d.alignmentPct, deltaPct: d.deltaPct }));
}

function linearSlopePctPerDecade(points) {
  if (!points || points.length < 3) return null;
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.year, 0) / n;
  const meanY = points.reduce((s, p) => s + p.agree, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.year - meanX) * (p.agree - meanY);
    den += (p.year - meanX) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  return round1(slope * 10);
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

/** Build a Voeten-name → ISO numeric lookup using world-atlas + name overrides. */
function buildIsoNumLookup() {
  const topo = JSON.parse(readFileSync(TOPO_PATH, "utf-8"));
  const byName = new Map();
  for (const g of topo.objects.countries.geometries) {
    const num = String(g.id).padStart(3, "0");
    byName.set(g.properties.name.toLowerCase(), num);
  }
  return (voetenName) => {
    if (!voetenName) return null;
    const direct = byName.get(voetenName.toLowerCase());
    if (direct) return direct;
    const mapped = NAME_OVERRIDES[voetenName];
    if (mapped) return byName.get(mapped.toLowerCase()) ?? null;
    return null;
  };
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
  const priorMinYear = minYear - YEARS_WINDOW;
  const priorMaxYear = minYear - 1;
  const trendStartYear = latestYear - 9; // last 10 years for regression

  // Build per-country yearly map: { ccode → Map(year → agree) }
  const yearlyByCountry = new Map();
  for (const r of rows) {
    if (!yearlyByCountry.has(r.other)) yearlyByCountry.set(r.other, new Map());
    yearlyByCountry.get(r.other).set(r.year, r.agree);
  }
  console.log(
    `  latest year=${latestYear}; recent window ${minYear}-${latestYear}; prior window ${priorMinYear}-${priorMaxYear}; trend window ${trendStartYear}-${latestYear}`
  );

  console.log("Building country lookup…");
  const lookup = await buildCountryLookup();
  const toIsoNum = buildIsoNumLookup();

  const data = [];
  for (const [cc, yearMap] of yearlyByCountry) {
    const entry = lookup.get(cc) || { iso3: null, name: `COW ${cc}` };
    const yearly = [...yearMap.entries()]
      .map(([year, agree]) => ({ year, agree: Math.round(agree * 1000) / 10 }))
      .sort((a, b) => a.year - b.year);

    const recentScores = yearly.filter((d) => d.year >= minYear).map((d) => d.agree);
    if (recentScores.length === 0) continue;

    const priorScores = yearly
      .filter((d) => d.year >= priorMinYear && d.year <= priorMaxYear)
      .map((d) => d.agree);

    const trendPoints = yearly.filter((d) => d.year >= trendStartYear);

    const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
    const alignmentPct = round1(mean(recentScores));
    const alignmentPriorPct = priorScores.length > 0 ? round1(mean(priorScores)) : null;
    const deltaPct = alignmentPriorPct == null ? null : round1(alignmentPct - alignmentPriorPct);

    const trendPctPerDecade = linearSlopePctPerDecade(trendPoints);

    const iso3num = toIsoNum(entry.name);

    data.push({
      ccode: cc,
      iso3: entry.iso3,
      iso3num,
      country: entry.name,
      alignmentPct,
      alignmentPriorPct,
      deltaPct,
      trendPctPerDecade,
      yearsObserved: recentScores.length,
      yearly,
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
      priorWindow: `${priorMinYear}-${priorMaxYear}`,
      trendWindow: `${trendStartYear}-${latestYear}`,
      countriesObserved: data.length,
      alignmentUnit: "% of roll-call votes the UK and counterpart cast the same way",
      topConverging: topMovers(data, "deltaPct", 5),
      topDiverging: topMovers(data, "deltaPct", 5, "asc"),
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
  const converging = output.snapshot.topConverging;
  const diverging = output.snapshot.topDiverging;
  if (converging) console.log(`  Top converging (Δ vs prior 5y): ${converging.map((c) => `${c.country} +${c.deltaPct}`).join(", ")}`);
  if (diverging) console.log(`  Top diverging (Δ vs prior 5y): ${diverging.map((c) => `${c.country} ${c.deltaPct}`).join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
