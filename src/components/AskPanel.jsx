import { useState, useRef, useEffect, useCallback } from "react";
import P from "../theme/palette";

const SCRIPT_URL ="https://script.google.com/macros/s/AKfycbxe0o8gieqssvL8X7nH-TDtILq62-9f7HUGtWtCt0fl_GwRrSrRKIM6QsKmAEbAajEU2Q/exec";

// Map dataset IDs to site pages (first/primary page for each)
const DATASET_ROUTES = {
  "gp-access": { path: "/foundations/healthcare/gp", label: "General Practice" },
  "nhs-waiting": { path: "/foundations/healthcare/waiting", label: "NHS Waiting Lists" },
  "nhs-workforce": { path: "/foundations/healthcare/workforce", label: "NHS Workforce" },
  "nhs-funding": { path: "/foundations/healthcare/funding", label: "NHS Funding" },
  "health-outcomes": { path: "/foundations/healthcare/outcomes", label: "Health Outcomes" },
  "mental-health": { path: "/foundations/healthcare/mental", label: "Mental Health" },
  "hospital-capacity": { path: "/foundations/healthcare/capacity", label: "Hospital Capacity" },
  "family": { path: "/foundations/family", label: "Family & Fertility" },
  "housing-stock": { path: "/foundations/housing/stock", label: "Housing Stock" },
  "housing-supply": { path: "/foundations/housing/supply", label: "Housebuilding" },
  "housing-prices": { path: "/foundations/housing/prices", label: "Housing Prices" },
  "housing-density": { path: "/foundations/housing/density", label: "Housing Density" },
  "safety": { path: "/foundations/safety", label: "Personal Safety" },
  "cpih": { path: "/foundations/food", label: "Food & Cost of Living" },
  "energy": { path: "/foundations/energy/overview", label: "Energy" },
  "water": { path: "/foundations/water/performance", label: "Water Industry" },
  "reservoirs": { path: "/foundations/water/reservoirs", label: "Reservoirs" },
  "environment": { path: "/foundations/environment", label: "Environment" },
  "culture": { path: "/foundations/culture", label: "Culture & Religion" },
  "childrens-social-care": { path: "/foundations/socialCare/children", label: "Children's Social Care" },
  "adult-social-care": { path: "/foundations/socialCare/adults", label: "Adult Social Care" },
  "jobs": { path: "/growth/jobs/overview", label: "Jobs & Employment" },
  "unemployment": { path: "/growth/jobs/unemployment", label: "Unemployment" },
  "startups": { path: "/growth/startups", label: "Startups" },
  "research": { path: "/growth/research", label: "Research & Development" },
  "productivity": { path: "/growth/productivity", label: "Productivity" },
  "workforce": { path: "/growth/pq", label: "Public Sector Workforce" },
  "investment": { path: "/growth/investment", label: "Investment" },
  "infrastructure": { path: "/growth/transport/roads", label: "Transport" },
  "airports": { path: "/growth/transport/airports", label: "Airports" },
  "industrial": { path: "/growth/industrial", label: "Industrial Production" },
  "education": { path: "/growth/education", label: "Education" },
  "justice": { path: "/state/justice", label: "Justice & Crime" },
  "defence": { path: "/state/defence/spending", label: "Defence" },
  "immigration": { path: "/state/immigration", label: "Immigration" },
  "taxation": { path: "/spending/spending/taxation", label: "Taxation" },
  "borrowing": { path: "/spending/spending/borrowing", label: "Borrowing & Debt" },
  "money-supply": { path: "/spending/spending/moneySupply", label: "Money Supply" },
  "local-government": { path: "/spending/localGov", label: "Local Government" },
  "spending": { path: "/spending/spending/overview", label: "Government Spending" },
};

export default function AskPanel({ open, onClose, isMobile }) {
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | answer | error
  const [answer, setAnswer] = useState("");
  const [datasets, setDatasets] = useState([]);
  const [loadingStep, setLoadingStep] = useState(0);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const cacheRef = useRef(new Map());

  // Focus input on open
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const q = question.trim();
      if (!q) return;

      // Check session cache
      const cached = cacheRef.current.get(q.toLowerCase());
      if (cached) {
        setAnswer(cached.answer);
        setDatasets(cached.datasets || []);
        setStatus("answer");
        return;
      }

      setStatus("loading");
      setLoadingStep(0);
      setAnswer("");
      setDatasets([]);

      // Animate loading steps
      const step1 = setTimeout(() => setLoadingStep(1), 1200);
      const step2 = setTimeout(() => setLoadingStep(2), 3000);

      try {
        const res = await fetch(SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ type: "ask", question: q }),
        });
        const data = await res.json();

        clearTimeout(step1);
        clearTimeout(step2);

        if (data.error || data.status === "error") {
          setAnswer(data.error || data.message || "Something went wrong.");
          setStatus("error");
          return;
        }

        setAnswer(data.answer || "No answer returned.");
        setDatasets(data.datasets || []);
        setStatus("answer");

        // Cache in session
        cacheRef.current.set(q.toLowerCase(), {
          answer: data.answer,
          datasets: data.datasets,
        });
      } catch (err) {
        clearTimeout(step1);
        clearTimeout(step2);
        setAnswer(
          "Unable to reach the server. Please check your connection and try again."
        );
        setStatus("error");
      }
    },
    [question]
  );

  if (!open) return null;

  const panelStyle = isMobile
    ? {
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: "80vh",
        background: P.bgCard,
        borderTop: `1px solid ${P.border}`,
        borderRadius: "12px 12px 0 0",
        boxShadow: "0 -8px 32px rgba(28,43,69,0.15)",
        zIndex: 1000,
        padding: "20px 16px",
        overflowY: "auto",
        animation: "askSlideUp 0.25s ease both",
      }
    : {
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 420,
        background: P.bgCard,
        borderLeft: `1px solid ${P.border}`,
        boxShadow: "-8px 0 32px rgba(28,43,69,0.1)",
        zIndex: 1000,
        padding: "32px 24px",
        overflowY: "auto",
        animation: "askSlideIn 0.25s ease both",
      };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(28,43,69,0.2)",
          zIndex: 999,
          animation: "askFadeIn 0.2s ease both",
        }}
      />

      <div ref={panelRef} style={panelStyle}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "18px",
              fontWeight: 600,
              color: P.text,
              margin: 0,
            }}
          >
            Ask the data
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: P.textLight,
              fontSize: "18px",
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="e.g. What is the UK fertility rate?"
            rows={2}
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: "13px",
              fontFamily: "'DM Mono', monospace",
              fontWeight: 300,
              color: P.text,
              background: P.bg,
              border: `1px solid ${P.border}`,
              borderRadius: 3,
              outline: "none",
              resize: "vertical",
              lineHeight: 1.6,
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            disabled={status === "loading" || !question.trim()}
            style={{
              marginTop: 8,
              fontSize: "12px",
              fontFamily: "'DM Mono', monospace",
              fontWeight: 500,
              color: P.bgCard,
              background: P.navy,
              border: "none",
              borderRadius: 3,
              padding: "8px 20px",
              cursor:
                status === "loading" || !question.trim()
                  ? "not-allowed"
                  : "pointer",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              opacity: status === "loading" || !question.trim() ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {status === "loading" ? "Thinking..." : "Ask"}
          </button>
        </form>

        {/* Loading state — stepped narrative */}
        {status === "loading" && (
          <div style={{ padding: "16px 0" }}>
            {[
              "Locating datasets...",
              "Identifying relevant sources...",
              "Reading the data...",
            ].map((step, i) => (
              <div
                key={i}
                style={{
                  fontSize: "12px",
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 300,
                  color: loadingStep >= i ? P.textMuted : P.border,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "color 0.3s",
                }}
              >
                <span style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: loadingStep > i ? P.teal : loadingStep === i ? P.navy : P.border,
                  transition: "background 0.3s",
                  flexShrink: 0,
                }} />
                {step}
              </div>
            ))}
            <div
              style={{
                marginTop: 8,
                height: 2,
                background: P.border,
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: "40%",
                  background: P.navy,
                  borderRadius: 1,
                  animation: "askProgress 1.5s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        )}

        {/* Answer */}
        {(status === "answer" || status === "error") && (
          <div
            style={{
              borderLeft: `3px solid ${status === "error" ? P.red : P.teal}`,
              background: P.bg,
              padding: "16px 18px",
              borderRadius: 3,
              marginBottom: 12,
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: P.text,
                fontFamily: "'DM Mono', monospace",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {answer}
            </p>

            {datasets.length > 0 && (() => {
              const primary = DATASET_ROUTES[datasets[0]];
              return (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: `1px solid ${P.border}`,
                  }}
                >
                  {primary && (
                    <button
                      onClick={() => {
                        onClose();
                        window.history.pushState(null, "", primary.path);
                        window.dispatchEvent(new PopStateEvent("popstate"));
                      }}
                      style={{
                        fontSize: "11px",
                        fontFamily: "'DM Mono', monospace",
                        fontWeight: 500,
                        color: P.bgCard,
                        background: P.navy,
                        border: "none",
                        borderRadius: 3,
                        padding: "7px 16px",
                        cursor: "pointer",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        marginBottom: 10,
                      }}
                    >
                      View the data
                    </button>
                  )}
                  <div
                    style={{
                      fontSize: "10px",
                      color: P.textLight,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    Sources:{" "}
                    {datasets.map((d, i) => {
                      const route = DATASET_ROUTES[d];
                      return (
                        <span key={d}>
                          {i > 0 && ", "}
                          {route ? (
                            <a
                              href={route.path}
                              onClick={(e) => {
                                e.preventDefault();
                                onClose();
                                window.history.pushState(null, "", route.path);
                                window.dispatchEvent(new PopStateEvent("popstate"));
                              }}
                              style={{ color: P.teal, textDecoration: "underline" }}
                            >
                              {route.label}
                            </a>
                          ) : d}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}


        {/* Disclaimer */}
        <div
          style={{
            fontSize: "10px",
            color: P.textLight,
            fontFamily: "'DM Mono', monospace",
            lineHeight: 1.5,
            marginTop: "auto",
            paddingTop: 16,
            borderTop: `1px solid ${P.border}`,
          }}
        >
          Answers are AI-generated from official statistics. Always verify
          important claims against the source data. Questions and answers are
          recorded anonymously to improve the site's data coverage.
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes askSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes askSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes askFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes askProgress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </>
  );
}
