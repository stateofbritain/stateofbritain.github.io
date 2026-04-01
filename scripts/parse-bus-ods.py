#!/usr/bin/env python3
"""Parse DfT bus statistics ODS files and output JSON to stdout.

Expects four ODS files in /tmp/:
  /tmp/dft-bus01.ods        – BUS01 passenger journeys by region
  /tmp/dft-bus01-hist.ods   – BUS01 historical (1950-2005)
  /tmp/dft-bus0415.ods      – BUS0415 quarterly fares index
  /tmp/dft-bus06.ods        – BUS06 fleet size
"""
import zipfile, xml.etree.ElementTree as ET, json, sys, re, os

ns = {
    "t": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
}


def get_cell_value(cell):
    vtype = cell.get("{urn:oasis:names:tc:opendocument:xmlns:office:1.0}value-type")
    if vtype == "float":
        return float(cell.get("{urn:oasis:names:tc:opendocument:xmlns:office:1.0}value"))
    if vtype == "date":
        return cell.get("{urn:oasis:names:tc:opendocument:xmlns:office:1.0}date-value", "")
    texts = cell.findall(".//text:p", ns)
    return " ".join(t.text or "" for t in texts).strip()


def expand_row(row):
    cells = row.findall("t:table-cell", ns)
    vals = []
    for cell in cells:
        rep = int(cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-columns-repeated", "1"))
        v = get_cell_value(cell)
        for _ in range(min(rep, 300)):
            vals.append(v)
    return vals


def load_sheets(path):
    z = zipfile.ZipFile(path)
    tree = ET.parse(z.open("content.xml"))
    tables = {}
    for t in tree.findall(".//t:table", ns):
        name = t.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}name")
        tables[name] = t
    return tables


def get_all_rows(table):
    rows = table.findall("t:table-row", ns)
    expanded = []
    for row in rows:
        rep = int(row.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-rows-repeated", "1"))
        vals = expand_row(row)
        for _ in range(min(rep, 200)):
            expanded.append(vals)
    return expanded


def fiscal_year_from_end(end_year):
    """Given an end year (int), return fiscal year string like '2024/25'."""
    return f"{end_year - 1}/{str(end_year)[-2:]}"


def debug(msg):
    print(msg, file=sys.stderr)


# ============================================================
# Series 1: journeysByRegion from BUS01, sheet BUS01a
# ============================================================
# Structure: Row 7 is headers with region names.
# Row 8+ are data rows. Col 0 = year (float like 2005.0 meaning
# "year ending March 2005"). Remaining cols are numeric journey values.
# Key columns: London=7, English metro=10, English non-metro=11,
# Scotland=16, Wales=17, Great Britain=18.
# ============================================================
def parse_journeys_by_region():
    path = "/tmp/dft-bus01.ods"
    if not os.path.exists(path):
        debug(f"WARN: {path} not found, skipping journeysByRegion")
        return []
    tables = load_sheets(path)
    debug(f"BUS01 sheets: {list(tables.keys())}")

    sheet = None
    for name in tables:
        if "BUS01a" in name:
            sheet = tables[name]
            break
    if sheet is None:
        sheet = list(tables.values())[0]

    rows = get_all_rows(sheet)
    debug(f"BUS01a: {len(rows)} rows")

    # Find header row containing region names
    header_row_idx = None
    region_cols = {}
    for i, r in enumerate(rows):
        row_str = " ".join(str(c) for c in r).lower()
        if "london" in row_str and ("metropolitan" in row_str or "scotland" in row_str):
            header_row_idx = i
            for j, c in enumerate(r):
                cs = str(c).lower().strip()
                if cs == "london" or (cs.startswith("london") and "outside" not in cs):
                    if "england" not in cs:
                        region_cols["london"] = j
                elif "english metropolitan" in cs and "non" not in cs:
                    region_cols["englishMetro"] = j
                elif "english non-metropolitan" in cs or "english non metropolitan" in cs:
                    region_cols["englishNonMetro"] = j
                elif cs == "scotland":
                    region_cols["scotland"] = j
                elif cs == "wales":
                    region_cols["wales"] = j
                elif "great britain" in cs:
                    region_cols["total"] = j
            break

    debug(f"Header row: {header_row_idx}, region cols: {region_cols}")

    if not region_cols:
        debug("WARN: No region columns found in BUS01")
        return []

    results = []
    for i in range(header_row_idx + 1, len(rows)):
        r = rows[i]
        if not r:
            continue
        # Year column is col 0, numeric float (e.g. 2005.0 = year ending March 2005)
        val = r[0]
        if isinstance(val, float) and 1950 <= val <= 2100:
            end_year = int(val)
        elif isinstance(val, str):
            m = re.match(r"^(\d{4})$", val.strip())
            if m:
                end_year = int(m.group(1))
            else:
                continue
        else:
            continue

        fy = fiscal_year_from_end(end_year)
        entry = {"year": fy}
        for key, col in region_cols.items():
            if col < len(r) and isinstance(r[col], (int, float)):
                entry[key] = round(r[col], 1)
        if len(entry) > 1:
            results.append(entry)

    debug(f"journeysByRegion: {len(results)} rows")
    return results


# ============================================================
# Series 2: journeysHistorical from bus01_hist.ods
# ============================================================
# Long format: Col 0=Year (string like "1950" or "1999/00"),
# Col 1=Region, Col 2=Bus Service Type, Col 3=Passenger Journeys (millions).
# Filter: Region="Great Britain", Type="Local bus services".
# ============================================================
def parse_journeys_historical():
    path = "/tmp/dft-bus01-hist.ods"
    if not os.path.exists(path):
        debug(f"WARN: {path} not found, skipping journeysHistorical")
        return []
    tables = load_sheets(path)
    debug(f"BUS01_hist sheets: {list(tables.keys())}")

    # Use BUS01a_hist sheet
    sheet = None
    for name in tables:
        if "BUS01a_hist" in name:
            sheet = tables[name]
            break
    if sheet is None:
        sheet = list(tables.values())[0]

    rows = get_all_rows(sheet)
    debug(f"bus01a_hist: {len(rows)} rows")

    # Find header row with "Year", "Region", etc.
    header_row_idx = None
    year_col = region_col = type_col = value_col = None
    for i, r in enumerate(rows):
        for j, c in enumerate(r[:10]):
            cs = str(c).lower().strip()
            if cs == "year":
                header_row_idx = i
                year_col = j
                break
        if header_row_idx is not None:
            break

    if header_row_idx is not None:
        header = rows[header_row_idx]
        for j, c in enumerate(header):
            cs = str(c).lower().strip()
            if cs == "year":
                year_col = j
            elif "region" in cs:
                region_col = j
            elif "service" in cs or "type" in cs:
                type_col = j
            elif "journey" in cs or "passenger" in cs:
                value_col = j

    debug(f"Historical cols: year={year_col}, region={region_col}, type={type_col}, value={value_col}")

    if year_col is None or value_col is None:
        debug("WARN: Could not find required columns in historical data")
        return []

    results = []
    for i in range(header_row_idx + 1, len(rows)):
        r = rows[i]
        if not r or year_col >= len(r):
            continue

        # Filter by region
        if region_col is not None and region_col < len(r):
            region = str(r[region_col]).lower().strip()
            if "great britain" not in region:
                continue

        # Filter by service type: "Local bus services" only
        if type_col is not None and type_col < len(r):
            stype = str(r[type_col]).lower().strip()
            if "local" not in stype:
                continue

        # Parse year
        yr_val = r[year_col]
        yr_str = str(yr_val).strip()
        # Could be "1950", "1999/00", or float like 1950.0
        if isinstance(yr_val, float) and 1900 <= yr_val <= 2100:
            # Calendar year, treat as fiscal year ending in that year
            fy = fiscal_year_from_end(int(yr_val))
        elif re.match(r"^\d{4}/\d{2}$", yr_str):
            fy = yr_str
        elif re.match(r"^\d{4}$", yr_str):
            # Plain year like "1950" - use as-is with /51 suffix
            y = int(yr_str)
            fy = fiscal_year_from_end(y)
        else:
            continue

        if value_col < len(r) and isinstance(r[value_col], (int, float)):
            results.append({"year": fy, "total": round(r[value_col], 0)})

    # Deduplicate by year (keep last)
    seen = {}
    for entry in results:
        seen[entry["year"]] = entry
    results = sorted(seen.values(), key=lambda x: x["year"])

    debug(f"journeysHistorical: {len(results)} rows")
    return results


# ============================================================
# Series 3: faresIndex from BUS0415, sheet BUS0415a
# ============================================================
# Structure: Row 8 is header.
# Col 0=Year (float), Col 1=Month (string like "Mar"),
# Col 3=CPI, Col 4=CPIH, Col 5=London, Col 6=English metro,
# Col 7=English non-metro, Col 8=England, Col 9=Scotland,
# Col 10=Wales, Col 11=Great Britain, Col 12=England outside London.
# ============================================================
def parse_fares_index():
    path = "/tmp/dft-bus0415.ods"
    if not os.path.exists(path):
        debug(f"WARN: {path} not found, skipping faresIndex")
        return []
    tables = load_sheets(path)
    debug(f"BUS0415 sheets: {list(tables.keys())}")

    sheet = None
    for name in tables:
        if "BUS0415a" in name:
            sheet = tables[name]
            break
    if sheet is None:
        sheet = list(tables.values())[0]

    rows = get_all_rows(sheet)
    debug(f"BUS0415a: {len(rows)} rows")

    # Find header row
    header_row_idx = None
    cols = {}
    for i, r in enumerate(rows):
        row_str = " ".join(str(c) for c in r).lower()
        if "year" in row_str and "month" in row_str and "london" in row_str:
            header_row_idx = i
            for j, c in enumerate(r):
                cs = str(c).lower().strip()
                if cs == "year":
                    cols["year"] = j
                elif cs == "month":
                    cols["month"] = j
                elif cs == "london":
                    cols["london"] = j
                elif "england outside london" in cs or "outside london" in cs:
                    cols["englandOutsideLondon"] = j
                elif "great britain" in cs:
                    cols["gb"] = j
                elif cs.startswith("all items consumer") or cs == "all items consumer prices index (cpi)":
                    cols["cpi"] = j
                elif cs.startswith("cpih") or "occupiers" in cs:
                    cols["cpi"] = j  # prefer CPIH over CPI
            break

    debug(f"Fares header row: {header_row_idx}, cols: {cols}")

    if header_row_idx is None or "year" not in cols or "month" not in cols:
        debug("WARN: Could not find fares header row with Year/Month columns")
        return []

    # Month to quarter mapping (as specified: Mar=Q1, Jun=Q2, Sep=Q3, Dec=Q4)
    month_q = {"mar": "Q1", "jun": "Q2", "sep": "Q3", "dec": "Q4"}

    results = []
    for i in range(header_row_idx + 1, len(rows)):
        r = rows[i]
        if not r:
            continue
        yr_col = cols["year"]
        mo_col = cols["month"]
        if yr_col >= len(r) or mo_col >= len(r):
            continue

        yr_val = r[yr_col]
        mo_val = str(r[mo_col]).strip().lower()[:3]

        if not isinstance(yr_val, (int, float)) or yr_val < 2000:
            continue
        year = int(yr_val)

        q = month_q.get(mo_val)
        if q is None:
            continue  # skip months that aren't quarter boundaries

        quarter = f"{year}-{q}"
        entry = {"quarter": quarter}

        for key in ["london", "englandOutsideLondon", "gb", "cpi"]:
            if key in cols and cols[key] < len(r) and isinstance(r[cols[key]], (int, float)):
                entry[key] = round(r[cols[key]], 1)

        if len(entry) > 1:
            results.append(entry)

    debug(f"faresIndex: {len(results)} rows")
    return results


# ============================================================
# Series 4: fleetSize from BUS06, sheet BUS06b
# ============================================================
# Structure: Row 8 is header.
# Col 0=Year (float like 2005.0 = "as at March 2005"),
# Col 1=London, Col 2=English metro, Col 3=English non-metro,
# Col 5=Scotland, Col 6=Wales, Col 7=Great Britain.
# Values in thousands (multiply by 1000 and round).
# ============================================================
def parse_fleet_size():
    path = "/tmp/dft-bus06.ods"
    if not os.path.exists(path):
        debug(f"WARN: {path} not found, skipping fleetSize")
        return []
    tables = load_sheets(path)
    debug(f"BUS06 sheets: {list(tables.keys())}")

    sheet = None
    for name in tables:
        if "BUS06b" in name:
            sheet = tables[name]
            break
    if sheet is None:
        sheet = list(tables.values())[0]

    rows = get_all_rows(sheet)
    debug(f"BUS06b: {len(rows)} rows")

    # Find header row
    header_row_idx = None
    region_cols = {}
    for i, r in enumerate(rows):
        row_str = " ".join(str(c) for c in r).lower()
        if "london" in row_str and ("scotland" in row_str or "metropolitan" in row_str) and "year" in row_str:
            header_row_idx = i
            for j, c in enumerate(r):
                cs = str(c).lower().strip()
                if cs == "london":
                    region_cols["london"] = j
                elif "english metropolitan" in cs and "non" not in cs:
                    region_cols["englishMetro"] = j
                elif "english non-metropolitan" in cs or "english non metropolitan" in cs:
                    region_cols["englishNonMetro"] = j
                elif cs == "scotland":
                    region_cols["scotland"] = j
                elif cs == "wales":
                    region_cols["wales"] = j
                elif "great britain" in cs:
                    region_cols["total"] = j
            break

    debug(f"Fleet header row: {header_row_idx}, region cols: {region_cols}")

    if header_row_idx is None or not region_cols:
        debug("WARN: Could not find fleet header row")
        return []

    results = []
    for i in range(header_row_idx + 1, len(rows)):
        r = rows[i]
        if not r:
            continue
        val = r[0]
        if isinstance(val, float) and 1950 <= val <= 2100:
            end_year = int(val)
        elif isinstance(val, str) and re.match(r"^\d{4}$", val.strip()):
            end_year = int(val.strip())
        else:
            continue

        fy = fiscal_year_from_end(end_year)
        entry = {"year": fy}
        for key, col in region_cols.items():
            if col < len(r) and isinstance(r[col], (int, float)):
                entry[key] = round(r[col] * 1000)
        if len(entry) > 1:
            results.append(entry)

    debug(f"fleetSize: {len(results)} rows")
    return results


# ============================================================
# Main
# ============================================================
journeys = parse_journeys_by_region()
historical = parse_journeys_historical()
fares = parse_fares_index()
fleet = parse_fleet_size()

# Compute latest values
latest_total = None
latest_year = None
latest_london = None
latest_fleet = None

if journeys:
    last = journeys[-1]
    latest_year = last.get("year")
    latest_total = last.get("total")
    latest_london = last.get("london")

if fleet:
    last_fleet = fleet[-1]
    latest_fleet = last_fleet.get("total")

result = {
    "journeysByRegion": journeys,
    "journeysHistorical": historical,
    "faresIndex": fares,
    "fleetSize": fleet,
    "latestYear": latest_year,
    "latestTotal": latest_total,
    "latestLondon": latest_london,
    "latestFleet": latest_fleet,
}

print(json.dumps(result))
