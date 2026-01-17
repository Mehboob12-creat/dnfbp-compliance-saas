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

      const { data: customers, error } = await supabase
        .from("customers")
        .select("id, full_name, cnic, city_district, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        setMsg(error.message);
        return;
      }

      setRows(customers || []);
      setMsg("");
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.full_name, r.cnic, r.city_district]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(needle))
    );
  }, [rows, q]);

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#f8fafc" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Header />

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, CNIC, or city…"
          style={searchStyle}
        />

        {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {filtered.length === 0 && !msg && (
            <Empty />
          )}

          {filtered.map((c) => (
            <a key={c.id} href={`/customers/${c.id}`} style={cardStyle}>
              <div style={{ fontWeight: 900 }}>{c.full_name || "Unnamed Customer"}</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                CNIC: {c.cnic || "-"} • City: {c.city_district || "-"}
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
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: "8px 0 0" }}>Customers</h1>
        <p style={{ color: "#64748b", marginTop: 6 }}>
          Search and open customer files.
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
      No customers yet. Click <b>“Add Customer”</b> to start.
    </div>
  );
}

const searchStyle = {
  width: "100%",
  marginTop: 16,
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  outline: "none",
};

const cardStyle = {
  textDecoration: "none",
  color: "inherit",
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
};

const addBtn = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "white",
  fontWeight: 900,
  textDecoration: "none",
  color: "#0f172a",
};

const emptyStyle = {
  padding: 20,
  borderRadius: 16,
  border: "1px dashed #cbd5f5",
  background: "#f8fafc",
  color: "#64748b",
};
