"""Step 1 of the Hansard Highlights pipeline.

Fetch a day's House of Commons sitting from the Hansard API
(https://hansard-api.parliament.uk) and compile it into a single transcript.

The API is queried in three stages:

  1. /overview/lastsittingdate.json    -> the most recent sitting date
  2. /overview/sectiontrees.json       -> the day's debate structure (ExternalIds)
  3. /debates/debate/{ExternalId}.json -> the contributions within each section

The day's sections are enumerated from the section tree; each section's debate
is fetched and its direct ``Contribution`` items are collected. Container
sections (e.g. "Oral Answers to Questions") only carry short procedural
headers of their own, so taking direct items from every node yields a complete
transcript with no duplication.

Run directly to fetch the most recent sitting:

    python -m hansard_highlights
    python -m hansard_highlights --date 2026-05-20 --out-dir output

Outputs (written to ``--out-dir``):

    transcript-{date}.json   structured data for downstream pipeline steps
    transcript-{date}.txt    single plain-text transcript for analysis
"""

from __future__ import annotations

import argparse
import dataclasses
import datetime as _dt
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

API_BASE = "https://hansard-api.parliament.uk"
WEB_BASE = "https://hansard.parliament.uk"
USER_AGENT = "HansardHighlights/0.1 (daily parliamentary highlights tool)"


class HansardAPIError(RuntimeError):
    """Raised when the Hansard API cannot be reached or returns no usable data."""


# ---------------------------------------------------------------------------
# Text cleaning
# ---------------------------------------------------------------------------

# Hansard contribution values are XML-ish. A few elements carry layout
# artefacts (page-column markers, images) whose *text content* must be dropped
# entirely rather than flattened into the transcript.
_DROP_ELEMENTS = re.compile(
    r"<(col|image|imageref|imagestream)\b[^>]*>.*?</\1>",
    re.IGNORECASE | re.DOTALL,
)
_DROP_EMPTY = re.compile(r"<(col|image|imageref|br)\b[^>]*/?>", re.IGNORECASE)
_ANY_TAG = re.compile(r"<[^>]+>")


def strip_html(value: Optional[str]) -> str:
    """Convert a raw Hansard contribution ``Value`` into clean plain text.

    Tags are removed, HTML entities decoded, and whitespace normalised while
    preserving paragraph breaks (a blank line between paragraphs).
    """
    if not value:
        return ""
    text = _DROP_ELEMENTS.sub(" ", value)
    text = _DROP_EMPTY.sub(" ", text)
    text = _ANY_TAG.sub("", text)
    text = html.unescape(text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Speaker attribution
# ---------------------------------------------------------------------------

# Party abbreviations as they appear in Hansard's AttributedTo strings.
_PARTY_TOKENS = {
    "lab", "con", "ld", "libdem", "snp", "dup", "sf", "pc", "green", "ruk",
    "reform", "uup", "sdlp", "alliance", "apni", "ind", "co-op", "ukip",
}

# Substrings that mark an office-holder rather than a personal name.
_ROLE_HINTS = (
    "minister", "secretary of state", "prime minister", "speaker",
    "attorney general", "solicitor general", "lord chancellor",
    "leader of the house", "chancellor of the", "chairman of ways",
    "advocate general", "paymaster general",
)


def _looks_like_party(token: str) -> bool:
    token = token.strip().lower()
    if not token:
        return False
    return all(part.strip() in _PARTY_TOKENS for part in token.split("/"))


def _looks_like_role(text: str) -> bool:
    if not text:
        return False
    low = text.lower()
    return low.startswith("the ") or any(hint in low for hint in _ROLE_HINTS)


def parse_attributed_to(attributed_to: Optional[str]):
    """Best-effort split of an ``AttributedTo`` string.

    Returns ``(speaker, role, constituency, party)``; any field may be None.
    The original string is always retained on the Contribution as well.

    Handled forms::

        "Name (Constituency) (Party)"   -> backbencher
        "Role (Name)"                   -> minister / office-holder
        "Name"  /  "Role"               -> continuation lines, procedural
    """
    if not attributed_to or not attributed_to.strip():
        return (None, None, None, None)
    s = attributed_to.strip()
    groups = re.findall(r"\(([^()]*)\)", s)
    head = s.split("(", 1)[0].strip() or None
    if len(groups) >= 2:
        # Name (Constituency) (Party)
        return (head, None, groups[-2].strip() or None, groups[-1].strip() or None)
    if len(groups) == 1:
        inner = groups[0].strip()
        if _looks_like_party(inner):
            return (head, None, None, inner or None)
        # Role (Name)
        return (inner or None, head, None, None)
    # No parentheses: a bare name or a bare role.
    if _looks_like_role(head or ""):
        return (None, head, None, None)
    return (head, None, None, None)


def slugify(title: str) -> str:
    """Make a URL slug from a section title (for Hansard website links)."""
    slug = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")
    return slug or "debate"


def _format_timecode(timecode: Optional[str]) -> str:
    """Render an ISO timecode as HH:MM, or "" if absent/unparseable."""
    if not timecode:
        return ""
    try:
        return _dt.datetime.fromisoformat(timecode).strftime("%H:%M")
    except ValueError:
        return ""


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class Contribution:
    """A single spoken contribution within a debate section."""

    external_id: str
    item_id: Optional[int]
    order_in_section: int
    item_type: str
    attributed_to: Optional[str]
    speaker: Optional[str]
    role: Optional[str]
    constituency: Optional[str]
    party: Optional[str]
    member_id: Optional[int]
    timecode: Optional[str]
    text: str
    html: str

    @classmethod
    def from_api(cls, raw: dict) -> "Contribution":
        attributed = raw.get("AttributedTo")
        speaker, role, constituency, party = parse_attributed_to(attributed)
        return cls(
            external_id=raw.get("ExternalId") or "",
            item_id=raw.get("ItemId"),
            order_in_section=raw.get("OrderInSection") or 0,
            item_type=raw.get("ItemType") or "",
            attributed_to=attributed,
            speaker=speaker,
            role=role,
            constituency=constituency,
            party=party,
            member_id=raw.get("MemberId"),
            timecode=raw.get("Timecode"),
            text=strip_html(raw.get("Value")),
            html=raw.get("Value") or "",
        )

    @property
    def word_count(self) -> int:
        return len(self.text.split())

    @property
    def speaker_label(self) -> str:
        return self.attributed_to or "[Procedural]"

    def to_dict(self) -> dict:
        data = dataclasses.asdict(self)
        data["word_count"] = self.word_count
        return data


@dataclass
class DebateSection:
    """A debate section (one node of the day's section tree) and its contributions."""

    external_id: str
    title: str
    section_id: Optional[int]
    parent_id: Optional[int]
    sort_order: int
    date: str
    house: str
    contributions: List[Contribution] = field(default_factory=list)

    @property
    def word_count(self) -> int:
        return sum(c.word_count for c in self.contributions)

    @property
    def hansard_url(self) -> str:
        """Link to this debate on the public Hansard website."""
        return (f"{WEB_BASE}/{self.house}/{self.date}/debates/"
                f"{self.external_id}/{slugify(self.title)}")

    def to_dict(self) -> dict:
        base = self.hansard_url
        contributions = []
        for c in self.contributions:
            cd = c.to_dict()
            cd["permalink"] = (f"{base}#contribution-{c.external_id}"
                               if c.external_id else base)
            contributions.append(cd)
        return {
            "external_id": self.external_id,
            "title": self.title,
            "section_id": self.section_id,
            "parent_id": self.parent_id,
            "sort_order": self.sort_order,
            "hansard_url": base,
            "word_count": self.word_count,
            "contribution_count": len(self.contributions),
            "contributions": contributions,
        }


@dataclass
class Transcript:
    """A full day's compiled transcript for one House."""

    date: str
    house: str
    generated_at: str
    sections: List[DebateSection] = field(default_factory=list)
    source: str = API_BASE

    @property
    def contribution_count(self) -> int:
        return sum(len(s.contributions) for s in self.sections)

    @property
    def word_count(self) -> int:
        return sum(s.word_count for s in self.sections)

    def to_dict(self) -> dict:
        return {
            "date": self.date,
            "house": self.house,
            "generated_at": self.generated_at,
            "source": self.source,
            "section_count": len(self.sections),
            "contribution_count": self.contribution_count,
            "word_count": self.word_count,
            "sections": [s.to_dict() for s in self.sections],
        }

    def to_plain_text(self) -> str:
        """Render the whole sitting as a single readable transcript."""
        rule = "=" * 80
        thin = "-" * 80
        lines = [
            rule,
            "UK PARLIAMENT  —  HOUSE OF COMMONS",
            "Daily Hansard transcript",
            rule,
            f"Sitting date  : {self.date}",
            f"Compiled (UTC): {self.generated_at}",
            f"Sections      : {len(self.sections)}",
            f"Contributions : {self.contribution_count}",
            f"Words         : {self.word_count:,}",
            f"Source        : {self.source}",
            rule,
        ]
        for i, section in enumerate(self.sections, 1):
            lines += [
                "",
                "",
                f"### SECTION {i} — {section.title}",
                f"Hansard: {section.hansard_url}",
                thin,
            ]
            for c in section.contributions:
                stamp = _format_timecode(c.timecode)
                header = f"{c.speaker_label}  [{stamp}]:" if stamp else f"{c.speaker_label}:"
                lines += ["", header, c.text or "(no text)"]
        return "\n".join(lines).rstrip() + "\n"

    def save_json(self, path) -> Path:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(self.to_dict(), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        return path

    def save_text(self, path) -> Path:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(self.to_plain_text(), encoding="utf-8")
        return path


# ---------------------------------------------------------------------------
# API client
# ---------------------------------------------------------------------------

class HansardClient:
    """Minimal client for the Hansard API (stdlib only, with retry/backoff)."""

    def __init__(self, base_url: str = API_BASE, delay: float = 0.25,
                 timeout: float = 30.0, retries: int = 3, backoff: float = 1.6):
        self.base_url = base_url.rstrip("/")
        self.delay = delay          # polite pause between debate fetches
        self.timeout = timeout
        self.retries = retries
        self.backoff = backoff

    def _get(self, path: str, params: Optional[dict] = None):
        url = f"{self.base_url}/{path.lstrip('/')}"
        if params:
            url = f"{url}?{urllib.parse.urlencode(params)}"
        last_err: Optional[Exception] = None
        for attempt in range(1, self.retries + 1):
            try:
                req = urllib.request.Request(
                    url, headers={"User-Agent": USER_AGENT,
                                  "Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except (urllib.error.URLError, TimeoutError, ValueError) as exc:
                # URLError covers HTTPError; ValueError covers JSONDecodeError.
                last_err = exc
                if attempt < self.retries:
                    time.sleep(self.backoff ** attempt)
        raise HansardAPIError(
            f"GET {url} failed after {self.retries} attempts: {last_err}")

    def last_sitting_date(self, house: str = "Commons") -> str:
        """Return the most recent sitting date as 'YYYY-MM-DD'."""
        return self._get("overview/lastsittingdate.json", {"house": house})

    def section_tree(self, date: str, house: str = "Commons",
                     section: str = "Debate") -> list:
        """Return the day's debate structure (list of top-level section trees)."""
        return self._get("overview/sectiontrees.json",
                          {"section": section, "date": date, "house": house})

    def debate(self, external_id: str) -> dict:
        """Return the full debate for a section ExternalId."""
        return self._get(f"debates/debate/{external_id}.json")


# ---------------------------------------------------------------------------
# Pipeline entry point
# ---------------------------------------------------------------------------

def _log(verbose: bool, message: str) -> None:
    if verbose:
        print(message, file=sys.stderr)


def fetch_transcript(date: Optional[str] = None, house: str = "Commons",
                     client: Optional[HansardClient] = None,
                     verbose: bool = True) -> Transcript:
    """Fetch and compile a full day's transcript.

    Args:
        date:    Sitting date 'YYYY-MM-DD'. Defaults to the most recent sitting.
        house:   Chamber to fetch (default 'Commons').
        client:  Optional pre-configured HansardClient.
        verbose: Print progress to stderr.

    Returns:
        A populated :class:`Transcript`.
    """
    client = client or HansardClient()

    if date is None:
        date = client.last_sitting_date(house)
        _log(verbose, f"Most recent {house} sitting: {date}")
    else:
        date = str(date)

    trees = client.section_tree(date, house)
    section_items = []
    for tree in trees or []:
        section_items.extend(tree.get("SectionTreeItems", []) or [])

    if not section_items:
        raise HansardAPIError(
            f"No debate sections returned for {house} on {date} "
            f"(not a sitting day, or Hansard has not published it yet).")

    _log(verbose, f"Found {len(section_items)} debate sections; fetching…")

    sections: List[DebateSection] = []
    for n, item in enumerate(section_items, 1):
        external_id = item.get("ExternalId")
        title = (item.get("Title") or "Untitled").strip()
        if not external_id:
            continue

        debate = client.debate(external_id)
        contributions = [
            c for c in (
                Contribution.from_api(raw)
                for raw in (debate.get("Items") or [])
                if raw.get("ItemType") == "Contribution"
            )
            if c.text
        ]
        contributions.sort(key=lambda c: c.order_in_section)

        _log(verbose, f"  [{n:>2}/{len(section_items)}] "
                      f"{title[:52]:<52} {len(contributions):>4} contributions")

        if contributions:
            sections.append(DebateSection(
                external_id=external_id,
                title=title,
                section_id=item.get("Id"),
                parent_id=item.get("ParentId"),
                sort_order=item.get("SortOrder") or n,
                date=date,
                house=house,
                contributions=contributions,
            ))

        if client.delay:
            time.sleep(client.delay)

    transcript = Transcript(
        date=date,
        house=house,
        generated_at=_dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        sections=sections,
    )
    _log(verbose, f"Compiled {transcript.contribution_count} contributions across "
                  f"{len(sections)} sections ({transcript.word_count:,} words).")
    return transcript


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        prog="hansard_highlights.fetch",
        description="Fetch a day's House of Commons sitting and compile a transcript.")
    parser.add_argument("--date", help="Sitting date YYYY-MM-DD (default: most recent).")
    parser.add_argument("--house", default="Commons", help="House (default: Commons).")
    parser.add_argument("--out-dir", default="output",
                        help="Directory for output files (default: output).")
    parser.add_argument("--delay", type=float, default=0.25,
                        help="Seconds to pause between API calls (default: 0.25).")
    parser.add_argument("--quiet", action="store_true", help="Suppress progress output.")
    args = parser.parse_args(argv)

    if args.date and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.date):
        parser.error("--date must be in YYYY-MM-DD format")

    verbose = not args.quiet
    client = HansardClient(delay=args.delay)
    try:
        transcript = fetch_transcript(date=args.date, house=args.house,
                                      client=client, verbose=verbose)
    except HansardAPIError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    out_dir = Path(args.out_dir)
    json_path = transcript.save_json(out_dir / f"transcript-{transcript.date}.json")
    text_path = transcript.save_text(out_dir / f"transcript-{transcript.date}.txt")
    _log(verbose, f"Wrote {json_path}")
    _log(verbose, f"Wrote {text_path}")
    print(text_path)  # stdout: transcript path, for downstream tooling
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
