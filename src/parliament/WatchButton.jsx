import P from "../theme/palette";
import { usePlayer } from "./playerContext";
import { clock, toUtc } from "./helpers";

/**
 * A ▶ button that seeks the embedded parliamentlive.tv player to a
 * contribution's moment. Renders nothing when there is no usable
 * timecode or no event for the day.
 */
export default function WatchButton({ timecode, small = false }) {
  const { seek, eventId } = usePlayer();
  const hhmm = clock(timecode);
  const utc = toUtc(timecode);
  if (!eventId || !hhmm || !utc) return null;

  return (
    <button
      type="button"
      onClick={() => seek(utc)}
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: small ? "10px" : "11px",
        fontWeight: 500,
        cursor: "pointer",
        background: P.teal,
        color: "#FFFDF8",
        border: "none",
        borderRadius: 3,
        padding: small ? "3px 8px" : "5px 11px",
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
      }}
    >
      ▶ Watch {hhmm}
    </button>
  );
}
