import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

export default function EntitiesIndex() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("legal_persons")
        .select("id, name, sector, status, created_at")
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (!error) setRows(data || []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Legal Persons</h1>
          <p style={{ marginTop: 8, color: "#64748b" }}>
            Maintain entity profiles, UBOs, controllers, and inspection-ready exports.
          </p>
        </div>
        <Link href="/entities/new" style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
          + New Entity
        </Link>
      </div>

      <div style={{ marginTop: 18, border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: 12, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#334155" }}>
          {loading ? "Loading..." : `${rows.length} entities`}
        </div>

        {!loading && rows.length === 0 ? (
          <div style={{ padding: 18, color: "#475569" }}>
            No entities yet. Create one to start UBO/controller onboarding.
          </div>
        ) : (
          rows.map(r => (
            <Link
              key={r.id}
              href={`/entities/${r.id}`}
              style={{ display: "block", padding: 14, borderBottom: "1px solid #e2e8f0", textDecoration: "none" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{r.name}</div>
                  <div style={{ color: "#64748b", marginTop: 4 }}>
                    {r.sector || "Sector not set"} • {r.status}
                  </div>
                </div>
                <div style={{ color: "#94a3b8" }}>
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
