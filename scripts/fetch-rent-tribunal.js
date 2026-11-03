/**
 * fetch-rent-tribunal.js
 *
 * First-tier Tribunal (Property Chamber) rent decisions, England:
 *  - Monthly count of market-rent decisions (Housing Act 1988 s13/s14)
 *  - Outcomes: tribunal-determined rent compared with the current rent and
 *    the landlord's proposed rent, parsed from the published decision text
 *
 * Source: GOV.UK residential property tribunal decisions register. The
 * search API lists decisions; the content API includes each decision's
 * full text (details.metadata.hidden_indexable_content).
 *
 * Decision documents are cached (one JSON per decision) so reruns only
 * fetch new decisions.
 *
 * Outputs: public/data/rent-tribunal.json (sob-dataset-v1)
 *
 * Usage: node scripts/fetch-rent-tribunal.js [--offline]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "data", "manual-uploads", "rent-tribunal-cache");
const OUT = path.join(ROOT, "public", "data", "rent-tribunal.json");
const OFFLINE = process.argv.includes("--offline");

const SEARCH = "https://www.gov.uk/api/search.json";
const CONTENT = "https://www.gov.uk/api/content";
const SUB_MARKET = "rents---market-rent-assured-shorthold-tenancy";

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    await sleep(1000 * 2 ** i);
  }
  throw new Error(`Failed after ${tries} tries: ${url}`);
}

// ── List every decision in a sub-category ────────────────────────────
async function listDecisions(sub) {
  const fields = "link,title,public_timestamp,tribunal_decision_decision_date";
  const out = [];
  for (let start = 0; ; start += 1000) {
    const url = `${SEARCH}?filter_format=residential_property_tribunal_decision&filter_tribunal_decision_sub_category=${sub}&count=1000&start=${start}&fields=${fields}`;
    const { results } = await getJson(url);
    out.push(...results);
    if (results.length < 1000) return out;
  }
}

// ── Fetch (or read cached) decision documents ────────────────────────
const cacheFile = link => path.join(CACHE, `${link.split("/").pop().slice(0, 180)}.json`);

async function fetchDocuments(list, concurrency = 6) {
  fs.mkdirSync(CACHE, { recursive: true });
  const todo = list.filter(d => !fs.existsSync(cacheFile(d.link)));
  console.log(`${list.length} decisions, ${todo.length} to fetch`);
  let done = 0;
  async function worker() {
    while (todo.length) {
      const d = todo.shift();
      const doc = await getJson(`${CONTENT}${d.link}`);
      if (doc) {
        const meta = doc.details?.metadata ?? {};
        fs.writeFileSync(cacheFile(d.link), JSON.stringify({
          link: d.link, title: doc.title, description: doc.description,
          firstPublished: doc.first_published_at, metaDecisionDate: meta.tribunal_decision_decision_date,
          text: meta.hidden_indexable_content ?? "",
        }));
      }
      if (++done % 200 === 0) console.log(`  fetched ${done}`);
      await sleep(100);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}


// ── Parse rents from the decision text ───────────────────────────────
// Amounts are converted to £ per month. A value with no stated period
// takes the period used elsewhere in the same decision.
const MONEY = String.raw`£\s*£?\s*(\d[\d,]*(?:\.[\do]{1,2})?)\s*(?:\(?\s*)((?:per|a|each)\s*(?:calendar\s*|cal\.?\s*)?(?:month|week|annum|year|quarter)|pcm|p\.c\.m\.?|pw|p\.w\.?|pa\b)?`;
const rx = parts => parts.map(p => new RegExp(p + MONEY, "i"));
const DETERMINED = rx([
  String.raw`Rent\s+Determined\s*:?\s*`,
  String.raw`(?:Tribunal|we)\s+(?:therefore\s+|accordingly\s+)?(?:determines?|finds?|assesse?s?)\s+(?:that\s+)?(?:the\s+)?(?:open\s+)?market\s+rent\s+(?:for\s+the\s+\w+\s+)?(?:to\s+be|is|of|at|as)\s+`,
  String.raw`determines\s+that\s+the\s+Property\s+would\s+let\s+.{0,80}?for\s+`,
  String.raw`The\s+rent\s+is\s*:?\s*`,
  String.raw`determine[sd]?\s+(?:a\s+|the\s+)?(?:new\s+|market\s+|open\s+market\s+)?rent\s+(?:for\s+[^£]{0,80}?)?(?:of|at|to\s+be|as|as\s+being)\s+`,
]);
const PROPOSED = rx([
  String.raw`increase\s+the\s+rent\s+.{0,80}?from\s+£[\d,.]+\s*(?:per\s+\w+|pcm|pw)?\s+to\s+`,
  String.raw`propos\w*\s+(?:a\s+)?(?:new\s+)?rental\s+of\s+`,
  String.raw`propos\w*\s+(?:a\s+)?(?:new\s+)?rent\s+(?:of|at)\s+`,
  String.raw`proposed\s+(?:new\s+)?rent\s*(?:of|was|is|:)\s*`,
  String.raw`(?:seeking|sought)\s+(?:an?\s+)?(?:increased?\s+|new\s+)?rent\s+(?:of\s+)?`,
]);
const CURRENT = rx([
  String.raw`increase\s+the\s+rent\s+.{0,80}?from\s+`,
  String.raw`rent\s+payable\s+.{0,60}?(?:was|is)\s+(?:said\s+to\s+be\s+)?`,
  String.raw`(?:existing|current|passing|present)\s+rent\s*(?:of|was|is|being|:)?\s*(?:was\s+|is\s+)?`,
  String.raw`in\s+place\s+of\s+(?:the\s+)?(?:existing\s+|current\s+)?(?:rent\s+)?(?:of\s+)?`,
  String.raw`at\s+an?\s+(?:initial\s+)?rent\s+(?:of\s+)?`,
]);
const NO_DETERMINATION = /Rent\s+Determined\s*:?\s*Withdrawn|rent\s+remains\s+unchanged|nothing\s+for\s+the\s+Tribunal\s+to\s+determine|no\s+jurisdiction|notice\s+(?:is|was)\s+(?:invalid|not\s+valid)|application\s+(?:is|was|has\s+been)\s+(?:withdrawn|struck\s+out)|new\s+rent\s+due\s+is\s+(?:now\s+)?that\s+set\s+out\s+in\s+the\s+landlords?.?\s+notice/i;
const PER_MONTH = { month: 1, week: 52 / 12, year: 1 / 12, quarter: 1 / 3 };

function periodOf(unit, after) {
  const u = (unit || "").toLowerCase();
  if (!u) return /\b(per\s+week|pw|weekly|per\s+calendar\s+week)\b/i.test(after) ? "week" : null;
  if (u.includes("week") || u.startsWith("pw") || u.startsWith("p.w")) return "week";
  if (u.includes("annum") || u.includes("year") || u === "pa") return "year";
  if (u.includes("quarter")) return "quarter";
  return "month";
}

function findAmount(patterns, text) {
  for (const re of patterns) {
    const m = re.exec(text);
    if (m) {
      const value = parseFloat(m[1].replace(/,/g, "").replace(/o/g, "0"));
      return { value, period: periodOf(m[2], text.slice(m.index + m[0].length, m.index + m[0].length + 40)) };
    }
  }
  return null;
}

function parseRents(rawText) {
  const text = rawText.replace(/\s+/g, " ");
  const found = { current: findAmount(CURRENT, text), proposed: findAmount(PROPOSED, text), determined: findAmount(DETERMINED, text) };
  const periods = Object.values(found).filter(x => x?.period).map(x => x.period);
  let dominant = periods.sort((a, b) => periods.filter(p => p === b).length - periods.filter(p => p === a).length)[0];
  if (!dominant) dominant = /per\s+(?:calendar\s+)?week|\bpw\b/i.test(text) && !/per\s+(?:calendar\s+)?month|\bpcm\b/i.test(text) ? "week" : "month";
  const monthly = x => x ? Math.round(x.value * PER_MONTH[x.period ?? dominant] * 100) / 100 : null;
  return {
    current: monthly(found.current), proposed: monthly(found.proposed), determined: monthly(found.determined),
    noDetermination: !found.determined && NO_DETERMINATION.test(text),
  };
}

// Outcome of a rent-increase challenge, comparing the determined rent with
// the current rent and the landlord's proposed rent (£0.50 tolerance).
// Implausible combinations (usually typos in the decision) are left unparsed.
function classify({ current: cur, proposed: prop, determined: det, noDetermination }) {
  if (det == null) return noDetermination ? "noDetermination" : "unparsed";
  if (cur == null || prop == null || prop <= cur || det > 2.5 * prop || det < 0.4 * cur) return "unparsed";
  if (det > prop + 0.5) return "aboveProposed";
  if (Math.abs(det - prop) <= 0.5) return "atProposed";
  if (Math.abs(det - cur) <= 0.5) return "atCurrent";
  if (det < cur) return "belowCurrent";
  return "between";
}

// ── Decision metadata ────────────────────────────────────────────────
const REGION = { LON: "London", MAN: "Northern", BIR: "Midlands", CAM: "Eastern", CHI: "Southern", HAV: "Southern" };
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function decisionDate(doc, today) {
  // The register's decision-date field occasionally has typos (e.g. year 3034)
  const meta = doc.metaDecisionDate;
  if (meta && meta >= "2018-01-01" && meta <= today) return meta;
  const m = /Date\s+of\s+(?:the\s+)?Decision\s*:?\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(\d{4})/i.exec(doc.text.replace(/\s+/g, " "));
  if (m) {
    const mi = MONTHS.indexOf(m[2].toLowerCase());
    const iso = `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    if (mi >= 0 && iso >= "2018-01-01" && iso <= today) return iso;
  }
  return doc.firstPublished.slice(0, 10);
}

function caseRef(doc) {
  const m = /\b([A-Z]{3})\s*\/\s*(\w{4})\s*\/\s*([A-Z]{2,4})\s*\/\s*(\d{4})\s*\/\s*(\d+)/.exec(`${doc.title} ${doc.text.slice(0, 3000)}`);
  return m ? { office: m[1], laCode: m[2], type: m[3], ref: m.slice(1).join("/") } : null;
}

// ── Aggregate ────────────────────────────────────────────────────────
const RRA_START = "2026-05";  // Renters' Rights Act rent rules take effect, 1 May 2026
const OUTCOMES = [
  ["atProposed", "Set at landlord's proposed rent"],
  ["between", "Between current and proposed rent"],
  ["atCurrent", "Kept at current rent"],
  ["belowCurrent", "Set below current rent"],
  ["aboveProposed", "Market rent assessed above proposal"],
  ["noDetermination", "No rent determined"],
];
const median = xs => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round1 = v => v == null ? null : Math.round(v * 10) / 10;
const pct = (a, b) => (100 * (a - b)) / b;

function build(docs, today) {
  const records = docs.map(doc => {
    const rents = parseRents(doc.text);
    const ref = caseRef(doc);
    return {
      date: decisionDate(doc, today), region: REGION[ref?.office] ?? null,
      ...rents, outcome: classify(rents),
    };
  });

  const month = r => r.date.slice(0, 7);
  const thisMonth = today.slice(0, 7);
  const months = [...new Set(records.map(month))].filter(m => m >= "2022-01" && m < thisMonth).sort();
  // Decisions are published weeks or months after the decision date, so recent months are incomplete
  const provisionalFrom = new Date(Date.parse(`${thisMonth}-01`) - 40 * 864e5).toISOString().slice(0, 7);

  const monthly = months.map(m => ({
    month: m, decisions: records.filter(r => month(r) === m).length, provisional: m >= provisionalFrom,
  }));

  const sinceRra = records.filter(r => month(r) >= RRA_START && month(r) < thisMonth);
  const classified = sinceRra.filter(r => r.outcome !== "unparsed");
  const outcomes = OUTCOMES.map(([key, label]) => {
    const n = classified.filter(r => r.outcome === key).length;
    return { key, label, decisions: n, pct: round1((100 * n) / classified.length) };
  });

  const outcomeMonths = months.filter(m => m >= "2025-01");
  const outcomesByMonth = outcomeMonths.map(m => {
    const rs = records.filter(r => month(r) === m && r.outcome !== "unparsed");
    const row = { month: m, classified: rs.length, provisional: m >= provisionalFrom };
    for (const [key] of OUTCOMES) row[key] = rs.length ? round1((100 * rs.filter(r => r.outcome === key).length) / rs.length) : null;
    return row;
  });

  const increases = rs => {
    const full = rs.filter(r => r.determined != null && !["unparsed", "noDetermination"].includes(r.outcome));
    return {
      decisions: full.length,
      medianCurrent: median(full.map(r => r.current)),
      medianProposedPct: round1(median(full.map(r => pct(r.proposed, r.current)))),
      medianDeterminedPct: round1(median(full.map(r => pct(r.determined, r.current)))),
    };
  };
  const increasesByMonth = outcomeMonths.map(m => ({
    month: m, ...increases(records.filter(r => month(r) === m)), provisional: m >= provisionalFrom,
  }));
  const byRegion = ["London", "Southern", "Eastern", "Midlands", "Northern"].map(region => {
    const rs = sinceRra.filter(r => r.region === region);
    return { region, totalDecisions: rs.length, ...increases(rs) };
  });

  const all = increases(sinceRra);
  const preRra = records.filter(r => month(r) >= "2025-05" && month(r) < RRA_START);
  const snapshot = {
    decisionsSinceRra: sinceRra.length,
    decisionsSinceRraFrom: "May 2026",
    decisionsPrevYear: preRra.length,
    decisionsPrevYearFrom: "May 2025 to April 2026",
    medianProposedPct: all.medianProposedPct,
    medianDeterminedPct: all.medianDeterminedPct,
    belowProposedPct: round1(outcomes.filter(o => ["between", "atCurrent", "belowCurrent"].includes(o.key)).reduce((s, o) => s + o.pct, 0)),
    classifiedPct: round1((100 * classified.length) / sinceRra.length),
    latestMonth: months.at(-1),
    provisionalFrom,
  };
  const counts = Object.fromEntries(["unparsed", ...OUTCOMES.map(o => o[0])].map(k => [k, sinceRra.filter(r => r.outcome === k).length]));
  console.log("since RRA", sinceRra.length, counts);
  console.log("snapshot", snapshot);
  return { snapshot, monthly, outcomes, outcomesByMonth, increasesByMonth, byRegion };
}

function writeDataset(agg, today, total) {
  const source = "gov-uk-rpt-decisions";
  const series = (data, timeField, extra = {}) => ({ sourceId: source, timeField, ...extra, data });
  const rra = { at: RRA_START, label: "Renters' Rights Act", description: "Rent increase rules under the Renters' Rights Act 2025 took effect on 1 May 2026.", severity: "major" };
  const dataset = {
    $schema: "sob-dataset-v1",
    id: "rent-tribunal",
    pillar: "foundations",
    topic: "housing",
    generated: today,
    sources: [{
      id: source,
      name: "GOV.UK Residential property tribunal decisions",
      url: "https://www.gov.uk/residential-property-tribunal-decisions?tribunal_decision_category=rents&tribunal_decision_sub_category%5B%5D=rents---market-rent-assured-shorthold-tenancy",
      publisher: "HM Courts & Tribunals Service",
      note: `Market rent decisions (First-tier Tribunal, Property Chamber), England. ${total} published decisions. Rents parsed from decision text; see scripts/fetch-rent-tribunal.js.`,
    }],
    snapshot: agg.snapshot,
    series: {
      monthly: series(agg.monthly, "month", { methodologyBreaks: [rra] }),
      outcomes: series(agg.outcomes, "key"),
      outcomesByMonth: series(agg.outcomesByMonth, "month", { methodologyBreaks: [rra] }),
      increasesByMonth: series(agg.increasesByMonth, "month", { methodologyBreaks: [rra] }),
      byRegion: series(agg.byRegion, "region"),
    },
  };
  fs.writeFileSync(OUT, JSON.stringify(dataset, null, 2));
  console.log(`Wrote ${OUT}`);
}

async function main() {
  const listFile = path.join(CACHE, "_list.json");
  let lists;
  if (OFFLINE) {
    lists = JSON.parse(fs.readFileSync(listFile, "utf8"));
  } else {
    lists = { market: await listDecisions(SUB_MARKET) };
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(listFile, JSON.stringify(lists));
    await fetchDocuments(lists.market);
  }
  const docs = lists.market.map(d => fs.existsSync(cacheFile(d.link)) ? JSON.parse(fs.readFileSync(cacheFile(d.link), "utf8")) : null).filter(Boolean);
  console.log(`${docs.length} market-rent documents cached`);
  const today = new Date().toISOString().slice(0, 10);
  writeDataset(build(docs, today), today, docs.length);
}

main().catch(e => { console.error(e); process.exit(1); });
