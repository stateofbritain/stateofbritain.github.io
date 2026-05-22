"""Caption-matching — pin each highlight to the exact moment it was spoken.

Hansard gives one coarse `Timecode` per contribution; for a long speech that
isn't precise enough to land on the quoted line. This module fetches the
parliamentlive.tv caption track for a sitting and fuzzy-matches each highlight's
`key_quote` against it, writing a precise `caption_timecode` back onto every
highlight in highlights-{date}.json. `build_page` then deep-links to that.

The caption track comes from Red Bee's Exposure API (parliamentlive.tv's video
platform): anonymous session -> play request -> HLS manifest -> the English
subtitle track, downloaded whole as one WebVTT file.

No third-party dependencies — Python 3.9+ standard library only.

    python -m hansard_highlights.captions --date 2026-05-20 \\
        --event-id f42af7a5-25bc-4f7b-8eb2-b141c5d2bdea
"""

from __future__ import annotations

import argparse
import datetime as _dt
import difflib
import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo

from .events import EventLookupError, find_commons_event

REDBEE_BASE = ("https://exposure.api.redbee.live/v2/customer/UKParliament"
               "/businessunit/ParliamentLive")
ASSET_SUFFIX = "_0D62A9b"          # Red Bee asset id = {eventGUID}{ASSET_SUFFIX}
LONDON = ZoneInfo("Europe/London")
USER_AGENT = "HansardHighlights/0.1 (daily parliamentary highlights tool)"

MATCH_THRESHOLD = 0.50  # minimum token-similarity to accept a caption match
LEAD_IN = 3             # seconds to start before the matched word, as a margin


class CaptionError(RuntimeError):
    """Raised when the caption track cannot be fetched or matched."""


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------

def _request(url: str, *, data: Optional[bytes] = None,
             headers: Optional[dict] = None, timeout: float = 60.0) -> bytes:
    hdrs = {"User-Agent": USER_AGENT, "Accept": "*/*"}
    if data is not None:
        hdrs["Content-Type"] = "application/json"
    hdrs.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=hdrs)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except (urllib.error.URLError, TimeoutError) as exc:
        raise CaptionError(f"request failed: {url} — {exc}")


def _get_text(url: str, timeout: float = 60.0) -> str:
    return _request(url, timeout=timeout).decode("utf-8", "replace")


def _get_json(url: str, headers: Optional[dict] = None) -> dict:
    return json.loads(_request(url, headers=headers).decode("utf-8"))


def _post_json(url: str, body: dict) -> dict:
    return json.loads(_request(url, data=json.dumps(body).encode("utf-8")).decode("utf-8"))


# ---------------------------------------------------------------------------
# Fetching the caption track (Red Bee Exposure API)
# ---------------------------------------------------------------------------

def _redbee_session() -> str:
    device = "hh-" + os.urandom(6).hex()
    payload = {"deviceId": device,
               "device": {"deviceId": device, "name": "hansard-highlights",
                          "type": "WEB"}}
    data = _post_json(f"{REDBEE_BASE}/auth/anonymous", payload)
    token = data.get("sessionToken")
    if not token:
        raise CaptionError(f"Red Bee anonymous auth returned no sessionToken: {data}")
    return token


def hls_master_url(event_id: str) -> str:
    """Return the HLS master manifest URL for a parliamentlive.tv event."""
    asset_id = event_id + ASSET_SUFFIX
    token = _redbee_session()
    play = _get_json(f"{REDBEE_BASE}/entitlement/{urllib.parse.quote(asset_id)}/play",
                     headers={"Authorization": f"Bearer {token}"})
    formats = play.get("formats") or []
    hls = next((f for f in formats if (f.get("format") or "").upper() == "HLS"),
               formats[0] if formats else None)
    if not hls or not hls.get("mediaLocator"):
        raise CaptionError(f"no HLS stream in play response (asset {asset_id})")
    return hls["mediaLocator"]


def fetch_caption_track(event_id: str):
    """Return (vtt_text, video_start_iso_utc) for a parliamentlive.tv event."""
    master_url = hls_master_url(event_id)
    master = _get_text(master_url)
    sub = re.search(r'#EXT-X-MEDIA:TYPE=SUBTITLES[^\n]*?URI="([^"]+)"', master)
    if not sub:
        raise CaptionError("no subtitle track listed in the HLS manifest")

    sub_playlist_url = urllib.parse.urljoin(master_url, sub.group(1))
    sub_playlist = _get_text(sub_playlist_url)
    pdt = re.search(r"#EXT-X-PROGRAM-DATE-TIME:([0-9T:.+\-Z]+)", sub_playlist)
    if not pdt:
        raise CaptionError("no PROGRAM-DATE-TIME in the subtitle playlist")
    video_start = pdt.group(1)

    # The whole track as a single WebVTT: same URL with .m3u8 -> .webvtt.
    vtt_url = re.sub(r"\.m3u8(\?|$)", r".webvtt\1", sub_playlist_url)
    vtt = _get_text(vtt_url)
    if "-->" not in vtt:
        raise CaptionError(f"caption download did not return WebVTT cues: {vtt_url}")
    return vtt, video_start


# ---------------------------------------------------------------------------
# Parsing and tokenising
# ---------------------------------------------------------------------------

_CUE = re.compile(
    r"(\d\d):(\d\d):(\d\d)[.,](\d\d\d)\s*-->[^\n]*\n(.*?)(?=\n\n|\Z)", re.S)
_WORD = re.compile(r"[^a-z0-9]+")


def parse_vtt(text: str):
    """Parse WebVTT into a list of (offset_seconds, cleaned_text) cues."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    cues = []
    for m in _CUE.finditer(text):
        h, mm, s, ms = (int(m.group(i)) for i in range(1, 5))
        offset = h * 3600 + mm * 60 + s + ms / 1000.0
        body = re.sub(r"<[^>]+>", "", m.group(5))
        body = " ".join(html.unescape(body).split())
        if body:
            cues.append((offset, body))
    return cues


def _tokens(text: str):
    """Lower-case alphanumeric word tokens — folds punctuation and hyphens."""
    return [t for t in _WORD.split((text or "").lower()) if t]


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------

def _to_offset(timecode: str, video_start_utc: str) -> float:
    """Convert a naive-London Hansard timecode to seconds from video start."""
    start = _dt.datetime.fromisoformat(video_start_utc.replace("Z", "+00:00"))
    start_local = start.astimezone(LONDON).replace(tzinfo=None)
    return (_dt.datetime.fromisoformat(timecode) - start_local).total_seconds()


def _to_timecode(offset: float, video_start_utc: str) -> str:
    """Convert seconds-from-video-start to a naive-London ISO timecode."""
    start = _dt.datetime.fromisoformat(video_start_utc.replace("Z", "+00:00"))
    moment = (start + _dt.timedelta(seconds=offset)).astimezone(LONDON)
    return moment.strftime("%Y-%m-%dT%H:%M:%S")


def _best_match(quote_tokens, ctokens, ctimes, token_index, seed_offset=None):
    """Find where `quote_tokens` best aligns in the caption token stream.

    Returns (score, start_index, first_word_offset) or None. Candidate windows
    are anchored on the quote's rarer words; when a Hansard seed is given,
    candidates far from it are discarded.
    """
    n = len(quote_tokens)
    if n < 4:
        return None

    # Anchor on distinctive (longer, rarer) words from the quote.
    anchors = sorted({t for t in quote_tokens if len(t) >= 6},
                     key=lambda t: len(token_index.get(t, [])))
    starts = set()
    for token in anchors[:8]:
        positions = token_index.get(token, [])
        if not positions or len(positions) > 400:
            continue
        qi = quote_tokens.index(token)
        for ci in positions:
            starts.add(max(0, ci - qi))
    if not starts and seed_offset is not None:
        # No usable anchor — scan a window around the Hansard seed instead.
        lo = next((i for i, t in enumerate(ctimes) if t >= seed_offset - 900), 0)
        hi = next((i for i, t in enumerate(ctimes) if t >= seed_offset + 900),
                  len(ctimes))
        starts = set(range(lo, hi))
    if not starts:
        return None

    matcher = difflib.SequenceMatcher(autojunk=False)
    matcher.set_seq2(quote_tokens)
    window = n + n // 4 + 4
    best = None
    for start in starts:
        if start >= len(ctokens) - 2:
            continue
        if seed_offset is not None and abs(ctimes[start] - seed_offset) > 1200:
            continue
        matcher.set_seq1(ctokens[start:start + window])
        score = matcher.ratio()
        if best is None or score > best[0]:
            blocks = matcher.get_matching_blocks()
            first = next((b for b in blocks if b.size >= 2), blocks[0])
            idx = min(start + first.a, len(ctimes) - 1)
            best = (score, start, ctimes[idx])
    return best


# ---------------------------------------------------------------------------
# Enrichment
# ---------------------------------------------------------------------------

def enrich(date: Optional[str] = None, event_id: Optional[str] = None,
           out_dir: str = "output", refresh: bool = False,
           verbose: bool = True) -> Path:
    """Match every highlight's key_quote to the captions; write timecodes back."""
    out = Path(out_dir)

    if date:
        highlights_path = out / f"highlights-{date}.json"
    else:
        found = sorted(p for p in out.glob("highlights-*.json") if "raw" not in p.name)
        if not found:
            raise CaptionError(f"no highlights-*.json in {out}/ — run Step 2 first")
        highlights_path = found[-1]
    if not highlights_path.exists():
        raise CaptionError(f"file not found: {highlights_path}")
    result = json.loads(highlights_path.read_text(encoding="utf-8"))
    date = result.get("date") or date

    if not event_id:
        _log(verbose, "Locating the parliamentlive.tv event…")
        try:
            event_id = find_commons_event(date)
        except EventLookupError as exc:
            raise CaptionError(str(exc))
        if not event_id:
            raise CaptionError(
                f"could not locate the Commons event for {date} — "
                f"pass --event-id explicitly")
        _log(verbose, f"Located event {event_id}")

    # Caption track — cached per day so re-runs do not re-download.
    cache = out / f"captions-{date}.vtt"
    start_cache = out / f"captions-{date}.start"
    if cache.exists() and start_cache.exists() and not refresh:
        vtt = cache.read_text(encoding="utf-8")
        video_start = start_cache.read_text(encoding="utf-8").strip()
        _log(verbose, f"Using cached caption track ({cache}).")
    else:
        _log(verbose, "Fetching caption track from parliamentlive.tv…")
        try:
            vtt, video_start = fetch_caption_track(event_id)
        except CaptionError as exc:
            if "no subtitle track" not in str(exc):
                raise
            _log(verbose, "No official caption track yet — transcribing the "
                          "sitting locally with whisper.cpp instead.")
            from .transcribe import local_caption_track
            vtt, video_start = local_caption_track(
                event_id, date, out_dir, verbose)
        cache.write_text(vtt, encoding="utf-8")
        start_cache.write_text(video_start, encoding="utf-8")

    cues = parse_vtt(vtt)
    if not cues:
        raise CaptionError("caption track parsed to zero cues")
    ctokens, ctimes = [], []
    for offset, body in cues:
        for token in _tokens(body):
            ctokens.append(token)
            ctimes.append(offset)
    token_index: dict = {}
    for i, token in enumerate(ctokens):
        token_index.setdefault(token, []).append(i)
    _log(verbose, f"Caption track: {len(cues)} cues, {len(ctokens)} words "
                  f"(video starts {video_start}).")

    matched = 0
    for hl in result.get("highlights", []):
        quote_tokens = _tokens(hl.get("key_quote"))
        seed = hl.get("timecode")
        seed_offset = _to_offset(seed, video_start) if seed else None
        best = _best_match(quote_tokens, ctokens, ctimes, token_index, seed_offset)

        hl["caption_match_score"] = round(best[0], 3) if best else None
        if best and best[0] >= MATCH_THRESHOLD:
            score, start, offset = best
            hl["caption_timecode"] = _to_timecode(max(0.0, offset - LEAD_IN),
                                                  video_start)
            hl["caption_cue_text"] = " ".join(
                ctokens[start:start + len(quote_tokens)])
            matched += 1
        else:
            hl["caption_timecode"] = None
            hl["caption_cue_text"] = None

        # Caption-match the debate-map voices too, so each gets a Watch button.
        for d in hl.get("debate_map", []) or []:
            d_tokens = _tokens(d.get("quote"))
            d_seed = (_to_offset(d["timecode"], video_start)
                      if d.get("timecode") else None)
            d_best = _best_match(d_tokens, ctokens, ctimes, token_index, d_seed)
            if d_best and d_best[0] >= MATCH_THRESHOLD:
                d["caption_timecode"] = _to_timecode(
                    max(0.0, d_best[2] - LEAD_IN), video_start)
            else:
                d["caption_timecode"] = None
            d["caption_match_score"] = round(d_best[0], 3) if d_best else None

        if verbose:
            tier = (hl.get("tier") or "?")[:4]
            score = hl["caption_match_score"]
            if hl["caption_timecode"]:
                clock = hl["caption_timecode"].split("T")[-1]
                print(f"  [{tier}] rank {hl.get('rank'):>2}  {clock}  "
                      f"score {score}  {hl.get('speaker_name')}", file=sys.stderr)
            else:
                print(f"  [{tier}] rank {hl.get('rank'):>2}  — no confident "
                      f"match (best {score})  {hl.get('speaker_name')}",
                      file=sys.stderr)

    result["caption_matched_count"] = matched
    result["event_id"] = event_id
    highlights_path.write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    _log(verbose, f"Matched {matched}/{len(result.get('highlights', []))} "
                  f"highlights to the caption track.")
    _log(verbose, f"Updated {highlights_path}")

    # Enrich the full transcript too — a precise timecode on every contribution,
    # so the full-sitting record can offer "watch" on any moment.
    indexed_path = out / f"transcript-indexed-{date}.json"
    if indexed_path.exists():
        indexed = json.loads(indexed_path.read_text(encoding="utf-8"))
        contributions = [c for s in indexed.get("sections", [])
                         for c in s.get("contributions", [])]
        enriched = 0
        for c in contributions:
            opening = _tokens(" ".join((c.get("text") or "").split()[:24]))
            seed = (_to_offset(c["timecode"], video_start)
                    if c.get("timecode") else None)
            best = _best_match(opening, ctokens, ctimes, token_index, seed)
            if best and best[0] >= MATCH_THRESHOLD:
                c["caption_timecode"] = _to_timecode(
                    max(0.0, best[2] - LEAD_IN), video_start)
                enriched += 1
            else:
                c["caption_timecode"] = None
        indexed_path.write_text(
            json.dumps(indexed, indent=2, ensure_ascii=False), encoding="utf-8")
        _log(verbose, f"Caption-matched {enriched}/{len(contributions)} "
                      f"contributions in the full record.")

    print(highlights_path)
    return highlights_path


def _log(verbose: bool, message: str) -> None:
    if verbose:
        print(message, file=sys.stderr)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="hansard_highlights.captions",
        description="Pin each highlight to the exact moment via caption-matching.")
    parser.add_argument("--date", help="Sitting date YYYY-MM-DD.")
    parser.add_argument("--event-id",
                        help="parliamentlive.tv event GUID for the Commons "
                             "chamber. Auto-located from the date if omitted.")
    parser.add_argument("--out-dir", default="output", help="Pipeline output dir.")
    parser.add_argument("--refresh", action="store_true",
                        help="Re-download the caption track even if cached.")
    args = parser.parse_args(argv)

    if args.date and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.date):
        parser.error("--date must be in YYYY-MM-DD format")

    try:
        enrich(date=args.date, event_id=args.event_id, out_dir=args.out_dir,
               refresh=args.refresh)
    except CaptionError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
