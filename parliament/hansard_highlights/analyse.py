"""Step 2 of the Hansard Highlights pipeline — local, in-session analysis.

Step 2 selects the day's editorial highlights. The judgement is done by Claude
Code in-session (no API, no key) — this module handles everything around it:

  `prepare`  — turn a Step 1 transcript into a self-contained analysis brief
               plus an indexed transcript. Claude Code then reads the brief and
               writes its selections to highlights-raw-{date}.json.
  `resolve`  — join those selections back to the transcript, attaching Hansard
               IDs, timecodes, and permalinks, and emit the final highlights.

Workflow:

    python -m hansard_highlights                    # Step 1 — fetch transcript
    python -m hansard_highlights.analyse prepare     # Step 2a — build the brief
    # → open output/analysis-brief-{date}.md in Claude Code and follow it;
    #   it writes output/highlights-raw-{date}.json
    python -m hansard_highlights.analyse resolve     # Step 2b — finalise

No third-party dependencies — Python 3.9+ standard library only.
"""

from __future__ import annotations

import argparse
import copy
import datetime as _dt
import json
import re
import sys
from pathlib import Path
from typing import Optional

from .prompts import CATEGORIES, build_analysis_brief


class AnalysisError(RuntimeError):
    """Raised when a Step 2 input is missing or malformed."""


# ---------------------------------------------------------------------------
# I/O helpers
# ---------------------------------------------------------------------------

def load_json(path) -> dict:
    p = Path(path)
    if not p.exists():
        raise AnalysisError(f"File not found: {p}")
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise AnalysisError(f"{p} is not valid JSON: {exc}")


def write_json(path, data) -> Path:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return p


def _utc_now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# Indexing
# ---------------------------------------------------------------------------

def index_transcript(transcript: dict) -> dict:
    """Return a copy of the transcript with a global integer `index` on every
    contribution. Nothing is removed — the full structure is preserved."""
    indexed = copy.deepcopy(transcript)
    counter = 0
    for section in indexed.get("sections", []):
        for contribution in section.get("contributions", []):
            contribution["index"] = counter
            counter += 1
    indexed["contribution_count"] = counter
    return indexed


def _build_index_map(indexed: dict) -> dict:
    """Map each contribution `index` to its contribution + section metadata."""
    index_map: dict = {}
    for section in indexed.get("sections", []):
        section_meta = {k: v for k, v in section.items() if k != "contributions"}
        for contribution in section.get("contributions", []):
            idx = contribution.get("index")
            if idx is not None:
                index_map[idx] = {"contribution": contribution, "section": section_meta}
    return index_map


def _build_member_profiles(indexed: dict) -> dict:
    """Best-known attribution per member_id.

    Debates and Question Time attribute follow-up contributions with only a
    bare name or role ("Mrs Badenoch", "The Prime Minister"). This lets a
    highlight anchored on one of those still resolve a full speaker, party,
    and constituency from the same member's fullest attribution that day.
    """
    profiles: dict = {}
    for section in indexed.get("sections", []):
        for c in section.get("contributions", []):
            mid = c.get("member_id")
            if mid is None:
                continue
            score = (bool(c.get("constituency")) + bool(c.get("party"))
                     + bool(c.get("speaker")) + bool(c.get("role")))
            best = profiles.get(mid)
            if best is None or score > best["score"]:
                profiles[mid] = {
                    "score": score,
                    "speaker": c.get("speaker"),
                    "role": c.get("role"),
                    "party": c.get("party"),
                    "constituency": c.get("constituency"),
                    "attributed_to": c.get("attributed_to"),
                }
    return profiles


# ---------------------------------------------------------------------------
# prepare — build the analysis brief
# ---------------------------------------------------------------------------

def _resolve_transcript_path(transcript_path, date, out_dir: Path) -> Path:
    if transcript_path:
        return Path(transcript_path)
    if date:
        path = out_dir / f"transcript-{date}.json"
        if not path.exists():
            raise AnalysisError(
                f"No transcript at {path}. Run Step 1 first: "
                f"python -m hansard_highlights --date {date}")
        return path
    candidates = sorted(
        p for p in out_dir.glob("transcript-*.json") if "indexed" not in p.name)
    if not candidates:
        raise AnalysisError(
            f"No transcript-*.json found in {out_dir}/. "
            f"Run Step 1 first: python -m hansard_highlights")
    return candidates[-1]


def prepare(date: Optional[str] = None, transcript_path: Optional[str] = None,
            out_dir: str = "output", verbose: bool = True) -> Path:
    """Build the indexed transcript and the analysis brief for a sitting."""
    out = Path(out_dir)
    source = _resolve_transcript_path(transcript_path, date, out)
    transcript = load_json(source)
    date = transcript.get("date") or date
    if not date:
        raise AnalysisError("Could not determine the sitting date from the transcript.")

    indexed = index_transcript(transcript)
    indexed_path = write_json(out / f"transcript-indexed-{date}.json", indexed)
    raw_path = out / f"highlights-raw-{date}.json"

    brief = build_analysis_brief(
        date=date,
        indexed_transcript_path=str(indexed_path),
        raw_output_path=str(raw_path),
        section_count=len(indexed.get("sections", [])),
        contribution_count=indexed.get("contribution_count", 0),
        word_count=indexed.get("word_count", 0),
    )
    brief_path = out / f"analysis-brief-{date}.md"
    brief_path.write_text(brief, encoding="utf-8")

    if verbose:
        log = lambda m: print(m, file=sys.stderr)
        log(f"Indexed transcript : {indexed_path}")
        log(f"Analysis brief     : {brief_path}")
        log("")
        log("Next — perform the analysis in Claude Code:")
        log(f"  1. Open and follow {brief_path}")
        log(f"  2. It writes your selections to {raw_path}")
        log(f"  3. Finalise: python -m hansard_highlights.analyse resolve --date {date}")
    print(brief_path)
    return brief_path


# ---------------------------------------------------------------------------
# resolve — join selections back to transcript data
# ---------------------------------------------------------------------------

_QUOTE_MAP = {
    "‘": "'", "’": "'", "“": '"', "”": '"',
    "–": "-", "—": "-", "…": "...",
}


def _normalise(text: Optional[str]) -> str:
    """Lower-case, fold smart punctuation, collapse whitespace — for quote checks."""
    text = (text or "").lower()
    for fancy, plain in _QUOTE_MAP.items():
        text = text.replace(fancy, plain)
    # Drop quotation marks entirely — the verbatim check is on the words, not
    # on whether a nested quote was typed with single or double quote marks.
    for quote_char in ("'", '"'):
        text = text.replace(quote_char, "")
    return " ".join(text.split())


def _resolve_debate_entry(raw_entry: dict, index_map: dict, member_profiles: dict,
                          label: str, warnings: list):
    """Resolve one debate-map contribution to its transcript data, or None."""
    didx = raw_entry.get("contribution_index")
    entry = index_map.get(didx)
    if entry is None:
        warnings.append(f"{label}: debate_map index {didx!r} not found — dropped.")
        return None
    contribution = entry["contribution"]
    profile = member_profiles.get(contribution.get("member_id"), {})

    quote = (raw_entry.get("quote") or "").strip()
    verified = bool(quote) and _normalise(quote) in _normalise(
        contribution.get("text", ""))
    if quote and not verified:
        warnings.append(
            f"{label}: debate_map quote not verbatim in contribution {didx}.")

    return {
        "role": raw_entry.get("role") or "",
        "speaker_name": (profile.get("speaker") or contribution.get("speaker")
                         or raw_entry.get("speaker_name") or ""),
        "party": profile.get("party") or contribution.get("party") or "",
        "constituency": (profile.get("constituency")
                         or contribution.get("constituency") or ""),
        "quote": quote,
        "timecode": contribution.get("timecode"),
        "contribution_index": didx,
        "contribution_external_id": contribution.get("external_id"),
        "hansard_permalink": contribution.get("permalink"),
        "quote_verified": verified,
    }


def _resolve_highlights(raw_highlights: list, index_map: dict, member_profiles: dict):
    """Join each selected highlight to its transcript data; collect warnings."""
    resolved = []
    warnings = []
    seen_ranks = set()

    for n, hl in enumerate(raw_highlights, 1):
        rank = hl.get("rank")
        idx = hl.get("contribution_index")
        label = f"highlight #{n} (rank {rank})"

        entry = index_map.get(idx)
        if entry is None:
            warnings.append(
                f"{label}: contribution_index {idx!r} not found in transcript — skipped.")
            continue
        if rank in seen_ranks:
            warnings.append(f"{label}: duplicate rank {rank}.")
        seen_ranks.add(rank)

        contribution = entry["contribution"]
        section = entry["section"]
        profile = member_profiles.get(contribution.get("member_id"), {})

        category = hl.get("category")
        if category not in CATEGORIES:
            warnings.append(f"{label}: category {category!r} is not a valid category.")

        quote = (hl.get("key_quote") or "").strip()
        quote_verified = bool(quote) and _normalise(quote) in _normalise(
            contribution.get("text", ""))
        if quote and not quote_verified:
            warnings.append(
                f"{label}: key_quote not found verbatim in contribution {idx}.")

        # Speaker: the member's fullest attribution that day is authoritative;
        # fall back to this contribution's own attribution, then the analysis.
        speaker_name = (profile.get("speaker") or contribution.get("speaker")
                        or hl.get("speaker_name") or "")
        speaker_role = profile.get("role") or contribution.get("role")
        party = (profile.get("party") or contribution.get("party")
                 or hl.get("party") or "")
        constituency = (profile.get("constituency") or contribution.get("constituency")
                        or hl.get("constituency") or "")

        # Cross-check: does the analysis's speaker match the transcript?
        model_speaker = (hl.get("speaker_name") or "").strip()
        if model_speaker:
            known = " ".join(_normalise(x) for x in (
                contribution.get("attributed_to"), profile.get("attributed_to"),
                speaker_name) if x)
            if _normalise(model_speaker) not in known:
                warnings.append(
                    f"{label}: speaker '{model_speaker}' does not match the "
                    f"transcript attribution at index {idx}.")

        # The debate around this point.
        debate_map = []
        for raw_entry in hl.get("debate_map", []) or []:
            entry_d = _resolve_debate_entry(
                raw_entry, index_map, member_profiles, label, warnings)
            if entry_d is not None:
                debate_map.append(entry_d)

        resolved.append({
            # Editorial output (from the analysis)
            "rank": rank,
            "category": category,
            "debate": hl.get("debate") or section.get("title"),
            "summary": hl.get("summary", ""),
            "key_quote": quote,
            "analysis": hl.get("analysis", ""),
            # Speaker — transcript attribution is authoritative
            "speaker_name": speaker_name,
            "speaker_role": speaker_role,
            "party": party,
            "constituency": constituency,
            "attributed_to": contribution.get("attributed_to"),
            "member_id": contribution.get("member_id"),
            # Hansard linkage (Step 3 — done here deterministically)
            "timecode": contribution.get("timecode"),
            "contribution_index": idx,
            "contribution_external_id": contribution.get("external_id"),
            "debate_section_title": section.get("title"),
            "debate_section_external_id": section.get("external_id"),
            "hansard_url": section.get("hansard_url"),
            "hansard_permalink": contribution.get("permalink"),
            # The debate around this point
            "debate_map": debate_map,
            # Full passage, for the page and the eventual video step
            "contribution_text": contribution.get("text"),
            "quote_verified": quote_verified,
        })

    resolved.sort(key=lambda r: (
        r["rank"] is None, r["rank"] if r["rank"] is not None else 0))
    return resolved, warnings


def _render_highlight(hl: dict) -> list:
    """Render one highlight, with its debate map, as Markdown lines."""
    who = hl.get("speaker_name") or "Unknown speaker"
    attribution_bits = [b for b in (hl.get("party"), hl.get("constituency")) if b]
    attribution = f" ({', '.join(attribution_bits)})" if attribution_bits else ""
    lines = [
        f"### {hl.get('rank')}. {hl.get('category', '')} — {who}{attribution}",
        "",
        f"**Debate:** {hl.get('debate', '')}",
    ]
    if hl.get("timecode"):
        lines.append(f"**Time:** {hl['timecode']}")
    lines.append("")
    if hl.get("summary"):
        lines += [f"**Why it matters.** {hl['summary']}", ""]
    if hl.get("key_quote"):
        lines += [f"> “{hl['key_quote']}”", ""]
    if hl.get("analysis"):
        lines += [hl["analysis"], ""]
    link = hl.get("hansard_permalink") or hl.get("hansard_url")
    if link:
        flag = "" if hl.get("quote_verified", True) else "  ·  ⚠ quote not verified"
        lines += [f"[Hansard]({link}){flag}", ""]

    debate_map = hl.get("debate_map") or []
    if debate_map:
        noun = "voice" if len(debate_map) == 1 else "voices"
        lines += [f"**The debate around this — {len(debate_map)} {noun}:**", ""]
        for d in debate_map:
            who_d = d.get("speaker_name") or "Unknown speaker"
            warn = "" if d.get("quote_verified", True) else "  ⚠"
            lines.append(
                f"- *{d.get('role', '')}* — {who_d}: “{d.get('quote', '')}”{warn}")
        lines.append("")

    lines += ["---", ""]
    return lines


def render_markdown(result: dict) -> str:
    """Render the resolved highlights as a readable review sheet."""
    highlights = result["highlights"]
    lines = [
        f"# Hansard Highlights — {result['date']}",
        "",
        f"*{result['house']} · {len(highlights)} highlights · "
        f"compiled {result['generated_at']}*",
        "",
    ]
    if result.get("sitting_overview"):
        lines += [f"> {result['sitting_overview']}", ""]
    for hl in highlights:
        lines += _render_highlight(hl)

    if result.get("warnings"):
        lines += ["## Pipeline warnings", ""]
        lines += [f"- {w}" for w in result["warnings"]]
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def resolve(date: Optional[str] = None, out_dir: str = "output",
            raw_path: Optional[str] = None, indexed_path: Optional[str] = None,
            verbose: bool = True) -> dict:
    """Join the analysis selections back to the transcript and emit highlights."""
    out = Path(out_dir)

    if date is None and raw_path:
        match = re.search(r"\d{4}-\d{2}-\d{2}", Path(raw_path).name)
        date = match.group(0) if match else None
    if date is None and raw_path is None:
        candidates = sorted(out.glob("highlights-raw-*.json"))
        if not candidates:
            raise AnalysisError(
                f"No highlights-raw-*.json found in {out}/. "
                f"Run the analysis brief in Claude Code first.")
        raw_path = candidates[-1]
        match = re.search(r"\d{4}-\d{2}-\d{2}", Path(raw_path).name)
        date = match.group(0) if match else None

    raw_file = Path(raw_path) if raw_path else out / f"highlights-raw-{date}.json"
    indexed_file = Path(indexed_path) if indexed_path else out / f"transcript-indexed-{date}.json"

    raw = load_json(raw_file)
    indexed = load_json(indexed_file)
    index_map = _build_index_map(indexed)
    if not index_map:
        raise AnalysisError(f"{indexed_file} has no indexed contributions.")
    member_profiles = _build_member_profiles(indexed)

    highlights, warnings = _resolve_highlights(
        raw.get("highlights", []), index_map, member_profiles)

    redactions = []
    for r in raw.get("redactions", []) or []:
        ridx = r.get("contribution_index")
        if ridx not in index_map:
            warnings.append(
                f"redaction: contribution_index {ridx!r} not found — dropped.")
            continue
        redactions.append({"contribution_index": ridx,
                           "reason": r.get("reason", "")})

    known_sections = {s.get("section_id") for s in indexed.get("sections", [])}
    section_summaries = []
    for sec in raw.get("sections", []) or []:
        sid = sec.get("section_id")
        if sid not in known_sections:
            warnings.append(
                f"section summary: section_id {sid!r} not found — dropped.")
            continue
        section_summaries.append({"section_id": sid,
                                  "summary": sec.get("summary", "")})

    result = {
        "date": date,
        "house": indexed.get("house", "Commons"),
        "generated_at": _utc_now(),
        "analysis_engine": "Claude Code (in-session)",
        "source_transcript": str(indexed_file),
        "section_count": len(indexed.get("sections", [])),
        "contribution_count": indexed.get("contribution_count", 0),
        "sitting_overview": raw.get("sitting_overview", ""),
        "highlight_count": len(highlights),
        "highlights": highlights,
        "redactions": redactions,
        "sections": section_summaries,
        "warnings": warnings,
    }

    json_path = write_json(out / f"highlights-{date}.json", result)
    md_path = out / f"highlights-{date}.md"
    md_path.write_text(render_markdown(result), encoding="utf-8")

    if verbose:
        log = lambda m: print(m, file=sys.stderr)
        log(f"Resolved {len(highlights)} highlights for {date}.")
        for w in warnings:
            log(f"  warning: {w}")
        log(f"Wrote {json_path}")
        log(f"Wrote {md_path}")
    print(json_path)
    return result


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="hansard_highlights.analyse",
        description="Step 2 — select editorial highlights (local, in-session analysis).")
    sub = parser.add_subparsers(dest="command", required=True)

    p_prepare = sub.add_parser(
        "prepare", help="Build the analysis brief from a Step 1 transcript.")
    p_prepare.add_argument("--date", help="Sitting date YYYY-MM-DD.")
    p_prepare.add_argument("--transcript", help="Path to a Step 1 transcript JSON.")
    p_prepare.add_argument("--out-dir", default="output", help="Output directory.")

    p_resolve = sub.add_parser(
        "resolve", help="Join the selected highlights back to the transcript.")
    p_resolve.add_argument("--date", help="Sitting date YYYY-MM-DD.")
    p_resolve.add_argument("--raw", help="Path to the highlights-raw JSON.")
    p_resolve.add_argument("--indexed", help="Path to the indexed transcript JSON.")
    p_resolve.add_argument("--out-dir", default="output", help="Output directory.")

    args = parser.parse_args(argv)

    if getattr(args, "date", None) and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.date):
        parser.error("--date must be in YYYY-MM-DD format")

    try:
        if args.command == "prepare":
            prepare(date=args.date, transcript_path=args.transcript,
                    out_dir=args.out_dir)
        elif args.command == "resolve":
            resolve(date=args.date, out_dir=args.out_dir,
                    raw_path=args.raw, indexed_path=args.indexed)
    except AnalysisError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
