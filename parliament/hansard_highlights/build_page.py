"""Step 3 of the Hansard Highlights pipeline — render the highlights page.

Reads a resolved ``highlights-{date}.json`` (Step 2 output) and produces a
self-contained static HTML page: the day's highlights in two tiers, with the
day's House of Commons sitting embedded from parliamentlive.tv. Designed for
hosting on GitHub Pages (e.g. hansardhighlights.com).

Compliance: the page embeds the official parliamentlive.tv player (permitted —
Downloading & Sharing T&Cs cl. 4) and wraps it in editorial text that lives as
page HTML *around* the unaltered video, never on it. It is non-commercial and
carries no advertising.

No third-party dependencies — Python 3.9+ standard library only.

    python -m hansard_highlights.build_page --date 2026-05-20 \\
        --event-id 182bf0b6-7a85-4838-afc4-3de25ce395e7
"""

from __future__ import annotations

import argparse
import datetime as _dt
import html
import json
import re
import sys
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo

from .events import EventLookupError, find_commons_event

# parliamentlive.tv: the embeddable player (seekable via postMessage) and the
# public event page (deep-linkable, but cannot itself be iframed).
PLIVE_PLAYER = ("https://videoplayback.parliamentlive.tv/Player/Index/"
                "{event_id}?audioOnly=False&autoStart=True&script=True")
PLIVE_EVENT = "https://parliamentlive.tv/Event/Index/{event_id}"
LONDON = ZoneInfo("Europe/London")


class PageError(RuntimeError):
    """Raised when a Step 3 input is missing or malformed."""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_json(path) -> dict:
    p = Path(path)
    if not p.exists():
        raise PageError(f"File not found: {p}")
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise PageError(f"{p} is not valid JSON: {exc}")


def _esc(value) -> str:
    """HTML-escape a value for use in text or attributes."""
    return html.escape("" if value is None else str(value), quote=True)


def _long_date(date: str) -> str:
    try:
        d = _dt.date.fromisoformat(date)
    except (ValueError, TypeError):
        return str(date)
    return f'{d.strftime("%A")} {d.day} {d.strftime("%B %Y")}'


def _short_date(date: str) -> str:
    try:
        d = _dt.date.fromisoformat(date)
    except (ValueError, TypeError):
        return str(date)
    return f'{d.strftime("%a")} {d.day} {d.strftime("%b")}'


def _clock(timecode) -> Optional[str]:
    """Extract HH:MM from an ISO timecode such as '2026-05-20T13:22:00'."""
    text = str(timecode or "")
    if "T" not in text:
        return None
    clock = text.split("T", 1)[1]
    return clock[:5] if len(clock) >= 5 else None


def _watch_url(event_id: str, timecode=None) -> str:
    """parliamentlive.tv event URL, deep-linked to a timecode when available."""
    url = PLIVE_EVENT.format(event_id=event_id)
    if timecode:
        url += f"?in={timecode}"
    return url


def _to_utc(timecode: Optional[str]) -> Optional[str]:
    """Convert a naive-London ISO timecode to a UTC ISO string for the player."""
    if not timecode or "T" not in str(timecode):
        return None
    try:
        local = _dt.datetime.fromisoformat(str(timecode)).replace(tzinfo=LONDON)
    except ValueError:
        return None
    return local.astimezone(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _attribution(highlight: dict):
    """Return (speaker_name, 'Role · Party, Constituency') for a highlight."""
    name = highlight.get("speaker_name") or "Unknown speaker"
    bits = []
    if highlight.get("office"):
        bits.append(highlight["office"])
    party_constituency = ", ".join(
        b for b in (highlight.get("party"), highlight.get("constituency")) if b)
    if party_constituency:
        bits.append(party_constituency)
    return name, " · ".join(bits)


# ---------------------------------------------------------------------------
# Stylesheet
# ---------------------------------------------------------------------------

_CSS = """\
:root{
  --bg:#f7f4ec; --ink:#1c1b18; --muted:#615f57; --soft:#33322c;
  --rule:#ddd7c6; --accent:#1a4d4a;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
}
*{box-sizing:border-box}
body{
  margin:0; background:var(--bg); color:var(--ink);
  font-family:Georgia,"Iowan Old Style","Times New Roman",serif;
  font-size:19px; line-height:1.62; -webkit-text-size-adjust:100%;
}
.page{max-width:1320px;margin:0 auto;padding:0 40px}
a{color:var(--accent)}

header{padding:54px 0 26px;border-bottom:3px double var(--rule)}
.masthead{
  font-family:var(--sans);text-transform:uppercase;letter-spacing:.2em;
  font-size:12px;font-weight:700;color:var(--accent);margin:0 0 20px;
}
header h1{font-size:39px;line-height:1.16;margin:0;font-weight:400}
header h1 .date{display:block;color:var(--muted);font-size:28px;margin-top:4px}
.lede{font-size:22px;line-height:1.48;margin:24px 0 18px;max-width:660px}
.meta{
  font-family:var(--sans);font-size:12px;color:var(--muted);
  letter-spacing:.07em;text-transform:uppercase;margin:0;
}

/* two columns: scrollable highlights on the left, sticky video on the right */
.cols{display:flex;gap:56px}
.reading{flex:0 0 560px;min-width:0}
.reading-solo{max-width:680px;margin:0 auto}
.viewer{flex:1 1 0;min-width:0;max-width:624px}
.viewer-sticky{position:sticky;top:20px}

.watch{margin:0}
.watch h2{font-weight:400}
.watch h2{
  font-family:var(--sans);font-size:12px;text-transform:uppercase;
  letter-spacing:.16em;color:var(--muted);margin:0 0 12px;
}
.embed{position:relative;padding-top:56.25%;background:#000;border:1px solid var(--rule)}
.embed iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.watch .note{font-family:var(--sans);font-size:13px;color:var(--muted);margin:10px 0 0}

.reading>.hl:first-child{padding-top:4px}

/* the debate map — collapsed by default, opened in place */
details.debate{margin:16px 0 0;border-top:1px solid var(--rule)}
details.debate>summary{
  font-family:var(--sans);font-size:13px;font-weight:700;color:var(--accent);
  cursor:pointer;padding:11px 0 3px;list-style:none;
}
details.debate>summary::-webkit-details-marker{display:none}
details.debate>summary::before{content:"▸";margin-right:8px;font-size:10px}
details.debate[open]>summary::before{content:"▾"}
details.debate>summary:hover{text-decoration:underline}
.dm-body{padding:3px 0 6px}
.dm-entry{margin:15px 0 0;padding-left:15px;border-left:2px solid var(--rule)}
.dm-head{font-family:var(--sans);font-size:14px;margin:0}
.dm-role{
  font-family:var(--sans);font-size:12.5px;font-weight:600;
  color:var(--accent);margin-right:8px;
}
.dm-quote{font-size:16.5px;line-height:1.46;color:var(--soft);margin:6px 0 0}
.dm-links{margin:9px 0 0;gap:14px}
.dm-links button.watch{font-size:11.5px;padding:4px 10px}

.hl{padding:32px 0;border-bottom:1px solid var(--rule)}
.hl-top{display:flex;align-items:baseline;gap:13px;margin:0 0 13px}
.rank{font-size:30px;line-height:1;color:var(--accent)}
.cat{
  font-family:var(--sans);font-size:11.5px;font-weight:700;text-transform:uppercase;
  letter-spacing:.13em;color:var(--muted);
}
.why{font-size:22px;line-height:1.44;margin:0 0 15px}
.who{font-family:var(--sans);font-size:15px;margin:0}
.who b{font-weight:700}
.who .who-meta{color:var(--muted)}
.debate{
  font-family:var(--sans);font-size:12px;text-transform:uppercase;
  letter-spacing:.07em;color:var(--muted);margin:3px 0 0;
}
blockquote{
  margin:18px 0 0;padding:3px 0 3px 21px;border-left:3px solid var(--accent);
  font-size:20px;line-height:1.5;
}
.analysis{margin:15px 0 0;color:var(--soft)}
.links{font-family:var(--sans);font-size:13px;margin:17px 0 0;display:flex;
  gap:16px;align-items:center;flex-wrap:wrap}
.links a{text-decoration:none;font-weight:600}
.links a:hover{text-decoration:underline}
.links button.watch{
  font-family:var(--sans);font-size:12.5px;font-weight:700;cursor:pointer;
  background:var(--accent);color:#fff;border:0;border-radius:3px;padding:6px 12px;
}
.links button.watch:hover{background:#143f3c}

footer{
  margin:60px 0 90px;padding-top:26px;border-top:3px double var(--rule);
  font-family:var(--sans);font-size:13.5px;line-height:1.6;color:var(--muted);
}
footer p{margin:0 0 12px}
footer .genmeta{font-size:12px;letter-spacing:.04em;text-transform:uppercase}

/* the full sitting — the complete record beneath the highlights */
.full-sitting{margin:56px 0 0;padding-top:30px;border-top:3px double var(--rule)}
.fs-head h2{font-size:27px;font-weight:400;margin:0}
.fs-head p{font-family:var(--sans);font-size:13.5px;color:var(--muted);margin:6px 0 0}
ul.contents{
  list-style:none;margin:22px 0 10px;padding:0;font-family:var(--sans);font-size:13.5px;
}
ul.contents li{
  display:flex;justify-content:space-between;gap:14px;
  padding:7px 0;border-bottom:1px solid var(--rule);
}
ul.contents a{text-decoration:none;font-weight:600}
ul.contents a:hover{text-decoration:underline}
.toc-n{color:var(--muted);font-variant-numeric:tabular-nums}
details.hs-d>summary{
  font-family:var(--sans);cursor:pointer;list-style:none;display:block;
  padding:9px 0;border-bottom:1px solid var(--rule);
  position:sticky;top:0;z-index:5;background:var(--bg);
}
details.hs-d>summary::-webkit-details-marker{display:none}
.hs-row{
  display:flex;justify-content:space-between;align-items:baseline;gap:14px;
}
.hs-title{font-size:13.5px;font-weight:600;color:var(--accent)}
.hs-title::before{content:"▸ ";font-size:.85em}
details.hs-d[open] .hs-title::before{content:"▾ "}
.hs-n{font-family:var(--sans);font-size:12px;color:var(--muted);
  white-space:nowrap;font-variant-numeric:tabular-nums}
.hs-summary{
  max-height:0;opacity:0;overflow:hidden;margin:0;
  font-size:13.5px;line-height:1.5;color:var(--soft);
  transition:max-height .24s ease,opacity .2s ease,margin .24s ease;
}
details.hs-d:not([open])>summary:hover .hs-summary{
  max-height:340px;opacity:1;margin:9px 0 3px;
}
.hs-body{padding:4px 0 22px}
.hs-sub{margin-top:4px}
.hs-subtitle{
  font-family:var(--sans);font-size:15px;font-weight:700;
  margin:32px 0 2px;padding-top:16px;border-top:1px solid var(--rule);
}
.hs-collapse{margin:22px 0 2px}
.hs-collapse button{
  font-family:var(--sans);font-size:12.5px;font-weight:700;cursor:pointer;
  background:none;border:0;color:var(--accent);padding:4px 0;
}
.hs-collapse button:hover{text-decoration:underline}
.contribution{margin:20px 0 0}
.c-who{
  font-family:var(--sans);font-size:13.5px;font-weight:700;color:var(--accent);
  margin:0 0 4px;
}
.c-office{font-weight:400;color:var(--muted)}
.contribution p{font-size:17px;line-height:1.55;margin:0 0 9px}
.contribution:target{background:#efe9d9;box-shadow:0 0 0 9px #efe9d9}
.back-hl{margin:0 0 9px;font-family:var(--sans);font-size:12.5px;display:none}
.back-hl a{color:var(--accent);font-weight:700;text-decoration:none}
.back-hl a:hover{text-decoration:underline}
.contribution:target .back-hl{display:block}
.hl:target{background:#efe9d9;box-shadow:0 0 0 12px #efe9d9;border-radius:2px}
.c-who button.watch{
  font-family:var(--sans);font-size:11px;font-weight:700;cursor:pointer;
  background:var(--accent);color:#fff;border:0;border-radius:3px;
  padding:3px 8px;margin-left:7px;vertical-align:middle;
}
.c-who button.watch:hover{background:#143f3c}
.redacted{
  font-family:var(--sans);font-size:13.5px;font-style:italic;
  color:var(--muted);margin:0;
}
.redacted a{color:var(--muted)}
[id]{scroll-margin-top:56px}

/* left navigation rail — landmarks for a tall page */
.rail{
  position:fixed;left:6px;top:50%;transform:translateY(-50%);
  display:flex;flex-direction:column;gap:5px;z-index:60;
}
.rail a{
  display:flex;align-items:center;text-decoration:none;
  color:var(--muted);background:var(--bg);
  border:1px solid var(--rule);border-radius:21px;
  height:42px;overflow:hidden;white-space:nowrap;
}
.rail-i{
  flex:0 0 40px;height:42px;
  display:flex;align-items:center;justify-content:center;font-size:15px;
}
.rail-l{
  font-family:var(--sans);font-size:13px;font-weight:600;
  max-width:0;opacity:0;
  transition:max-width .2s ease,opacity .2s ease,padding .2s ease;
}
.rail a.active{border-color:var(--accent);color:var(--accent)}
.rail a:hover{background:var(--accent);border-color:var(--accent);color:#fff}
.rail a:hover .rail-l{max-width:150px;opacity:1;padding-right:17px}
@media (max-width:1339px){.rail{display:none}}

/* day tabs — the back catalogue of sittings */
.days{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 2px}
.day-tab{
  font-family:var(--sans);font-size:13px;font-weight:600;text-decoration:none;
  color:var(--muted);background:var(--bg);
  padding:6px 13px;border:1px solid var(--rule);border-radius:16px;
}
.day-tab:hover{border-color:var(--accent);color:var(--accent)}
.day-tab.active{background:var(--accent);border-color:var(--accent);color:#fff}

/* foot-of-page navigation between sitting days */
.day-foot{display:flex;flex-wrap:wrap;gap:10px;margin:46px 0 0}
.day-foot a{
  font-family:var(--sans);text-decoration:none;
  display:flex;flex-direction:column;gap:3px;
  padding:11px 17px;border:1px solid var(--rule);border-radius:10px;
  background:var(--bg);min-width:150px;
}
.day-foot a:hover{border-color:var(--accent)}
.day-foot a.next{margin-left:auto;text-align:right}
.day-foot .dir{font-size:12px;color:var(--muted)}
.day-foot .when{font-size:15px;font-weight:600;color:var(--accent)}

@media (max-width:1120px){
  .cols{flex-direction:column;gap:0}
  .reading{flex:none}
  .viewer{flex:none;max-width:none;order:-1;position:sticky;top:0;z-index:10;
    background:var(--bg);box-shadow:0 7px 15px -11px rgba(0,0,0,.55)}
  .viewer-sticky{position:static}
  details.hs-d>summary{position:static}
  .watch{padding:6px 0 8px}
  .watch h2,.watch .note{display:none}
  .reading>.tier:first-child{margin-top:30px}
}
@media (max-width:560px){
  body{font-size:18px}
  header h1{font-size:32px}
  header h1 .date{font-size:23px}
  .lede,.why{font-size:20px}
}
"""


# The single on-page player is driven by every highlight's ▶ button: a click
# postMessages a seek to the player iframe — its only seek interface.
_JS = """\
(function(){
  // Expand any <details> an in-page link targets, so a highlight can jump
  // into the full-sitting record and land with the debate open.
  function openHash(){
    if(!location.hash)return;
    var el;
    try{el=document.querySelector(location.hash);}catch(e){return;}
    for(var n=el;n;n=n.parentElement){ if(n.tagName==="DETAILS")n.open=true; }
    if(el)el.scrollIntoView();
  }
  window.addEventListener("hashchange",openHash);
  openHash();

  // Left rail — mark the section currently in view.
  var railLinks=document.querySelectorAll(".rail a");
  if(railLinks.length){
    var rHl=document.getElementById("highlights");
    var rFs=document.getElementById("full-sitting");
    var railSpy=function(){
      var cur="top";
      if(rHl&&rHl.getBoundingClientRect().top<140)cur="highlights";
      if(rFs&&rFs.getBoundingClientRect().top<140)cur="full-sitting";
      railLinks.forEach(function(a){
        a.classList.toggle("active",a.getAttribute("data-rail")===cur);
      });
    };
    window.addEventListener("scroll",railSpy,{passive:true});
    railSpy();
  }

  // Full-sitting debates form an accordion (native <details name="hs">);
  // a click on a header — opening or collapsing — re-anchors you to it.
  document.querySelectorAll("details.hs-d>summary").forEach(function(sm){
    sm.addEventListener("click",function(){
      var d=sm.parentElement;
      requestAnimationFrame(function(){ d.scrollIntoView(); });
    });
  });
  document.querySelectorAll(".hs-collapse button").forEach(function(b){
    b.addEventListener("click",function(){
      var d=b.closest("details");
      if(d){ d.open=false; d.scrollIntoView(); }
    });
  });

  // The single on-page player — every highlight's ▶ button seeks it.
  var player=document.getElementById("hh-player");
  if(!player)return;
  // The player must carry this page's URL in its hash, or its sendUTCTime()
  // throws on every timeupdate/seeked event, which breaks seeking.
  player.src=player.getAttribute("data-src")+"#"+encodeURIComponent(location.href);
  function seek(utc){
    player.contentWindow.postMessage(JSON.stringify({
      "function":"seekPostMessage",
      sender:document.location.href,
      data:"seek-program-date-time_"+utc+"_delaystart"
    }),"*");
  }
  document.querySelectorAll("button.watch").forEach(function(b){
    b.addEventListener("click",function(){
      seek(b.getAttribute("data-seek"));
    });
  });
})();
"""


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

def _watch_button(timecode, event_id: Optional[str]) -> Optional[str]:
    """A ▶ Watch button that seeks the on-page player to a timecode — or None."""
    clock = _clock(timecode)
    seek_utc = _to_utc(timecode)
    if not (event_id and clock and seek_utc):
        return None
    return (f'<button class="watch" type="button" data-seek="{_esc(seek_utc)}">'
            f'▶ Watch from {_esc(clock)}</button>')


def _debate_entry(d: dict, event_id: Optional[str]) -> str:
    """Render one debate-map contribution, a voice in the surrounding debate."""
    name = d.get("speaker_name") or "Unknown speaker"
    bits = []
    if d.get("office"):
        bits.append(d["office"])
    party_constituency = ", ".join(
        b for b in (d.get("party"), d.get("constituency")) if b)
    if party_constituency:
        bits.append(party_constituency)
    meta = " · ".join(bits)
    head = f'<span class="dm-role">{_esc(d.get("role", ""))}</span><b>{_esc(name)}</b>'
    if meta:
        head += f' <span class="who-meta">{_esc(meta)}</span>'
    rows = [f'<div class="dm-entry">\n<p class="dm-head">{head}</p>']
    if d.get("quote"):
        rows.append(f'<p class="dm-quote">“{_esc(d["quote"])}”</p>')
    links = []
    button = _watch_button(d.get("caption_timecode") or d.get("timecode"), event_id)
    if button:
        links.append(button)
    if d.get("hansard_permalink"):
        links.append(f'<a href="{_esc(d["hansard_permalink"])}" target="_blank" '
                     f'rel="noopener">Hansard ↗</a>')
    if links:
        rows.append('<p class="links dm-links">' + "".join(links) + '</p>')
    rows.append('</div>')
    return "\n".join(rows)


def _highlight_article(highlight: dict, event_id: Optional[str],
                       redacted: set) -> str:
    name, meta = _attribution(highlight)
    rows = [f'<article class="hl" id="hl-{highlight.get("contribution_index")}">']
    rows.append(
        '<p class="hl-top">'
        f'<span class="rank">{_esc(highlight.get("rank", ""))}</span>'
        f'<span class="cat">{_esc(highlight.get("category", ""))}</span></p>')

    if highlight.get("summary"):
        rows.append(f'<p class="why">{_esc(highlight["summary"])}</p>')

    who = f'<b>{_esc(name)}</b>'
    if meta:
        who += f' <span class="who-meta">{_esc(meta)}</span>'
    rows.append(f'<p class="who">{who}</p>')
    if highlight.get("debate"):
        rows.append(f'<p class="debate">{_esc(highlight["debate"])}</p>')

    if highlight.get("key_quote"):
        rows.append(f'<blockquote>“{_esc(highlight["key_quote"])}”</blockquote>')
    if highlight.get("analysis"):
        rows.append(f'<p class="analysis">{_esc(highlight["analysis"])}</p>')

    links = []
    hansard = highlight.get("hansard_permalink") or highlight.get("hansard_url")
    if hansard:
        links.append(f'<a href="{_esc(hansard)}" target="_blank" rel="noopener">'
                     f'Read in Hansard</a>')
    if event_id:
        # caption_timecode is precise; the Hansard timecode is the fallback.
        timecode = highlight.get("caption_timecode") or highlight.get("timecode")
        button = _watch_button(timecode, event_id)
        if button:
            links.append(button)
        links.append(f'<a href="{_esc(_watch_url(event_id, timecode))}" '
                     f'target="_blank" rel="noopener">parliamentlive.tv ↗</a>')
    cidx = highlight.get("contribution_index")
    if cidx is not None:
        links.append(f'<a href="#c{cidx}">The speech in full ↓</a>')
    if links:
        rows.append('<p class="links">' + "".join(links) + '</p>')

    debate_map = [d for d in (highlight.get("debate_map") or [])
                  if d.get("contribution_index") not in redacted]
    if debate_map:
        noun = "voice" if len(debate_map) == 1 else "voices"
        entries = "\n".join(_debate_entry(d, event_id) for d in debate_map)
        rows.append(
            f'<details class="debate"><summary>The debate around this · '
            f'{len(debate_map)} {noun}</summary>\n'
            f'<div class="dm-body">\n{entries}\n</div></details>')

    rows.append('</article>')
    return "\n".join(rows)


def _slug(text: str) -> str:
    """A stable anchor slug for a debate section title."""
    return "sec-" + re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")


_HONORIFICS = ("Mr ", "Mrs ", "Ms ", "Miss ")


def _plain_name(attribution: str) -> str:
    """A member's plain full name from a Hansard attribution — dropping the
    courtesy honorific, constituency and party."""
    a = (attribution or "").strip()
    if not a:
        return ""
    if a.startswith("The ") and "(" in a:
        # Office attribution — the name is the final parenthetical group.
        a = re.findall(r"\(([^)]*)\)", a)[-1].strip()
    else:
        # Name-first attribution — drop (constituency) and (party).
        a = re.sub(r"\s*\([^)]*\)", "", a).strip()
    for h in _HONORIFICS:
        if a.startswith(h) and " " in a[len(h):]:
            return a[len(h):]
    return a


def _office(attribution: str) -> str:
    """The Government office from a Hansard minister attribution, else ''.
    'The Minister for the Armed Forces (Luke Pollard)' yields the office."""
    a = (attribution or "").strip()
    if not a.startswith("The ") or "(" not in a:
        return ""
    office = a[:a.rfind("(")].strip()
    return office[4:] if office.startswith("The ") else office


def _redaction_note(c: dict) -> str:
    """Stand-in for a contribution withheld on legal-risk grounds — a neutral
    pointer to the official record, which carries absolute privilege."""
    link = c.get("permalink") or c.get("hansard_permalink")
    if link:
        return (f'<p class="redacted"><a href="{_esc(link)}" target="_blank" '
                f'rel="noopener">Not reproduced here. Read it in the official '
                f'record (Hansard) →</a></p>')
    return '<p class="redacted">Not reproduced here.</p>'


def _contribution_block(c: dict, event_id: Optional[str], redacted: set,
                        highlight_indexes: set) -> str:
    """One contribution in the full-sitting record — speaker, verbatim text,
    and a Watch button; a redacted contribution shows only a pointer to Hansard.
    A contribution that is itself a highlight carries a link back to its card."""
    idx = c.get("index")
    who = c.get("attributed_to")
    office = c.get("office")
    office_html = (f' <span class="c-office">{_esc(office)}</span>'
                   if office else "")
    if idx in redacted:
        head = (f'<p class="c-who">{_esc(who)}{office_html}</p>'
                if who else "")
        return (f'<div class="contribution" id="c{idx}">'
                f'{head}{_redaction_note(c)}</div>')
    raw = (c.get("text") or "").replace("\r\n", "\n")
    paras = [" ".join(p.split()) for p in re.split(r"\n\s*\n", raw) if p.strip()]
    body = "".join(f"<p>{_esc(p)}</p>" for p in paras)
    button = _watch_button(c.get("caption_timecode") or c.get("timecode"), event_id)
    head = ""
    if who or button:
        head = ('<p class="c-who">'
                + (_esc(who) if who else "")
                + office_html
                + (((" " if who else "") + button) if button else "")
                + '</p>')
    back = ""
    if idx in highlight_indexes:
        back = (f'<p class="back-hl"><a href="#hl-{idx}">'
                f'↑ Back to the highlight</a></p>')
    return f'<div class="contribution" id="c{idx}">{back}{head}{body}</div>'


_TITLE_FIXES = {
    "Prime Minister": "Prime Minister's Questions",
    "Engagements": "Prime Minister's Questions",
    "Middle East: Economic Response": "Economic Statement",
}


def _nice_title(title: str) -> str:
    """Hansard's section title, with the few opaque ones made reader-friendly."""
    return _TITLE_FIXES.get(title or "", title or "—")


def _section_tree_body(section: dict, children: dict, event_id: Optional[str],
                       redacted: set, highlight_indexes: set) -> str:
    """A section's contributions, with child sections nested as subheadings —
    a lone child folds straight in (e.g. Engagements within PMQs)."""
    parts = [_contribution_block(c, event_id, redacted, highlight_indexes)
             for c in section.get("contributions", [])]
    kids = children.get(section.get("section_id"), [])
    for kid in kids:
        sub = _section_tree_body(kid, children, event_id, redacted,
                                 highlight_indexes)
        if len(kids) > 1:
            parts.append(
                f'<div class="hs-sub" id="{_slug(kid.get("title", ""))}">'
                f'<h3 class="hs-subtitle">{_esc(kid.get("title") or "—")}</h3>\n'
                f'{sub}</div>')
        else:
            parts.append(sub)
    return "\n".join(p for p in parts if p)


def _full_sitting(indexed: dict, event_id: Optional[str], redacted: set,
                  highlight_indexes: set, summaries: dict) -> str:
    """The complete record — every debate of the day, in Hansard's own
    hierarchy: top-level debates, with sub-sections nested inside. Each
    top-level header carries an objective summary, revealed on hover."""
    sections = indexed.get("sections", [])
    if not sections:
        return ""
    ids = {s.get("section_id") for s in sections}
    children = {}
    tops = []
    for s in sections:
        pid = s.get("parent_id")
        if pid in ids:
            children.setdefault(pid, []).append(s)
        else:
            tops.append(s)

    def total(s):
        return (len(s.get("contributions", []))
                + sum(total(k) for k in children.get(s.get("section_id"), [])))

    blocks = []
    for s in tops:
        n = total(s)
        body = _section_tree_body(s, children, event_id, redacted,
                                  highlight_indexes)
        title = _nice_title(s.get("title", ""))
        summary = summaries.get(s.get("section_id"))
        summary_html = (f'<p class="hs-summary">{_esc(summary)}</p>'
                        if summary else "")
        blocks.append(
            f'<section class="hs" id="{_slug(s.get("title", ""))}">'
            f'<details class="hs-d" name="hs"><summary>'
            f'<span class="hs-row">'
            f'<span class="hs-title">{_esc(title)}</span>'
            f'<span class="hs-n">{n} contribution{"" if n == 1 else "s"}</span>'
            f'</span>{summary_html}'
            f'</summary>\n<div class="hs-body">\n{body}\n'
            f'<p class="hs-collapse"><button type="button">↑ Collapse</button></p>'
            f'\n</div></details></section>')

    return ('<section class="full-sitting" id="full-sitting">\n'
            '<div class="fs-head"><h2>The full sitting</h2>'
            '<p>Every debate of the day, in full: the complete record '
            'beneath the highlights.</p></div>\n'
            + "\n".join(blocks) + '\n</section>')


def render_page(result: dict, event_id: Optional[str] = None,
                indexed: Optional[dict] = None,
                all_days: Optional[list] = None,
                current_day: Optional[str] = None) -> str:
    """Render the full self-contained highlights page as an HTML string."""
    date = result.get("date", "")
    long_date = _long_date(date)
    redacted = {r.get("contribution_index")
                for r in result.get("redactions", [])}
    highlights = [h for h in result.get("highlights", [])
                  if h.get("contribution_index") not in redacted]
    overview = result.get("sitting_overview", "")

    # Display every speaker by their plain full name, and tag Government
    # ministers with the office Hansard attributes them by.
    member_name, member_role, idx_member = {}, {}, {}
    if indexed:
        for sec in indexed.get("sections", []):
            for c in sec.get("contributions", []):
                mid = c.get("member_id")
                idx_member[c.get("index")] = mid
                att = c.get("attributed_to") or ""
                if mid and "(" in att:
                    member_name[mid] = _plain_name(att)
                    office = _office(att)
                    if office:
                        member_role[mid] = office
        for sec in indexed.get("sections", []):
            for c in sec.get("contributions", []):
                mid = c.get("member_id")
                if mid in member_name:
                    c["attributed_to"] = member_name[mid]
                if mid in member_role:
                    c["office"] = member_role[mid]
    for h in highlights:
        if h.get("speaker_name"):
            h["speaker_name"] = _plain_name(h["speaker_name"])
        role = member_role.get(idx_member.get(h.get("contribution_index")))
        if role:
            h["office"] = role
        for e in h.get("debate_map", []):
            if e.get("speaker_name"):
                e["speaker_name"] = _plain_name(e["speaker_name"])
            erole = member_role.get(idx_member.get(e.get("contribution_index")))
            if erole:
                e["office"] = erole

    description = re.sub(r"\s+", " ", overview)[:200]

    player_html = ""
    if event_id:
        player_html = (
            '<section class="watch">\n'
            '<h2>Watch the sitting</h2>\n'
            '<div class="embed"><iframe id="hh-player" '
            f'data-src="{_esc(PLIVE_PLAYER.format(event_id=event_id))}" '
            'title="UK Parliament Player, House of Commons" '
            'allow="encrypted-media; autoplay; fullscreen" '
            'allowfullscreen></iframe></div>\n'
            '<p class="note">Click any ▶ button to jump the player '
            'to that moment.</p>\n</section>')

    highlight_indexes = {h.get("contribution_index") for h in highlights}
    section_summaries = {s.get("section_id"): s.get("summary", "")
                         for s in result.get("sections", [])}
    reading = "\n".join(
        _highlight_article(h, event_id, redacted) for h in highlights)
    if indexed:
        reading += "\n" + _full_sitting(
            indexed, event_id, redacted, highlight_indexes, section_summaries)

    if player_html:
        body = (f'<div class="cols">\n<main class="reading" id="highlights">\n'
                f'{reading}\n</main>\n'
                f'<aside class="viewer"><div class="viewer-sticky">\n{player_html}'
                f'\n</div></aside>\n</div>')
    else:
        body = (f'<main class="reading reading-solo" id="highlights">\n'
                f'{reading}\n</main>')

    counts = f'{len(highlights)} highlights · a non-partisan daily digest'

    rail_items = [("#top", "top", "↑", "Top"),
                  ("#highlights", "highlights", "★", "Highlights")]
    if indexed:
        rail_items.append(("#full-sitting", "full-sitting", "☰", "Full sitting"))
    rail = '<nav class="rail" aria-label="Jump to section">' + "".join(
        f'<a href="{h}" data-rail="{d}"><span class="rail-i">{i}</span>'
        f'<span class="rail-l">{_esc(l)}</span></a>'
        for h, d, i, l in rail_items) + '</nav>'

    days = sorted(all_days or [], reverse=True)
    daynav = ""
    if len(days) > 1:
        tabs = "".join(
            f'<a class="day-tab{" active" if d == current_day else ""}"'
            f' href="{d}.html">{_esc(_short_date(d))}</a>'
            for d in days)
        daynav = f'<nav class="days" aria-label="Sitting days">{tabs}</nav>'

    dayfoot = ""
    if len(days) > 1 and current_day in days:
        i = days.index(current_day)
        newer = days[i - 1] if i > 0 else None
        older = days[i + 1] if i + 1 < len(days) else None
        parts = []
        if older:
            parts.append(
                f'<a class="prev" href="{older}.html">'
                f'<span class="dir">← Previous sitting</span>'
                f'<span class="when">{_esc(_short_date(older))}</span></a>')
        if newer:
            parts.append(
                f'<a class="next" href="{newer}.html">'
                f'<span class="dir">Next sitting →</span>'
                f'<span class="when">{_esc(_short_date(newer))}</span></a>')
        if parts:
            dayfoot = (f'<nav class="day-foot" aria-label="Other sitting days">'
                       f'{"".join(parts)}</nav>')

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hansard Highlights · House of Commons, {_esc(long_date)}</title>
<meta name="description" content="{_esc(description)}">
<style>
{_CSS}</style>
</head>
<body>
{rail}
<div class="page">

<header id="top">
<p class="masthead">Hansard Highlights</p>
{daynav}
<h1>House of Commons<span class="date">{_esc(long_date)}</span></h1>
<p class="lede">{_esc(overview)}</p>
<p class="meta">{_esc(counts)}</p>
</header>

{body}

{dayfoot}

<footer>
<p><strong>Hansard Highlights</strong> is an independent, non-partisan daily
digest of the House of Commons. Each sitting day the full Official Report is
read, the most substantive contributions are selected by editorial judgement,
and the debate around each is mapped, with the complete record kept beneath,
in full.</p>
<p>Transcript text is from Hansard, used under the Open Parliament Licence.
Video is embedded from parliamentlive.tv. This is a free, non-commercial
publication, carries no advertising, and is a fair and accurate report of
parliamentary proceedings.</p>
<p class="genmeta">Compiled {_esc(result.get("generated_at", ""))}</p>
</footer>

</div>
<script>
{_JS}</script>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

def build(date: Optional[str] = None, out_dir: str = "output",
          site_dir: str = "site", event_id: Optional[str] = None,
          highlights_path: Optional[str] = None, verbose: bool = True) -> Path:
    """Render every processed sitting day into ``site_dir``: one page per day,
    with ``index.html`` the most recent. Every day is rebuilt each run so the
    date navigation on every page stays current."""
    out = Path(out_dir)
    days = sorted(p.name[len("highlights-"):-len(".json")]
                  for p in out.glob("highlights-*.json")
                  if "raw" not in p.name)
    if not days:
        raise PageError(
            f"No highlights-*.json in {out_dir}/. Run Step 2 first.")

    site = Path(site_dir)
    site.mkdir(parents=True, exist_ok=True)
    latest = days[-1]
    log = (lambda m: print(m, file=sys.stderr)) if verbose else (lambda m: None)

    for day in days:
        result = load_json(out / f"highlights-{day}.json")
        ev = result.get("event_id")
        if not ev:
            try:
                ev = find_commons_event(day)
            except EventLookupError:
                ev = None
        indexed = None
        indexed_path = out / f"transcript-indexed-{day}.json"
        if indexed_path.exists():
            indexed = load_json(indexed_path)
        html_text = render_page(result, event_id=ev, indexed=indexed,
                                all_days=days, current_day=day)
        (site / f"{day}.html").write_text(html_text, encoding="utf-8")
        if day == latest:
            (site / "index.html").write_text(html_text, encoding="utf-8")
        log(f"Built {day}: {result.get('highlight_count', 0)} highlights.")

    log(f"Wrote {len(days)} day page(s); index.html = {latest}.")
    page_path = site / "index.html"
    print(page_path)
    return page_path


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="hansard_highlights.build_page",
        description="Step 3 — render the highlights page for hosting.")
    parser.add_argument("--date", help="Sitting date YYYY-MM-DD.")
    parser.add_argument("--highlights", help="Path to a highlights-{date}.json.")
    parser.add_argument("--event-id",
                        help="parliamentlive.tv event GUID for the day's "
                             "Commons chamber. Auto-located from the date "
                             "if omitted.")
    parser.add_argument("--out-dir", default="output", help="Step 2 output dir.")
    parser.add_argument("--site-dir", default="site", help="Where to write the page.")
    args = parser.parse_args(argv)

    if args.date and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.date):
        parser.error("--date must be in YYYY-MM-DD format")

    try:
        build(date=args.date, out_dir=args.out_dir, site_dir=args.site_dir,
              event_id=args.event_id, highlights_path=args.highlights)
    except PageError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
