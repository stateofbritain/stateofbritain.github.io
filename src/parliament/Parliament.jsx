import { useState, useEffect, useRef, useCallback } from "react";
import P from "../theme/palette";
import HighlightCard from "./HighlightCard";
import SittingPlayer from "./SittingPlayer";
import FullSitting from "./FullSitting";
import { PlayerContext } from "./playerContext";
import { longDate, shortDate } from "./helpers";

const BASE = import.meta.env.BASE_URL || "/";

// Width tracking — the two-column layout and the jump rail need breakpoints
// finer than the global isMobile flag.
function useWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Loading({ message }) {
  return (
    <div style={{
      padding: "80px 0", textAlign: "center", fontFamily: "'DM Mono', monospace",
      fontSize: "13px", color: P.textLight,
    }}>
      {message}
    </div>
  );
}

// The fixed left rail — landmarks for a tall page.
function JumpRail() {
  const items = [
    { id: "parliament-top", icon: "↑", label: "Top" },
    { id: "highlights", icon: "★", label: "Highlights" },
    { id: "full-sitting", icon: "☰", label: "Full sitting" },
  ];
  return (
    <nav style={{
      position: "fixed", left: 10, top: "50%", transform: "translateY(-50%)",
      display: "flex", flexDirection: "column", gap: 6, zIndex: 50,
    }}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          title={it.label}
          onClick={() => scrollToId(it.id)}
          style={{
            width: 38, height: 38, borderRadius: "50%", cursor: "pointer",
            border: `1px solid ${P.border}`, background: P.bgCard, color: P.textMuted,
            fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {it.icon}
        </button>
      ))}
    </nav>
  );
}

/**
 * The /parliament tab — Hansard Highlights. A daily, non-partisan digest of
 * the House of Commons: ranked editorial highlights with a click-to-seek
 * parliamentlive.tv player, the debate mapped around each, and the complete
 * sitting record beneath.
 */
export default function Parliament({ date, navigate }) {
  const width = useWidth();
  const twoCol = width >= 1080;
  const showRail = width >= 1480;

  const [index, setIndex] = useState(null);
  const [data, setData] = useState(null);
  const [indexed, setIndexed] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [jump, setJump] = useState(null);

  useEffect(() => {
    fetch(`${BASE}data/parliament/index.json`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setIndex)
      .catch(() => setLoadError(true));
  }, []);

  const activeDate = date || index?.latest || null;

  useEffect(() => {
    if (!activeDate) return;
    setData(null);
    setIndexed(null);
    fetch(`${BASE}data/parliament/highlights-${activeDate}.json`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setLoadError(true));
    fetch(`${BASE}data/parliament/transcript-indexed-${activeDate}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setIndexed)
      .catch(() => setIndexed(null));
  }, [activeDate]);

  // The single embedded player — every ▶ button postMessages a seek to it.
  const playerRef = useRef(null);
  const eventId = data?.event_id || null;
  const seek = useCallback((utc) => {
    const frame = playerRef.current;
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage(JSON.stringify({
      function: "seekPostMessage",
      sender: document.location.href,
      data: `seek-program-date-time_${utc}_delaystart`,
    }), "*");
  }, []);

  if (loadError) {
    return <Loading message="The parliamentary record could not be loaded." />;
  }
  if (!index || !data) {
    return <Loading message="Loading the sitting…" />;
  }

  const redacted = new Set((data.redactions || []).map((r) => r.contribution_index));
  const highlights = (data.highlights || []).filter((h) => !redacted.has(h.contribution_index));
  const highlightIndexes = new Set(highlights.map((h) => h.contribution_index));
  const summaries = {};
  for (const s of data.sections || []) summaries[s.section_id] = s.summary;

  const days = index.days || [];
  const dateList = days.map((d) => d.date);
  const pos = dateList.indexOf(activeDate);
  const newer = pos > 0 ? dateList[pos - 1] : null;
  const older = pos >= 0 && pos + 1 < dateList.length ? dateList[pos + 1] : null;

  const onJump = (i) => setJump({ index: i, nonce: Date.now() });
  const onBack = (i) => scrollToId(`hl-${i}`);

  return (
    <PlayerContext.Provider value={{ seek, eventId }}>
      {showRail && <JumpRail />}
      <div style={{ padding: "32px 0 8px", animation: "fadeSlideIn 0.4s ease both" }}>

        {/* Header */}
        <header id="parliament-top">
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: "11px", fontWeight: 500,
            textTransform: "uppercase", letterSpacing: "0.18em", color: P.teal,
          }}>
            Hansard Highlights
          </div>

          {days.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "14px 0 2px" }}>
              {days.map((d) => {
                const active = d.date === activeDate;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => navigate("parliament", d.date)}
                    style={{
                      fontFamily: "'DM Mono', monospace", fontSize: "12px", fontWeight: 500,
                      cursor: "pointer", padding: "5px 12px", borderRadius: 16,
                      border: `1px solid ${active ? P.teal : P.border}`,
                      background: active ? P.teal : P.bgCard,
                      color: active ? "#FFFDF8" : P.textMuted,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {shortDate(d.date)}
                  </button>
                );
              })}
            </div>
          )}

          <h2 style={{
            fontFamily: "'Playfair Display', serif", fontSize: "clamp(24px, 4vw, 34px)",
            fontWeight: 700, color: P.text, margin: "14px 0 2px", lineHeight: 1.15,
          }}>
            House of Commons
          </h2>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: "14px", color: P.textMuted,
            marginBottom: 14,
          }}>
            {longDate(activeDate)}
          </div>
          {data.sitting_overview && (
            <p style={{
              fontFamily: "'Playfair Display', serif", fontSize: "17px", lineHeight: 1.5,
              color: P.text, margin: "0 0 10px", maxWidth: 660,
            }}>
              {data.sitting_overview}
            </p>
          )}
          <p style={{
            fontFamily: "'DM Mono', monospace", fontSize: "11px", textTransform: "uppercase",
            letterSpacing: "0.07em", color: P.textLight, margin: 0,
          }}>
            {highlights.length} highlights · a non-partisan daily digest
          </p>
          <button
            type="button"
            onClick={() => navigate("parliament", "about")}
            style={{
              fontFamily: "'DM Mono', monospace", fontSize: "12px", fontWeight: 500,
              color: P.teal, background: "none", border: "none", cursor: "pointer",
              padding: 0, marginTop: 10,
            }}
          >
            Why this exists →
          </button>
        </header>

        {/* Highlights + sticky player */}
        <div style={{
          display: "flex",
          flexDirection: twoCol ? "row" : "column",
          gap: twoCol ? 40 : 0,
          alignItems: "flex-start",
          marginTop: 24,
        }}>
          <main
            id="highlights"
            style={{
              flex: twoCol ? "1 1 0" : "none",
              width: twoCol ? "auto" : "100%",
              minWidth: 0,
              maxWidth: twoCol ? 640 : "none",
              order: 0,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {highlights.map((h) => (
                <HighlightCard key={h.contribution_index} highlight={h} onJump={onJump} />
              ))}
            </div>
            <FullSitting
              indexed={indexed}
              summaries={summaries}
              redacted={redacted}
              highlightIndexes={highlightIndexes}
              jump={jump}
              onBack={onBack}
            />
          </main>

          {eventId && (
            <aside
              style={{
                flex: twoCol ? "1 1 0" : "none",
                width: twoCol ? "auto" : "100%",
                minWidth: 0,
                order: twoCol ? 0 : -1,
                position: "sticky",
                top: twoCol ? 16 : 0,
                alignSelf: "flex-start",
                ...(twoCol
                  ? {}
                  : {
                      zIndex: 20, background: P.bg, padding: "8px 0 10px",
                      marginBottom: 8, boxShadow: "0 7px 14px -12px rgba(28,43,69,0.55)",
                    }),
              }}
            >
              <SittingPlayer ref={playerRef} eventId={eventId} compact={!twoCol} />
            </aside>
          )}
        </div>

        {/* Previous / next sitting */}
        {(older || newer) && (
          <nav style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 40 }}>
            {older && (
              <button
                type="button"
                onClick={() => navigate("parliament", older)}
                style={dayFootStyle("left")}
              >
                <span style={dayFootDir}>← Previous sitting</span>
                <span style={dayFootWhen}>{shortDate(older)}</span>
              </button>
            )}
            {newer && (
              <button
                type="button"
                onClick={() => navigate("parliament", newer)}
                style={{ ...dayFootStyle("right"), marginLeft: "auto" }}
              >
                <span style={dayFootDir}>Next sitting →</span>
                <span style={dayFootWhen}>{shortDate(newer)}</span>
              </button>
            )}
          </nav>
        )}

        {/* Open Parliament Licence notice — the legal basis; wording is verbatim. */}
        <div style={{
          marginTop: 40, paddingTop: 22, borderTop: `1px solid ${P.border}`,
          fontFamily: "'DM Mono', monospace", fontWeight: 300, fontSize: "12px",
          lineHeight: 1.7, color: P.textLight,
        }}>
          <p style={{ margin: "0 0 10px" }}>
            <strong style={{ fontWeight: 500, color: P.textMuted }}>Hansard Highlights</strong> is
            an independent, non-partisan daily digest of the House of Commons. Each sitting day the
            full Official Report is read, the most substantive contributions are selected by
            editorial judgement, and the debate around each is mapped, with the complete record
            kept beneath, in full.
          </p>
          <p style={{ margin: "0 0 10px" }}>
            Transcript text is from Hansard, used under the Open Parliament Licence. Video is
            embedded from parliamentlive.tv. This is a free, non-commercial publication, carries no
            advertising, and is a fair and accurate report of parliamentary proceedings.
          </p>
          {data.generated_at && (
            <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Compiled {data.generated_at}
            </p>
          )}
        </div>
      </div>
    </PlayerContext.Provider>
  );
}

function dayFootStyle(align) {
  return {
    fontFamily: "'DM Mono', monospace", cursor: "pointer", display: "flex",
    flexDirection: "column", gap: 3, padding: "11px 16px", borderRadius: 6,
    border: `1px solid ${P.border}`, background: P.bgCard, minWidth: 150,
    textAlign: align === "right" ? "right" : "left",
  };
}
const dayFootDir = { fontSize: "11px", color: P.textLight };
const dayFootWhen = { fontSize: "14px", fontWeight: 500, color: P.teal };
