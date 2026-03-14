import React, { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import html2canvas from "html2canvas";
import { ResponsiveContainer } from "recharts";
import P from "../theme/palette";
import { track } from "../analytics";

const CANVAS = 1080;
const DPR = 2;
const BG = "#FFFDF8";
const CSS = CANVAS / DPR; // 540 — Recharts renders at mobile width, html2canvas 2× scales to 1080
const SHARE_CHART_H = 350;

/**
 * Strip card chrome so it fills the capture area cleanly.
 */
function withShareCardStyle(el) {
  if (!React.isValidElement(el)) return el;
  const style = el.props?.style;
  if (
    style &&
    (style.border || style.borderRadius || style.boxShadow || style.margin)
  ) {
    return React.cloneElement(el, {
      style: {
        ...style,
        margin: 0,
        border: "none",
        borderRadius: 0,
        boxShadow: "none",
      },
    });
  }
  return el;
}

/**
 * Walk the React element tree and add isAnimationActive={false} to all
 * Recharts components (Line, Area, Bar, etc.).
 */
function withNoAnimation(el) {
  if (!React.isValidElement(el)) return el;
  const isComponent = typeof el.type !== "string";
  const extraProps = isComponent ? { isAnimationActive: false } : {};
  if (el.props?.children) {
    return React.cloneElement(
      el,
      extraProps,
      React.Children.map(el.props.children, (c) => withNoAnimation(c))
    );
  }
  return isComponent ? React.cloneElement(el, extraProps) : el;
}

/**
 * Override ResponsiveContainer height so the chart fills the share image.
 */
function withShareHeight(el, h) {
  if (!React.isValidElement(el)) return el;
  if (el.type === ResponsiveContainer) {
    return React.cloneElement(
      el,
      { height: h },
      ...React.Children.toArray(el.props.children)
    );
  }
  if (el.props?.children) {
    return React.cloneElement(
      el,
      {},
      React.Children.map(el.props.children, (c) => withShareHeight(c, h))
    );
  }
  return el;
}

export default function ShareableChart({ title, children, shareContent, shareHeight }) {
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(false);
  const [portal, setPortal] = useState(null);
  const captureResolve = useRef(null);

  useEffect(() => {
    if (!portal) return;
    let cancelled = false;

    (async () => {
      await document.fonts.ready;
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r))
      );
      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 500));
      if (cancelled) return;

      // Scale only HTML text for social readability (SVG ticks left to Recharts)
      // html2canvas scale:2 doubles everything, so set sizes at half the target:
      //   heading 14px → 24px (outputs 48px), sources 10px → 10px (outputs 20px)
      const chartArea = portal.querySelector("[data-share-chart]");
      if (chartArea) {
        // HTML: headings, legends, sources — scale up for readability
        chartArea.querySelectorAll("div, span, p, a, button").forEach((node) => {
          const fs = parseFloat(window.getComputedStyle(node).fontSize);
          if (!fs) return;
          if (fs <= 11) node.style.fontSize = `${fs}px`;  // sources/legends → unchanged, 2× scale handles it
          else if (fs <= 14) node.style.fontSize = "24px"; // card headings → 48px
          else node.style.fontSize = `${fs * 1.5}px`;
        });
        // SVG: shrink ticks so 2× scale produces ~16px output
        chartArea.querySelectorAll("text, tspan").forEach((node) => {
          node.style.fontSize = "10px";
        });
      }

      // Expand SVG clipPath rects (Recharts clips to original viewport)
      portal.querySelectorAll("svg clipPath rect").forEach((rect) => {
        rect.setAttribute("height", "9999");
        rect.setAttribute("width", "9999");
      });

      const captured = await html2canvas(portal, {
        scale: DPR,
        useCORS: true,
        backgroundColor: BG,
        width: CSS,
        height: CSS,
      });

      if (captureResolve.current) {
        captureResolve.current(captured);
        captureResolve.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [portal]);

  const generate = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    let wrapper = null;
    try {
      wrapper = document.createElement("div");
      Object.assign(wrapper.style, {
        position: "fixed",
        left: "-9999px",
        top: "0",
        width: `${CSS}px`,
        height: `${CSS}px`,
        overflow: "hidden",
        background: BG,
        zIndex: "-1",
      });
      document.body.appendChild(wrapper);

      const captured = await new Promise((resolve) => {
        captureResolve.current = resolve;
        setPortal(wrapper);
      });

      setPortal(null);
      document.body.removeChild(wrapper);
      wrapper = null;

      const blob = await new Promise((r) => captured.toBlob(r, "image/png"));
      const file = new File([blob], `stateofbritain-${slugify(title)}.png`, {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${title} — State of Britain`,
          url: "https://stateofbritain.uk",
        });
        track("share_chart", { title, method: "native" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            `${title} — State of Britain`
          )}&url=${encodeURIComponent("https://stateofbritain.uk")}`,
          "_blank",
          "noopener"
        );
        track("share_chart", { title, method: "desktop" });
      }
    } catch (e) {
      console.error("Share failed:", e);
      setPortal(null);
      if (wrapper?.parentNode) document.body.removeChild(wrapper);
    } finally {
      setBusy(false);
    }
  }, [busy, title]);

  const shareSource = shareContent
    ? React.Children.only(shareContent)
    : React.Children.only(children);
  const shareChildren = withShareHeight(
    withNoAnimation(withShareCardStyle(shareSource)),
    shareHeight ?? SHARE_CHART_H
  );

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div>{children}</div>

      {portal &&
        createPortal(
          <div
            style={{
              width: CSS,
              height: CSS,
              background: BG,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{ height: 2, background: P.sienna, flexShrink: 0 }}
            />
            <div data-share-chart style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
              {shareChildren}
            </div>
            <div
              style={{
                textAlign: "right",
                padding: "8px 24px",
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: P.textMuted,
                opacity: 0.3,
                flexShrink: 0,
              }}
            >
              stateofbritain.uk
            </div>
          </div>,
          portal
        )}

      <button
        onClick={generate}
        disabled={busy}
        aria-label="Share chart"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: `1px solid ${P.border}`,
          background: hover
            ? "rgba(255,253,248,0.95)"
            : "rgba(255,253,248,0.7)",
          cursor: busy ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s, opacity 0.2s",
          opacity: hover || busy ? 1 : 0,
          padding: 0,
          zIndex: 10,
        }}
      >
        {busy ? (
          <span
            style={{
              width: 14,
              height: 14,
              border: `2px solid ${P.border}`,
              borderTopColor: P.sienna,
              borderRadius: "50%",
              display: "inline-block",
              animation: "shareSpinner 0.6s linear infinite",
            }}
          />
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={P.textMuted}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        )}
      </button>
      <style>{`@keyframes shareSpinner { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
