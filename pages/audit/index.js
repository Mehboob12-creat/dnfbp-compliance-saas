// pages/audit/index.js
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../utils/supabase";

const styles = {
  page: { padding: 24, maxWidth: 1200, margin: "0 auto" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  h1: { margin: 0, color: "#0f172a", fontSize: 26, letterSpacing: "-0.01em" },
  sub: { marginTop: 8, color: "#64748b", lineHeight: 1.5, maxWidth: 780 },
  card: { border: "1px solid #e2e8f0", borderRadius: 16, background: "#ffffff", overflow: "hidden" },
  cardHeader: { padding: 14, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#334155" },
  cardBody: { padding: 16 },
  row: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" },
  field: { display: "flex", flexDirection: "column", gap: 6, minWidth: 220, flex: 1 },
  label: { fontSize: 12, color: "#334155" },
  input: { padding: "10px 12px", borderRadius: 12, border: "1px solid #e2e8f0", outline: "none" },
  btn: { padding: "10px 14px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" },
  btnPrimary: { padding: "10px 14px", borderRadius: 12, border: "1px solid #0f172a", background: "#0f172a", color: "#fff", cursor: "pointer" },
  tiny: { fontSize: 12, color: "#64748b", lineHeight: 1.45 },
  warn: { padding: 12, borderRadius: 14, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0 },
  th: { textAlign: "left", fontSize: 12, color: "#334155", padding: 10, background: "#f8fafc", borderBottom: "1px solid #e2e8f0" },
  td: { padding: 10, borderBottom: "1px solid #e2e8f0", verticalAlign: "top" },
  badge: { display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, border: "1px solid #e2e8f0", background: "#fff", color: "#334155", fontSize: 12 },
  linkBtn: { padding: 0, border: "none", background: "transparent", cursor: "pointer", color: "#0f172a", textDecoration: "underline", fontSize: 12 },
};

function toCsvValue(v) {
  const s = (v ?? "").toString();
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCsv({ filename, rows }) {
  if (!rows || rows.length === 0) {
    alert("Nothing to export yet.");
    return;
  }
  const header = Object.keys(rows[0] || {});
  const lines = [
    header.map(toCsvValue).join(","),
    ...rows.map((r) => header.map((h) => toCsvValue(r[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AuditLogPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [events, setEvents] = useState([]);

  // Filters
  const [q, setQ] = useState("");
  const [objectType, setObjectType] = useState("");
  const [severity, setSeverity] = useState("");
  const [limit, setLimit] = useState(200);

  async function loadEvents() {
    setLoading(true);
    setErrorMsg("");
    try {
      let query = supabase
        .from("audit_events")
        .select("id, action, summary, severity, object_type, object_id, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (severity) query = query.eq("severity", severity);
      if (objectType) query = query.eq("object_type", objectType);

      // Simple client-side text filter (inspection-safe; avoids complex full-text setup)
      const { data, error } = await query;
      if (error) throw error;

      const needle = q.trim().toLowerCase();
      const filtered = needle
        ? (data || []).filter((e) => {
            const blob = `${e.action} ${e.summary} ${e.object_type} ${e.object_id || ""}`.toLowerCase();
            return blob.includes(needle);
          })
        : (data || []);

      setEvents(filtered);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Unable to load audit log.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, severity, objectType]);

  const stats = useMemo(() => {
    const total = events.length;
    const attention = events.filter(e => e.severity === "attention").length;
    const info = total - attention;
    return { total, info, attention };
  }, [events]);

  const csvRows = useMemo(() => {
    return events.map((e) => ({
      "Timestamp": e.created_at,
      "Action": e.action,
      "Summary": e.summary,
      "Severity": e.severity,
      "Object type": e.object_type,
      "Object id": e.object_id || "",
      "Metadata": JSON.stringify(e.metadata || {}),
    }));
  }, [events]);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.h1}>Audit Log</h1>
          <p style={styles.sub}>
            Inspection-ready activity record. Entries are neutral and review-based (e.g., uploaded evidence, exported registers).
            This system does not submit to regulators or file any reports.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <span style={styles.badge}>Shown: <b>{stats.total}</b></span>
            <span style={styles.badge}>Info: <b>{stats.info}</b></span>
            <span style={styles.badge}>Attention: <b>{stats.attention}</b></span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href="/dashboard" style={{ ...styles.btn, textDecoration: "none", display: "inline-block" }}>
            ← Dashboard
          </Link>
          <button
            type="button"
            style={styles.btnPrimary}
            onClick={() => {
              const safe = new Date().toISOString().slice(0, 10);
              downloadCsv({ filename: `audit_log_${safe}.csv`, rows: csvRows });
            }}
            disabled={busy || loading}
          >
            Export CSV
          </button>
        </div>
      </div>

      {errorMsg ? (
        <div style={{ marginTop: 14, ...styles.warn }}>
          <b>Action needed:</b> {errorMsg}
        </div>
      ) : null}

      <div style={{ marginTop: 14, ...styles.card }}>
        <div style={styles.cardHeader}>
          <div style={{ fontWeight: 700 }}>Filters</div>
          <div style={styles.tiny}>Use filters to quickly prepare inspection evidence. Export is manual and user-controlled.</div>
        </div>

        <div style={styles.cardBody}>
          <div style={styles.row}>
            <div style={styles.field}>
              <div style={styles.label}>Search</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={styles.input}
                placeholder="Search action/summary/object…"
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Object type</div>
              <select value={objectType} onChange={(e) => setObjectType(e.target.value)} style={styles.input}>
                <option value="">All</option>
                <option value="legal_person">legal_person</option>
                <option value="customer">customer</option>
                <option value="transaction">transaction</option>
                <option value="risk_assessment">risk_assessment</option>
                <option value="training">training</option>
                <option value="notice">notice</option>
                <option value="response">response</option>
                <option value="evidence_item">evidence_item</option>
                <option value="legal_person_associate">legal_person_associate</option>
              </select>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Severity</div>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={styles.input}>
                <option value="">All</option>
                <option value="info">info</option>
                <option value="attention">attention</option>
              </select>
            </div>

            <div style={{ minWidth: 160 }}>
              <div style={styles.label}>Max rows</div>
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={styles.input}>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>

            <button
              type="button"
              style={styles.btn}
              onClick={() => loadEvents()}
              disabled={busy || loading}
              title="Refresh with current filters"
            >
              Refresh
            </button>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              style={styles.btn}
              onClick={() => {
                setQ("");
                setObjectType("");
                setSeverity("");
                setLimit(200);
                // loadEvents will run via dependencies, but refresh explicitly too:
                setTimeout(loadEvents, 0);
              }}
              disabled={busy || loading}
            >
              Reset filters
            </button>

            <button
              type="button"
              style={styles.btn}
              onClick={() => {
                const safe = new Date().toISOString().slice(0, 10);
                downloadCsv({ filename: `audit_log_filtered_${safe}.csv`, rows: csvRows });
              }}
              disabled={busy || loading}
              title="Exports currently shown rows"
            >
              Export shown rows (CSV)
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, ...styles.card }}>
        <div style={styles.cardHeader}>
          <div style={{ fontWeight: 700 }}>Entries</div>
          <div style={styles.tiny}>Newest first.</div>
        </div>

        <div style={styles.cardBody}>
          {loading ? (
            <div style={{ color: "#64748b" }}>Loading…</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Time</th>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Summary</th>
                  <th style={styles.th}>Object</th>
                  <th style={styles.th}>Severity</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td style={styles.td}>
                      <div style={{ fontSize: 12, color: "#334155" }}>
                        {new Date(e.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{e.action}</div>
                      <div style={styles.tiny}>{e.object_type}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ color: "#334155" }}>{e.summary}</div>
                      {(e.metadata && Object.keys(e.metadata).length > 0) ? (
                        <div style={styles.tiny}>metadata: {JSON.stringify(e.metadata)}</div>
                      ) : null}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: 12, color: "#334155" }}>
                        {e.object_type}{e.object_id ? ` • ${String(e.object_id).slice(0, 8)}…` : ""}
                      </div>
                      {/* Optional deep links for known object types */}
                      {e.object_type === "legal_person" && e.object_id ? (
                        <a href={`/entities/${e.object_id}`} style={styles.linkBtn}>Open entity</a>
                      ) : null}
                      {e.object_type === "customer" && e.object_id ? (
                        <a href={`/customers/${e.object_id}`} style={styles.linkBtn}>Open customer</a>
                      ) : null}
                      {e.object_type === "notice" && e.object_id ? (
                        <a href={`/notices/${e.object_id}`} style={styles.linkBtn}>Open notice</a>
                      ) : null}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badge}><b>{e.severity}</b></span>
                    </td>
                  </tr>
                ))}
                {events.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={5}>No audit events yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}

          <div style={{ marginTop: 12, ...styles.warn }}>
            <b>Reminder:</b> Audit logs support inspection readiness and internal review. They do not submit to regulators or file any reports.
          </div>
        </div>
      </div>
    </div>
  );
}
