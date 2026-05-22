"""Local speech-to-text fallback for video timecodes.

parliamentlive.tv publishes a caption track for each sitting, but only a day or
two afterwards. Until it appears, this module transcribes the sitting audio
locally with whisper.cpp and produces the same timed cues that captions.py
matches against.

The transcript text is used only to locate timecodes. The words shown on the
page are always Hansard's, so an imperfect machine transcript is fine: every
contribution is found by matching its known opening words, then discarded.

The Python here is still standard-library only; it shells out to two external
tools (Homebrew: `brew install ffmpeg whisper-cpp`):

  ffmpeg       extracts the audio from the parliamentlive.tv HLS stream
  whisper-cli  whisper.cpp; transcribes the audio with word-level timestamps

plus a whisper.cpp model file (default models/ggml-small.en.bin, override with
the HH_WHISPER_MODEL environment variable).

    python -m hansard_highlights.transcribe --date 2026-05-21
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
from pathlib import Path

from .captions import CaptionError, _get_text, _log, hls_master_url
from .events import EventLookupError, find_commons_event

MODEL_URL = ("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/"
             "ggml-small.en.bin")


# ---------------------------------------------------------------------------
# External tools
# ---------------------------------------------------------------------------

def _which_whisper() -> str:
    for name in (os.environ.get("HH_WHISPER_BIN"), "whisper-cli", "whisper-cpp"):
        if name and shutil.which(name):
            return shutil.which(name)
    raise CaptionError(
        "whisper.cpp not found. Install it with `brew install whisper-cpp`, "
        "or point HH_WHISPER_BIN at the binary.")


def _which_ffmpeg() -> str:
    found = shutil.which("ffmpeg")
    if not found:
        raise CaptionError("ffmpeg not found. Install it with `brew install ffmpeg`.")
    return found


def _model_path() -> str:
    path = os.environ.get("HH_WHISPER_MODEL", "models/ggml-small.en.bin")
    if not Path(path).exists():
        raise CaptionError(
            f"whisper model not found at {path}. Download one with:\n"
            f"  mkdir -p models && curl -L -o {path} {MODEL_URL}")
    return path


# ---------------------------------------------------------------------------
# HLS audio stream
# ---------------------------------------------------------------------------

def _audio_stream(master_url: str):
    """Return (stream_playlist_url, video_start_iso) from the HLS master."""
    master = _get_text(master_url)
    audio = re.search(r'#EXT-X-MEDIA:TYPE=AUDIO[^\n]*?URI="([^"]+)"', master)
    if audio:
        stream_url = urllib.parse.urljoin(master_url, audio.group(1))
    elif "#EXTINF" in master:
        stream_url = master_url            # already a media playlist
    else:
        variant = re.search(r'#EXT-X-STREAM-INF:[^\n]*\n([^\n]+)', master)
        if not variant:
            raise CaptionError("no media stream in the HLS master manifest")
        stream_url = urllib.parse.urljoin(master_url, variant.group(1).strip())
    playlist = master if stream_url == master_url else _get_text(stream_url)
    pdt = re.search(r"#EXT-X-PROGRAM-DATE-TIME:([0-9T:.+\-Z]+)", playlist)
    if not pdt:
        raise CaptionError("no PROGRAM-DATE-TIME in the audio playlist")
    return stream_url, pdt.group(1)


# ---------------------------------------------------------------------------
# ffmpeg + whisper.cpp
# ---------------------------------------------------------------------------

def _extract_audio(stream_url: str, wav_path: Path) -> None:
    cmd = [_which_ffmpeg(), "-y", "-loglevel", "warning", "-stats",
           "-i", stream_url, "-vn", "-ac", "1", "-ar", "16000",
           "-c:a", "pcm_s16le", str(wav_path)]
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as exc:
        raise CaptionError(f"ffmpeg failed to extract audio ({exc})")


def _run_whisper(wav_path: Path, json_prefix: Path) -> Path:
    # -ml 1 -sow gives one segment per word, i.e. word-level timestamps.
    cmd = [_which_whisper(), "-m", _model_path(), "-f", str(wav_path),
           "-l", "en", "-ml", "1", "-sow", "-oj", "-of", str(json_prefix), "-pp"]
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as exc:
        raise CaptionError(f"whisper.cpp failed ({exc})")
    produced = json_prefix.with_suffix(".json")
    if not produced.exists():
        raise CaptionError(f"whisper.cpp produced no JSON at {produced}")
    return produced


def _ms_to_vtt(ms) -> str:
    ms = max(0, int(ms))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def _whisper_json_to_vtt(json_path: Path) -> str:
    """Convert whisper.cpp JSON into WebVTT that captions.parse_vtt accepts."""
    data = json.loads(json_path.read_text(encoding="utf-8"))
    lines = ["WEBVTT", ""]
    for seg in data.get("transcription") or []:
        offsets = seg.get("offsets") or {}
        text = (seg.get("text") or "").strip()
        if not text or "from" not in offsets:
            continue
        start = _ms_to_vtt(offsets["from"])
        end = _ms_to_vtt(offsets.get("to", offsets["from"]))
        lines += [f"{start} --> {end}", text, ""]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def local_caption_track(event_id: str, date: str, out_dir: str = "output",
                        verbose: bool = True):
    """Transcribe the sitting locally; return (vtt_text, video_start_iso).

    A drop-in for captions.fetch_caption_track when no official track exists.
    The whisper JSON is cached as asr-{date}.json so re-runs are instant.
    """
    out = Path(out_dir)
    asr_json = out / f"asr-{date}.json"
    start_file = out / f"asr-{date}.start"
    if asr_json.exists() and start_file.exists():
        _log(verbose, f"Using cached local transcript ({asr_json}).")
        return (_whisper_json_to_vtt(asr_json),
                start_file.read_text(encoding="utf-8").strip())

    _log(verbose, "Locating the sitting audio…")
    stream_url, video_start = _audio_stream(hls_master_url(event_id))

    wav = out / f"audio-{date}.wav"
    if wav.exists():
        _log(verbose, f"Reusing extracted audio ({wav}).")
    else:
        _log(verbose, "Extracting audio from parliamentlive.tv with ffmpeg…")
        _extract_audio(stream_url, wav)
        _log(verbose, f"Audio extracted: {wav.stat().st_size / 1e6:.0f} MB.")

    _log(verbose, "Transcribing with whisper.cpp — the slow step…")
    produced = _run_whisper(wav, out / f"asr-{date}")
    if produced != asr_json:
        shutil.move(str(produced), str(asr_json))
    start_file.write_text(video_start, encoding="utf-8")
    _log(verbose, f"Local transcript cached at {asr_json}.")
    return _whisper_json_to_vtt(asr_json), video_start


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="hansard_highlights.transcribe",
        description="Transcribe a sitting's audio locally for video timecodes.")
    parser.add_argument("--date", required=True, help="Sitting date YYYY-MM-DD.")
    parser.add_argument("--event-id", help="parliamentlive.tv event GUID.")
    parser.add_argument("--out-dir", default="output", help="Pipeline output dir.")
    args = parser.parse_args(argv)
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.date):
        parser.error("--date must be in YYYY-MM-DD format")

    event_id = args.event_id
    try:
        if not event_id:
            event_id = find_commons_event(args.date)
        vtt, start = local_caption_track(event_id, args.date, args.out_dir)
    except (CaptionError, EventLookupError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(f"Local transcript ready: {vtt.count('-->')} cues, "
          f"video starts {start}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
