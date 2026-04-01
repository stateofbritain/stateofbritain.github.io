/**
 * fetch-ethnicity.js
 *
 * Curated Census ethnicity data for England & Wales (2001, 2011, 2021).
 * Source: ONS Census TS021 (2021), KS201EW (2011), KS006 (2001).
 *
 * Categories evolved between censuses (e.g. Gypsy/Traveller added in 2011,
 * Roma added in 2021, Arab separated from Other in 2011). The "byCensus"
 * series aggregates into five broad groups (White, Asian, Black, Mixed,
 * Other) that are comparable across all three censuses.
 *
 * Outputs: public/data/ethnicity.json
 */
import { writeFileSync } from "fs";

// ── Raw Census counts by detailed ethnic group ──────────────────────────

const census2001 = {
  year: 2001,
  total: 52_041_916,
  groups: {
    whiteBritish:     45_533_741,
    whiteIrish:          641_804,
    whiteOther:        1_345_321,
    mixed:               661_034,
    asianIndian:       1_036_807,
    asianPakistani:      714_826,
    asianBangladeshi:    280_830,
    asianChinese:        226_948,
    asianOther:          241_274,
    blackAfrican:        479_665,
    blackCaribbean:      563_843,
    blackOther:           96_069,
    other:               219_754,
  },
};

const census2011 = {
  year: 2011,
  total: 56_075_912,
  groups: {
    whiteBritish:     45_134_686,
    whiteIrish:          531_087,
    whiteGypsyTraveller:  57_680,
    whiteOther:        2_485_942,
    mixed:             1_224_400,
    asianIndian:       1_412_958,
    asianPakistani:    1_124_511,
    asianBangladeshi:    447_201,
    asianChinese:        393_141,
    asianOther:          835_720,
    blackAfrican:        989_628,
    blackCaribbean:      594_825,
    blackOther:          280_437,
    arab:                230_600,
    other:               333_096,
  },
};

const census2021 = {
  year: 2021,
  total: 59_597_542,
  groups: {
    whiteBritish:     44_355_038,
    whiteIrish:          507_465,
    whiteGypsyTraveller:  67_768,
    whiteRoma:           100_981,
    whiteOther:        3_667_997,
    mixed:             1_717_976,
    asianIndian:       1_864_318,
    asianPakistani:    1_587_819,
    asianBangladeshi:    644_881,
    asianChinese:        445_619,
    asianOther:          972_783,
    blackAfrican:      1_488_381,
    blackCaribbean:      623_119,
    blackOther:          297_778,
    arab:                331_844,
    other:               923_775,
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────

const round1 = (n) => Math.round(n * 10) / 10;
const pct = (count, total) => round1((count / total) * 100);

/**
 * Aggregate detailed groups into five broad categories.
 * White = all white* keys; Asian = all asian* keys;
 * Black = all black* keys; Mixed = mixed; Other = arab + other.
 */
function broadGroups(census) {
  const g = census.groups;
  const t = census.total;

  const white = Object.entries(g)
    .filter(([k]) => k.startsWith("white"))
    .reduce((s, [, v]) => s + v, 0);

  const asian = Object.entries(g)
    .filter(([k]) => k.startsWith("asian"))
    .reduce((s, [, v]) => s + v, 0);

  const black = Object.entries(g)
    .filter(([k]) => k.startsWith("black"))
    .reduce((s, [, v]) => s + v, 0);

  const mixed = g.mixed;

  const other = (g.arab || 0) + (g.other || 0);

  return {
    year: census.year,
    white: pct(white, t),
    asian: pct(asian, t),
    black: pct(black, t),
    mixed: pct(mixed, t),
    other: pct(other, t),
  };
}

// ── Build broad-group trend series ──────────────────────────────────────

const byCensusData = [census2001, census2011, census2021].map(broadGroups);

// ── Build detailed 2021 breakdown ───────────────────────────────────────

const labelMap = {
  whiteBritish:        "White: English, Welsh, Scottish, Northern Irish, British",
  whiteIrish:          "White: Irish",
  whiteGypsyTraveller: "White: Gypsy or Irish Traveller",
  whiteRoma:           "White: Roma",
  whiteOther:          "White: Other White",
  mixed:               "Mixed or Multiple ethnic groups",
  asianIndian:         "Asian: Indian",
  asianPakistani:      "Asian: Pakistani",
  asianBangladeshi:    "Asian: Bangladeshi",
  asianChinese:        "Asian: Chinese",
  asianOther:          "Asian: Other Asian",
  blackAfrican:        "Black: African",
  blackCaribbean:      "Black: Caribbean",
  blackOther:          "Black: Other Black",
  arab:                "Arab",
  other:               "Other ethnic group",
};

const broadGroupMap = {
  whiteBritish: "White",
  whiteIrish: "White",
  whiteGypsyTraveller: "White",
  whiteRoma: "White",
  whiteOther: "White",
  mixed: "Mixed",
  asianIndian: "Asian",
  asianPakistani: "Asian",
  asianBangladeshi: "Asian",
  asianChinese: "Asian",
  asianOther: "Asian",
  blackAfrican: "Black",
  blackCaribbean: "Black",
  blackOther: "Black",
  arab: "Other",
  other: "Other",
};

const detailed2021Data = Object.entries(census2021.groups).map(([key, count]) => ({
  group: labelMap[key] || key,
  broadGroup: broadGroupMap[key] || "Other",
  count,
  pct: pct(count, census2021.total),
}));

// ── Snapshot values ─────────────────────────────────────────────────────

const snap2021 = byCensusData.find((d) => d.year === 2021);

// ── Build v1 dataset ────────────────────────────────────────────────────

const dataset = {
  $schema: "sob-dataset-v1",
  id: "ethnicity",
  pillar: "foundations",
  topic: "demographics",
  generated: new Date().toISOString().slice(0, 10),

  sources: [
    {
      id: "ons-census-ethnicity",
      name: "ONS Census (TS021, KS201EW, KS006)",
      url: "https://www.ons.gov.uk/peoplepopulationandcommunity/culturalidentity/ethnicity/bulletins/ethnicgroupenglandandwales/census2021",
      publisher: "Office for National Statistics",
      note: "Census 2001, 2011, and 2021. England and Wales only. Self-identified ethnic group.",
    },
  ],

  snapshot: {
    latestCensus: 2021,
    totalPopulation: census2021.total,
    whiteBritishPct: pct(census2021.groups.whiteBritish, census2021.total),
    asianPct: snap2021.asian,
    blackPct: snap2021.black,
    mixedPct: snap2021.mixed,
    otherPct: snap2021.other,
  },

  series: {
    byCensus: {
      sourceId: "ons-census-ethnicity",
      label: "Broad ethnic group (% of population)",
      unit: "%",
      timeField: "year",
      data: byCensusData,
    },
    detailed2021: {
      sourceId: "ons-census-ethnicity",
      label: "Detailed ethnic group, Census 2021",
      unit: "count",
      timeField: "group",
      data: detailed2021Data,
    },
  },
};

// ── Write output ────────────────────────────────────────────────────────

const outPath = new URL("../public/data/ethnicity.json", import.meta.url).pathname;
writeFileSync(outPath, JSON.stringify(dataset, null, 2));
console.log(`Wrote ${outPath}`);
console.log(`  Broad groups: ${byCensusData.length} census years (2001, 2011, 2021)`);
console.log(`  Detailed 2021: ${detailed2021Data.length} ethnic groups`);
