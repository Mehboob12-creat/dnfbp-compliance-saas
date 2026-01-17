import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../utils/supabase";

export default function CustomersList() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("Loading...");

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        window.location.href = "/login";
        return;
      }

      // Load customers (latest first)
      const { data: customers, error } = await supabase
        .from("customers")
        .select("id, full_name, cnic, city_district, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        setMsg(error.message);
        return;
      }

      // Load latest risk per customer (simple: fetch recent risk rows then map)
      const { data: risks, error: rErr } = await supabase
        .from("risk_assessments")
        .select("customer_id, overall_score, risk_category, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (rErr) {
        // If risk table not accessible, still show customers list
        setRows(customers || []);
        setMsg("");
        return;
      }

      const riskMap = new Map();
      for (const r of risks || []) {
        if (!riskMap.has(r.customer_id)) riskMap.set(r.customer_id, r);
      }

      const enriched = (customers || []).map((c) => ({
        ...c,
        risk: riskMap.get(c.id) || null,
      }));

      setRows(enriched);
      setMsg("");
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      return (
        (r.full_name || "").toLowerCase().includes(needle) ||
        (r.cnic || "").toLowerCase().includes(needle) ||
        (r.city_district || "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q]);

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#f8fafc" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
          <div>
            <a href="/dashboard" style={{ textDecoration: "none" }}>← Dashboard</a>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: "8px 0 0" }}>Customers</h1>
            <p style={{ color: "#64748b", marginTop: 6 }}>Search, open customer files, and review risk status.</p>
          </div>

          <a
            href="/customers/new"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: "white",
              cursor: "pointer",
              fontWeight: 900,
              textDecoration: "none",
              color: "#0f172a",
              height: "fit-content",
            }}
          >
            + Add Customer
          </a>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, CNIC, city..."
            style={{
              flex: 1,
              minWidth: 240,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              outline: "none",
              background: "white",
            }}
          />
        </div>

        {msg ? <div style={{ marginTop: 12 }}>{msg}</div> : null}

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {filtered.length === 0 && !msg ? (
            <div style={{ color: "#64748b", padding: 14, borderRadius: 14, border: "1px solid #e2e8f0", background: "white" }}>
              No customers found.
            </div>
          ) : null}

          {filtered.map((c) => (
            <a
              key={c.id}
              href={`/customers/${c.id}`}
              style={{
                textDecoration: "none",
                color: "inherit",
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                padding: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.full_name || "Unnamed Customer"}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                    CNIC: {c.cnic || "-"} • City: {c.city_district || "-"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {c.risk ? (
                    <Badge
                      label={`${c.risk.risk_category} (${c.risk.overall_score}/100)`}
                      tone={toneOf(c.risk.risk_category)}
                    />
                  ) : (
                    <Badge label="NO RISK YET" tone="neutral" />
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function toneOf(cat) {
  if (cat === "LOW") return "ok";
  if (cat === "MEDIUM") return "warn";
  if (cat === "HIGH") return "danger";
  if (cat === "VERY_HIGH") return "danger";
  return "neutral";
}

function Badge({ label, tone }) {
  const styles =
    tone === "danger"
      ? { bg: "#fff1f2", bd: "#fecdd3", tx: "#9f1239" }
      : tone === "warn"
      ? { bg: "#fffbeb", bd: "#fde68a", tx: "#92400e" }
      : tone === "ok"
      ? { bg: "#ecfeff", bd: "#a5f3fc", tx: "#155e75" }
      : { bg: "#f1f5f9", bd: "#e2e8f0", tx: "#334155" };

  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${styles.bd}`,
        background: styles.bg,
        color: styles.tx,
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
