import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";
import { computeInspectionReadiness } from "../utils/inspection/readiness";

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

        {/* Policy Generator Quick Action Card */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <Link href="/policy" style={{ textDecoration: "none" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 18,
                  padding: 16,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                  cursor: "pointer",
                }}
                title="Draft, review, and export an AML/CFT policy (human-reviewed)."
              >
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Quick Action</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#e5e7eb" }}>Policy Generator</div>
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8, lineHeight: 1.45 }}>
                  Create a draft, review internally, and export as PDF for inspection preparation.
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <CardLink
            title="Add Customer (Natural Person)"
            desc="15-question wizard (start here)."
            href="/customers"
          />
          <CardLink
            title="Training Modules"
            desc="Videos + quizzes (next step)."
            href="/training"
          />
          <CardLink
            title="Important Links"
            desc="FMU, FATF, UN, NACTA (next step)."
            href="/links"
          />
          <Card title="Inspection Mode" desc="Readiness score + pack export (next step)." />
        </div>

        {/* Add the Inspection Readiness Widget */}
        <InspectionReadinessWidget />
        
        {/* Add the Inspection Quick Actions Card */}
        <InspectionQuickActionsCard />
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
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ padding: 16, borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>{title}</div>
        <div style={{ color: "#64748b", fontSize: 14 }}>{desc}</div>
      </div>
    </Link>
  );
}

function isKycComplete(c) {
  const name = String(c?.full_name || "").trim();
  const cnic = String(c?.cnic || "").trim();
  const cityDistrict = String(c?.city_district || "").trim();
  return Boolean(name && cnic && cityDistrict);
}

function normalizeRiskBand(r) {
  const raw = String(r?.risk_category || r?.risk_band || "UNKNOWN").trim().toUpperCase();
  if (raw === "VERY HIGH" || raw === "VERY-HIGH") return "VERY_HIGH";
  if (["LOW", "MEDIUM", "HIGH", "VERY_HIGH"].includes(raw)) return raw;
  return "UNKNOWN";
}

function Pill({ children, tone = "neutral" }) {
  const style =
    tone === "good"
      ? { bg: "#ecfeff", bd: "#a5f3fc", tx: "#155e75" }
      : tone === "warn"
      ? { bg: "#fffbeb", bd: "#fde68a", tx: "#92400e" }
      : tone === "bad"
      ? { bg: "#fff1f2", bd: "#fecdd3", tx: "#9f1239" }
      : { bg: "#f1f5f9", bd: "#e2e8f0", tx: "#0f172a" };

  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${style.bd}`,
        background: style.bg,
        color: style.tx,
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function CardShell({ title, children, right }) {
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 900 }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function InspectionReadinessWidget() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [avgScore, setAvgScore] = useState(0);
  const [pctReady, setPctReady] = useState(0);
  const [topNeedingAttention, setTopNeedingAttention] = useState([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr("");

        // Customers schema-safe (NO city, NO screening_status)
        const { data: customers, error: custErr } = await supabase
          .from("customers")
          .select("id, full_name, cnic, city_district")
          .order("created_at", { ascending: false })
          .limit(100);

        if (custErr) throw custErr;

        const list = customers || [];
        if (list.length === 0) {
          if (!alive) return;
          setAvgScore(0);
          setPctReady(0);
          setTopNeedingAttention([]);
          setLoading(false);
          return;
        }

        const ids = list.map((c) => c.id);

        // Transactions presence per customer
        const { data: txRows, error: txErr } = await supabase
          .from("transactions")
          .select("customer_id")
          .in("customer_id", ids)
          .limit(5000);

        if (txErr) throw txErr;
        const txSet = new Set((txRows || []).map((x) => x.customer_id));

        // Latest risk per customer
        const { data: riskRows, error: riskErr } = await supabase
          .from("risk_assessments")
          .select("customer_id, risk_category, overall_score, created_at")
          .in("customer_id", ids)
          .order("created_at", { ascending: false })
          .limit(5000);

        if (riskErr) throw riskErr;

        const latestRiskByCustomer = new Map();
        for (const r of riskRows || []) {
          if (!latestRiskByCustomer.has(r.customer_id)) {
            latestRiskByCustomer.set(r.customer_id, r);
          }
        }

        // Compute readiness (dashboard v1: screening not tracked here yet)
        const scored = list.map((c) => {
          const risk = latestRiskByCustomer.get(c.id) || null;

          const readiness = computeInspectionReadiness({
            kycComplete: isKycComplete(c),
            transactionRecorded: txSet.has(c.id),
            screeningDone: false, // v1: screening evidence not yet wired on dashboard
            riskSaved: Boolean(risk),
            riskBand: normalizeRiskBand(risk),

            // v1 placeholders
            eddEvidenceUploaded: false,
            trainingCompleted: false,
            policyExists: false,
          });

          return {
            id: c.id,
            name: (c.full_name || "Customer").trim(),
            score: readiness.score || 0,
          };
        });

        const total = scored.reduce((s, x) => s + x.score, 0);
        const avg = Math.round(total / scored.length);
        const readyCount = scored.filter((x) => x.score >= 80).length;
        const pct = Math.round((readyCount / scored.length) * 100);
        const bottom = [...scored].sort((a, b) => a.score - b.score).slice(0, 5);

        if (!alive) return;
        setAvgScore(avg);
        setPctReady(pct);
        setTopNeedingAttention(bottom);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load inspection readiness.");
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const tone = avgScore >= 80 ? "good" : avgScore >= 50 ? "warn" : "bad";

  return (
    <CardShell
      title="Inspection Readiness"
      right={<Pill tone={tone}>{loading ? "Loading…" : `${avgScore}/100`}</Pill>}
    >
      <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
        Evidence coverage score for inspection preparation and internal recordkeeping.
        Regulatory reporting decisions remain subject to human review and approval.
      </div>

      {err ? (
        <div style={{ marginTop: 10, color: "#9f1239", fontWeight: 700 }}>{err}</div>
      ) : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <Pill tone="neutral">{loading ? "…" : `${pctReady}%`} customers ≥ 80</Pill>
        <Pill tone="neutral">{loading ? "…" : `${topNeedingAttention.length}`} in attention list</Pill>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 900, color: "#0f172a" }}>Needs attention</div>

        {loading ? (
          <div style={{ color: "#64748b" }}>Loading customers…</div>
        ) : topNeedingAttention.length === 0 ? (
          <div style={{ color: "#64748b" }}>No customer records found.</div>
        ) : (
          topNeedingAttention.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                padding: 10,
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                background: "#f8fafc",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontWeight: 900 }}>{c.name}</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>Readiness: {c.score}/100</div>
              </div>

              <button
                onClick={() => (window.location.href = `/inspection/${c.id}`)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px solid #cbd5e1",
                  background: "white",
                  color: "#0f172a",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
                title="Open Inspection Mode for this customer."
              >
                Open Inspection Mode
              </button>
            </div>
          ))
        )}
      </div>
    </CardShell>
  );
}

function InspectionQuickActionsCard() {
  const [lastCustomerId, setLastCustomerId] = useState("");

  useEffect(() => {
    try {
      const v = localStorage.getItem("lastCustomerId") || "";
      setLastCustomerId(v);
    } catch {}
  }, []);

  async function downloadPack() {
    try {
      if (!lastCustomerId) {
        alert("Open a customer file first so the dashboard can remember the customer for export.");
        return;
      }

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        alert("Your session has expired. Please log in again.");
        return;
      }

      const resp = await fetch("/api/inspection-pack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ customerId: lastCustomerId }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => null);
        const msg = errJson?.detail || errJson?.error || `Failed with status ${resp.status}`;
        alert(msg);
        return;
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const cd = resp.headers.get("content-disposition") || "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] || `inspection_pack_${lastCustomerId}.zip`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.message || "Failed to download inspection pack.");
    }
  }

  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900 }}>Inspection Quick Actions</div>
        <span
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #e2e8f0",
            background: "#f1f5f9",
            color: "#0f172a",
            fontWeight: 900,
            fontSize: 12,
          }}
          title="Uses the last customer you opened in the Customers section."
        >
          {lastCustomerId ? "Customer selected" : "No customer selected"}
        </span>
      </div>

      <div style={{ marginTop: 10, color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
        Open Inspection Mode or export an inspection pack for the last customer you viewed.
        This platform does not automatically file reports or communicate with regulators.
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => {
            if (!lastCustomerId) {
              alert("Open a customer file first so the dashboard can remember the customer.");
              return;
            }
            window.location.href = `/inspection/${lastCustomerId}`;
          }}
          style={{
            padding: "10px 14px",
            borderRadius: 14,
            border: "1px solid #cbd5e1",
            background: "white",
            color: "#0f172a",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Open Inspection Mode
        </button>

        <button
          onClick={downloadPack}
          style={{
            padding: "10px 14px",
            borderRadius: 14,
            border: "1px solid #0f172a",
            background: "#0f172a",
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Download Inspection Pack (ZIP)
        </button>
      </div>

      {/* Add Policy Generator Button */}
      <div style={{ marginTop: 16 }}>
        <Link href="/policy" style={{ textDecoration: "none" }}>
          <button
            style={{
              borderRadius: 14,
              padding: "12px 14px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.08)",
              color: "#e5e7eb",
              fontWeight: 700,
              cursor: "pointer",
              width: "100%",
            }}
            title="Draft and review an AML/CFT policy (human-reviewed)."
          >
            Policy Generator
          </button>
        </Link>
      </div>
    </div>
  );
}
