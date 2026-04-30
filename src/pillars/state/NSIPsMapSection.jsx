import { useEffect, useMemo, useState } from "react";
import P from "../../theme/palette";
import { useJsonDataset } from "../../hooks/useDataset";
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
  const timelines = timelinesData?.timelines || {};
  const projects = data?.projects || [];
  const [selectedRef, setSelectedRef] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(new Set());
  const [stageFilter, setStageFilter] = useState(new Set());

  const stageOrder = useMemo(() => {
    const counts = {};
    for (const p of projects) counts[p.stage || "Unknown"] = (counts[p.stage || "Unknown"] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [projects]);

  const visible = useMemo(() => {
    const cf = categoryFilter.size === 0 ? null : categoryFilter;
    const sf = stageFilter.size === 0 ? null : stageFilter;
    return projects.filter((p) => {
      if (cf && !cf.has(p.category)) return false;
      if (sf && !sf.has(p.stage || "Unknown")) return false;
      return true;
    });
  }, [projects, categoryFilter, stageFilter]);

  const selected = useMemo(
    () => projects.find((p) => p.ref === selectedRef) || null,
    [projects, selectedRef],
  );

  // If a filter excludes the current selection, clear it so the side panel
  // doesn't show a project that isn't on the map.
  useEffect(() => {
    if (selected && !visible.includes(selected)) setSelectedRef(null);
  }, [selected, visible]);

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

  const deliveryRollup = useMemo(() => {
    let operationalMW = 0;
    let underConstructionMW = 0;
    let consentedMW = 0; // granted but not yet operational
    let opCount = 0;
    let ucCount = 0;
    for (const p of projects) {
      const d = p.delivery;
      if (!d) continue;
      const cap = d.capacityMW || 0;
      if (/operational/i.test(d.status || "")) { operationalMW += cap; opCount++; }
      else if (/under construction/i.test(d.status || "")) { underConstructionMW += cap; ucCount++; }
      else if (/permission granted|awaiting construction/i.test(d.status || "")) { consentedMW += cap; }
    }
    return { operationalMW, underConstructionMW, consentedMW, opCount, ucCount };
  }, [projects]);

  if (loading) return <Skeleton message="Loading NSIPs…" />;
  if (error || !data) return <Skeleton message={error ?? "No data"} />;

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 22, fontWeight: 600, color: P.text, margin: "0 0 6px",
      }}>
        Nationally Significant Infrastructure Projects
      </h3>
      <p style={{
        fontFamily: "'DM Mono', monospace", fontSize: 13,
        color: P.textMuted, margin: "0 0 12px",
      }}>
        Every project on the Planning Inspectorate's DCO consenting register since 2010 ({projects.length} in total).
        Energy projects are joined to DESNZ's REPD for post-consent delivery status. Circle size scales with years in the planning system.
      </p>

      <DeliveryRollupBar rollup={deliveryRollup} />


      <Filters
        totalsByCategory={totalsByCategory}
        categoryFilter={categoryFilter}
        onToggleCategory={(k) => toggleSet(setCategoryFilter, k)}
        totalsByStage={totalsByStage}
        stageOrder={stageOrder}
        stageFilter={stageFilter}
        onToggleStage={(k) => toggleSet(setStageFilter, k)}
        visibleCount={visible.length}
      />

      <div style={{
        display: "grid",
        gridTemplateColumns: selected ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
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
          <ProjectPanel
            project={selected}
            timeline={timelines[selected.ref]}
            onClose={() => setSelectedRef(null)}
          />
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
  visibleCount,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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

function DeliveryRollupBar({ rollup }) {
  const { operationalMW, underConstructionMW, consentedMW, opCount, ucCount } = rollup;
  if (operationalMW === 0 && underConstructionMW === 0 && consentedMW === 0) return null;
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 18,
      padding: "10px 14px", marginBottom: 10,
      background: P.bgCard, border: `1px solid ${P.border}`, borderRadius: 4,
    }}>
      <RollupStat color={P.teal} label="Operational" mw={operationalMW} count={opCount} />
      <RollupStat color={P.yellow} label="Under construction" mw={underConstructionMW} count={ucCount} />
      <RollupStat color={P.grey} label="Consented, not yet building" mw={consentedMW} />
      <span style={{
        fontSize: 10, color: P.textLight, fontFamily: "'DM Mono', monospace",
        marginLeft: "auto", alignSelf: "center",
      }}>
        Energy NSIPs only · capacity per REPD
      </span>
    </div>
  );
}

function RollupStat({ color, label, mw, count }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
      <div>
        <div style={{
          fontSize: 10, color: P.textLight, fontFamily: "'DM Mono', monospace",
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          {label}
        </div>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600,
          color: P.text, lineHeight: 1.1,
        }}>
          {formatMW(mw)}
          {count != null && <span style={{
            fontSize: 11, fontFamily: "'DM Mono', monospace", color: P.textMuted,
            fontWeight: 400, marginLeft: 6,
          }}>· {count} projects</span>}
        </div>
      </div>
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

function ProjectPanel({ project, timeline, onClose }) {
  const events = projectEvents(project);
  return (
    <aside style={{
      background: P.bgCard,
      border: `1px solid ${P.border}`,
      borderRadius: 4,
      padding: "16px 18px",
      maxHeight: 720,
      overflowY: "auto",
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

      <KeyVal label="Stage" value={project.stage || "—"} />
      <KeyVal label="Years in system" value={project.yearsInSystem != null ? `${project.yearsInSystem} yrs` : "—"} />
      <KeyVal label="Region" value={project.region || "—"} />
      <KeyVal label="Location" value={project.location || "—"} />

      {project.delivery && <DeliveryBlock delivery={project.delivery} />}

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
          summary={timeline.summary}
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

function KeyVal({ label, value }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "120px 1fr",
      gap: 8, padding: "6px 0",
      borderBottom: `1px dashed ${P.border}`,
      fontFamily: "'DM Mono', monospace", fontSize: 12,
    }}>
      <span style={{
        fontSize: 10, color: P.textLight,
        textTransform: "uppercase", letterSpacing: "0.08em",
      }}>{label}</span>
      <span style={{ color: P.text }}>{value}</span>
    </div>
  );
}

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
