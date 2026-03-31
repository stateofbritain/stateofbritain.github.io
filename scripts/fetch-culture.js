/**
 * fetch-culture.js
 *
 * Curated Census religion data for England & Wales (2001, 2011, 2021).
 * Source: ONS Census TS030 and equivalent tables from prior censuses.
 *
 * There has not been a census since 2021. Significant population change
 * (particularly immigration) has occurred since, so these figures are
 * considerably out of date.
 *
 * Outputs: public/data/culture.json
 */
import { writeFileSync } from "fs";

// ── Census religion data (England & Wales, % of population) ───────────
// Sources:
//   2001: ONS Census 2001, Table KS07
//   2011: ONS Census 2011, Table KS209EW
//   2021: ONS Census 2021, Table TS030
const religionByYear = [
  {
    year: 2001,
    christian: 71.7,
    noReligion: 14.8,
    muslim: 3.0,
    hindu: 1.1,
    sikh: 0.6,
    jewish: 0.5,
    buddhist: 0.3,
    other: 0.3,
    notStated: 7.7,
  },
  {
    year: 2011,
    christian: 59.3,
    noReligion: 25.1,
    muslim: 4.8,
    hindu: 1.5,
    sikh: 0.8,
    jewish: 0.5,
    buddhist: 0.4,
    other: 0.4,
    notStated: 7.2,
  },
  {
    year: 2021,
    christian: 46.2,
    noReligion: 37.2,
    muslim: 6.5,
    hindu: 1.7,
    sikh: 0.9,
    jewish: 0.5,
    buddhist: 0.5,
    other: 0.6,
    notStated: 6.0,
  },
];

// ── Absolute numbers (millions, rounded) ──────────────────────────────
const religionAbsolute = [
  {
    year: 2001,
    christian: 37.3,
    noReligion: 7.7,
    muslim: 1.5,
    hindu: 0.6,
    sikh: 0.3,
    jewish: 0.3,
    buddhist: 0.1,
    other: 0.2,
    notStated: 4.0,
    total: 52.0,
  },
  {
    year: 2011,
    christian: 33.2,
    noReligion: 14.1,
    muslim: 2.7,
    hindu: 0.8,
    sikh: 0.4,
    jewish: 0.3,
    buddhist: 0.2,
    other: 0.2,
    notStated: 4.0,
    total: 56.1,
  },
  {
    year: 2021,
    christian: 27.5,
    noReligion: 22.2,
    muslim: 3.9,
    hindu: 1.0,
    sikh: 0.5,
    jewish: 0.3,
    buddhist: 0.3,
    other: 0.3,
    notStated: 3.6,
    total: 59.6,
  },
];

// ── Build v1 dataset ──────────────────────────────────────────────────
const dataset = {
  $schema: "sob-dataset-v1",
  id: "culture",
  pillar: "foundations",
  topic: "culture",
  generated: new Date().toISOString().slice(0, 10),

  sources: [
    {
      id: "ons-census-religion",
      name: "ONS Census: Religion (England & Wales)",
      url: "https://www.ons.gov.uk/peoplepopulationandcommunity/culturalidentity/religion/bulletins/religionenglandandwales/census2021",
      publisher: "Office for National Statistics",
      note: "Census 2001 (KS07), 2011 (KS209EW), 2021 (TS030). Decennial census, voluntary question. No census has been conducted since March 2021.",
    },
  ],

  snapshot: {
    christianPct: 46.2,
    christianPctYear: 2021,
    noReligionPct: 37.2,
    noReligionPctYear: 2021,
    muslimPct: 6.5,
    muslimPctYear: 2021,
    christianMillions: 27.5,
    noReligionMillions: 22.2,
    muslimMillions: 3.9,
    censusYear: 2021,
  },

  series: {
    religionPct: {
      sourceId: "ons-census-religion",
      label: "Religious Affiliation (% of population)",
      unit: "%",
      timeField: "year",
      data: religionByYear,
    },
    religionAbsolute: {
      sourceId: "ons-census-religion",
      label: "Religious Affiliation (millions)",
      unit: "millions",
      timeField: "year",
      data: religionAbsolute,
    },
  },
};

// ── Write output ──────────────────────────────────────────────────────
const outPath = new URL("../public/data/culture.json", import.meta.url).pathname;
writeFileSync(outPath, JSON.stringify(dataset, null, 2));
console.log(`Wrote ${outPath}`);
console.log(`  Religion data: ${religionByYear.length} census years (2001, 2011, 2021)`);
