/**
 * fetch-real-wages-monthly.js
 *
 * ONS Average Weekly Earnings — total pay incl. bonuses (JLGD), nominal,
 * deflated by CPIH (L55O) into real-terms £/week (constant 2015 = 100 base).
 *
 * Two ONS time-series fetches; we compute month-by-month real wages and a YoY
 * growth-rate column.
 *
 * Output: public/data/real-wages-monthly.json (sob-dataset-v1)
 */
import { writeFileSync } from "fs";
import https from "https";

const URL_AWE =
  "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/jlgd/lms/data";
const URL_CPIH =
  "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/data";

const MONTHS_SHORT = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      const parsed = new URL(u);
      https.get(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          headers: { "User-Agent": "StateOfBritain/1.0 (+dashboard)" },
        },
        (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            res.resume();
            return get(res.headers.location);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode}`));
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
      ).on("error", reject);
    };
    get(url);
  });
}

function parseOnsMonth(date) {
  if (typeof date !== "string") return null;
  const m1 = date.match(/^(\d{4})\s+([A-Z]{3})$/);
  if (m1 && MONTHS_SHORT[m1[2]]) return `${m1[1]}-${MONTHS_SHORT[m1[2]]}`;
  const m2 = date.match(/^(\d{4})-(\d{2})$/);
  if (m2) return `${m2[1]}-${m2[2]}`;
  return null;
}

function toMonthlyMap(json) {
  const map = new Map();
  for (const m of json.months || []) {
    const period = parseOnsMonth(m.date);
    const value = Number.parseFloat(m.value);
    if (period && Number.isFinite(value)) map.set(period, value);
  }
  return map;
}

async function main() {
  console.log("Fetching ONS AWE total pay (JLGD)…");
  const aweJson = await fetchJson(URL_AWE);
  const awe = toMonthlyMap(aweJson);

  console.log("Fetching ONS CPIH index (L55O)…");
  const cpihJson = await fetchJson(URL_CPIH);
  const cpih = toMonthlyMap(cpihJson);

  // Real AWE = nominal AWE / CPIH × 100 (CPIH is index, base=100).
  const periods = [...awe.keys()].filter((p) => cpih.has(p)).sort();
  if (periods.length === 0) throw new Error("No overlapping AWE × CPIH months");

  const monthly = periods.map((period) => {
    const nominal = awe.get(period);
    const cpihVal = cpih.get(period);
    const real = (nominal / cpihVal) * 100; // 2015 base
    return { period, nominal, cpih: cpihVal, real };
  });

  // YoY real wages growth
  const monthlyWithYoY = monthly.map((m, i) => {
    const yearAgo = monthly[i - 12];
    const yoy =
      yearAgo && yearAgo.real > 0
        ? ((m.real - yearAgo.real) / yearAgo.real) * 100
        : null;
    return { ...m, realYoY: yoy };
  });

  const latest = monthlyWithYoY[monthlyWithYoY.length - 1];

  const output = {
    $schema: "sob-dataset-v1",
    id: "real-wages-monthly",
    pillar: "growth",
    topic: "jobs",
    generated: new Date().toISOString().slice(0, 10),
    sources: [
      {
        id: "ons-awe-jlgd",
        name: "ONS Average Weekly Earnings — total pay incl. bonuses (JLGD)",
        url: "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/jlgd/lms",
        publisher: "ONS",
      },
      {
        id: "ons-cpih-l55o",
        name: "ONS Consumer Prices Index including owner-occupiers' housing (CPIH, L55O)",
        url: "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/data",
        publisher: "ONS",
      },
    ],
    snapshot: {
      realLatest: Math.round(latest.real * 10) / 10,
      realLatestPeriod: latest.period,
      realYoYLatest: latest.realYoY != null ? Math.round(latest.realYoY * 10) / 10 : null,
    },
    series: {
      monthly: {
        sourceId: "ons-awe-jlgd",
        timeField: "period",
        unit: "£/week (real, 2015=100 deflator)",
        description:
          "Monthly real-terms total pay incl. bonuses (AWE deflated by CPIH).",
        data: monthlyWithYoY,
      },
    },
  };

  writeFileSync(
    "public/data/real-wages-monthly.json",
    JSON.stringify(output, null, 2) + "\n"
  );
  console.log(
    `✓ public/data/real-wages-monthly.json (${monthlyWithYoY.length} months; latest real=${latest.real.toFixed(1)}, YoY=${latest.realYoY?.toFixed(1)}% for ${latest.period})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
