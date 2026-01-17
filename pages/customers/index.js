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
            <p style={{ color: "#64748b", marginTop: 6 }}>Search by name, CNIC, or city.</p>
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

        <div style={{ marginTop: 12 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            style={{
              width: "100%",
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
              <div style={{ fontWeight: 900, fontSize: 16 }}>{c.full_name || "Unnamed Customer"}</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                CNIC: {c.cnic || "-"} • City: {c.city_district || "-"}
              </div>
            </a>
          ))}

          {filtered.length === 0 && !msg ? (
            <div style={{ color: "#64748b", padding: 14, borderRadius: 14, border: "1px solid #e2e8f0", background: "white" }}>
              No customers found.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
