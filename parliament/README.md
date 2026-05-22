# Hansard Highlights

A daily parliamentary highlights tool. It automatically identifies the most
substantive contributions from UK Parliament debates and presents them as a
clean, public-facing highlights page — so journalists, YouTubers, policy wonks
and politically engaged citizens can see what happened in Parliament today
without reading the full Hansard transcript.

The longer-term goal is an automated video editing system built on top of this
pipeline. We're building it one step at a time.

## Pipeline

| Step | Status | What it does |
|------|--------|--------------|
| 1. Fetch transcript | ✅ Done | Pull the day's Commons sitting from the Hansard API and compile a single transcript. |
| 2. Identify highlights | ✅ Done | Select the most substantive contributions by editorial judgement, locally. |
| 3. Build highlights page | ✅ Done | Render a self-contained static page with the parliamentlive.tv sitting embedded. |
| 4. Caption-matched video | ✅ Done | Match each highlight to its exact second; the page's player seeks there on click. |

## Step 1 — Fetch the day's transcript

`hansard_highlights/fetch.py` queries the
[Hansard API](https://hansard-api.parliament.uk) in three stages:

1. `lastsittingdate` → the most recent sitting date
2. `sectiontrees` → the day's debate structure (an `ExternalId` per section)
3. `debate/{ExternalId}` → the contributions within each section

Every section is fetched and its `Contribution` items collected, with HTML/XML
tags stripped to clean text. Container sections (e.g. "Oral Answers to
Questions") only carry short procedural headers, so taking direct items from
every node yields a complete transcript with no duplication.

### Usage

No third-party dependencies — Python 3.9+ standard library only.

```bash
# Fetch the most recent sitting
python -m hansard_highlights

# Fetch a specific date into a chosen directory
python -m hansard_highlights --date 2026-05-20 --out-dir output
```

Or from Python:

```python
from hansard_highlights import fetch_transcript

transcript = fetch_transcript()                 # most recent sitting
transcript = fetch_transcript(date="2026-05-20")
transcript.save_json("output/transcript.json")
transcript.save_text("output/transcript.txt")
```

### Output

Two files are written to `--out-dir` (default `output/`):

- **`transcript-{date}.json`** — structured data for downstream pipeline steps.
  Each contribution carries its speaker, role, constituency, party, member ID,
  timecode, clean text, raw HTML and a Hansard permalink.
- **`transcript-{date}.txt`** — a single readable plain-text transcript,
  suitable for feeding to the Step 2 analysis.

The progress log goes to stderr; the transcript path is printed to stdout so
the command can be chained into later pipeline steps.

## Step 2 — Identify the highlights

Step 2 selects the day's editorial highlights — the contributions that genuinely
matter, filtered from procedural noise and party-line repetition. The editorial
judgement runs **locally in Claude Code**, in-session: no API, no API key, no
local model to install. `hansard_highlights/analyse.py` handles everything
around it, and `hansard_highlights/prompts.py` holds the editorial prompt.

It is a three-stage flow:

```bash
# 2a. Build the analysis brief from a Step 1 transcript
python -m hansard_highlights.analyse prepare --date 2026-05-20

# 2b. Open output/analysis-brief-{date}.md in Claude Code and follow it.
#     Claude Code reads the indexed transcript, applies the editorial
#     standard, and writes its selections to output/highlights-raw-{date}.json

# 2c. Join the selections back to the transcript
python -m hansard_highlights.analyse resolve --date 2026-05-20
```

`prepare` writes `transcript-indexed-{date}.json` (the full transcript with an
integer `index` on every contribution) and `analysis-brief-{date}.md` (the
editorial prompt + output spec). `resolve` reads the raw selections, joins each
back to the transcript by `index`, and attaches the Hansard contribution and
debate-section `ExternalId`s, the timecode, and a permalink — so it also covers
the Hansard side of the pipeline's Step 3 deterministically.

### Output

- **`highlights-{date}.json`** — the finalised highlights. Each carries the
  editorial fields (tier, rank, category, summary, key quote, analysis) plus
  resolved speaker, party, constituency, timecode, contribution text, and
  Hansard permalink. `resolve` verifies every key quote appears verbatim in the
  source contribution and records any mismatches under `warnings`.
- **`highlights-{date}.md`** — a readable review sheet of the same.

### Two tiers

Highlights come in two tiers:

- **Headline tier** — political importance: what a well-informed reader expects
  to see reported. Categories: Effective scrutiny, New evidence, Casework,
  Policy signal, Sharp exchange, Crisis.
- **Signal tier** — the deeper layer: rhetorically strong or quietly
  significant moments the day's coverage will miss. Categories: Rhetoric,
  Candour, Reframe, Revealing detail, Cross-party, Original argument.

Each tier is selected and ranked independently against the same editorial test.

## Step 3 — Build the page

`hansard_highlights/build_page.py` renders a resolved `highlights-{date}.json`
into `site/index.html` — a self-contained static page (no dependencies, no
build tooling) ready for GitHub Pages.

```bash
python -m hansard_highlights.build_page --date 2026-05-20
```

The page presents the two tiers as editorial cards — why it matters, speaker,
key quote, analysis, Hansard permalink — and embeds the day's House of Commons
sitting via the official parliamentlive.tv player. It is compliant by design:
editorial text sits as page HTML *around* the unaltered embedded video, never
on it; the page is non-commercial and carries no advertising.

The parliamentlive.tv event GUID is found automatically (see Step 4); pass
`--event-id` only to override it. Each highlight carries a **▶ Watch from**
button that seeks the page's embedded player to that highlight's moment.

### Hosting

`site/index.html` is the publishable artefact. To put it on GitHub Pages at a
custom domain, push the repo, enable Pages, and add a `site/CNAME` file
containing the domain.

## Step 4 — Caption-matching and the player

A Hansard `Timecode` is a single coarse marker per contribution — accurate for
a short question, too coarse for a long speech. `hansard_highlights/captions.py`
fixes that: it fetches the sitting's caption track from parliamentlive.tv and
fuzzy-matches each highlight's `key_quote` against it to find the exact second
the words were spoken.

```bash
python -m hansard_highlights.captions --date 2026-05-20
```

It writes a precise `caption_timecode` onto every highlight in
`highlights-{date}.json` (the caption track is cached as `captions-{date}.vtt`).
`build_page` prefers that timecode: the page carries one embedded player, and
every highlight's **▶ Watch from HH:MM** button seeks the player straight to
that moment — no leaving the page.

### The full pipeline

```bash
python -m hansard_highlights --date 2026-05-20
python -m hansard_highlights.analyse prepare --date 2026-05-20
#   … in-session editorial analysis → highlights-raw-2026-05-20.json …
python -m hansard_highlights.analyse resolve   --date 2026-05-20
python -m hansard_highlights.captions   --date 2026-05-20
python -m hansard_highlights.build_page --date 2026-05-20
```

`captions` and `build_page` locate the day's parliamentlive.tv event GUID
themselves — `hansard_highlights/events.py` matches it from the `/Commons`
listing by name and date. Pass `--event-id` to either only to override.
