import { useEffect, useMemo, useRef, useState } from "react";
import P from "../../theme/palette";
import { useJsonDataset } from "../../hooks/useDataset";
import useIsMobile from "../../hooks/useIsMobile";
import UKNSIPsMap, { CATEGORY_COLOR, CATEGORY_LABEL } from "../../components/UKNSIPsMap";
import ProjectTimeline from "../../components/ProjectTimeline";

/**
 * Construction-tab section: map of every NSIP on the Planning Inspectorate
 * register, with filter chips for category and stage and a side panel
 * showing the selected project's metadata, timeline, and PINS link.
 *
 * Phase 1 — flat metadata view. Phase 2 will layer cost data (GMPP), a
 * full project-history timeline (proposed → consent → quashed → revived),
 * and per-project representation counts on top of this same shell.
 */
export default function NSIPsMapSection() {
  const { data, loading, error } = useJsonDataset("nsips.json");
  const { data: timelinesData } = useJsonDataset("nsip-timelines.json");
  const { data: costsData } = useJsonDataset("nsip-costs.json");
  const timelines = timelinesData?.timelines || {};
  const costs = costsData?.costs || {};
  const projects = data?.projects || [];
  const isMobile = useIsMobile();
  const panelRef = useRef(null);
  const [selectedRef, setSelectedRef] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(new Set());
  const [stageFilter, setStageFilter] = useState(new Set());
  // Default view shows "live" projects (in consenting, in build, or
  // cancelled/completed since the current government took office on
  // 5 July 2024). Toggle adds projects that finished before that date —
  // historical context that isn't part of the current story.
  const [showCompleted, setShowCompleted] = useState(false);

  const stageOrder = useMemo(() => {
    const counts = {};
    for (const p of projects) counts[p.stage || "Unknown"] = (counts[p.stage || "Unknown"] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [projects]);

  // A project is "live" when there's still something happening — it's
  // pre-DCO, in build, has an upcoming target date, or was cancelled
  // /completed under the current government. Older completed schemes
  // are hidden by default to surface what's in flight today.
  const liveLookup = useMemo(() => {
    const CUTOFF = "2024-07-05"; // Labour government took office
    const live = new Set();
    for (const p of projects) {
      if (isLiveProject(p, timelines[p.ref], CUTOFF)) live.add(p.ref);
    }
    return live;
  }, [projects, timelines]);

  const visible = useMemo(() => {
    const cf = categoryFilter.size === 0 ? null : categoryFilter;
    const sf = stageFilter.size === 0 ? null : stageFilter;
    return projects.filter((p) => {
      if (cf && !cf.has(p.category)) return false;
      if (sf && !sf.has(p.stage || "Unknown")) return false;
      if (!showCompleted && !liveLookup.has(p.ref)) return false;
      return true;
    });
  }, [projects, categoryFilter, stageFilter, showCompleted, liveLookup]);

  const selected = useMemo(
    () => projects.find((p) => p.ref === selectedRef) || null,
    [projects, selectedRef],
  );

  // If a filter excludes the current selection, clear it so the side panel
  // doesn't show a project that isn't on the map.
  useEffect(() => {
    if (selected && !visible.includes(selected)) setSelectedRef(null);
  }, [selected, visible]);

  useEffect(() => {
    if (!isMobile || !selectedRef || !panelRef.current) return;
    panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedRef, isMobile]);

  const totalsByCategory = useMemo(() => {
    const t = {};
    for (const p of projects) t[p.category] = (t[p.category] || 0) + 1;
    return t;
  }, [projects]);

  const totalsByStage = useMemo(() => {
    const t = {};
    for (const p of projects) t[p.stage || "Unknown"] = (t[p.stage || "Unknown"] || 0) + 1;
    return t;
  }, [projects]);

  if (loading) return <Skeleton message="Loading NSIPs…" />;
  if (error || !data) return <Skeleton message={error ?? "No data"} />;

  return (
    <div>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 600,
        color: P.text, margin: "0 0 6px",
      }}>
        Nationally Significant Infrastructure Projects
      </h2>
      <p style={{
        fontFamily: "'DM Mono', monospace", fontSize: 13,
        color: P.textMuted, margin: "0 0 24px",
        lineHeight: 1.55, maxWidth: 760,
      }}>
        Every project on the Planning Inspectorate's DCO consenting register since 2010 ({projects.length} in total).
      </p>

      <Filters
        totalsByCategory={totalsByCategory}
        categoryFilter={categoryFilter}
        onToggleCategory={(k) => toggleSet(setCategoryFilter, k)}
        totalsByStage={totalsByStage}
        stageOrder={stageOrder}
        stageFilter={stageFilter}
        onToggleStage={(k) => toggleSet(setStageFilter, k)}
        visibleCount={visible.length}
        liveCount={liveLookup.size}
        totalCount={projects.length}
        showCompleted={showCompleted}
        onToggleShowCompleted={() => setShowCompleted((v) => !v)}
      />

      <div style={{
        display: "grid",
        gridTemplateColumns: !isMobile && selected ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
        gap: 16,
        marginTop: 12,
      }}>
        <div style={{
          background: P.bgCard,
          border: `1px solid ${P.border}`,
          borderRadius: 4,
          padding: 12,
        }}>
          <UKNSIPsMap
            projects={visible}
            selectedRef={selectedRef}
            onSelect={(p) => setSelectedRef(p.ref)}
          />
        </div>
        {selected && (
          <div ref={panelRef}>
            <ProjectPanel
              project={selected}
              timeline={timelines[selected.ref]}
              cost={costs[selected.ref]}
              onClose={() => setSelectedRef(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function toggleSet(setter, key) {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
}

function Filters({
  totalsByCategory, categoryFilter, onToggleCategory,
  totalsByStage, stageOrder, stageFilter, onToggleStage,
  visibleCount, liveCount, totalCount,
  showCompleted, onToggleShowCompleted,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <ChipRow label="View">
        <Chip
          label="Live projects"
          count={liveCount}
          color={null}
          active={!showCompleted}
          onClick={() => { if (showCompleted) onToggleShowCompleted(); }}
        />
        <Chip
          label="All (incl. completed pre-2024)"
          count={totalCount}
          color={null}
          active={showCompleted}
          onClick={() => { if (!showCompleted) onToggleShowCompleted(); }}
        />
      </ChipRow>
      <ChipRow label="Category">
        {Object.keys(CATEGORY_LABEL).map((k) => (
          <Chip
            key={k}
            label={CATEGORY_LABEL[k]}
            count={totalsByCategory[k] || 0}
            color={CATEGORY_COLOR[k]}
            active={categoryFilter.has(k)}
            onClick={() => onToggleCategory(k)}
          />
        ))}
      </ChipRow>
      <ChipRow label="Stage">
        {stageOrder.map((s) => (
          <Chip
            key={s}
            label={s}
            count={totalsByStage[s] || 0}
            active={stageFilter.has(s)}
            onClick={() => onToggleStage(s)}
          />
        ))}
        <span style={{
          fontSize: 11, color: P.textLight,
          fontFamily: "'DM Mono', monospace", marginLeft: 6,
        }}>
          {visibleCount} shown
        </span>
      </ChipRow>
    </div>
  );
}

function ChipRow({ label, children }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <span style={{
        fontSize: 10, color: P.textLight, fontFamily: "'DM Mono', monospace",
        textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4,
      }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({ label, count, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 10px",
        border: `1px solid ${active ? P.navy : P.border}`,
        background: active ? P.navy : "transparent",
        color: active ? P.bgCard : P.textMuted,
        fontFamily: "'DM Mono', monospace", fontSize: 11,
        letterSpacing: "0.04em",
        borderRadius: 16, cursor: "pointer",
        transition: "background 0.12s, color 0.12s, border-color 0.12s",
      }}
    >
      {color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />}
      {label}
      <span style={{ opacity: 0.7 }}>{count}</span>
    </button>
  );
}

function ProjectPanel({ project, timeline, cost, onClose }) {
  const events = projectEvents(project);
  return (
    <aside style={{
      background: P.bgCard,
      border: `1px solid ${P.border}`,
      borderRadius: 4,
      padding: "16px 18px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <span style={{
          fontSize: 10, color: CATEGORY_COLOR[project.category],
          fontFamily: "'DM Mono', monospace",
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          {CATEGORY_LABEL[project.category]} · {project.subtype}
        </span>
        <button onClick={onClose} style={{
          background: "transparent", border: "none", color: P.textMuted,
          fontFamily: "'DM Mono', monospace", fontSize: 11, cursor: "pointer", padding: 0,
        }}>Close ✕</button>
      </div>
      <h4 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 18, fontWeight: 600, color: P.text,
        margin: "6px 0 4px",
      }}>
        {project.name}
      </h4>
      <div style={{ fontSize: 11, color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>
        {project.applicant || "—"}
      </div>

      {project.delivery && <DeliveryBlock delivery={project.delivery} />}

      {cost && <CostBlock cost={cost} />}

      {project.judicialReviewCount > 0 && <JRBadge count={project.judicialReviewCount} />}

      {project.description && (
        <p style={{
          fontFamily: "'DM Mono', monospace", fontSize: 12, color: P.text,
          marginTop: 12, lineHeight: 1.5,
        }}>
          {project.description}
        </p>
      )}

      {timeline?.milestones && timeline.milestones.length >= 2 ? (
        <ProjectTimeline
          milestones={timeline.milestones}
          researcher={timeline.researcher}
          lastResearched={timeline.lastResearched}
        />
      ) : (
        events.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${P.border}` }}>
            <div style={{
              fontSize: 10, color: P.textLight, fontFamily: "'DM Mono', monospace",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
            }}>
              Examination history (PINS only)
            </div>
            {events.map((ev, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "84px 1fr",
                gap: 8, padding: "4px 0",
                fontFamily: "'DM Mono', monospace", fontSize: 11,
              }}>
                <span style={{ color: P.textLight }}>{ev.date}</span>
                <span style={{ color: P.text }}>{ev.label}</span>
              </div>
            ))}
          </div>
        )
      )}

      <a
        href={project.projectUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          marginTop: 14,
          fontFamily: "'DM Mono', monospace", fontSize: 11,
          letterSpacing: "0.06em", textTransform: "uppercase",
          color: P.teal, textDecoration: "none",
          borderBottom: `1px solid ${P.teal}`, paddingBottom: 1,
        }}
      >
        View on Planning Inspectorate ↗
      </a>
    </aside>
  );
}

function JRBadge({ count }) {
  // Surfaces the number of judicial-review milestones in the project
  // timeline. Count is derived from agent-researched timelines, so it
  // captures known JR filings/rulings/appeals; not exhaustive.
  return (
    <div style={{
      marginTop: 12, padding: "8px 12px",
      background: "rgba(201,75,26,0.08)", borderRadius: 3,
      border: `1px solid rgba(201,75,26,0.3)`,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{
        display: "inline-block", padding: "3px 9px",
        background: P.sienna, color: P.bgCard,
        fontFamily: "'Playfair Display', serif", fontSize: 14,
        fontWeight: 600, borderRadius: 12, minWidth: 24, textAlign: "center",
      }}>
        {count}
      </span>
      <div>
        <div style={{
          fontSize: 10, color: P.textLight, fontFamily: "'DM Mono', monospace",
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          Court challenges
        </div>
        <div style={{
          fontSize: 11, color: P.text, fontFamily: "'DM Mono', monospace",
          marginTop: 1,
        }}>
          {count === 1 ? "1 judicial review" : `${count} judicial-review milestones`} in project history
        </div>
      </div>
    </div>
  );
}

function CostBlock({ cost }) {
  // Renders the GMPP whole-life cost + Delivery Confidence Assessment
  // for projects on the Government Major Projects Portfolio.
  const wlc = cost.wholeLifeCostMillions;
  const fyB = cost.fyBaselineMillions;
  const fyF = cost.fyForecastMillions;
  const variance = cost.fyVariancePct;
  const dca = cost.dca || cost.sroDca;
  return (
    <div style={{
      marginTop: 12, padding: "10px 12px",
      background: "rgba(28,43,69,0.04)", borderRadius: 3,
      border: `1px solid ${P.border}`,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 6,
      }}>
        <span style={{
          fontSize: 10, color: P.textLight, fontFamily: "'DM Mono', monospace",
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          GMPP cost &amp; delivery confidence
        </span>
        {dca && (
          <span style={{
            display: "inline-block", padding: "2px 8px",
            background: DCA_COLOR[dca] || P.textMuted, color: P.bgCard,
            fontFamily: "'DM Mono', monospace", fontSize: 10,
            letterSpacing: "0.04em", borderRadius: 12,
          }}>
            {dca}
          </span>
        )}
      </div>
      {wlc != null && wlc > 0 && (
        <KeyValInline label="Whole-life cost" value={`£${wlc >= 1000 ? `${(wlc / 1000).toFixed(2)}bn` : `${wlc.toLocaleString()}m`}`} />
      )}
      {fyB != null && fyF != null && (
        <KeyValInline
          label={`FY ${cost.fyVariancePct != null && cost.fyVariancePct > 0 ? "overrun" : "variance"}`}
          value={`£${fyB.toLocaleString()}m → £${fyF.toLocaleString()}m${variance != null ? ` (${variance > 0 ? "+" : ""}${variance.toFixed(1)}%)` : ""}`}
        />
      )}
      {cost.startDate && cost.endDate && (
        <KeyValInline label="Window" value={`${cost.startDate} → ${cost.endDate}`} />
      )}
      {cost.gmppName && cost.gmppName !== cost.nsipName && (
        <div style={{
          marginTop: 6, fontSize: 10, color: P.textLight,
          fontFamily: "'DM Mono', monospace",
        }}>
          GMPP entry: {cost.gmppName}
        </div>
      )}
    </div>
  );
}

const DCA_COLOR = {
  GREEN:        P.teal,
  "AMBER/GREEN": P.teal,
  AMBER:        P.yellow,
  "AMBER/RED":  P.sienna,
  RED:          P.red,
};

function DeliveryBlock({ delivery }) {
  // Status colour: a quick traffic-light read on whether the consented
  // project is actually in the ground.
  const statusColor = STATUS_COLOR[delivery.status] || P.textMuted;
  return (
    <div style={{
      marginTop: 12, padding: "10px 12px",
      background: "rgba(28,43,69,0.04)", borderRadius: 3,
      border: `1px solid ${P.border}`,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 6,
      }}>
        <span style={{
          fontSize: 10, color: P.textLight, fontFamily: "'DM Mono', monospace",
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          Post-consent delivery (REPD)
        </span>
        {delivery.lastUpdated && (
          <span style={{ fontSize: 10, color: P.textLight, fontFamily: "'DM Mono', monospace" }}>
            updated {delivery.lastUpdated}
          </span>
        )}
      </div>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "3px 10px",
        background: statusColor, color: P.bgCard,
        fontFamily: "'DM Mono', monospace", fontSize: 11,
        letterSpacing: "0.04em", borderRadius: 12,
        marginBottom: 8,
      }}>
        {delivery.status}
      </div>
      {delivery.capacityMW != null && (
        <KeyValInline label="Capacity" value={`${formatMW(delivery.capacityMW)} (${delivery.technology || "—"})`} />
      )}
      {delivery.operationalDate && (
        <KeyValInline label="Operational" value={delivery.operationalDate} />
      )}
      {!delivery.operationalDate && delivery.constructionStartDate && (
        <KeyValInline label="Construction start" value={delivery.constructionStartDate} />
      )}
      {!delivery.operationalDate && !delivery.constructionStartDate && delivery.plannedOperationalDate && (
        <KeyValInline label="Planned operational" value={delivery.plannedOperationalDate} />
      )}
      {!delivery.operationalDate && !delivery.constructionStartDate && delivery.permissionGrantedDate && (
        <KeyValInline label="Permission granted" value={delivery.permissionGrantedDate} />
      )}
    </div>
  );
}

function KeyValInline({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", gap: 8,
      padding: "3px 0",
      fontFamily: "'DM Mono', monospace", fontSize: 12,
    }}>
      <span style={{ color: P.textLight, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span style={{ color: P.text }}>{value}</span>
    </div>
  );
}

function formatMW(mw) {
  if (mw == null) return "—";
  if (mw >= 1000) return `${(mw / 1000).toFixed(2)} GW`;
  return `${Math.round(mw)} MW`;
}

const STATUS_COLOR = {
  "Operational":                  P.teal,
  "Under Construction":           P.yellow,
  "Awaiting Construction":        P.grey,
  "Planning Permission Granted":  P.grey,
  "Planning Application Submitted": "#9DA0A8",
  "Planning Application Withdrawn": P.sienna,
  "Planning Permission Refused":  P.red,
  "Planning Permission Expired":  P.sienna,
  "Abandoned":                    P.sienna,
  "Decommissioned":               P.sienna,
  "Revised":                      P.grey,
};

function projectEvents(p) {
  return [
    { date: p.dateOfApplication,    label: "Application submitted" },
    { date: p.dateApplicationAccepted, label: "Application accepted" },
    { date: p.dateExaminationStarted, label: "Examination opened" },
    { date: p.dateExaminationClosed,  label: "Examination closed" },
    { date: p.dateOfRecommendation,   label: "Recommendation to Secretary of State" },
    { date: p.dateOfDecision,         label: "Decision issued" },
    { date: p.dateWithdrawn,          label: "Application withdrawn" },
  ].filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Decide whether an NSIP is "live" — still worth attention today.
 *   - Anything pre-DCO-decision stages is live.
 *   - Post-decision schemes are live if they have recent activity (date >= cutoff),
 *     a future-target milestone, an active REPD delivery status,
 *     or any cancellation/withdrawal.
 *   - Schemes whose only post-decision activity is a years-old "operational"
 *     milestone are NOT live — they completed before the current government and
 *     belong in the historical view.
 */
function isLiveProject(p, timeline, cutoffDate) {
  const liveStages = [
    "Pre-application", "Pre-examination", "Examination",
    "Recommendation", "Decision",
  ];
  if (liveStages.includes(p.stage)) return true;

  // Active REPD delivery indicates something still happening on the ground.
  const ds = p.delivery?.status || "";
  if (/under construction|awaiting construction|planning application submitted|planning permission granted|revised/i.test(ds)) {
    return true;
  }

  // Scan timeline milestones for recent or future activity.
  if (timeline?.milestones?.length) {
    for (const m of timeline.milestones) {
      if (m.expected) return true; // future target
      if (m.phase === "cancelled" || m.phase === "jr") {
        const d = String(m.date || "");
        if (d >= cutoffDate) return true;
      }
      // build / fid / consent milestones since the cutoff = current government activity
      if (["build", "fid", "consent", "revived", "examination"].includes(m.phase)) {
        const d = String(m.date || "");
        if (d >= cutoffDate) return true;
      }
    }
  }

  // PINS examination dates since the cutoff
  const dates = [
    p.dateOfApplication, p.dateApplicationAccepted, p.dateExaminationStarted,
    p.dateExaminationClosed, p.dateOfRecommendation, p.dateOfDecision,
    p.dateWithdrawn,
  ].filter(Boolean);
  for (const d of dates) {
    if (d >= cutoffDate) return true;
  }

  return false;
}

function Skeleton({ message }) {
  return (
    <div style={{
      marginTop: 32, height: 200, display: "flex",
      alignItems: "center", justifyContent: "center",
      background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 4,
    }}>
      <span style={{ fontSize: 12, color: P.textMuted, fontFamily: "'DM Mono', monospace" }}>
        {message}
      </span>
    </div>
  );
}
