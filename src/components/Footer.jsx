import P from "../theme/palette";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: `1px solid ${P.border}`,
        padding: "20px 0 44px",
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: P.textLight,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.06em",
        }}
      >
        STATE OF BRITAIN &middot; {new Date().getFullYear()}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: P.textLight,
          fontFamily: "'DM Mono', monospace",
        }}
      >
        Personal project by Jack Aspinall &middot; Data sourced from official UK government statistics
        &middot;{" "}
        <a
          href="/data/api"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState(null, "", "/data/api");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
          style={{ color: P.textLight, textDecoration: "underline" }}
        >
          Data & API
        </a>
        {" "}&middot;{" "}
        <a
          href="/about"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState(null, "", "/about");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
          style={{ color: P.textLight, textDecoration: "underline" }}
        >
          About
        </a>
        {" "}&middot;{" "}
        <a
          href="/contribute"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState(null, "", "/contribute");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
          style={{ color: P.textLight, textDecoration: "underline" }}
        >
          Contribute
        </a>
      </div>
    </footer>
  );
}
