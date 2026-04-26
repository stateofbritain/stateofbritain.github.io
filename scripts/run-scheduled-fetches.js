/**
 * run-scheduled-fetches.js
 *
 * Daily dispatcher that consults scripts/release-schedule.json and runs
 * every fetch whose rule matches today. Intended to be invoked once per
 * day from the GitHub Actions workflow at ~06:00 UTC.
 *
 * Usage:
 *   node scripts/run-scheduled-fetches.js              # use today's date
 *   node scripts/run-scheduled-fetches.js 2026-04-22   # override (test)
 *   node scripts/run-scheduled-fetches.js --dry        # list, don't run
 *   node scripts/run-scheduled-fetches.js --all        # run every entry
 */
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEDULE_PATH = path.join(__dirname, "release-schedule.json");

function parseArgs(argv) {
  const args = { dry: false, all: false, date: null };
  for (const a of argv.slice(2)) {
    if (a === "--dry") args.dry = true;
    else if (a === "--all") args.all = true;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(a)) args.date = a;
  }
  return args;
}

function flattenSchedule(node, out = {}) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("_")) continue;
    if (value && typeof value === "object") {
      if (typeof value.type === "string") {
        out[key] = value;
      } else {
        flattenSchedule(value, out);
      }
    }
  }
  return out;
}

function nthWeekdayOfMonth(year, month0, n, weekday) {
  const first = new Date(Date.UTC(year, month0, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}

function lastWeekdayOfMonth(year, month0, weekday) {
  const last = new Date(Date.UTC(year, month0 + 1, 0));
  const offset = (last.getUTCDay() - weekday + 7) % 7;
  return last.getUTCDate() - offset;
}

function addOffsetDays(year, month0, baseDom, offsetDays) {
  const d = new Date(Date.UTC(year, month0, baseDom + (offsetDays || 0)));
  return { year: d.getUTCFullYear(), month0: d.getUTCMonth(), dom: d.getUTCDate() };
}

function matches(rule, today) {
  const y = today.getUTCFullYear();
  const m0 = today.getUTCMonth();
  const dom = today.getUTCDate();

  const monthFilter = (r) => !r.months || r.months.includes(m0 + 1);

  switch (rule.type) {
    case "daily":
      return true;
    case "weekly":
      // Fires every week on rule.weekday (0=Sun..6=Sat). Optional months filter.
      if (rule.months && !rule.months.includes(m0 + 1)) return false;
      return today.getUTCDay() === rule.weekday;
    case "fixed-dom":
      if (!monthFilter(rule)) return false;
      return dom === rule.dom;
    case "nth-weekday": {
      if (!monthFilter(rule)) return false;
      const baseDom = nthWeekdayOfMonth(y, m0, rule.n, rule.weekday);
      if (baseDom > new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate()) return false;
      const target = addOffsetDays(y, m0, baseDom, rule.offsetDays || 0);
      return target.year === y && target.month0 === m0 && target.dom === dom;
    }
    case "last-weekday": {
      if (!monthFilter(rule)) return false;
      const baseDom = lastWeekdayOfMonth(y, m0, rule.weekday);
      const target = addOffsetDays(y, m0, baseDom, rule.offsetDays || 0);
      return target.year === y && target.month0 === m0 && target.dom === dom;
    }
    default:
      return false;
  }
}

function resolveScript(id) {
  const candidate = path.join(__dirname, `fetch-${id}.js`);
  return existsSync(candidate) ? candidate : null;
}

const args = parseArgs(process.argv);
const today = args.date
  ? new Date(`${args.date}T12:00:00Z`)
  : new Date();

const schedule = flattenSchedule(JSON.parse(readFileSync(SCHEDULE_PATH, "utf-8")));

const due = Object.entries(schedule).filter(([, rule]) =>
  args.all ? true : matches(rule, today)
);

console.log(
  `Date: ${today.toISOString().slice(0, 10)}  (UTC weekday=${today.getUTCDay()})  ` +
    `Scheduled fetches: ${due.length}/${Object.keys(schedule).length}${args.dry ? "  [dry-run]" : ""}`
);

if (due.length === 0) {
  console.log("Nothing due today.");
  process.exit(0);
}

const failures = [];
for (const [id, rule] of due) {
  const script = resolveScript(id);
  if (!script) {
    console.warn(`  ⚠ ${id}: no fetch-${id}.js script found; skipping`);
    continue;
  }
  console.log(`▶ ${id}  (${rule.release || rule.type})`);
  if (args.dry) continue;
  try {
    execSync(`node ${script}`, { stdio: "inherit", cwd: path.dirname(__dirname) });
  } catch (err) {
    console.warn(`  ✗ ${id} failed: ${err.message}`);
    failures.push(id);
  }
}

console.log(
  `\nDone. ${due.length - failures.length}/${due.length} succeeded` +
    (failures.length ? `; failed: ${failures.join(", ")}` : "")
);
