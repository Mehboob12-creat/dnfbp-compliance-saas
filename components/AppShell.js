// components/AppShell.js
import { supabase } from "../utils/supabase";
import TopTabs from "./TopTabs";

export default function AppShell({ user, title = "Dashboard", subtitle, children }) {
  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const page = {
    minHeight: "100vh",
    padding: 18,
    background:
      "radial-gradient(1200px 600px at 20% 10%, rgba(99,102,241,0.18), transparent 60%)," +
      "radial-gradient(900px 500px at 80% 0%, rgba(14,165,233,0.18), transparent 55%)," +
      "radial-gradient(900px 700px at 50% 100%, rgba(16,185,129,0.10), transparent 60%)," +
      "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
  };

  const shell = {
    maxWidth: 1200,
    margin: "0 auto",
    borderRadius: 22,
    border: "1px solid rgba(15,23,42,0.12)",
    background: "rgba(255,255,255,0.55)",
    backdropFilter: "blur(14px)",
    boxShadow: "0 24px 60px rgba(15,23,42,0.12)",
    overflow: "hidden",
  };

  const header = {
    padding: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    borderBottom: "1px solid rgba(15,23,42,0.10)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.86) 0%, rgba(30,41,59,0.78) 40%, rgba(2,132,199,0.38) 100%)",
    color: "white",
  };

  const brandRow = { display: "flex", gap: 12, alignItems: "center" };

  const logo = {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.16)",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
  };

  const titleStyle = { fontSize: 22, fontWeight: 950, margin: 0, letterSpacing: 0.2 };

  const descStyle = { marginTop: 6, opacity: 0.9, lineHeight: 1.45, maxWidth: 720 };

  const right = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" };

  const pill = {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.20)",
    background: "rgba(255,255,255,0.10)",
    fontSize: 12,
    fontWeight: 800,
  };

  const logoutBtn = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.20)",
    background: "rgba(255,255,255,0.12)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  };

  const body = { padding: 18 };
  const pageTitle = { fontSize: 22, fontWeight: 950, margin: "6px 0 6px", color: "#0f172a" };
  const pageSubtitle = { margin: 0, color: "#475569", lineHeight: 1.5 };

  return (
    <div style={page}>
      <div style={shell}>
        <div style={header}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={brandRow}>
              <div style={logo}>ST</div>
              <div>
                <h1 style={titleStyle}>DNFBP SafeTrack</h1>
                <div style={descStyle}>
                  Inspection-ready AML/CFT workflow support for Pakistan DNFBPs.
                  <br />
                  Human oversight required. Findings remain subject to compliance officer approval. No regulator submissions.
                </div>
              </div>
            </div>
          </div>

          <div style={right}>
            <span style={pill}>Signed in: {user?.email || "—"}</span>
            <button onClick={logout} style={logoutBtn}>
              Logout
            </button>
          </div>
        </div>

        <div style={{ padding: 18 }}>
          <TopTabs />
        </div>

        <div style={body}>
          <div style={{ marginBottom: 14 }}>
            <div style={pageTitle}>{title}</div>
            <p style={pageSubtitle}>
              {subtitle ||
                "Inspection-safe overview of records, evidence coverage, and internal workflow items. This system does not submit anything to regulators."}
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
