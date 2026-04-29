/**
 * Alignment buckets for the Strategic Dependencies view.
 *
 * Trade partners are classified by their UNGA voting alignment with the
 * UK (from public/data/unga-alignment.json). Three buckets, with cut-offs
 * chosen against the empirical distribution (median ~70%, IQR roughly
 * 55-85%):
 *
 *   aligned (>= 70%)   — Western Europe, Anglophone bloc, Japan, S. Korea
 *   neutral (50-70%)   — most of Africa, Latin America, SE Asia
 *   low     (< 50%)    — Russia, China, Iran, North Korea, Cuba, etc.
 *
 * Used by both the fetch script (for binning import flows) and the
 * dashboard component (for colour mapping and labelling), so the
 * thresholds stay in one place.
 */

export const ALIGNMENT_BUCKETS = ["aligned", "neutral", "low", "unknown"];

export const BUCKET_THRESHOLDS = {
  alignedMin: 70,
  neutralMin: 50,
};

export const BUCKET_LABELS = {
  aligned: "Aligned",
  neutral: "Neutral",
  low: "Low alignment",
  unknown: "Unclassified",
};

export const BUCKET_DESCRIPTIONS = {
  aligned: "≥ 70% UNGA agreement with the UK",
  neutral: "50–70% UNGA agreement",
  low: "< 50% UNGA agreement",
  unknown: "Not in UNGA alignment dataset",
};

/**
 * Classify an alignment percent (0-100) into one of the four buckets.
 * Returns "unknown" if the input is null/undefined/non-numeric.
 */
export function bucketFor(alignmentPct) {
  if (alignmentPct == null || !Number.isFinite(alignmentPct)) return "unknown";
  if (alignmentPct >= BUCKET_THRESHOLDS.alignedMin) return "aligned";
  if (alignmentPct >= BUCKET_THRESHOLDS.neutralMin) return "neutral";
  return "low";
}
