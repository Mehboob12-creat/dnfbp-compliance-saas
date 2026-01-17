import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../utils/supabase";

export default function CustomersList() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("Loading...");
  const [highOnly, setHighOnly] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        window.location.href = "/login";
        return;
      }

      // Load customers
      const { data: customers, error } = await supabase
        .from("customers")
        .select("id, full_name, cnic, city_district, created_at")
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) {
        setMsg(error.message);
        return;
      }

      // Load latest risks (then map latest risk per customer)
      const { data: risks, error: rErr } = await supabase
        .from("risk_assessments")
        .select("customer_id, overall_score, risk_category, created_at")
        .order("created_at", { ascending: false })
        .limit(800);

      // If risk table not accessible yet, still show list
      if (rErr) {
        setRows(customers || []);
        setMsg("");
        return;
      }

      const riskMap = new Map();
      for (const r of risks || []) {
        if (!riskMap.has(r.customer_id)) riskMap.set(r.customer_id, r); // keep latest only
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

    let out = rows;

    // Search filter
    if (needle) {
      out = out.filter((r) =>
        [r.full_name, r.cnic, r.city_district]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(needle))
      );
    }

    // High risk only filter
    if (highOnly) {
      out = out.filter(
        (r) => r?.risk?.risk_category === "HIGH" || r?.risk?.risk_category === "VERY_HIGH"
      );
    }

    return out;
  }, [rows, q, highOnly]);

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#f8fafc" }}>
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>
        <Header />

        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, CNIC, or city…"
            style={searchStyle}
          />

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: "10px 12px",
              userSelect: "none",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            <input
              type="checkbox"
              checked={highOnly}
              onChange={(e) => setHighOnly(e.target.checked)}
            />
            High risk only
          </label>
        </div>

        {msg && (
          <div style={{ marginTop: 12, color: "#0f172a" }}>
            {msg}
          </div>
        )}

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {!msg && filtered.length === 0 ? (
            <Empty />
          ) : null}

          {filtered.map((c) => (
            <a key={c.id} href={`/customers/${c.id}`} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 950,
                      fontSize: 16,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
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

function Header() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
      <div>
        <a href="/dashboard" style={{ textDecoration: "none" }}>← Dashboard</a>
        <h1 style={{ fontSize: 28, fontWeight: 950, margin: "8px 0 0" }}>Customers</h1>
        <p style={{ color: "#64748b", marginTop: 6 }}>
          Review customers and their latest risk status.
        </p>
      </div>

      <a href="/customers/new" style={addBtn}>
        + Add Customer
      </a>
    </div>
  );
}

function Empty() {
  return (
    <div style={emptyStyle}>
      <div style={{ fontWeight: 900, color: "#0f172a" }}>No customers found</div>
      <div style={{ marginTop: 6 }}>
        Try a different search, or click <b>“Add Customer”</b>.
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
        fontWeight: 950,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

const searchStyle = {
  flex: 1,
  minWidth: 260,
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  outline: "none",
  background: "white",
};

const cardStyle = {
  textDecoration: "none",
  color: "inherit",
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 16,
};

const addBtn = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "white",
  fontWeight: 950,
  textDecoration: "none",
  color: "#0f172a",
};

const emptyStyle = {
  padding: 18,
  borderRadius: 18,
  border: "1px dashed #cbd5e1",
  background: "white",
  color: "#64748b",
};
