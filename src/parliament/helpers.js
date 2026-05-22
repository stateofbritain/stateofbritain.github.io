// Render helpers for the /parliament tab, ported from the Hansard Highlights
// pipeline (hansard_highlights/build_page.py) so the React port renders the
// same data the same way.

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dateParts(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  return { y, mo, d, dow: new Date(Date.UTC(y, mo - 1, d)).getUTCDay() };
}

export function longDate(date) {
  const p = dateParts(date);
  if (!p) return String(date || "");
  return `${WEEKDAYS[p.dow]} ${p.d} ${MONTHS[p.mo - 1]} ${p.y}`;
}

export function shortDate(date) {
  const p = dateParts(date);
  if (!p) return String(date || "");
  return `${WEEKDAYS_SHORT[p.dow]} ${p.d} ${MONTHS_SHORT[p.mo - 1]}`;
}

// HH:MM from an ISO timecode such as "2026-05-21T13:22:00".
export function clock(timecode) {
  const t = String(timecode || "");
  if (!t.includes("T")) return null;
  const c = t.split("T")[1];
  return c.length >= 5 ? c.slice(0, 5) : null;
}

// London's UTC offset (ms) at a given instant — handles BST.
function londonOffsetMs(date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/London", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUTC - date.getTime();
}

// Convert a naive-London ISO timecode to a UTC ISO string for the player.
export function toUtc(timecode) {
  const t = String(timecode || "");
  if (!t.includes("T")) return null;
  const naiveAsUtc = new Date(t + "Z");
  if (isNaN(naiveAsUtc.getTime())) return null;
  const utc = new Date(naiveAsUtc.getTime() - londonOffsetMs(naiveAsUtc));
  return utc.toISOString().replace(/\.\d{3}Z$/, "Z");
}

const PLIVE_EVENT = "https://parliamentlive.tv/Event/Index/";
export function watchUrl(eventId, timecode) {
  let u = PLIVE_EVENT + eventId;
  if (timecode) u += `?in=${timecode}`;
  return u;
}

const HONORIFICS = ["Mr ", "Mrs ", "Ms ", "Miss "];
// A member's plain full name from a Hansard attribution — dropping the
// courtesy honorific, constituency and party.
export function plainName(attribution) {
  let a = (attribution || "").trim();
  if (!a) return "";
  if (a.startsWith("The ") && a.includes("(")) {
    // Office attribution — the name is the final parenthetical group.
    const m = [...a.matchAll(/\(([^)]*)\)/g)];
    a = m.length ? m[m.length - 1][1].trim() : a;
  } else {
    // Name-first attribution — drop (constituency) and (party).
    a = a.replace(/\s*\([^)]*\)/g, "").trim();
  }
  for (const h of HONORIFICS) {
    if (a.startsWith(h) && a.slice(h.length).includes(" ")) return a.slice(h.length);
  }
  return a;
}

// The Government office from a Hansard minister attribution, else "".
export function office(attribution) {
  const a = (attribution || "").trim();
  if (!a.startsWith("The ") || !a.includes("(")) return "";
  let off = a.slice(0, a.lastIndexOf("(")).trim();
  if (off.startsWith("The ")) off = off.slice(4);
  return off;
}

// Hansard's section title, with the few opaque ones made reader-friendly.
const TITLE_FIXES = {
  "Prime Minister": "Prime Minister's Questions",
  "Engagements": "Prime Minister's Questions",
  "Middle East: Economic Response": "Economic Statement",
};
export function niceTitle(title) {
  return TITLE_FIXES[title || ""] || title || "—";
}

// A stable anchor slug for a debate section title.
export function slug(text) {
  return "sec-" + (text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Split a contribution's raw text into clean paragraphs.
export function paragraphs(text) {
  return String(text || "").replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.split(/\s+/).join(" ").trim())
    .filter(Boolean);
}

// Speaker meta line: "Office · Party, Constituency".
export function speakerMeta({ office: off, party, constituency }) {
  const partyConstituency = [party, constituency].filter(Boolean).join(", ");
  return [off, partyConstituency].filter(Boolean).join(" · ");
}
