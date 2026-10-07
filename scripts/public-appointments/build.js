/**
 * build.js
 *
 * Injects the fetched roles into the board template, producing a standalone
 * HTML page for publishing as a Claude artifact.
 *
 * Usage: node scripts/public-appointments/build.js [--in data.json] [--out page.html]
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const args = process.argv.slice(2);
const argVal = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const IN = argVal("--in", "data/experiments/public-appointments.json");
const OUT = argVal("--out", "data/experiments/public-appointments-board.html");

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(IN, "utf-8"));
if (!Array.isArray(data.roles) || !data.roles.some((r) => r.status === "open")) {
  console.error("No open roles in data; refusing to build an empty board.");
  process.exit(1);
}
const json = JSON.stringify(data).replace(/<\//g, "<\\/");
const html = readFileSync(join(here, "board.template.html"), "utf-8").replace("__DATA__", () => json);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
console.log(`Built ${OUT} (${data.roles.filter((r) => r.status === "open").length} open roles)`);
