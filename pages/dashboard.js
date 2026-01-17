import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = "/login";
      setUser(data.user);
    });
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!user) return <p style={{ padding: 24 }}>Loading...</p>;

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#f8fafc" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Dashboard</h1>
            <p style={{ color: "#64748b", marginTop: 6 }}>Logged in as: {user.email}</p>
          </div>
          <button
            onClick={logout}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: "white",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          <CardLink
            title="Add Customer (Natural Person)"
            desc="15-question wizard (start here)."
            href="/customers/new"
          />
          <Card title="Training Modules" desc="Videos + quizzes (next step)." />
          <Card title="Important Links" desc="FMU, FATF, UN, NACTA (next step)." />
          <Card title="Inspection Mode" desc="Readiness score + pack export (next step)." />
        </div>
      </div>
    </div>
  );
}

function Card({ title, desc }) {
  return (
    <div style={{ padding: 16, borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>{title}</div>
      <div style={{ color: "#64748b", fontSize: 14 }}>{desc}</div>
    </div>
  );
}

function CardLink({ title, desc, href }) {
  return (
    <a href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ padding: 16, borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>{title}</div>
        <div style={{ color: "#64748b", fontSize: 14 }}>{desc}</div>
      </div>
    </a>
  );
}
