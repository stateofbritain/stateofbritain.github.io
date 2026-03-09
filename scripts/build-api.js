#!/usr/bin/env node
/**
 * build-api.js
 *
 * Copies dataset JSON files to public/api/data/, stripping fields that
 * come from sources whose licences do not permit bulk redistribution:
 *
 *   - industrial.json: remove crude_steel product (World Steel Association)
 *   - startups.json:   remove equity[] array (British Business Bank)
 *   - defence.json:    remove intlComparison[] (NATO)
 *
 * All other files are copied as-is (OGL / CC BY licensed).
 * Run: node scripts/build-api.js
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(import.meta.dirname, "..", "public", "data");
const API_DIR = join(import.meta.dirname, "..", "public", "api", "data");

mkdirSync(API_DIR, { recursive: true });

const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));

for (const file of files) {
  const raw = readFileSync(join(DATA_DIR, file), "utf-8");
  let data = JSON.parse(raw);

  if (file === "industrial.json") {
    // Remove crude_steel (World Steel Association — proprietary)
    for (const cat of Object.values(data.categories)) {
      cat.products = cat.products.filter((p) => p.id !== "crude_steel");
    }
    // Remove steel snapshot fields
    const { steelLatest, steelLatestYear, steelPeak, steelPeakYear, steelPctOfPeak, ...restSnapshot } = data.snapshot;
    data.snapshot = { ...restSnapshot, totalProducts: restSnapshot.totalProducts - 1 };
    // Remove World Steel source from meta
    if (data.meta?.sources) {
      data.meta.sources = data.meta.sources.filter(
        (s) => !s.name?.toLowerCase().includes("world steel")
      );
    }
  }

  if (file === "startups.json") {
    // Remove equity array (British Business Bank — proprietary)
    delete data.equity;
    // Remove BBB source from meta
    if (data.meta?.sources) {
      data.meta.sources = data.meta.sources.filter(
        (s) => !s.name?.toLowerCase().includes("british business bank")
      );
    }
  }

  if (file === "defence.json") {
    // Remove intlComparison (NATO — restricted redistribution)
    delete data.intlComparison;
    // Remove NATO source from meta
    if (data.meta?.sources) {
      data.meta.sources = data.meta.sources.filter(
        (s) => !s.name?.toLowerCase().includes("nato")
      );
    }
  }

  writeFileSync(join(API_DIR, file), JSON.stringify(data), "utf-8");
}

console.log(`Built ${files.length} API datasets → public/api/data/`);
