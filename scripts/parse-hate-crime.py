"""
parse-hate-crime.py

Parses Home Office hate crime data tables ODS file.
Extracts:
  - Sheet "2", Table 2a: Hate crimes by strand (excl. Met Police), 2011/12-2024/25
  - Sheet "5", Table 5a: Religious hate crimes by perceived religion

Usage:
  python3 scripts/parse-hate-crime.py <path-to-ods>

Outputs JSON to stdout.
"""

import sys
import json
import re
import zipfile
import xml.etree.ElementTree as ET

NS = {
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
    "table":  "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text":   "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
}


def read_ods_sheets(path):
    with zipfile.ZipFile(path) as z:
        content = z.read("content.xml")
    root = ET.fromstring(content)
    body = root.find(".//office:body/office:spreadsheet", NS)
    sheets = {}
    for tbl in body.findall("table:table", NS):
        name = tbl.get(f"{{{NS['table']}}}name")
        rows = []
        for tr in tbl.findall("table:table-row", NS):
            row = []
            for tc in tr.findall("table:table-cell", NS):
                repeat = int(tc.get(f"{{{NS['table']}}}number-columns-repeated", "1"))
                text_parts = []
                for p in tc.findall(".//text:p", NS):
                    if p.text:
                        text_parts.append(p.text)
                    for child in p:
                        if child.tail:
                            text_parts.append(child.tail)
                cell_text = " ".join(text_parts).strip() if text_parts else ""
                for _ in range(min(repeat, 50)):
                    row.append(cell_text)
            rows.append(row)
        sheets[name] = rows
    return sheets


def parse_number(s):
    if not s:
        return None
    s = re.sub(r'\[.*?\]', '', s).strip()
    s = s.replace(',', '').replace(' ', '')
    if not s:
        return None
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return None


def parse_strand_series(sheets):
    """Parse sheet '2', rows 6-13: strand time series excl. Met Police."""
    sheet = sheets.get("2", [])
    if not sheet:
        print("Sheet '2' not found", file=sys.stderr)
        return []

    # Row 6 is header: ['Hate crime strand', '2011/12', '2012/13', ...]
    # Rows 7-11 are strands, row 12 is total motivating factors, row 13 is total offences
    header = sheet[6] if len(sheet) > 6 else []
    year_pattern = re.compile(r'20\d{2}/\d{2}')

    years = []
    year_cols = []
    for j, cell in enumerate(header):
        cell_str = str(cell).strip()
        # Only match cells that ARE a year (possibly with notes), not "% change 2023/24 to ..."
        m = re.match(r'^(20\d{2}/\d{2})', cell_str)
        if m:
            years.append(m.group(1))
            year_cols.append(j)

    strand_rows = {
        7: "race",
        8: "religion",
        9: "sexualOrientation",
        10: "disability",
        11: "transgender",
    }

    result = []
    for idx, year in enumerate(years):
        col = year_cols[idx]
        entry = {"year": year}
        for row_idx, key in strand_rows.items():
            if row_idx < len(sheet) and col < len(sheet[row_idx]):
                entry[key] = parse_number(sheet[row_idx][col])
            else:
                entry[key] = None

        # Total offences from row 13
        if 13 < len(sheet) and col < len(sheet[13]):
            entry["totalOffences"] = parse_number(sheet[13][col])
        else:
            entry["totalOffences"] = None

        result.append(entry)

    return result


def parse_religion_breakdown(sheets):
    """Parse sheet '5', rows 7-16: religion breakdown with 4 years of data."""
    sheet = sheets.get("5", [])
    if not sheet:
        print("Sheet '5' not found", file=sys.stderr)
        return []

    # Row 7 is header: ['Perceived religion', '2021/22', '2022/23', '2023/24', '2024/25', ...]
    # Rows 8-16 are religions
    header = sheet[7] if len(sheet) > 7 else []
    year_pattern = re.compile(r'20\d{2}/\d{2}')

    years = []
    year_cols = []
    for j, cell in enumerate(header):
        cell_str = str(cell).strip()
        m = re.match(r'^(20\d{2}/\d{2})', cell_str)
        if m:
            years.append(m.group(1))
            year_cols.append(j)

    religions = []
    for row_idx in range(8, min(17, len(sheet))):
        row = sheet[row_idx]
        label = str(row[0]).strip() if row else ""
        if not label or label.lower().startswith("total") or label.lower().startswith("number"):
            continue

        entry = {"religion": label}
        for idx, year in enumerate(years):
            col = year_cols[idx]
            if col < len(row):
                entry[year] = parse_number(row[col])
        religions.append(entry)

    return religions


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 parse-hate-crime.py <ods-file>", file=sys.stderr)
        sys.exit(1)

    sheets = read_ods_sheets(sys.argv[1])
    print(f"Found {len(sheets)} sheets", file=sys.stderr)

    by_strand = parse_strand_series(sheets)
    print(f"Strand series: {len(by_strand)} years", file=sys.stderr)
    if by_strand:
        print(f"  Latest: {by_strand[-1]}", file=sys.stderr)

    by_religion = parse_religion_breakdown(sheets)
    print(f"Religion breakdown: {len(by_religion)} entries", file=sys.stderr)

    json.dump({"byStrand": by_strand, "byReligion": by_religion}, sys.stdout, indent=2)


if __name__ == "__main__":
    main()
