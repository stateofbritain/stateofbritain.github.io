"""Locate the parliamentlive.tv event for a day's House of Commons sitting.

`build_page` and `captions` need the parliamentlive.tv event GUID for the
Commons chamber. This finds it automatically, rather than having it passed by
hand: it reads the parliamentlive.tv /Commons listing, takes every event whose
card name is exactly "House of Commons" — which excludes the BSL version,
Westminster Hall, committees and ballots — and confirms the date against each
candidate's MeetingStartTime.

No third-party dependencies — Python 3.9+ standard library only.

    python -m hansard_highlights.events --date 2026-05-20
"""

from __future__ import annotations

import argparse
import html as _html
import re
import sys
import urllib.error
import urllib.request
from typing import List, Optional

COMMONS_URL = "https://parliamentlive.tv/Commons"
EVENT_URL = "https://parliamentlive.tv/Event/Index/{guid}"
CHAMBER_NAME = "House of Commons"
USER_AGENT = "HansardHighlights/0.1 (daily parliamentary highlights tool)"

_CARD = re.compile(r'Event/Index/([a-f0-9-]{36})"[^>]*>(.*?)</a>', re.S)
_NAME = re.compile(r"<p[^>]*>(.*?)</p>", re.S)
_START = re.compile(r'MeetingStartTime[^>]*value="([^"]*)"')


class EventLookupError(RuntimeError):
    """Raised when the parliamentlive.tv listing cannot be reached."""


def _get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", "replace")
    except (urllib.error.URLError, TimeoutError) as exc:
        raise EventLookupError(f"could not reach {url} — {exc}")


def _chamber_candidates() -> List[str]:
    """Unique event GUIDs from /Commons whose card name is exactly the chamber.

    The card name distinguishes the chamber ("House of Commons") from the BSL
    feed ("BSL - House of Commons"), Westminster Hall and committees — so this
    is the safe filter the carousel-scrape got wrong before.
    """
    page = _get(COMMONS_URL)
    guids: List[str] = []
    for match in _CARD.finditer(page):
        guid, block = match.group(1), match.group(2)
        name_match = _NAME.search(block)
        if not name_match:
            continue
        name = _html.unescape(re.sub(r"<[^>]+>", "", name_match.group(1))).strip()
        if name == CHAMBER_NAME and guid not in guids:
            guids.append(guid)
    return guids


def _event_date(guid: str) -> Optional[str]:
    """The YYYY-MM-DD date of an event, from its MeetingStartTime."""
    match = _START.search(_get(EVENT_URL.format(guid=guid)))
    if not match or "T" not in match.group(1):
        return None
    return match.group(1)[:10]


def find_commons_event(date: str) -> Optional[str]:
    """Return the parliamentlive.tv event GUID for the Commons chamber on `date`.

    `date` is YYYY-MM-DD. Returns None when no matching sitting is in the
    /Commons listing — e.g. the date is too old to still be carried there.
    """
    for guid in _chamber_candidates():
        if _event_date(guid) == date:
            return guid
    return None


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="hansard_highlights.events",
        description="Find the parliamentlive.tv event GUID for a Commons sitting.")
    parser.add_argument("--date", required=True, help="Sitting date YYYY-MM-DD.")
    args = parser.parse_args(argv)
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.date):
        parser.error("--date must be in YYYY-MM-DD format")

    try:
        guid = find_commons_event(args.date)
    except EventLookupError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    if not guid:
        print(f"error: no House of Commons sitting for {args.date} in the "
              f"parliamentlive.tv listing", file=sys.stderr)
        return 1
    print(guid)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
