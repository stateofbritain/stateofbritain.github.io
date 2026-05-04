/**
 * augment-nsip-jr-counts.js
 *
 * Reads public/data/nsip-timelines.json and, for each NSIP, counts the
 * milestones with phase: "jr". Writes the count back as
 * `judicialReviewCount` (0 when researched but no JRs found, null when
 * not researched yet) on the corresponding row in nsips.json.
 *
 * The agent-researched timelines already surface every JR ruling/filing
 * we know about — Boswell carbon JRs on three A47 schemes, the Stop
 * the A38 Expansion challenge, the Manston Airport JRs, etc. So we can
 * derive an accurate court-challenges count locally rather than
 * scraping BAILII (which would only catch JRs that happened to use the
 * project name as a search term).
 *
 * BAILII can be added later as a verification cross-check.
 *
 * Idempotent. Run after fetch-nsips.js or after timelines update.
 */
import { readFileSync, writeFileSync } from "fs";

const NSIPS_PATH = "public/data/nsips.json";
const TIMELINES_PATH = "public/data/nsip-timelines.json";

function main() {
  const nsips = JSON.parse(readFileSync(NSIPS_PATH, "utf-8"));
  const timelines = JSON.parse(readFileSync(TIMELINES_PATH, "utf-8"));
  const tlData = timelines.series.timelines.data;

  const projects = nsips.series.projects.data;
  let researched = 0;
  let withJr = 0;
  for (const p of projects) {
    const tl = tlData[p.ref];
    if (!tl || !Array.isArray(tl.milestones)) {
      // Not researched yet — leave the field undefined so the UI can
      // distinguish "no JRs found" from "we don't know".
      delete p.judicialReviewCount;
      continue;
    }
    researched++;
    const jrs = tl.milestones.filter((m) => m.phase === "jr");
    p.judicialReviewCount = jrs.length;
    if (jrs.length > 0) withJr++;
  }

  // Update snapshot
  nsips.snapshot.researched = researched;
  nsips.snapshot.withJudicialReview = withJr;

  writeFileSync(NSIPS_PATH, JSON.stringify(nsips, null, 2) + "\n");

  // Print rollup so we can see the most-litigated projects
  const ranked = projects
    .filter((p) => (p.judicialReviewCount || 0) > 0)
    .sort((a, b) => b.judicialReviewCount - a.judicialReviewCount)
    .slice(0, 12);

  console.log(`✓ ${NSIPS_PATH} updated`);
  console.log(`  ${researched}/${projects.length} NSIPs researched`);
  console.log(`  ${withJr} have at least one JR milestone`);
  console.log(`  Most-litigated projects:`);
  for (const p of ranked) {
    console.log(`    ${p.ref.padEnd(11)} ${String(p.judicialReviewCount).padStart(2)}  ${p.name}`);
  }
}

main();
