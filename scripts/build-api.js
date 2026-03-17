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
    // v1: categories is under series.categories.data
    const cats = data.series?.categories?.data ?? data.categories;
    if (cats && typeof cats === "object") {
      for (const cat of Object.values(cats)) {
        if (cat.products) {
          cat.products = cat.products.filter((p) => p.id !== "crude_steel");
        }
      }
    }
    // Remove steel snapshot fields
    const snap = data.snapshot ?? {};
    const { steelLatest, steelLatestYear, steelPeak, steelPeakYear, steelPctOfPeak, ...restSnapshot } = snap;
    if (restSnapshot.totalProducts != null) restSnapshot.totalProducts -= 1;
    data.snapshot = restSnapshot;
    // Remove World Steel source
    const sources = data.sources ?? data.meta?.sources;
    if (sources) {
      const filtered = sources.filter((s) => !s.name?.toLowerCase().includes("world steel"));
      if (data.sources) data.sources = filtered;
      else if (data.meta?.sources) data.meta.sources = filtered;
    }
  }

  if (file === "startups.json") {
    // Remove equity array (British Business Bank — proprietary)
    // v1: equity is under series.equity
    if (data.series?.equity) delete data.series.equity;
    else delete data.equity;
    // Remove BBB source
    const startupSources = data.sources ?? data.meta?.sources;
    if (startupSources) {
      const filtered = startupSources.filter((s) => !s.name?.toLowerCase().includes("british business bank"));
      if (data.sources) data.sources = filtered;
      else if (data.meta?.sources) data.meta.sources = filtered;
    }
  }

  if (file === "defence.json") {
    // Remove intlComparison (NATO — restricted redistribution)
    // v1: intlComparison is under series.intlComparison
    if (data.series?.intlComparison) delete data.series.intlComparison;
    else delete data.intlComparison;
    // Remove NATO source
    const defSources = data.sources ?? data.meta?.sources;
    if (defSources) {
      const filtered = defSources.filter((s) => !s.name?.toLowerCase().includes("nato"));
      if (data.sources) data.sources = filtered;
      else if (data.meta?.sources) data.meta.sources = filtered;
    }
  }

  writeFileSync(join(API_DIR, file), JSON.stringify(data), "utf-8");
}

console.log(`Built ${files.length} API datasets → public/api/data/`);
