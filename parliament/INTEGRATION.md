# Hansard Highlights — integration into State of Britain

A handoff document for incorporating the Hansard Highlights tool into the
State of Britain platform, to be hosted at **stateofbritain.uk/parliament**.

> **Status — integrated.** The tool now ships as the React `/parliament` tab.
> The pipeline lives in `parliament/`; the page is rendered from data by
> `src/parliament/` rather than by `build_page`. The standalone `build_page.py`
> is kept for reference but is no longer part of the routine —
> `scripts/sync-parliament-data.js` publishes the pipeline output to the web
> app instead. See sections 6 and 11.

---

## 1. What this is

A daily, non-partisan digest of the House of Commons. For each sitting day it
fetches the full Official Report (Hansard), selects the most substantive
contributions by editorial judgement, maps the debate around each, generates
precise video timecodes, and builds one self-contained HTML page.

The mission is to make Parliament legible: to serve both the tourist and the
purist. Someone with five minutes gets the shape of the day; someone whose job
is Parliament can navigate the entire record beneath. It is the highlights reel
for a considered viewer.

The output is fully static HTML with an inline stylesheet. No JavaScript
framework, no build tooling, no external assets except the parliamentlive.tv
video iframe.

---

## 2. The pipeline

Six stages, left to right:

```
fetch  ->  prepare  ->  [editorial analysis]  ->  resolve  ->  captions  ->  build_page
```

1. **fetch** (`fetch.py`) pulls a sitting from the Hansard API. Writes the raw
   transcript, a plain-text rendering, and an indexed transcript: sections,
   each holding numbered contributions with speaker attribution, IDs, and
   Hansard's own coarse timecodes.
2. **prepare** (`analyse.py prepare`) assembles the editorial brief: the system
   prompt plus the indexed transcript, ready for analysis.
3. **editorial analysis** is NOT automated. It is done in-session in Claude
   Code, with no API call. The editor reads the whole transcript and authors
   `highlights-raw-{date}.json`. This is the heart of the product. See section 4.
4. **resolve** (`analyse.py resolve`) validates the raw highlights, verifies
   every quote is verbatim against the transcript, attaches contribution
   metadata and Hansard permalinks, and writes `highlights-{date}.json`.
5. **captions** (`captions.py`) locates the parliamentlive.tv video, fetches
   its caption track, fuzzy-matches every contribution's opening words to it,
   and writes precise video timecodes back. When no official track exists yet
   it falls back to local transcription. See section 8.
6. **build_page** (`build_page.py`) renders every day to `site/{date}.html`,
   rebuilds `index.html` as the latest day, and links the days together.

---

## 3. Repository layout

`hansard_highlights/` — Python package, standard library only:

| File | Role |
|------|------|
| `fetch.py` | Hansard API to transcript files |
| `analyse.py` | `prepare` and `resolve` subcommands |
| `prompts.py` | the editorial system prompt and output schema |
| `captions.py` | parliamentlive.tv caption matching to timecodes |
| `transcribe.py` | local speech-to-text fallback (ffmpeg + whisper.cpp) |
| `events.py` | locates the parliamentlive.tv Commons event for a date |
| `build_page.py` | HTML page builder and stylesheet |
| `__main__.py` | package entry point (runs `fetch`) |

`output/` — per-day artefacts, `{date}` is `YYYY-MM-DD`:

| File | Stage | Contents |
|------|-------|----------|
| `transcript-{date}.json` | fetch | raw Hansard response |
| `transcript-{date}.txt` | fetch | plain-text transcript |
| `transcript-indexed-{date}.json` | fetch | sections and numbered contributions |
| `analysis-brief-{date}.md` | prepare | the brief for the editorial step |
| `highlights-raw-{date}.json` | editorial | the authored editorial output |
| `highlights-{date}.json` | resolve | resolved, validated, enriched |
| `highlights-{date}.md` | resolve | a readable rendering of the above |
| `captions-{date}.vtt` / `.start` | captions | caption-track cache |
| `asr-{date}.json` / `.start` | captions | local-transcript cache |
| `audio-{date}.wav` | captions | extracted audio (large, ~900 MB, deletable) |

`site/` — the built site: `index.html` is the latest day, `{date}.html` are the
back catalogue.

`models/` — the whisper.cpp model file. Not in version control (~465 MB).

---

## 4. The editorial step — read this carefully

The selection and writing is done by a human or AI editor inside Claude Code,
reading the full transcript. There is no analysis API call and no automated
"AI picks the highlights" service. This is deliberate: it costs nothing to run,
it keeps a person accountable for editorial judgement, and it keeps the output
defensible.

`prompts.py` is the editorial standard. It defines what earns a highlight, the
categories, the debate-map model, the section summaries, the legal-risk screen,
and the output JSON schema. Treat it as the source of truth.

`highlights-raw-{date}.json` has four top-level keys:

- `sitting_overview` — two or three neutral sentences on the shape of the day.
- `highlights[]` — ranked. Each carries: `rank`, `contribution_index`,
  `speaker_name`, `party`, `constituency`, `debate`, `category`, `summary`,
  `key_quote` (verbatim), `analysis`, and `debate_map[]` (up to four
  surrounding contributions, each with a verbatim quote).
- `redactions[]` — the legal-risk screen output. Usually empty.
- `sections[]` — one objective paragraph per top-level debate, keyed by
  `section_id`.

`resolve` validates this file. It will reject a quote that is not verbatim, or
a `contribution_index` or `section_id` that does not exist.

---

## 5. Editorial standards (load-bearing — do not relax in the port)

These were arrived at through iteration and are not negotiable. The product
does not work at State of Britain without them.

- **Strictly non-partisan.** Describe what a measure does, never adopt either
  side's framing. Write "a change to the taxation of foreign branch profits",
  not "closing a loophole". Never state a contested or multi-causal claim as
  fact: "rising costs", not "rising costs from the war". Loaded
  characterisations and asserted causes belong only in verbatim quotes. A
  Hansard section title can itself carry the Government's communications
  framing; replace it with a plain description where it does.
- **Objective but not bland.** A summary leads with the substance, the specific
  fact or figure, written like a sharp news standfirst.
- **Naming.** Backbenchers as "Full Name (PARTY)", e.g. "Justin Madders (LAB)".
  Ministers, Secretaries of State and the Prime Minister by office and name,
  e.g. "The Chancellor, Rachel Reeves,".
- **Verbatim quotes.** Every `key_quote` and debate-map quote must appear word
  for word in the transcript. `resolve` enforces this.
- **No em dashes** in authored prose. Verbatim Hansard quotes are exempt.
- **Substance over theatre.** Weight lasting policy over ephemeral exchanges.
- **Legal-risk screen.** Every sitting is screened. See section 7.

---

## 6. Running the pipeline

For a sitting on `{date}`, run the Python stages from the `parliament/`
directory:

```
python -m hansard_highlights.fetch     --date {date}
python -m hansard_highlights.analyse   prepare --date {date}
#   --- editorial analysis in Claude Code: author output/highlights-raw-{date}.json ---
python -m hansard_highlights.analyse   resolve --date {date}
python -m hansard_highlights.captions  --date {date}
#   --- then, from the repo root: node scripts/sync-parliament-data.js ---
```

`sync-parliament-data.js` copies the day's `highlights-{date}.json` and
`transcript-indexed-{date}.json` into `public/data/parliament/` and rebuilds the
day index, so the date pills on the /parliament tab stay current. It replaces
the old `build_page` step. Run any stage with `--help` for its flags.

Pipeline-ordering note: if you re-run `resolve`, you must re-run `captions`
after it. `resolve` regenerates the highlights file from the raw and drops the
caption timecodes; `captions` then puts them back.

---

## 7. Legal and licensing constraints (do not break these)

- **Hansard text** is Crown copyright, reproduced under the Open Parliament
  Licence. Attribution is required and is carried in the page footer.
- **Reproduction of proceedings** is protected by qualified privilege
  (Defamation Act 1996 Schedule 1; Parliamentary Papers Act 1840) as long as
  the report is fair, accurate and not malicious. The non-partisan discipline
  is part of staying within that protection.
- **Parliamentary privilege** lets Members say things in the House that would
  be defamatory outside it. The legal-risk screen in the editorial step exists
  to catch such material so it can be replaced with a redaction note plus a
  link to Hansard, rather than reproduced. The screen runs over the whole
  sitting, not just the highlights.
- **Video** is embedded from parliamentlive.tv. Its terms require
  non-commercial, non-partisan use. The page carries no advertising.
- The product must remain **non-commercial**. State of Britain is the user's
  neutral, non-commercial, public-good civic-data platform; this fits there
  and must stay consistent with that.

---

## 8. Video and timecodes

The page embeds the parliamentlive.tv player and deep-links each highlight and
each full-record contribution to the moment it was spoken.

- `events.py` locates the Commons event GUID for a date.
- `captions.py` fetches the official caption track (Red Bee Exposure API, then
  the HLS manifest, then the WebVTT) and fuzzy-matches contribution opening
  lines to it. Imperfect matching is fine: the displayed words are always
  Hansard's; the caption text is only ever used to find a timecode.
- The official track is published a day or two after the sitting. Until then,
  `transcribe.py` is the fallback. It extracts the audio with ffmpeg and
  transcribes the whole sitting locally with whisper.cpp, producing the same
  timed cues. A full sitting takes roughly 20 minutes on Apple Silicon and
  matches around 80% of contributions and effectively all highlights.
- `captions.py` falls back automatically: it tries the official track, and on
  "no subtitle track" it transcribes locally. Same-day pages therefore get
  watch buttons without waiting.
- To prefer the official track once it appears: `captions --date {date}
  --refresh`.

---

## 9. Dependencies

- **Python 3.9+, standard library only.** No pip packages. This is a
  deliberate design rule. Keep it.
- **External command-line tools, used only by the local-transcription
  fallback:**
  - `ffmpeg` — `brew install ffmpeg`
  - `whisper.cpp` — `brew install whisper-cpp` (provides `whisper-cli`)
  - a whisper model at `models/ggml-small.en.bin` (~465 MB), from
    huggingface.co/ggerganov/whisper.cpp. Override the model path with
    `HH_WHISPER_MODEL` and the binary with `HH_WHISPER_BIN`.

  The Python code shells out to these; it does not import them, so the
  "no Python dependencies" rule still holds. If the official caption track is
  always allowed to backfill, the fallback and these three tools are optional.

---

## 10. Integrating into State of Britain

Target path: **stateofbritain.uk/parliament**.

Because the build output is static and self-contained, integration is mostly a
hosting and styling exercise. Options, simplest first:

- **Serve `site/` under `/parliament`.** `index.html` is the latest day,
  `{date}.html` are the archive, and day-to-day navigation is already built in.
- **Adopt State of Britain's chrome.** The pages carry their own minimal
  masthead, footer and stylesheet. To sit inside the wider site, either keep
  them standalone in a subsection, or adapt the page template and the `_CSS`
  string in `build_page.py` to State of Britain's header, footer and design
  tokens. Both are localised to that one file.
- **Wire the daily run into State of Britain's scheduling.** Five of the six
  stages can run as a scheduled job. The editorial stage cannot: it is a person
  in Claude Code. See section 11.

Decisions to make during the port:

- **Where the editorial step happens, and who runs it.** It must stay an
  editorial judgement, not an automated API call. This is the one stage that
  needs a person each sitting day.
- **URL scheme.** `/parliament` for the latest day and `/parliament/{date}`
  for past days would be natural. The files are currently named `{date}.html`.
- **Where `output/` and `site/` live** in State of Britain's repo or storage.
  `build_page` rebuilds the whole back catalogue each run; this stays cheap as
  static HTML, but the JSON in `output/` is the durable record and should be
  kept under version control or equivalent.
- **The video fallback.** Decide whether to keep the whisper fallback, which
  gives same-day watch buttons but needs ffmpeg and whisper.cpp on the build
  machine, or to rely on the official track backfilling.
- **Footer notices.** The Open Parliament Licence attribution and the "fair
  and accurate report of parliamentary proceedings" wording must carry over
  verbatim. They are part of the legal basis in section 7.

---

## 11. Daily operating routine

The pipeline lives in `parliament/`; run the Python stages from there. On a
sitting evening:

1. `cd parliament`, then `fetch` the day and `prepare` the brief.
2. Editorial analysis in Claude Code: read the transcript and author
   `output/highlights-raw-{date}.json` to the standard in `prompts.py` and
   section 5.
3. `resolve`, then `captions` (which transcribes locally if the official track
   is not up yet).
4. From the repo root, `node scripts/sync-parliament-data.js` — publishes the
   day to `public/data/parliament/` and rebuilds the day index.
5. Commit and deploy as normal; the /parliament tab renders the new day.
6. Optional, a day or two later: `captions --date {date} --refresh`, then
   re-run the sync, to switch to the official caption track if preferred.
