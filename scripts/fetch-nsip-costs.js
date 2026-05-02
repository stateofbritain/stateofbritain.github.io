/**
 * fetch-nsip-costs.js
 *
 * Joins the Government Major Projects Portfolio (GMPP) annual report
 * to the PINS NSIP register so the dashboard's project panel can
 * surface whole-life cost and Delivery Confidence Assessment for the
 * c.30-50 NSIPs that also appear on the GMPP.
 *
 * Source: NISTA (formerly IPA) annual report — discovered via the
 * gov.uk search API so we automatically pick up the latest year
 * without hard-coding a URL each January. The CSV publishes one row
 * per GMPP project with whole-life cost (£m), DCA RAG rating,
 * financial-year baseline + forecast, narrative, etc.
 *
 * Match strategy: fuzzy name match. NSIP names like "The Sizewell C
 * Project" need to find "Sizewell C" on the GMPP side; "A14 Cambridge
 * to Huntingdon Improvement Scheme" matches "A14 Cambridge-Huntingdon".
 *
 * Output: public/data/nsip-costs.json keyed by NSIP ref.
 *
 * Refresh cadence: monthly (cheap; underlying NISTA report is
 * annual but we want to ride changes in the gov.uk asset URLs).
 */
import https from "https";
import { writeFileSync, readFileSync } from "fs";

const SEARCH_URL =
  "https://www.gov.uk/api/search.json?q=infrastructure+projects+authority+annual+report&count=15";
const NSIPS_PATH = "public/data/nsips.json";
const OUT = "public/data/nsip-costs.json";

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const get = (u, depth = 0) => {
      if (depth > 5) return reject(new Error("too many redirects"));
      const parsed = new URL(u);
      const req = https.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: {
            "User-Agent": "stateofbritain-nsip-costs/1.0",
            Accept: "*/*",
          },
          timeout: 30_000,
        },
        (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
            res.resume();
            const next = res.headers.location.startsWith("http")
              ? res.headers.location
              : new URL(res.headers.location, u).toString();
            return get(next, depth + 1);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
          res.on("error", reject);
        },
      );
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("timeout"));
      });
      req.on("error", reject);
    };
    get(url);
  });
}

function parseCsv(text) {
  const rows = [];
  let cur = [];
  let field = "";
  let inQ = false;
  // Strip BOM if present
  const t = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') {
        if (t[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c !== "\r") field += c;
    }
  }
  if (field || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

/**
 * Discover the latest IPA/NISTA annual-report attachment URL.
 * Walks gov.uk search results in date order; the first result whose
 * publication page links to a "*nista*" or "*ipa*" CSV is taken.
 */
async function discoverLatestCsvUrl() {
  console.log("Discovering latest IPA/NISTA annual report…");
  const search = JSON.parse(await fetchText(SEARCH_URL));
  // Sort newest first by public_timestamp
  const candidates = search.results
    .filter((r) =>
      /annual[-\s]report/i.test(r.link)
      && /(nista|infrastructure-and-projects-authority)/i.test(r.link)
    )
    .sort((a, b) => (b.public_timestamp || "").localeCompare(a.public_timestamp || ""));
  for (const r of candidates) {
    const pubUrl = `https://www.gov.uk${r.link}`;
    console.log(`  trying ${pubUrl}`);
    const html = await fetchText(pubUrl);
    const m = html.match(
      /href="(https:\/\/assets\.publishing\.service\.gov\.uk\/[^"]*(?:nista|ipa|annual_report|major_projects)[^"]*\.csv)"/i,
    );
    if (m) {
      console.log(`  found CSV: ${m[1]}`);
      return { url: m[1], publication: pubUrl, publicationDate: r.public_timestamp };
    }
  }
  throw new Error("No NISTA/IPA annual-report CSV found via gov.uk search");
}

/** Lower-case, strip punctuation and "the/project/scheme" filler. */
function normalise(name) {
  return (name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|project|scheme|programme|improvement|improvements|new|of|a|an|in|at|on)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns 0..1 — fraction of GMPP-name tokens that appear in NSIP-name (or vice versa). */
function tokenOverlap(a, b) {
  const A = new Set(a.split(" ").filter((t) => t.length >= 3));
  const B = new Set(b.split(" ").filter((t) => t.length >= 3));
  if (A.size === 0 || B.size === 0) return 0;
  let hits = 0;
  for (const t of A) if (B.has(t)) hits++;
  return hits / Math.min(A.size, B.size);
}

function parseRagRating(s) {
  if (!s) return null;
  const t = s.trim();
  // GMPP uses "Green/Amber/Red/Amber-Red/Green-Amber" plus narrative
  const m = t.match(/^(Green|Amber\/Red|Amber-?Red|Amber\/Green|Amber-?Green|Amber|Red)/i);
  if (m) return m[1].toUpperCase().replace(/[-\/]/g, "/");
  return null;
}

function parseNumber(s) {
  if (s == null) return null;
  const v = Number(String(s).replace(/[£,\s]/g, ""));
  return Number.isFinite(v) ? v : null;
}

async function main() {
  const { url, publication, publicationDate } = await discoverLatestCsvUrl();
  console.log(`Pulling ${url}…`);
  const csv = await fetchText(url);
  const rows = parseCsv(csv);
  const header = rows[0];
  const idx = (k) => header.findIndex((h) => h.trim() === k);
  const cols = {
    name: idx("Project Name"),
    dept: idx("Department"),
    cat: idx("Annual Report Category"),
    desc: idx("Project Description"),
    dca: idx("IPA Delivery Confidence Assessment"),
    sroDca: idx("SRO Delivery Confidence Assessment"),
    dcaNarr: idx("Departmental Commentary on Delivery Confidence Assessment Rating"),
    start: idx("Start Date"),
    end: idx("End Date"),
    fyBaseline: idx("Financial Year Baseline (£m)"),
    fyForecast: idx("Financial Year Forecast (£m)"),
    fyVar: idx("Financial Year Variance (%)"),
    fyVarNarr: idx("In Year Variance Narrative"),
    wlc: idx("Whole Life Cost (£m)"),
    costsNarr: idx("Costs Narrative"),
    benefits: idx("Benefits (£m)"),
    sroName: idx("Senior Responsible Owner (SRO) Name"),
    gmppId: idx("GMPP ID"),
  };

  const gmpp = rows.slice(1).filter((r) => r[cols.name]).map((r) => ({
    name: r[cols.name].trim(),
    department: r[cols.dept]?.trim() || null,
    category: r[cols.cat]?.trim() || null,
    description: r[cols.desc]?.trim() || null,
    dca: parseRagRating(r[cols.dca]),
    sroDca: parseRagRating(r[cols.sroDca]),
    dcaNarrative: r[cols.dcaNarr]?.trim() || null,
    startDate: r[cols.start]?.trim() || null,
    endDate: r[cols.end]?.trim() || null,
    fyBaselineMillions: parseNumber(r[cols.fyBaseline]),
    fyForecastMillions: parseNumber(r[cols.fyForecast]),
    fyVariancePct: parseNumber(r[cols.fyVar]),
    fyVarianceNarrative: r[cols.fyVarNarr]?.trim() || null,
    wholeLifeCostMillions: parseNumber(r[cols.wlc]),
    costsNarrative: r[cols.costsNarr]?.trim() || null,
    benefitsMillions: parseNumber(r[cols.benefits]),
    sroName: r[cols.sroName]?.trim() || null,
    gmppId: r[cols.gmppId]?.trim() || null,
  }));
  console.log(`  ${gmpp.length} GMPP project rows`);

  const nsipsFile = JSON.parse(readFileSync(NSIPS_PATH, "utf-8"));
  const nsips = nsipsFile.series.projects.data;
  console.log(`  ${nsips.length} NSIPs in register`);

  // Match: for each NSIP, score every GMPP entry by token overlap on
  // normalised names; accept matches >= 0.6, prefer Infrastructure
  // & Construction or Military Capability category to avoid false
  // positives on common words.
  const matches = {};
  let matched = 0;
  for (const nsip of nsips) {
    const nA = normalise(nsip.name);
    if (!nA) continue;
    let best = { score: 0, gmpp: null };
    for (const g of gmpp) {
      const nB = normalise(g.name);
      if (!nB) continue;
      let score = tokenOverlap(nA, nB);
      // Boost matches in plausible categories
      if (g.category === "Infrastructure and Construction" || g.category === "Military Capability") {
        score += 0.05;
      }
      // Penalise matches in irrelevant categories
      if (g.category === "Government Transformation and Service Delivery" || g.category === "ICT") {
        score -= 0.1;
      }
      if (score > best.score) best = { score, gmpp: g };
    }
    if (best.score >= 0.6 && best.gmpp) {
      matches[nsip.ref] = {
        nsipName: nsip.name,
        gmppName: best.gmpp.name,
        matchScore: Math.round(best.score * 100) / 100,
        ...best.gmpp,
      };
      matched++;
    }
  }
  console.log(`  ${matched} NSIPs matched to GMPP entries`);

  const output = {
    $schema: "sob-dataset-v1",
    id: "nsip-costs",
    pillar: "state",
    topic: "construction",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "nista-gmpp",
        name: "NISTA (formerly IPA) — Government Major Projects Portfolio annual report",
        url: publication,
        publisher: "NISTA / Cabinet Office",
        note: `Whole-life cost (£m), Delivery Confidence Assessment RAG rating and financial-year variance for every project on the GMPP. Joined to the PINS NSIP register by fuzzy project-name match. Auto-discovers the latest annual report via the gov.uk search API. Latest source: ${publicationDate?.slice(0, 10) || "unknown"}.`,
      },
    ],
    snapshot: {
      gmppRows: gmpp.length,
      nsipsMatched: matched,
      sourcePublicationDate: publicationDate?.slice(0, 10) || null,
    },
    series: {
      costs: {
        sourceId: "nista-gmpp",
        timeField: "ref",
        unit: "£m / project",
        description: `Per-NSIP cost and DCA from the latest GMPP annual report. Keyed by NSIP reference. ${matched} of ${nsips.length} NSIPs matched.`,
        data: matches,
      },
    },
  };

  writeFileSync(OUT, JSON.stringify(output, null, 2) + "\n");
  console.log(`\n✓ ${OUT}`);
  console.log(`  Top-cost matches:`);
  Object.entries(matches)
    .map(([ref, m]) => ({ ref, ...m }))
    .sort((a, b) => (b.wholeLifeCostMillions || 0) - (a.wholeLifeCostMillions || 0))
    .slice(0, 12)
    .forEach((m) => {
      console.log(
        `    ${m.ref.padEnd(11)} £${(m.wholeLifeCostMillions || 0).toLocaleString().padStart(8)}m  ${(m.dca || "—").padEnd(10)}  ${m.nsipName}`,
      );
    });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
