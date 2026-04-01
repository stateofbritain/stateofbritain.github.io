#!/usr/bin/env node
/**
 * generate-uk-outline.js
 *
 * Downloads Natural Earth 50m admin-0 subunits shapefile, extracts UK nations
 * (England, Scotland, Wales, Northern Ireland), and outputs a simplified
 * TopoJSON for use as the UKMap background.
 *
 * Output: public/data/geo/uk-outline.topo.json
 *
 * One-time script — the UK coastline doesn't change.
 */

import fs from "fs";
import path from "path";
import https from "https";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import * as shapefile from "shapefile";
import { topology } from "topojson-server";
import { presimplify, simplify } from "topojson-simplify";
import { feature } from "topojson-client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_PATH = path.join(__dirname, "..", "public", "data", "geo", "uk-outline.topo.json");
const TMP_DIR = path.join(__dirname, "..", ".tmp-geo");
const SHP_URL = "https://naciscdn.org/naturalearth/50m/cultural/ne_50m_admin_0_map_subunits.zip";

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function main() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
  const zipPath = path.join(TMP_DIR, "ne_subunits.zip");

  console.log("Downloading Natural Earth 50m subunits...");
  await download(SHP_URL, zipPath);
  console.log("Downloaded. Extracting...");

  execSync("unzip -o " + JSON.stringify(zipPath) + " -d " + JSON.stringify(TMP_DIR), { stdio: "pipe" });

  const shpFile = fs.readdirSync(TMP_DIR).find(f => f.endsWith(".shp") && f.includes("subunits"));
  if (!shpFile) throw new Error("Could not find subunits .shp file");

  const shpPath = path.join(TMP_DIR, shpFile);
  const dbfPath = shpPath.replace(".shp", ".dbf");

  console.log("Reading shapefile...");
  const source = await shapefile.open(shpPath, dbfPath);
  const ukFeatures = [];
  const ukSubunits = ["ENG", "SCT", "WLS", "NIR"];

  while (true) {
    const result = await source.read();
    if (result.done) break;
    const f = result.value;
    const su = f.properties.SU_A3;
    if (ukSubunits.includes(su)) {
      ukFeatures.push({
        type: "Feature",
        properties: { name: f.properties.NAME, code: su },
        geometry: f.geometry,
      });
    }
  }

  console.log("Found " + ukFeatures.length + " UK subunits: " + ukFeatures.map(f => f.properties.name).join(", "));
  if (ukFeatures.length === 0) throw new Error("No UK features found");

  const geojson = { type: "FeatureCollection", features: ukFeatures };

  console.log("Converting to TopoJSON...");
  let topo = topology({ countries: geojson });

  // Simplify
  topo = presimplify(topo);
  topo = simplify(topo, 0.001);

  // Re-quantize for smaller file
  const simplified = feature(topo, topo.objects.countries);
  topo = topology({ countries: simplified }, 1e5);

  const json = JSON.stringify(topo);
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, json);
  const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log("Wrote " + OUT_PATH + " (" + sizeKB + " KB)");

  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  console.log("Done.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
