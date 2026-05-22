import { useState, useEffect, useMemo } from "react";
import P from "../theme/palette";
import WatchButton from "./WatchButton";
import { niceTitle, slug, paragraphs, plainName, office } from "./helpers";

const BACK_LINK = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "12px",
  fontWeight: 500,
  color: P.teal,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "3px 0",
};
const C_WHO = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "12.5px",
  fontWeight: 500,
  color: P.teal,
  margin: "0 0 4px",
};
const C_OFFICE = { fontWeight: 400, color: P.textLight };
const C_PARA = {
  fontFamily: "'DM Mono', monospace",
  fontWeight: 300,
  fontSize: "13px",
  lineHeight: 1.65,
  color: P.textMuted,
  margin: "0 0 8px",
};

// One contribution in the full-sitting record — verbatim, with a Watch
// button; a redacted contribution shows only a pointer to Hansard.
function ContributionBlock({ c, redacted, isHighlight, onBack }) {
  const idx = c.index;
  const who = plainName(c.attributed_to);
  const off = office(c.attributed_to) || c.role;

  if (redacted.has(idx)) {
    const link = c.permalink || c.hansard_permalink;
    return (
      <div id={`c${idx}`} style={{ margin: "18px 0 0", scrollMarginTop: 90 }}>
        {who && <p style={C_WHO}>{who}{off && <span style={C_OFFICE}> · {off}</span>}</p>}
        <p style={{
          fontFamily: "'DM Mono', monospace", fontSize: "12px",
          fontStyle: "italic", color: P.textLight, margin: 0,
        }}>
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: P.textLight }}>
              Not reproduced here. Read it in the official record (Hansard) →
            </a>
          ) : "Not reproduced here."}
        </p>
      </div>
    );
  }

  return (
    <div
      id={`c${idx}`}
      style={{
        scrollMarginTop: 90,
        ...(isHighlight
          ? { background: "rgba(30,107,94,0.06)", borderRadius: 3, padding: "10px 12px", margin: "18px -12px 0" }
          : { margin: "18px 0 0" }),
      }}
    >
      {isHighlight && (
        <button type="button" onClick={() => onBack(idx)} style={{ ...BACK_LINK, marginBottom: 4 }}>
          ↑ Back to the highlight
        </button>
      )}
      {who && (
        <p style={C_WHO}>
          {who}{off && <span style={C_OFFICE}> · {off}</span>}{" "}
          <WatchButton timecode={c.caption_timecode || c.timecode} small />
        </p>
      )}
      {paragraphs(c.text).map((p, i) => <p key={i} style={C_PARA}>{p}</p>)}
    </div>
  );
}

/**
 * The complete record — every debate of the day in Hansard's own hierarchy,
 * as an exclusive accordion. Each top-level header carries the objective
 * editorial summary. Only the open section's contributions are mounted.
 */
export default function FullSitting({ indexed, summaries, redacted, highlightIndexes, jump, onBack }) {
  const [openId, setOpenId] = useState(null);

  const { tops, childrenMap, indexToTop, totals } = useMemo(() => {
    const sections = indexed?.sections || [];
    const ids = new Set(sections.map((s) => s.section_id));
    const childrenMap = {};
    const tops = [];
    for (const s of sections) {
      if (ids.has(s.parent_id)) (childrenMap[s.parent_id] ||= []).push(s);
      else tops.push(s);
    }
    const indexToTop = {};
    const collect = (s, topId) => {
      for (const c of s.contributions || []) indexToTop[c.index] = topId;
      for (const k of childrenMap[s.section_id] || []) collect(k, topId);
    };
    for (const t of tops) collect(t, t.section_id);
    const totals = {};
    const total = (s) =>
      (s.contributions || []).length +
      (childrenMap[s.section_id] || []).reduce((a, k) => a + total(k), 0);
    for (const t of tops) totals[t.section_id] = total(t);
    return { tops, childrenMap, indexToTop, totals };
  }, [indexed]);

  // A "speech in full" jump from a highlight — open its debate and scroll.
  useEffect(() => {
    if (!jump) return;
    const topId = indexToTop[jump.index];
    if (topId == null) return;
    setOpenId(topId);
    const t = setTimeout(() => {
      document.getElementById(`c${jump.index}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 70);
    return () => clearTimeout(t);
  }, [jump, indexToTop]);

  if (!indexed || tops.length === 0) return null;

  // A section's contributions, with child sections nested as subheadings.
  const sectionBody = (s) => {
    const parts = (s.contributions || []).map((c) => (
      <ContributionBlock
        key={`c${c.index}`}
        c={c}
        redacted={redacted}
        isHighlight={highlightIndexes.has(c.index)}
        onBack={onBack}
      />
    ));
    const kids = childrenMap[s.section_id] || [];
    for (const k of kids) {
      parts.push(
        kids.length > 1 ? (
          <div key={`k${k.section_id}`}>
            <h4 style={{
              fontFamily: "'DM Mono', monospace", fontSize: "13px", fontWeight: 500,
              color: P.text, margin: "26px 0 2px", paddingTop: 14, borderTop: `1px solid ${P.border}`,
            }}>
              {niceTitle(k.title)}
            </h4>
            {sectionBody(k)}
          </div>
        ) : (
          <div key={`k${k.section_id}`}>{sectionBody(k)}</div>
        )
      );
    }
    return parts;
  };

  return (
    <section
      id="full-sitting"
      style={{ marginTop: 48, paddingTop: 28, borderTop: `2px solid ${P.borderStrong}` }}
    >
      <h2 style={{
        fontFamily: "'Playfair Display', serif", fontSize: "22px",
        fontWeight: 600, color: P.text, margin: "0 0 4px",
      }}>
        The full sitting
      </h2>
      <p style={{
        fontFamily: "'DM Mono', monospace", fontSize: "12px", color: P.textMuted, margin: "0 0 16px",
      }}>
        Every debate of the day, in full — the complete record beneath the highlights.
      </p>

      {tops.map((s) => {
        const open = openId === s.section_id;
        const n = totals[s.section_id];
        const summary = summaries[s.section_id];
        return (
          <div
            key={s.section_id}
            id={slug(s.title)}
            style={{ borderBottom: `1px solid ${P.border}`, scrollMarginTop: 90 }}
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : s.section_id)}
              style={{
                width: "100%", textAlign: "left", background: "none",
                border: "none", cursor: "pointer", padding: "13px 0", display: "block",
              }}
            >
              <span style={{
                display: "flex", justifyContent: "space-between", gap: 14, alignItems: "baseline",
              }}>
                <span style={{
                  fontFamily: "'Playfair Display', serif", fontSize: "15px",
                  fontWeight: 600, color: P.teal,
                }}>
                  {open ? "▾" : "▸"} {niceTitle(s.title)}
                </span>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: "11px",
                  color: P.textLight, whiteSpace: "nowrap",
                }}>
                  {n} contribution{n === 1 ? "" : "s"}
                </span>
              </span>
              {summary && (
                <span style={{
                  display: "block", fontFamily: "'DM Mono', monospace", fontWeight: 300,
                  fontSize: "12px", lineHeight: 1.55, color: P.textMuted, margin: "6px 0 0",
                }}>
                  {summary}
                </span>
              )}
            </button>
            {open && (
              <div style={{ padding: "2px 0 22px" }}>
                {sectionBody(s)}
                <button
                  type="button"
                  onClick={() => setOpenId(null)}
                  style={{ ...BACK_LINK, marginTop: 18 }}
                >
                  ↑ Collapse
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
