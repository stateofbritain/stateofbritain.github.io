/**
 * fetch-industrial.js
 *
 * Curated UK industrial production data (~40 core materials) in physical units.
 * Benchmark years rather than full annual series — sufficient to show direction
 * and scale of deindustrialisation over 50 years.
 *
 * Sources per product cited inline. Key sources:
 *  - World Steel Association (worldsteel)
 *  - British Geological Survey (BGS) UK Minerals Yearbook
 *  - Chemical Industries Association (CIA)
 *  - Mineral Products Association (MPA)
 *  - British Plastics Federation (BPF)
 *  - ONS PRODCOM
 *  - DESNZ / BEIS energy & industrial statistics
 *
 * Outputs: public/data/industrial.json
 */
import { writeFileSync } from "fs";

// ── METALS ──────────────────────────────────────────────────────────────
const metals = [
  {
    id: "crude_steel",
    name: "Crude steel",
    unit: "Mt",
    source: "World Steel Association",
    sourceUrl: "https://worldsteel.org/steel-topics/statistics/",
    note: null,
    ceased: false,
    series: [
      { year: 1970, value: 28.3 },
      { year: 1980, value: 11.3 },
      { year: 1990, value: 17.8 },
      { year: 2000, value: 15.2 },
      { year: 2005, value: 13.2 },
      { year: 2010, value: 9.7 },
      { year: 2015, value: 10.9 },
      { year: 2020, value: 7.2 },
      { year: 2023, value: 5.6 },
    ],
  },
  {
    id: "aluminium_primary",
    name: "Aluminium, primary",
    unit: "kt",
    source: "BGS / International Aluminium Institute",
    sourceUrl: "https://www.bgs.ac.uk/mineralsuk/statistics/",
    note: "Fort William smelter only (~40 kt); Lynemouth closed 2012, Anglesey closed 2009",
    ceased: false,
    series: [
      { year: 1970, value: 310 },
      { year: 1980, value: 370 },
      { year: 1990, value: 290 },
      { year: 2000, value: 340 },
      { year: 2005, value: 360 },
      { year: 2010, value: 200 },
      { year: 2015, value: 42 },
      { year: 2020, value: 40 },
      { year: 2023, value: 41 },
    ],
  },
  {
    id: "aluminium_secondary",
    name: "Aluminium, secondary/recycled",
    unit: "kt",
    source: "BGS",
    sourceUrl: "https://www.bgs.ac.uk/mineralsuk/statistics/",
    note: null,
    ceased: false,
    series: [
      { year: 1980, value: 180 },
      { year: 1990, value: 250 },
      { year: 2000, value: 310 },
      { year: 2005, value: 340 },
      { year: 2010, value: 290 },
      { year: 2015, value: 300 },
      { year: 2020, value: 260 },
      { year: 2023, value: 280 },
    ],
  },
  {
    id: "copper_refined",
    name: "Copper, refined",
    unit: "kt",
    source: "BGS",
    sourceUrl: "https://www.bgs.ac.uk/mineralsuk/statistics/",
    note: "IMI Refiners (Walsall) closed 2003. No primary copper refining in UK since.",
    ceased: true,
    series: [
      { year: 1970, value: 190 },
      { year: 1980, value: 130 },
      { year: 1990, value: 100 },
      { year: 2000, value: 52 },
      { year: 2003, value: 0 },
    ],
  },
  {
    id: "zinc",
    name: "Zinc",
    unit: "kt",
    source: "BGS",
    sourceUrl: "https://www.bgs.ac.uk/mineralsuk/statistics/",
    note: "Neath smelter (Nystar) — remaining UK zinc production",
    ceased: false,
    series: [
      { year: 1970, value: 90 },
      { year: 1980, value: 65 },
      { year: 1990, value: 90 },
      { year: 2000, value: 105 },
      { year: 2005, value: 100 },
      { year: 2010, value: 90 },
      { year: 2015, value: 80 },
      { year: 2020, value: 65 },
      { year: 2023, value: 55 },
    ],
  },
  {
    id: "tin",
    name: "Tin",
    unit: "kt",
    source: "BGS",
    sourceUrl: "https://www.bgs.ac.uk/mineralsuk/statistics/",
    note: "Last Cornish tin mine closed 1998. No domestic smelting since mid-1990s.",
    ceased: true,
    series: [
      { year: 1970, value: 3.6 },
      { year: 1980, value: 3.8 },
      { year: 1990, value: 2.2 },
      { year: 1996, value: 0 },
    ],
  },
  {
    id: "lead_refined",
    name: "Lead, refined",
    unit: "kt",
    source: "BGS",
    sourceUrl: "https://www.bgs.ac.uk/mineralsuk/statistics/",
    note: "Mostly secondary (battery recycling); Britannia Refined Metals at Northfleet",
    ceased: false,
    series: [
      { year: 1970, value: 210 },
      { year: 1980, value: 175 },
      { year: 1990, value: 185 },
      { year: 2000, value: 190 },
      { year: 2005, value: 190 },
      { year: 2010, value: 170 },
      { year: 2015, value: 160 },
      { year: 2020, value: 140 },
      { year: 2023, value: 130 },
    ],
  },
  {
    id: "titanium_sponge",
    name: "Titanium sponge",
    unit: "kt",
    source: "BGS / USGS",
    sourceUrl: "https://www.bgs.ac.uk/mineralsuk/statistics/",
    note: "No UK production. Global production dominated by China, Japan, Russia, Kazakhstan.",
    ceased: true,
    series: [
      { year: 1970, value: 0 },
      { year: 2023, value: 0 },
    ],
  },
];

// ── BASIC CHEMICALS ─────────────────────────────────────────────────────
const chemicals = [
  {
    id: "chlorine",
    name: "Chlorine",
    unit: "kt",
    source: "CIA / PRODCOM",
    sourceUrl: "https://www.cia.org.uk/",
    note: null,
    ceased: false,
    series: [
      { year: 1970, value: 1100 },
      { year: 1980, value: 1020 },
      { year: 1990, value: 870 },
      { year: 2000, value: 800 },
      { year: 2005, value: 720 },
      { year: 2010, value: 540 },
      { year: 2015, value: 480 },
      { year: 2020, value: 410 },
      { year: 2023, value: 390 },
    ],
  },
  {
    id: "sodium_hydroxide",
    name: "Sodium hydroxide (caustic soda)",
    unit: "kt",
    source: "CIA / PRODCOM",
    sourceUrl: "https://www.cia.org.uk/",
    note: "Co-produced with chlorine (chlor-alkali process)",
    ceased: false,
    series: [
      { year: 1970, value: 1200 },
      { year: 1980, value: 1100 },
      { year: 1990, value: 950 },
      { year: 2000, value: 870 },
      { year: 2005, value: 790 },
      { year: 2010, value: 590 },
      { year: 2015, value: 520 },
      { year: 2020, value: 440 },
      { year: 2023, value: 420 },
    ],
  },
  {
    id: "ammonia",
    name: "Ammonia",
    unit: "kt",
    source: "DESNZ / CF Fertilisers",
    sourceUrl: "https://www.gov.uk/government/collections/digest-of-uk-energy-statistics-dukes",
    note: "Two UK plants (Billingham, Ince). CF Industries shut Ince in 2024.",
    ceased: false,
    series: [
      { year: 1970, value: 1600 },
      { year: 1980, value: 1500 },
      { year: 1990, value: 1350 },
      { year: 2000, value: 1200 },
      { year: 2005, value: 1100 },
      { year: 2010, value: 900 },
      { year: 2015, value: 850 },
      { year: 2020, value: 650 },
      { year: 2023, value: 500 },
    ],
  },
  {
    id: "sulphuric_acid",
    name: "Sulphuric acid",
    unit: "kt",
    source: "CIA / PRODCOM",
    sourceUrl: "https://www.cia.org.uk/",
    note: null,
    ceased: false,
    series: [
      { year: 1970, value: 3400 },
      { year: 1980, value: 2800 },
      { year: 1990, value: 2200 },
      { year: 2000, value: 1600 },
      { year: 2005, value: 1100 },
      { year: 2010, value: 850 },
      { year: 2015, value: 750 },
      { year: 2020, value: 600 },
      { year: 2023, value: 550 },
    ],
  },
  {
    id: "ethylene",
    name: "Ethylene",
    unit: "kt",
    source: "BEIS / petrochemical sites",
    sourceUrl: "https://www.gov.uk/government/collections/digest-of-uk-energy-statistics-dukes",
    note: "Grangemouth, Wilton, Fawley crackers",
    ceased: false,
    series: [
      { year: 1970, value: 1400 },
      { year: 1980, value: 1700 },
      { year: 1990, value: 2050 },
      { year: 2000, value: 2350 },
      { year: 2005, value: 2200 },
      { year: 2010, value: 1900 },
      { year: 2015, value: 1750 },
      { year: 2020, value: 1500 },
      { year: 2023, value: 1350 },
    ],
  },
  {
    id: "propylene",
    name: "Propylene",
    unit: "kt",
    source: "BEIS / petrochemical sites",
    sourceUrl: "https://www.gov.uk/government/collections/digest-of-uk-energy-statistics-dukes",
    note: null,
    ceased: false,
    series: [
      { year: 1980, value: 700 },
      { year: 1990, value: 900 },
      { year: 2000, value: 1050 },
      { year: 2005, value: 1000 },
      { year: 2010, value: 850 },
      { year: 2015, value: 780 },
      { year: 2020, value: 650 },
      { year: 2023, value: 580 },
    ],
  },
  {
    id: "benzene",
    name: "Benzene",
    unit: "kt",
    source: "BEIS / CIA",
    sourceUrl: "https://www.cia.org.uk/",
    note: null,
    ceased: false,
    series: [
      { year: 1980, value: 700 },
      { year: 1990, value: 650 },
      { year: 2000, value: 600 },
      { year: 2005, value: 500 },
      { year: 2010, value: 400 },
      { year: 2015, value: 350 },
      { year: 2020, value: 280 },
      { year: 2023, value: 250 },
    ],
  },
  {
    id: "methanol",
    name: "Methanol",
    unit: "kt",
    source: "PRODCOM / industry",
    sourceUrl: "https://www.ons.gov.uk/businessindustryandtrade/manufacturingandproductionindustry/datasets/ukmanufacturerssalesbyproductprodcom",
    note: "Very limited UK production. Most imported.",
    ceased: false,
    series: [
      { year: 1980, value: 450 },
      { year: 1990, value: 500 },
      { year: 2000, value: 480 },
      { year: 2005, value: 350 },
      { year: 2010, value: 150 },
      { year: 2015, value: 100 },
      { year: 2020, value: 60 },
      { year: 2023, value: 50 },
    ],
  },
];

// ── CONSTRUCTION MATERIALS ──────────────────────────────────────────────
const construction = [
  {
    id: "cement",
    name: "Cement",
    unit: "Mt",
    source: "Mineral Products Association",
    sourceUrl: "https://www.mineralproducts.org/Facts-Figures",
    note: null,
    ceased: false,
    series: [
      { year: 1970, value: 17.0 },
      { year: 1980, value: 14.8 },
      { year: 1990, value: 14.2 },
      { year: 2000, value: 12.5 },
      { year: 2005, value: 12.3 },
      { year: 2010, value: 8.5 },
      { year: 2015, value: 9.3 },
      { year: 2020, value: 9.0 },
      { year: 2023, value: 8.8 },
    ],
  },
  {
    id: "bricks",
    name: "Bricks",
    unit: "bn",
    source: "Brick Development Association / PRODCOM",
    sourceUrl: "https://www.brick.org.uk/",
    note: null,
    ceased: false,
    series: [
      { year: 1970, value: 6.2 },
      { year: 1980, value: 4.5 },
      { year: 1990, value: 3.2 },
      { year: 2000, value: 2.8 },
      { year: 2005, value: 2.7 },
      { year: 2010, value: 1.5 },
      { year: 2015, value: 1.7 },
      { year: 2020, value: 1.5 },
      { year: 2023, value: 1.4 },
    ],
  },
  {
    id: "aggregates",
    name: "Aggregates, sand & gravel",
    unit: "Mt",
    source: "BGS / MPA",
    sourceUrl: "https://www.bgs.ac.uk/mineralsuk/statistics/",
    note: null,
    ceased: false,
    series: [
      { year: 1970, value: 280 },
      { year: 1980, value: 220 },
      { year: 1990, value: 260 },
      { year: 2000, value: 230 },
      { year: 2005, value: 210 },
      { year: 2010, value: 150 },
      { year: 2015, value: 170 },
      { year: 2020, value: 160 },
      { year: 2023, value: 155 },
    ],
  },
  {
    id: "flat_glass",
    name: "Flat glass",
    unit: "kt",
    source: "British Glass / PRODCOM",
    sourceUrl: "https://www.britglass.org.uk/",
    note: null,
    ceased: false,
    series: [
      { year: 1980, value: 800 },
      { year: 1990, value: 780 },
      { year: 2000, value: 750 },
      { year: 2005, value: 700 },
      { year: 2010, value: 550 },
      { year: 2015, value: 600 },
      { year: 2020, value: 520 },
      { year: 2023, value: 500 },
    ],
  },
  {
    id: "ready_mix_concrete",
    name: "Ready-mix concrete",
    unit: "Mm³",
    source: "MPA",
    sourceUrl: "https://www.mineralproducts.org/Facts-Figures",
    note: null,
    ceased: false,
    series: [
      { year: 1970, value: 30 },
      { year: 1980, value: 25 },
      { year: 1990, value: 27 },
      { year: 2000, value: 25 },
      { year: 2005, value: 24 },
      { year: 2010, value: 15 },
      { year: 2015, value: 18 },
      { year: 2020, value: 17 },
      { year: 2023, value: 16 },
    ],
  },
];

// ── POLYMERS ────────────────────────────────────────────────────────────
const polymers = [
  {
    id: "polyethylene",
    name: "Polyethylene (PE)",
    unit: "kt",
    source: "BPF / PRODCOM",
    sourceUrl: "https://www.bpf.co.uk/",
    note: null,
    ceased: false,
    series: [
      { year: 1980, value: 600 },
      { year: 1990, value: 700 },
      { year: 2000, value: 850 },
      { year: 2005, value: 800 },
      { year: 2010, value: 650 },
      { year: 2015, value: 600 },
      { year: 2020, value: 500 },
      { year: 2023, value: 450 },
    ],
  },
  {
    id: "polypropylene",
    name: "Polypropylene (PP)",
    unit: "kt",
    source: "BPF / PRODCOM",
    sourceUrl: "https://www.bpf.co.uk/",
    note: null,
    ceased: false,
    series: [
      { year: 1980, value: 250 },
      { year: 1990, value: 400 },
      { year: 2000, value: 500 },
      { year: 2005, value: 480 },
      { year: 2010, value: 400 },
      { year: 2015, value: 380 },
      { year: 2020, value: 320 },
      { year: 2023, value: 290 },
    ],
  },
  {
    id: "pvc",
    name: "PVC",
    unit: "kt",
    source: "INEOS / BPF",
    sourceUrl: "https://www.bpf.co.uk/",
    note: "INEOS Runcorn is the main UK producer",
    ceased: false,
    series: [
      { year: 1980, value: 350 },
      { year: 1990, value: 380 },
      { year: 2000, value: 400 },
      { year: 2005, value: 380 },
      { year: 2010, value: 320 },
      { year: 2015, value: 300 },
      { year: 2020, value: 270 },
      { year: 2023, value: 250 },
    ],
  },
  {
    id: "polycarbonate",
    name: "Polycarbonate",
    unit: "kt",
    source: "PRODCOM",
    sourceUrl: "https://www.ons.gov.uk/businessindustryandtrade/manufacturingandproductionindustry/datasets/ukmanufacturerssalesbyproductprodcom",
    note: "Very limited UK production. Bayer/Covestro had some, mostly ceased.",
    ceased: true,
    series: [
      { year: 1990, value: 30 },
      { year: 2000, value: 25 },
      { year: 2005, value: 15 },
      { year: 2010, value: 5 },
      { year: 2015, value: 0 },
    ],
  },
  {
    id: "pet",
    name: "PET",
    unit: "kt",
    source: "BPF / PRODCOM",
    sourceUrl: "https://www.bpf.co.uk/",
    note: null,
    ceased: false,
    series: [
      { year: 1990, value: 80 },
      { year: 2000, value: 150 },
      { year: 2005, value: 180 },
      { year: 2010, value: 160 },
      { year: 2015, value: 140 },
      { year: 2020, value: 120 },
      { year: 2023, value: 110 },
    ],
  },
];

// ── INDUSTRIAL GASES ────────────────────────────────────────────────────
const gases = [
  {
    id: "oxygen",
    name: "Oxygen",
    unit: "kt",
    source: "ONS SIC data / industry estimates",
    sourceUrl: "https://www.ons.gov.uk/",
    note: "Estimated from SIC data. ASU output tied to steelmaking demand.",
    ceased: false,
    series: [
      { year: 1990, value: 2200 },
      { year: 2000, value: 2000 },
      { year: 2005, value: 1800 },
      { year: 2010, value: 1400 },
      { year: 2015, value: 1300 },
      { year: 2020, value: 1100 },
      { year: 2023, value: 1050 },
    ],
  },
  {
    id: "nitrogen",
    name: "Nitrogen",
    unit: "kt",
    source: "ONS SIC data / industry estimates",
    sourceUrl: "https://www.ons.gov.uk/",
    note: "Estimated. Co-produced with oxygen in ASUs.",
    ceased: false,
    series: [
      { year: 1990, value: 3000 },
      { year: 2000, value: 2800 },
      { year: 2005, value: 2700 },
      { year: 2010, value: 2300 },
      { year: 2015, value: 2200 },
      { year: 2020, value: 2000 },
      { year: 2023, value: 1900 },
    ],
  },
  {
    id: "hydrogen",
    name: "Hydrogen",
    unit: "kt",
    source: "DESNZ",
    sourceUrl: "https://www.gov.uk/government/publications/uk-hydrogen-strategy",
    note: "Mostly grey hydrogen from SMR at refineries/chemical plants. ~27 TWh/yr.",
    ceased: false,
    series: [
      { year: 2000, value: 700 },
      { year: 2005, value: 720 },
      { year: 2010, value: 680 },
      { year: 2015, value: 660 },
      { year: 2020, value: 600 },
      { year: 2023, value: 580 },
    ],
  },
];

// ── INTERMEDIATES ───────────────────────────────────────────────────────
const intermediates = [
  {
    id: "nitrogen_fertiliser",
    name: "Nitrogen fertiliser (N-equiv.)",
    unit: "kt",
    source: "AIC (Agricultural Industries Confederation)",
    sourceUrl: "https://www.agindustries.org.uk/",
    note: "Domestic production only. UK was ~50% self-sufficient by 2020.",
    ceased: false,
    series: [
      { year: 1970, value: 900 },
      { year: 1980, value: 1100 },
      { year: 1990, value: 1050 },
      { year: 2000, value: 800 },
      { year: 2005, value: 700 },
      { year: 2010, value: 650 },
      { year: 2015, value: 600 },
      { year: 2020, value: 480 },
      { year: 2023, value: 350 },
    ],
  },
  {
    id: "paper_paperboard",
    name: "Paper & paperboard",
    unit: "Mt",
    source: "CPI (Confederation of Paper Industries)",
    sourceUrl: "https://www.paper.org.uk/",
    note: "Several major mill closures 2005-2020 (Sittingbourne, Kemsley newsprint)",
    ceased: false,
    series: [
      { year: 1970, value: 5.0 },
      { year: 1980, value: 4.4 },
      { year: 1990, value: 5.2 },
      { year: 2000, value: 6.6 },
      { year: 2005, value: 6.2 },
      { year: 2010, value: 4.9 },
      { year: 2015, value: 4.2 },
      { year: 2020, value: 3.5 },
      { year: 2023, value: 3.2 },
    ],
  },
  {
    id: "synthetic_fibres",
    name: "Synthetic fibres",
    unit: "kt",
    source: "BPF / PRODCOM",
    sourceUrl: "https://www.bpf.co.uk/",
    note: "UK synthetic fibre production largely ended 2000s (ICI legacy plants closed)",
    ceased: true,
    series: [
      { year: 1970, value: 450 },
      { year: 1980, value: 380 },
      { year: 1990, value: 300 },
      { year: 2000, value: 150 },
      { year: 2005, value: 60 },
      { year: 2010, value: 20 },
      { year: 2015, value: 5 },
      { year: 2020, value: 0 },
    ],
  },
  {
    id: "mineral_wool",
    name: "Mineral wool insulation",
    unit: "kt",
    source: "PRODCOM",
    sourceUrl: "https://www.ons.gov.uk/businessindustryandtrade/manufacturingandproductionindustry/datasets/ukmanufacturerssalesbyproductprodcom",
    note: "Knauf Insulation (Cwmbran), Superglass (Stirling)",
    ceased: false,
    series: [
      { year: 1990, value: 220 },
      { year: 2000, value: 250 },
      { year: 2005, value: 260 },
      { year: 2010, value: 200 },
      { year: 2015, value: 210 },
      { year: 2020, value: 190 },
      { year: 2023, value: 185 },
    ],
  },
  {
    id: "explosives",
    name: "Explosives",
    unit: "kt",
    source: "PRODCOM",
    sourceUrl: "https://www.ons.gov.uk/businessindustryandtrade/manufacturingandproductionindustry/datasets/ukmanufacturerssalesbyproductprodcom",
    note: "Mining & quarrying explosives. Orica, EPC-UK",
    ceased: false,
    series: [
      { year: 1990, value: 80 },
      { year: 2000, value: 70 },
      { year: 2005, value: 65 },
      { year: 2010, value: 50 },
      { year: 2015, value: 45 },
      { year: 2020, value: 35 },
      { year: 2023, value: 30 },
    ],
  },
];

// ── Assemble categories ─────────────────────────────────────────────────
const categories = {
  metals: { label: "Metals", products: metals },
  chemicals: { label: "Basic Chemicals", products: chemicals },
  construction: { label: "Construction Materials", products: construction },
  polymers: { label: "Polymers", products: polymers },
  gases: { label: "Industrial Gases", products: gases },
  intermediates: { label: "Intermediates", products: intermediates },
};

// ── Snapshot ─────────────────────────────────────────────────────────────
const allProducts = Object.values(categories).flatMap((c) => c.products);
const ceasedCount = allProducts.filter((p) => p.ceased).length;

const steelSeries = metals.find((p) => p.id === "crude_steel").series;
const steelLatest = steelSeries[steelSeries.length - 1];
const steelPeak = steelSeries.reduce((a, b) => (b.value > a.value ? b : a));

const cementSeries = construction.find((p) => p.id === "cement").series;
const cementLatest = cementSeries[cementSeries.length - 1];
const cementPeak = cementSeries.reduce((a, b) => (b.value > a.value ? b : a));

const snapshot = {
  steelLatest: steelLatest.value,
  steelLatestYear: steelLatest.year,
  steelPeak: steelPeak.value,
  steelPeakYear: steelPeak.year,
  steelPctOfPeak: Math.round((steelLatest.value / steelPeak.value) * 100),
  cementLatest: cementLatest.value,
  cementLatestYear: cementLatest.year,
  cementPeak: cementPeak.value,
  cementPeakYear: cementPeak.year,
  cementPctOfPeak: Math.round((cementLatest.value / cementPeak.value) * 100),
  ceasedCount,
  totalProducts: allProducts.length,
};

// ── Collect unique sources ──────────────────────────────────────────────
const sourceMap = new Map();
for (const p of allProducts) {
  if (!sourceMap.has(p.source)) {
    sourceMap.set(p.source, p.sourceUrl);
  }
}
const sources = [...sourceMap.entries()].map(([name, url]) => ({ name, url }));

// ── Output ──────────────────────────────────────────────────────────────
const output = {
  snapshot,
  categories,
  meta: {
    generated: new Date().toISOString(),
    sources,
  },
};

writeFileSync("public/data/industrial.json", JSON.stringify(output, null, 2));
console.log(
  `  industrial.json written (${allProducts.length} products across ${Object.keys(categories).length} categories, ${ceasedCount} ceased)`
);
