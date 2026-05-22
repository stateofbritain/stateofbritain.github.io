import { useState } from "react";
import P from "../theme/palette";
import WatchButton from "./WatchButton";
import { usePlayer } from "./playerContext";
import { watchUrl, speakerMeta, office } from "./helpers";

const LINK = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "12px",
  color: P.teal,
  textDecoration: "none",
  fontWeight: 500,
};

// One voice in the surrounding debate — the debate-map entry.
function DebateEntry({ entry }) {
  const meta = speakerMeta({
    office: office(entry.attributed_to),
    party: entry.party,
    constituency: entry.constituency,
  });
  return (
    <div style={{ margin: "14px 0 0", paddingLeft: 14, borderLeft: `2px solid ${P.border}` }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", margin: 0, color: P.text }}>
        {entry.role && (
          <span style={{ color: P.teal, fontWeight: 500, marginRight: 7 }}>{entry.role}</span>
        )}
        <strong style={{ fontWeight: 500 }}>{entry.speaker_name}</strong>
        {meta && <span style={{ color: P.textLight }}> · {meta}</span>}
      </p>
      {entry.quote && (
        <p style={{
          fontFamily: "'Playfair Display', serif", fontSize: "14px",
          lineHeight: 1.55, color: P.textMuted, margin: "5px 0 0",
        }}>
          “{entry.quote}”
        </p>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 7, flexWrap: "wrap" }}>
        <WatchButton timecode={entry.caption_timecode || entry.timecode} small />
        {entry.hansard_permalink && (
          <a href={entry.hansard_permalink} target="_blank" rel="noopener noreferrer"
             style={{ ...LINK, fontSize: "11px" }}>
            Hansard ↗
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * One editorial highlight — rank, category, the standfirst summary, speaker
 * attribution, the verbatim key quote, the analysis, source links, and the
 * collapsible debate map of surrounding contributions.
 */
export default function HighlightCard({ highlight, onJump }) {
  const [mapOpen, setMapOpen] = useState(false);
  const { eventId } = usePlayer();
  const h = highlight;
  const meta = speakerMeta({
    office: office(h.attributed_to) || h.speaker_role,
    party: h.party,
    constituency: h.constituency,
  });
  const timecode = h.caption_timecode || h.timecode;
  const hansard = h.hansard_permalink || h.hansard_url;
  const debateMap = h.debate_map || [];

  return (
    <article
      id={`hl-${h.contribution_index}`}
      style={{
        background: P.bgCard,
        border: `1px solid ${P.border}`,
        borderRadius: 3,
        padding: "22px 24px",
        boxShadow: "0 1px 4px rgba(28,43,69,0.04)",
        scrollMarginTop: 90,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
        <span style={{
          fontFamily: "'Playfair Display', serif", fontSize: "26px",
          fontWeight: 700, color: P.teal, lineHeight: 1,
        }}>
          {h.rank}
        </span>
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500,
          textTransform: "uppercase", letterSpacing: "0.13em", color: P.textLight,
        }}>
          {h.category}
        </span>
      </div>

      {h.summary && (
        <p style={{
          fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: 600,
          lineHeight: 1.45, color: P.text, margin: "0 0 12px",
        }}>
          {h.summary}
        </p>
      )}

      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px", margin: 0, color: P.text }}>
        <strong style={{ fontWeight: 500 }}>{h.speaker_name}</strong>
        {meta && <span style={{ color: P.textLight }}> · {meta}</span>}
      </p>
      {h.debate && (
        <p style={{
          fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase",
          letterSpacing: "0.08em", color: P.textLight, margin: "4px 0 0",
        }}>
          {h.debate}
        </p>
      )}

      {h.key_quote && (
        <blockquote style={{
          margin: "16px 0 0", padding: "2px 0 2px 18px", borderLeft: `3px solid ${P.teal}`,
          fontFamily: "'Playfair Display', serif", fontSize: "16px", lineHeight: 1.5, color: P.text,
        }}>
          “{h.key_quote}”
        </blockquote>
      )}
      {h.analysis && (
        <p style={{
          fontFamily: "'DM Mono', monospace", fontWeight: 300, fontSize: "13px",
          lineHeight: 1.7, color: P.textMuted, margin: "14px 0 0",
        }}>
          {h.analysis}
        </p>
      )}

      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
        {hansard && (
          <a href={hansard} target="_blank" rel="noopener noreferrer" style={LINK}>
            Read in Hansard ↗
          </a>
        )}
        <WatchButton timecode={timecode} />
        {eventId && (
          <a href={watchUrl(eventId, timecode)} target="_blank" rel="noopener noreferrer" style={LINK}>
            parliamentlive.tv ↗
          </a>
        )}
        {h.contribution_index != null && (
          <button
            type="button"
            onClick={() => onJump?.(h.contribution_index)}
            style={{ ...LINK, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            The speech in full ↓
          </button>
        )}
      </div>

      {debateMap.length > 0 && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${P.border}`, paddingTop: 2 }}>
          <button
            type="button"
            onClick={() => setMapOpen((o) => !o)}
            style={{
              fontFamily: "'DM Mono', monospace", fontSize: "12px", fontWeight: 500,
              color: P.teal, background: "none", border: "none", cursor: "pointer",
              padding: "9px 0 3px",
            }}
          >
            {mapOpen ? "▾" : "▸"} The debate around this · {debateMap.length}{" "}
            {debateMap.length === 1 ? "voice" : "voices"}
          </button>
          {mapOpen && (
            <div style={{ paddingBottom: 4 }}>
              {debateMap.map((e, i) => <DebateEntry key={i} entry={e} />)}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
