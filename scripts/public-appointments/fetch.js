/**
 * public-appointments/fetch.js
 *
 * Collects advertised public appointments (chairs, non-executive directors,
 * board members, office holders) from two sources:
 *
 *   1. Cabinet Office "Apply for a public appointment" service
 *      https://apply-for-public-appointment.service.gov.uk/roles
 *      Server-rendered listing (10 per page) + one detail page per open role
 *      for the timeline and description. Role category and regulated status
 *      come from the site's own search filters.
 *
 *   2. NHS England non-executive opportunities (WordPress REST API)
 *      https://www.england.nhs.uk/non-executive-opportunities/
 *      Free-text posts; closing date is extracted from the text. Pay and term
 *      are normally only in the candidate pack, so are left blank.
 *
 * Experimental: output is not a sob-dataset-v1 file and is not wired into the
 * site. Usage: node scripts/public-appointments/fetch.js [--out path] [--closed-days 60]
 *
 * Outputs: data/experiments/public-appointments.json
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const args = process.argv.slice(2);
const argVal = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = argVal("--out", "data/experiments/public-appointments.json");
const CLOSED_DAYS = Number(argVal("--closed-days", 60));

const CO_BASE = "https://apply-for-public-appointment.service.gov.uk";
const NHS_API = "https://www.england.nhs.uk/non-executive-opportunities/wp-json/wp/v2/posts";
const UA = { "User-Agent": "Mozilla/5.0 (StateOfBritain public appointments research)" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", hellip: "…", pound: "£" };
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
const clean = (s) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

// ── Date parsing ────────────────────────────────────────────────────────
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
function parseDate(text) {
  if (!text) return null;
  const m = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(20\d\d)/);
  if (!m) return null;
  const mi = MONTHS.indexOf(m[2].toLowerCase());
  if (mi < 0) return null;
  return `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

// ── Normalisation helpers ───────────────────────────────────────────────
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
function termYears(text) {
  if (!text) return null;
  const t = text.toLowerCase().replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/g, (w) => WORDS[w]);
  let m = t.match(/(\d+(?:\.\d+)?)\s*(?:to|-|–)\s*(\d+(?:\.\d+)?)\s*-?\s*years?/);
  if (m) return +m[2];
  m = t.match(/(\d+(?:\.\d+)?)\s*-?\s*years?/);
  if (m) return +m[1];
  m = t.match(/(\d+)\s*months?/);
  if (m) return Math.round((+m[1] / 12) * 10) / 10;
  return null;
}

// Days per year implied by a time commitment string, e.g. "2 day(s) per month".
function daysPerYear(text) {
  if (!text) return null;
  const m = text.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(day|hour)\(?s?\)?\s*per\s*(annum|year|month|week)/);
  if (!m) return null;
  let n = +m[1];
  if (m[2] === "hour") n = n / 7.5;
  const mult = { annum: 1, year: 1, month: 12, week: 46 }[m[3]];
  return Math.round(n * mult);
}

// Annual pay estimate in £ from a remuneration string, plus the time commitment.
function annualPay(rem, days) {
  if (!rem) return null;
  const nums = [...rem.matchAll(/£\s?([\d,]+(?:\.\d+)?)/g)].map((m) => +m[1].replace(/,/g, ""));
  if (!nums.length) return null;
  const v = nums.length > 1 ? (nums[0] + nums[1]) / 2 : nums[0];
  const r = rem.toLowerCase();
  if (/per (annum|year)|p\.?a\.?/.test(r)) return Math.round(v);
  if (/per month/.test(r)) return Math.round(v * 12);
  if (/per day/.test(r) && days) return Math.round(v * days);
  return null;
}

function roleType(title, category) {
  if (category) return category;
  const t = title.toLowerCase();
  if (/\bchair\b|chairperson/.test(t) && !/committee chair|deputy chair|vice[- ]chair/.test(t)) return "Chair (or equivalent)";
  if (/non-executive|\bned\b|member|trustee|director|commissioner/.test(t)) return "Member (or equivalent)";
  return "Other";
}

// ── Source 1: Cabinet Office service ────────────────────────────────────
function parseListing(html) {
  const parts = html.split(/(?=<a[^>]+href="\/roles\/\d+)/).slice(1);
  return parts.map((part) => {
    const id = part.match(/\/roles\/(\d+)/)[1];
    const title = clean(part.match(/>([\s\S]*?)<\/a>/)[1]);
    const f = {};
    for (const m of part.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)) f[clean(m[1])] = clean(m[2]);
    return { id, title, f };
  });
}

async function listIds(query, maxPages = 400) {
  const out = [];
  for (let p = 1; p <= maxPages; p++) {
    const html = await get(`${CO_BASE}/roles?page=${p}&sort=openingAt%3Adesc&${query}`);
    const rows = parseListing(html);
    if (!rows.length) break;
    out.push(...rows);
    if (!html.includes(`page=${p + 1}&`)) break;
  }
  return out;
}

async function coDetail(id) {
  const html = await get(`${CO_BASE}/roles/${id}`);
  const timeline = {};
  for (const m of html.matchAll(/app-timeline__title">([\s\S]*?)<\/h3>[\s\S]*?app-timeline__date">([\s\S]*?)<\/span>/g)) timeline[clean(m[1])] = clean(m[2]);
  const grab = (h) => {
    const m = html.match(new RegExp(`<h3>${h}</h3>\\s*<div class="govuk-body">([\\s\\S]*?)(?=<h3>|<h2)`));
    return m ? clean(m[1]) : null;
  };
  const desc = grab("Appointment description") || grab("Introduction");
  return {
    opened: parseDate(timeline["Opening date"]),
    sift: parseDate(timeline["Sifting date"]),
    interviewsBy: parseDate(timeline["Interviews expected to end on"]),
    summary: desc ? (desc.length > 420 ? desc.slice(0, 420).replace(/\s\S*$/, "") + "…" : desc) : null,
  };
}

function coRecord(row, status) {
  const f = row.f;
  const days = daysPerYear(f["Time commitment"]);
  return {
    id: `co-${row.id}`,
    source: "cabinet-office",
    status,
    title: row.title,
    organisation: f["Organisation"] || null,
    department: f["Sponsor department"] || null,
    location: f["Location"] || null,
    sectors: f["Sectors"] ? f["Sectors"].split(/,\s*/) : [],
    skills: f["Skills"] ? f["Skills"].split(/,\s*/) : [],
    vacancies: f["Number of vacancies"] ? +f["Number of vacancies"] || 1 : 1,
    timeCommitment: f["Time commitment"] || null,
    daysPerYear: days,
    remuneration: f["Remuneration"] || null,
    annualPayEstimate: annualPay(f["Remuneration"], days),
    term: f["Length of term"] || null,
    termYears: termYears(f["Length of term"]),
    deadlineText: f["Application deadline"] || null,
    deadline: parseDate(f["Application deadline"]),
    url: `${CO_BASE}/roles/${row.id}`,
  };
}

async function fetchCabinetOffice() {
  console.log("Cabinet Office: open listings…");
  const open = await listIds("status=open");
  console.log(`  ${open.length} open`);

  // Tags from the site's own filters (open roles only; cheap).
  const cats = { 1000: "Chair (or equivalent)", 1001: "Member (or equivalent)", 1002: "Individual office holder", 1003: "Executive" };
  const catById = {};
  for (const [code, label] of Object.entries(cats)) {
    for (const r of await listIds(`status=open&appointmentCategory=${code}`)) catById[r.id] ??= label;
  }
  const regulated = new Set((await listIds("status=open&regulated=yes")).map((r) => r.id));

  const records = [];
  for (const row of open) {
    const rec = coRecord(row, "open");
    rec.category = roleType(rec.title, catById[row.id]);
    rec.regulated = regulated.has(row.id);
    Object.assign(rec, await coDetail(row.id));
    records.push(rec);
    await sleep(150);
  }

  // Recently closed: walk the closed listing (newest opening first) until
  // deadlines fall outside the window. Listing data only, no detail pages.
  console.log(`Cabinet Office: closed in last ${CLOSED_DAYS} days…`);
  const cutoff = new Date(Date.now() - CLOSED_DAYS * 864e5).toISOString().slice(0, 10);
  let archiveTotal = null;
  for (let p = 1, stale = 0; p <= 60 && stale < 3; p++) {
    const html = await get(`${CO_BASE}/roles?page=${p}&sort=openingAt%3Adesc&status=closed`);
    if (p === 1) {
      const m = clean(html).match(/Search results:\s*([\d,]+)\s*closed/);
      archiveTotal = m ? +m[1].replace(/,/g, "") : null;
    }
    const rows = parseListing(html);
    if (!rows.length) break;
    let fresh = 0;
    for (const row of rows) {
      const rec = coRecord(row, "closed");
      if (!rec.deadline || rec.deadline < cutoff) continue;
      rec.category = roleType(rec.title);
      rec.regulated = null;
      records.push(rec);
      fresh++;
    }
    stale = fresh ? 0 : stale + 1;
  }
  console.log(`  ${records.filter((r) => r.status === "closed").length} recently closed (archive total ${archiveTotal})`);
  return { records, archiveTotal };
}

// ── Source 2: NHS England ───────────────────────────────────────────────
function nhsClosing(text) {
  const m = text.match(/closing date[^.]{0,80}?(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+20\d\d)/i)
    || text.match(/(?:applications? (?:must be received|close)|deadline)[^.]{0,60}?(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+20\d\d)/i);
  return m ? { text: m[0].replace(/^.*?(closing date|deadline)/i, "$1").trim(), date: parseDate(m[1]) } : null;
}

async function fetchNHS() {
  console.log("NHS England: posts…");
  const posts = JSON.parse(await get(`${NHS_API}?per_page=100&categories=2&_fields=id,date,link,title,content`));
  const today = new Date().toISOString().slice(0, 10);
  const records = [];
  for (const p of posts) {
    const title = decode(p.title.rendered).replace(/\s+/g, " ").trim();
    const text = clean(p.content.rendered);
    const close = nhsClosing(text);
    if (!close) continue; // evergreen pages (e.g. development schemes) have no closing date
    const idx = title.lastIndexOf(",");
    const org = idx > 0 ? title.slice(0, idx).trim() : title;
    const role = idx > 0 ? title.slice(idx + 1).trim() : title;
    const n = role.match(/x\s?(\d+)|\b(two|three|four|five)\b/i);
    const firstPara = (p.content.rendered.match(/<p[^>]*>([\s\S]*?)<\/p>/) || [])[1];
    const summary = firstPara ? clean(firstPara) : null;
    records.push({
      id: `nhs-${p.id}`,
      source: "nhs-england",
      status: close.date && close.date < today ? "closed" : "open",
      title: role,
      organisation: org,
      department: "Department of Health and Social Care",
      location: null,
      sectors: ["Health"],
      skills: [],
      vacancies: n ? +(n[1] || WORDS[n[2].toLowerCase()]) : 1,
      timeCommitment: null,
      daysPerYear: null,
      remuneration: null,
      annualPayEstimate: null,
      term: null,
      termYears: null,
      deadlineText: close.text,
      deadline: close.date,
      opened: p.date.slice(0, 10),
      sift: null,
      interviewsBy: null,
      summary: summary && summary.length > 420 ? summary.slice(0, 420).replace(/\s\S*$/, "") + "…" : summary,
      category: roleType(role),
      regulated: null,
      url: p.link,
    });
  }
  console.log(`  ${records.length} roles`);
  return records;
}

// ── Main ────────────────────────────────────────────────────────────────
const co = await fetchCabinetOffice();
const nhs = await fetchNHS();
const roles = [...co.records, ...nhs].sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));

const out = {
  generated: new Date().toISOString(),
  sources: [
    { id: "cabinet-office", name: "Cabinet Office, Apply for a public appointment", url: `${CO_BASE}/roles`, archiveClosedTotal: co.archiveTotal },
    { id: "nhs-england", name: "NHS England, Non-executive opportunities in the NHS", url: "https://www.england.nhs.uk/non-executive-opportunities/" },
  ],
  notes: {
    daysPerYear: "Derived from the advertised time commitment. 'Per week' assumes 46 working weeks; hours are converted at 7.5 hours per day.",
    annualPayEstimate: "Derived from advertised remuneration. Ranges use the midpoint; day rates are multiplied by days per year. Per-meeting rates are not annualised.",
    nhs: "NHS England adverts rarely state pay or term in the post text; these are set out in each candidate pack.",
  },
  roles,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`Wrote ${roles.length} roles → ${OUT}`);
