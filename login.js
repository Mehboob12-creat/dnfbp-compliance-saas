import { useState } from "react";
import { supabase } from "../utils/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function login(e) {
    e.preventDefault();

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/dashboard`
        : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });

    setMsg(error ? error.message : "Check your email for the login link.");
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, border: "1px solid #e5e7eb", borderRadius: 16, padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>DNFBP Compliance SaaS</h1>
        <p style={{ color: "#6b7280", marginBottom: 16 }}>Login with email (magic link).</p>

        <form onSubmit={login} style={{ display: "grid", gap: 12 }}>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}
          />
          <button
            style={{
              padding: 12,
              borderRadius: 12,
              border: "none",
              background: "#0A1F44",
              color: "white",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Send Login Link
          </button>
          {msg ? <p style={{ fontSize: 14, color: "#111827" }}>{msg}</p> : null}
        </form>
      </div>
    </div>
  );
}
