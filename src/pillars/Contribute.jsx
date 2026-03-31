import { useState, useRef, useEffect } from "react";
import P from "../theme/palette";
import useIsMobile from "../hooks/useIsMobile";

// Replace with your Google Apps Script deployment URL after setup
// See scripts/google-apps-script.js for setup instructions
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxe0o8gieqssvL8X7nH-TDtILq62-9f7HUGtWtCt0fl_GwRrSrRKIM6QsKmAEbAajEU2Q/exec";


export default function Contribute() {
  const isMobile = useIsMobile();

  // Main form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [recognition, setRecognition] = useState("anonymous"); // anonymous | name | custom
  const [customAlias, setCustomAlias] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const fileRef = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Deletion form state
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteStatus, setDeleteStatus] = useState("idle");

  const h3Style = {
    fontFamily: "'Playfair Display', serif",
    fontSize: "18px",
    fontWeight: 600,
    color: P.text,
    margin: "0 0 8px",
  };

  const pStyle = {
    fontSize: "13px",
    color: P.textMuted,
    lineHeight: 1.7,
    fontFamily: "'DM Mono', monospace",
    fontWeight: 300,
    margin: "0 0 20px",
  };

  const labelStyle = {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: P.textMuted,
    fontWeight: 500,
    fontFamily: "'DM Mono', monospace",
    marginBottom: 6,
    display: "block",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    fontSize: "13px",
    fontFamily: "'DM Mono', monospace",
    fontWeight: 300,
    color: P.text,
    background: P.bgCard,
    border: `1px solid ${P.border}`,
    borderRadius: 3,
    outline: "none",
    lineHeight: 1.6,
    boxSizing: "border-box",
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]); // strip data URL prefix
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !consent) return;

    setStatus("submitting");
    const payload = {
      name,
      email,
      recognition: recognition === "custom" ? `Custom: ${customAlias}` : recognition,
      message,
    };

    const file = fileRef.current?.files?.[0];
    if (file) {
      payload.fileName = file.name;
      payload.fileType = file.type;
      payload.fileData = await readFileAsBase64(file);
    }

    // Fire and forget — no-cors means we cannot read the response anyway,
    // so show success immediately rather than making the user wait
    fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(payload),
    });
    setStatus("success");
    setName("");
    setEmail("");
    setRecognition("anonymous");
    setCustomAlias("");
    setMessage("");
    setConsent(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDeleteRequest = async (e) => {
    e.preventDefault();
    if (!deleteEmail.trim()) return;

    fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({ type: "deletion", email: deleteEmail }),
    });
    setDeleteStatus("success");
    setDeleteEmail("");
  };

  return (
    <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.4s ease both" }}>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(24px, 4vw, 34px)",
          fontWeight: 600,
          color: P.text,
          margin: "0 0 8px",
        }}
      >
        Contribute
      </h2>
      <p style={{ ...pStyle, fontSize: "14px", ...(isMobile ? {} : { maxWidth: 620 }) }}>
        State of Britain aims to be a community resource. The form below is
        purposefully broad, to capture all kinds of contribution: data sources,
        corrections, observations from the ground, topic suggestions, or
        anything else. All submissions are read.
      </p>

      {/* ── Submission Form ───────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={h3Style}>Submit a contribution</h3>

        {status === "success" ? (
          <div
            style={{
              borderLeft: `3px solid ${P.teal}`,
              background: P.bgCard,
              padding: "20px 24px",
              borderRadius: 3,
              marginBottom: 20,
            }}
          >
            <p style={{ ...pStyle, color: P.text, fontWeight: 500, margin: "0 0 8px" }}>
              Thank you for your contribution.
            </p>
            <p style={{ ...pStyle, margin: "0 0 12px" }}>
              Your submission has been received and will be reviewed.
            </p>
            <button
              onClick={() => setStatus("idle")}
              style={{
                fontSize: "12px",
                fontFamily: "'DM Mono', monospace",
                color: P.teal,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              Submit another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ ...(isMobile ? {} : { maxWidth: 560 }) }}>
            {status === "error" && (
              <div
                style={{
                  borderLeft: `3px solid ${P.red}`,
                  background: P.bgCard,
                  padding: "14px 18px",
                  borderRadius: 3,
                  marginBottom: 20,
                }}
              >
                <p style={{ ...pStyle, color: P.red, margin: 0 }}>
                  Something went wrong. Please try again, or email your contribution
                  directly to{" "}
                  <a href="mailto:jackaspinall1@gmail.com?subject=Stateofbritain" style={{ color: P.red }}>
                    jackaspinall1@gmail.com
                  </a>.
                </p>
              </div>
            )}

            {/* Message */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Your contribution</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={8}
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="What would you like to share?"
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
                placeholder="For follow-up questions"
              />
            </div>

            {/* Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                placeholder="Your name"
              />
            </div>

            {/* Recognition */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>How should we credit you?</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { value: "anonymous", label: "Anonymous" },
                  { value: "name", label: "Use my name above" },
                  { value: "custom", label: "Use a custom alias" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: "12px",
                      fontFamily: "'DM Mono', monospace",
                      color: P.textMuted,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="recognition"
                      value={opt.value}
                      checked={recognition === opt.value}
                      onChange={() => setRecognition(opt.value)}
                      style={{ accentColor: P.teal }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              {recognition === "custom" && (
                <input
                  type="text"
                  value={customAlias}
                  onChange={(e) => setCustomAlias(e.target.value)}
                  style={{ ...inputStyle, marginTop: 8 }}
                  placeholder="Your preferred alias"
                />
              )}
            </div>

            {/* File upload */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Attach a file (optional)</label>
              <input
                type="file"
                ref={fileRef}
                accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.json"
                style={{
                  fontSize: "12px",
                  fontFamily: "'DM Mono', monospace",
                  color: P.textMuted,
                }}
              />
              <div style={{ fontSize: "10px", color: P.textLight, fontFamily: "'DM Mono', monospace", marginTop: 4 }}>
                CSV, Excel, PDF, images, or JSON. Max 10 MB.
              </div>
            </div>

            {/* Privacy notice */}
            <div
              style={{
                fontSize: "11px",
                color: P.textLight,
                fontFamily: "'DM Mono', monospace",
                lineHeight: 1.6,
                marginBottom: 16,
                padding: "12px 14px",
                background: "rgba(28,43,69,0.02)",
                borderRadius: 3,
              }}
            >
              <strong style={{ color: P.textMuted }}>How your data is handled:</strong>{" "}
              Submissions are stored in a private Google Sheet and forwarded to
              the site maintainer by email. Uploaded files are saved to Google
              Drive. Submissions may be published in edited form; contributors
              are not identified unless they request attribution. You can request
              deletion of your data using the form at the bottom of this page.
            </div>

            {/* Consent checkbox */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: "12px",
                  fontFamily: "'DM Mono', monospace",
                  color: P.textMuted,
                  lineHeight: 1.5,
                }}
              >
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  style={{ marginTop: 3, accentColor: P.teal }}
                />
                I consent to my submission being reviewed and potentially published
                on State of Britain
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "submitting" || !message.trim() || !consent}
              style={{
                fontSize: "12px",
                fontFamily: "'DM Mono', monospace",
                fontWeight: 500,
                color: P.bgCard,
                background: P.teal,
                border: "none",
                borderRadius: 3,
                padding: "10px 28px",
                cursor: status === "submitting" || !message.trim() || !consent ? "not-allowed" : "pointer",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                opacity: status === "submitting" || !message.trim() || !consent ? 0.6 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {status === "submitting" ? "Sending..." : "Submit"}
            </button>
          </form>
        )}
      </section>

      {/* ── What we are looking for ──────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={h3Style}>What we are looking for</h3>
        <p style={pStyle}>
          The best insights often come from people doing the work: teachers,
          nurses, engineers, council officers, planners, and anyone who sees how
          the numbers play out in practice. Official statistics tell part of the
          story; the view from the ground fills in the rest.
        </p>
        <p style={pStyle}>
          Contributions may be edited for consistency with the site's editorial
          standards: traceable to a primary source, neutral in tone, and as
          complete as the data allows. Not everything will be published, but
          everything is read.
        </p>
      </section>

      {/* ── Community Contributions ────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={h3Style}>Community contributions</h3>
        <p style={pStyle}>
          The following data and suggestions have been contributed by readers and
          incorporated into the site.
        </p>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 12,
        }}>
          {[
            { topic: "Housebuilding", detail: "EPC lodgements and brick deliveries as leading indicators of new builds", contributor: "Greg Boggis" },
            { topic: "Personal Finance", detail: "Mortgage approvals and cash ISA balances from Bank of England datasets", contributor: "Greg Boggis" },
          ].map((c, i) => (
            <div key={i} style={{
              padding: "10px 14px",
              background: P.bgCard,
              border: `1px solid ${P.border}`,
              borderRadius: 3,
              fontSize: "12px",
              fontFamily: "'DM Mono', monospace",
              color: P.textMuted,
              lineHeight: 1.5,
            }}>
              <span style={{ fontWeight: 500, color: P.text }}>{c.topic}</span>
              {" — "}{c.detail}
              <span style={{ color: P.textLight }}>{" · "}{c.contributor}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Deletion Request ──────────────────────────────────── */}
      <section
        style={{
          borderTop: `1px solid ${P.border}`,
          paddingTop: 24,
          marginBottom: 20,
        }}
      >
        <h3 style={{ ...h3Style, fontSize: "14px", color: P.textMuted }}>
          Request data deletion
        </h3>
        <p style={{ ...pStyle, fontSize: "11px", color: P.textLight }}>
          If you have previously submitted a contribution and would like your data
          removed, enter the email address you used. We will delete your
          submission within 30 days.
        </p>

        {deleteStatus === "success" ? (
          <p style={{ ...pStyle, fontSize: "12px", color: P.teal }}>
            Deletion request sent. Your data will be removed within 30 days.
          </p>
        ) : (
          <form
            onSubmit={handleDeleteRequest}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              ...(isMobile ? { flexDirection: "column", alignItems: "stretch" } : { maxWidth: 440 }),
            }}
          >
            <input
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              required
              placeholder="Your email"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="submit"
              disabled={deleteStatus === "submitting" || !deleteEmail.trim()}
              style={{
                fontSize: "11px",
                fontFamily: "'DM Mono', monospace",
                fontWeight: 500,
                color: P.textMuted,
                background: "none",
                border: `1px solid ${P.border}`,
                borderRadius: 3,
                padding: "10px 16px",
                cursor: deleteStatus === "submitting" || !deleteEmail.trim() ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                opacity: deleteStatus === "submitting" ? 0.6 : 1,
              }}
            >
              {deleteStatus === "submitting" ? "Sending..." : "Request deletion"}
            </button>
          </form>
        )}
        {deleteStatus === "error" && (
          <p style={{ ...pStyle, fontSize: "11px", color: P.red, marginTop: 8 }}>
            Something went wrong. Please email{" "}
            <a href="mailto:jackaspinall1@gmail.com?subject=Stateofbritain%20-%20Deletion%20Request" style={{ color: P.red }}>
              jackaspinall1@gmail.com
            </a>{" "}
            directly.
          </p>
        )}
      </section>
    </div>
  );
}
