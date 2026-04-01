#!/usr/bin/env python3
"""Parse DWP benefit expenditure ODS file and output JSON to stdout."""
import zipfile, xml.etree.ElementTree as ET, json, sys

ods_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/dwp-outturn-welfare.ods"

z = zipfile.ZipFile(ods_path)
tree = ET.parse(z.open("content.xml"))
ns = {
    "t": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
}

def get_cell_value(cell):
    vtype = cell.get("{urn:oasis:names:tc:opendocument:xmlns:office:1.0}value-type")
    if vtype == "float":
        return float(cell.get("{urn:oasis:names:tc:opendocument:xmlns:office:1.0}value"))
    texts = cell.findall(".//text:p", ns)
    return " ".join(t.text or "" for t in texts).strip()

def expand_row(row):
    cells = row.findall("t:table-cell", ns)
    vals = []
    for cell in cells:
        rep = int(cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-columns-repeated", "1"))
        v = get_cell_value(cell)
        for _ in range(min(rep, 100)):
            vals.append(v)
    return vals

tables_map = {
    t.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}name"): t
    for t in tree.findall(".//t:table", ns)
}

# === 1. Category breakdown from Benefit_summary_table ===
t = tables_map["Benefit_summary_table"]
rows = t.findall("t:table-row", ns)
headers = expand_row(rows[1])
markers = expand_row(rows[2])

year_cols = {}
for i, h in enumerate(headers):
    if isinstance(h, str) and "/" in h:
        parts = h.split("/")
        if parts[0].isdigit() and int(parts[0]) >= 1999:
            year_cols[h] = i

def extract_summary_row(row_idx):
    vals = expand_row(rows[row_idx])
    data = {}
    for yr, ci in year_cols.items():
        if ci < len(vals) and isinstance(vals[ci], float):
            marker = markers[ci] if ci < len(markers) else ""
            data[yr] = {"value": round(vals[ci], 2), "forecast": marker == "Forecast"}
    return data

cats = {
    "children": extract_summary_row(13),
    "workingAge": extract_summary_row(14),
    "pensioners": extract_summary_row(15),
    "total": extract_summary_row(16),
}

by_category = []
for yr in sorted(year_cols.keys()):
    entry = {"year": yr}
    is_forecast = False
    for cat in ["children", "workingAge", "pensioners", "total"]:
        if yr in cats[cat]:
            entry[cat] = cats[cat][yr]["value"]
            if cats[cat][yr]["forecast"]:
                is_forecast = True
    entry["forecast"] = is_forecast
    if "total" in entry:
        by_category.append(entry)

# === 2. Per-benefit totals from individual sheets ===
def extract_total(sheet_name, total_row=3):
    t = tables_map[sheet_name]
    srows = t.findall("t:table-row", ns)
    sheet_headers = expand_row(srows[1])
    sheet_year_cols = {}
    for i, h in enumerate(sheet_headers):
        if isinstance(h, str) and "/" in h:
            parts = h.split("/")
            if parts[0].isdigit() and int(parts[0]) >= 1999:
                sheet_year_cols[h] = i
    vals = expand_row(srows[total_row])
    data = {}
    for yr, ci in sheet_year_cols.items():
        if ci < len(vals) and isinstance(vals[ci], (int, float)):
            data[yr] = round(vals[ci] / 1000, 2)
    return data

benefits_raw = {
    "statePension": extract_total("State_Pension", 3),
    "housing": extract_total("Housing_benefits", 3),
    "disability": extract_total("Disability_benefits", 3),
    "incapacity": extract_total("Incapacity_benefits", 3),
    "unemployment": extract_total("Unemployment_benefits", 3),
    "pensionCredit": extract_total("Pension_Credit", 3),
    "carersAllowance": extract_total("Carers_Allowance", 3),
}

by_benefit = []
for yr in sorted(year_cols.keys()):
    entry = {"year": yr}
    for key, data in benefits_raw.items():
        if yr in data:
            entry[key] = data[yr]
    if len(entry) > 1:
        by_benefit.append(entry)

latest_outturn = [e for e in by_category if not e.get("forecast")][-1]

result = {
    "byCategory": by_category,
    "byBenefit": by_benefit,
    "latestYear": latest_outturn["year"],
    "latestTotal": latest_outturn["total"],
    "latestPensioners": latest_outturn["pensioners"],
    "latestWorkingAge": latest_outturn["workingAge"],
}
print(json.dumps(result))
