import { forwardRef, useEffect } from "react";
import P from "../theme/palette";

const PLIVE_PLAYER =
  "https://videoplayback.parliamentlive.tv/Player/Index/{id}?audioOnly=False&autoStart=False&script=True";

/**
 * The single embedded parliamentlive.tv player. The forwarded ref points at
 * the <iframe>; the page's seek() postMessages to its contentWindow.
 *
 * Compliance: the official player is embedded unaltered, with editorial text
 * only ever as page HTML around it, never on it (parliamentlive.tv T&Cs).
 */
const SittingPlayer = forwardRef(function SittingPlayer({ eventId, compact = false }, ref) {
  useEffect(() => {
    const frame = ref && typeof ref !== "function" ? ref.current : null;
    if (!frame || !eventId) return;
    // The player must carry this page's URL in its hash, or its sendUTCTime()
    // throws on every timeupdate event, which breaks seeking.
    frame.src = PLIVE_PLAYER.replace("{id}", eventId) +
      "#" + encodeURIComponent(window.location.href);
  }, [eventId, ref]);

  if (!eventId) return null;

  return (
    <section>
      {!compact && (
        <div
          style={{
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: P.teal,
            fontWeight: 500,
            marginBottom: 8,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          Watch the sitting
        </div>
      )}
      <div
        style={{
          position: "relative",
          paddingTop: "56.25%",
          background: "#000",
          border: `1px solid ${P.border}`,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <iframe
          ref={ref}
          title="UK Parliament Player, House of Commons"
          allow="encrypted-media; autoplay; fullscreen"
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
      </div>
      {!compact && (
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            color: P.textLight,
            lineHeight: 1.5,
            margin: "8px 0 0",
          }}
        >
          Click any ▶ button to jump the player to that moment.
        </p>
      )}
    </section>
  );
});

export default SittingPlayer;
