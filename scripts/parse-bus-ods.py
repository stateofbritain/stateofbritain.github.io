#!/usr/bin/env python3
"""Parse DfT bus statistics ODS files and output JSON to stdout.

Expects five ODS files in /tmp/:
  /tmp/dft-bus01.ods        – BUS01 passenger journeys by region
  /tmp/dft-bus01-hist.ods   – BUS01 historical (1950-2005)
  /tmp/dft-bus0415.ods      – BUS0415 quarterly fares index
  /tmp/dft-bus06.ods        – BUS06 fleet size
  /tmp/dft-bus08.ods        – BUS08 concessionary travel
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
# Series 5: concessionaryPct from BUS01, sheet BUS01d
# ============================================================
# Concessionary journeys as percentage of total, by region.
# Rows contain year + category (e.g. "Total concessionary").
# We want "Total concessionary" rows only.
# ============================================================
def parse_concessionary_pct():
    path = "/tmp/dft-bus01.ods"
    if not os.path.exists(path):
        debug(f"WARN: {path} not found, skipping concessionaryPct")
        return []
    tables = load_sheets(path)

    sheet = None
    for name in tables:
        if "BUS01d" in name:
            sheet = tables[name]
            break
    if sheet is None:
        debug("WARN: BUS01d sheet not found")
        return []

    rows = get_all_rows(sheet)
    debug(f"BUS01d: {len(rows)} rows")

    # Debug: print first 15 rows to understand structure
    for i, r in enumerate(rows[:15]):
        vals = [str(c)[:40] for c in r[:20] if str(c).strip()]
        if vals:
            debug(f"  BUS01d row {i}: {vals}")

    # Find header row containing region names
    header_row_idx = None
    region_cols = {}
    for i, r in enumerate(rows):
        row_str = " ".join(str(c) for c in r).lower()
        if "london" in row_str and ("england" in row_str or "scotland" in row_str):
            # Check this looks like a header
            has_year = False
            for c in r[:5]:
                cs = str(c).lower().strip()
                if cs == "year" or "year" in cs:
                    has_year = True
            if not has_year:
                continue
            header_row_idx = i
            for j, c in enumerate(r):
                cs = str(c).lower().strip()
                if cs == "london" or (cs.startswith("london") and "outside" not in cs and "england" not in cs):
                    region_cols["london"] = j
                elif "england outside london" in cs or "outside london" in cs:
                    region_cols["englandOutsideLondon"] = j
                elif cs == "england" or cs.startswith("england") and "outside" not in cs and "non" not in cs:
                    if "london" not in cs and "metropolitan" not in cs:
                        region_cols["england"] = j
                elif cs == "scotland":
                    region_cols["scotland"] = j
                elif cs == "wales":
                    region_cols["wales"] = j
                elif "great britain" in cs:
                    region_cols["gb"] = j
            break

    debug(f"BUS01d header row: {header_row_idx}, region cols: {region_cols}")

    if header_row_idx is None or not region_cols:
        debug("WARN: Could not find header row in BUS01d")
        return []

    # Find which column has the category/type descriptor
    # Scan data rows to identify the category column
    cat_col = None
    for i in range(header_row_idx + 1, min(header_row_idx + 20, len(rows))):
        r = rows[i]
        for j, c in enumerate(r[:10]):
            cs = str(c).lower().strip()
            if "concessionary" in cs or "elderly" in cs:
                cat_col = j
                break
        if cat_col is not None:
            break

    debug(f"BUS01d category column: {cat_col}")

    # Debug a few data rows
    for i in range(header_row_idx + 1, min(header_row_idx + 10, len(rows))):
        r = rows[i]
        vals = [str(c)[:40] for c in r[:10] if str(c).strip()]
        if vals:
            debug(f"  BUS01d data row {i}: {vals}")

    results = []
    for i in range(header_row_idx + 1, len(rows)):
        r = rows[i]
        if not r:
            continue

        # Check category column for "total concessionary"
        if cat_col is not None and cat_col < len(r):
            cat = str(r[cat_col]).lower().strip()
            if "total concessionary" not in cat:
                continue
        else:
            continue

        # Find year in first few columns
        end_year = None
        for j in range(min(5, len(r))):
            val = r[j]
            if isinstance(val, float) and 1950 <= val <= 2100:
                end_year = int(val)
                break
            elif isinstance(val, str) and re.match(r"^\d{4}$", val.strip()):
                end_year = int(val.strip())
                break

        if end_year is None:
            continue

        fy = fiscal_year_from_end(end_year)
        entry = {"year": fy}
        for key, col in region_cols.items():
            if col < len(r) and isinstance(r[col], (int, float)):
                entry[key] = round(r[col], 1)
        if len(entry) > 1:
            results.append(entry)

    debug(f"concessionaryPct: {len(results)} rows")
    return results


# ============================================================
# Series 6: passHolders from BUS08, sheet BUS08a
# ============================================================
# Long-format: Col 0 = Year (string like "2011"), Col 1 = Metric description,
# Col 5 = England value. Multiple metric rows per year.
# We want: Older passes, Disabled passes, Total passes, Journeys per pass.
# ============================================================
def parse_pass_holders():
    path = "/tmp/dft-bus08.ods"
    if not os.path.exists(path):
        debug(f"WARN: {path} not found, skipping passHolders")
        return []
    tables = load_sheets(path)
    debug(f"BUS08 sheets: {list(tables.keys())}")

    sheet = None
    for name in tables:
        if name.strip() == "BUS08a":
            sheet = tables[name]
            break
    if sheet is None:
        for name in tables:
            if "BUS08a" in name:
                sheet = tables[name]
                break
    if sheet is None:
        debug("WARN: BUS08a sheet not found")
        return []

    rows = get_all_rows(sheet)
    debug(f"BUS08a: {len(rows)} rows")

    # Find header row
    header_row_idx = None
    year_col = metric_col = england_col = None
    for i, r in enumerate(rows):
        row_str = " ".join(str(c) for c in r).lower()
        if "year" in row_str and "metric" in row_str and "england" in row_str:
            header_row_idx = i
            for j, c in enumerate(r):
                cs = str(c).lower().strip()
                if "year" in cs:
                    year_col = j
                elif "metric" in cs:
                    metric_col = j
                elif cs == "england":
                    england_col = j
            break

    debug(f"BUS08a header: row={header_row_idx}, year_col={year_col}, metric_col={metric_col}, england_col={england_col}")

    if header_row_idx is None or england_col is None:
        debug("WARN: Could not find header row in BUS08a")
        return []

    # Parse all data rows, grouping by year
    # Metric descriptions contain keywords we can match:
    #   "Older ... concessionary travel passes (Thousands)"
    #   "Disabled ... concessionary travel passes (Thousands)"
    #   "Older and disabled concessionary travel passes (Thousands)" -> totalPasses
    #   "Concessionary journeys per concessionary pass" -> journeysPerPass
    year_data = {}  # year_str -> {metric: value}
    for i in range(header_row_idx + 1, len(rows)):
        r = rows[i]
        if not r or year_col >= len(r) or metric_col >= len(r):
            continue

        yr_raw = r[year_col]
        if isinstance(yr_raw, float) and 2000 <= yr_raw <= 2100:
            yr_str = str(int(yr_raw))
        elif isinstance(yr_raw, str) and re.match(r"^\d{4}$", yr_raw.strip()):
            yr_str = yr_raw.strip()
        else:
            continue

        metric_text = str(r[metric_col]).lower().strip()
        if england_col >= len(r):
            continue
        val = r[england_col]
        if not isinstance(val, (int, float)):
            continue

        if yr_str not in year_data:
            year_data[yr_str] = {}

        if "older and disabled" in metric_text and "pass" in metric_text and "thousand" in metric_text:
            year_data[yr_str]["totalPasses"] = round(val, 1)
        elif "older" in metric_text and "disabled" not in metric_text and "pass" in metric_text and "thousand" in metric_text:
            year_data[yr_str]["olderPasses"] = round(val, 1)
        elif "disabled" in metric_text and "older" not in metric_text and "pass" in metric_text and "thousand" in metric_text:
            year_data[yr_str]["disabledPasses"] = round(val, 1)
        elif "journey" in metric_text and "per" in metric_text and "pass" in metric_text:
            year_data[yr_str]["journeysPerPass"] = round(val, 1)

    # Build sorted results
    results = []
    for yr_str in sorted(year_data.keys()):
        d = year_data[yr_str]
        if not d:
            continue
        end_year = int(yr_str)
        fy = fiscal_year_from_end(end_year)
        entry = {"year": fy}
        entry.update(d)
        results.append(entry)

    debug(f"passHolders: {len(results)} rows")
    if results:
        debug(f"  passHolders first: {results[0]}")
        debug(f"  passHolders last: {results[-1]}")
    return results


# ============================================================
# Series 7: expenditure from BUS08, sheet BUS08di
# ============================================================
# Long-format: Col 0 = Year (string like "2001"), Col 1 = Metric description,
# Col 5 = England value. Multiple metric rows per year.
# We want: net current expenditure, reimbursement, reimbursement per journey.
# ============================================================
def parse_expenditure():
    path = "/tmp/dft-bus08.ods"
    if not os.path.exists(path):
        debug(f"WARN: {path} not found, skipping expenditure")
        return []
    tables = load_sheets(path)

    sheet = None
    for name in tables:
        if name.strip() == "BUS08di":
            sheet = tables[name]
            break
    if sheet is None:
        for name in tables:
            if "BUS08di" in name and "BUS08dii" not in name:
                sheet = tables[name]
                break
    if sheet is None:
        debug("WARN: BUS08di sheet not found")
        debug(f"Available sheets: {list(tables.keys())}")
        return []

    rows = get_all_rows(sheet)
    debug(f"BUS08di: {len(rows)} rows")

    # Find header row
    header_row_idx = None
    year_col = metric_col = england_col = None
    for i, r in enumerate(rows):
        row_str = " ".join(str(c) for c in r).lower()
        if "year" in row_str and "metric" in row_str and "england" in row_str:
            header_row_idx = i
            for j, c in enumerate(r):
                cs = str(c).lower().strip()
                if "year" in cs:
                    year_col = j
                elif "metric" in cs:
                    metric_col = j
                elif cs == "england":
                    england_col = j
            break

    debug(f"BUS08di header: row={header_row_idx}, year_col={year_col}, metric_col={metric_col}, england_col={england_col}")

    if header_row_idx is None or england_col is None:
        debug("WARN: Could not find header row in BUS08di")
        return []

    # Debug a few data rows after header
    for i in range(header_row_idx + 1, min(header_row_idx + 10, len(rows))):
        r = rows[i]
        vals = [str(c)[:60] for c in r[:8] if str(c).strip()]
        if vals:
            debug(f"  BUS08di data row {i}: {vals}")

    # Parse all data rows, grouping by year
    year_data = {}
    for i in range(header_row_idx + 1, len(rows)):
        r = rows[i]
        if not r or year_col >= len(r) or metric_col >= len(r):
            continue

        yr_raw = r[year_col]
        if isinstance(yr_raw, float) and 2000 <= yr_raw <= 2100:
            yr_str = str(int(yr_raw))
        elif isinstance(yr_raw, str) and re.match(r"^\d{4}$", yr_raw.strip()):
            yr_str = yr_raw.strip()
        else:
            continue

        metric_text = str(r[metric_col]).lower().strip()
        if england_col >= len(r):
            continue
        val = r[england_col]
        if not isinstance(val, (int, float)):
            continue

        if yr_str not in year_data:
            year_data[yr_str] = {}

        if "net current expenditure" in metric_text and "million" in metric_text and "mhclg" in metric_text:
            year_data[yr_str]["netExpenditure"] = round(val, 1)
        elif "total reimbursement" in metric_text and "million" in metric_text:
            year_data[yr_str]["reimbursement"] = round(val, 1)
        elif "reimbursement per journey" in metric_text and "pence" in metric_text:
            # Value is in pence, convert to £
            year_data[yr_str]["reimbursementPerJourney"] = round(val, 1)

    # Build sorted results
    results = []
    for yr_str in sorted(year_data.keys()):
        d = year_data[yr_str]
        if not d:
            continue
        end_year = int(yr_str)
        fy = fiscal_year_from_end(end_year)
        entry = {"year": fy}
        entry.update(d)
        results.append(entry)

    debug(f"expenditure: {len(results)} rows")
    if results:
        debug(f"  expenditure first: {results[0]}")
        debug(f"  expenditure last: {results[-1]}")
    return results


# ============================================================
# Main
# ============================================================
journeys = parse_journeys_by_region()
historical = parse_journeys_historical()
fares = parse_fares_index()
fleet = parse_fleet_size()
concessionary_pct = parse_concessionary_pct()
pass_holders = parse_pass_holders()
expenditure = parse_expenditure()

# Compute latest values
latest_total = None
latest_year = None
latest_london = None
latest_fleet = None
latest_concessionary_pct = None
latest_pass_holders = None

if journeys:
    last = journeys[-1]
    latest_year = last.get("year")
    latest_total = last.get("total")
    latest_london = last.get("london")

if fleet:
    last_fleet = fleet[-1]
    latest_fleet = last_fleet.get("total")

if concessionary_pct:
    last_conc = concessionary_pct[-1]
    latest_concessionary_pct = last_conc.get("gb") or last_conc.get("england")

if pass_holders:
    last_ph = pass_holders[-1]
    latest_pass_holders = last_ph.get("totalPasses")

result = {
    "journeysByRegion": journeys,
    "journeysHistorical": historical,
    "faresIndex": fares,
    "fleetSize": fleet,
    "concessionaryPct": concessionary_pct,
    "passHolders": pass_holders,
    "expenditure": expenditure,
    "latestYear": latest_year,
    "latestTotal": latest_total,
    "latestLondon": latest_london,
    "latestFleet": latest_fleet,
    "latestConcessionaryPct": latest_concessionary_pct,
    "latestPassHolders": latest_pass_holders,
}

print(json.dumps(result))
