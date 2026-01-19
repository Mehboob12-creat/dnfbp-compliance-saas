// pages/entities/[id]/exports.js
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import {
  getLegalPerson,
  getOrCreateOrgSettings,
  listAssociates,
  getOrCreateMiniKyc,
} from "../../../utils/entities/legalPersonRepo";

function toCsvValue(v) {
  const s = (v ?? "").toString();
  const escaped = s.replace(/"/g, '""');
  return `"${escaped}"`;
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

const styles = {
  page: { padding: 24, maxWidth: 1100, margin: "0 auto" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  h1: { margin: 0, color: "#0f172a", fontSize: 26, letterSpacing: "-0.01em" },
  sub: { marginTop: 8, color: "#64748b", lineHeight: 1.5, maxWidth: 760 },
  badge: { display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, border: "1px solid #e2e8f0", background: "#fff", color: "#334155", fontSize: 12 },
  badgeRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 },
  card: { border: "1px solid #e2e8f0", borderRadius: 16, background: "#ffffff", overflow: "hidden" },
  cardHeader: { padding: 14, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#334155" },
  cardBody: { padding: 16 },
  btn: { padding: "10px 14px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" },
  btnPrimary: { padding: "10px 14px", borderRadius: 12, border: "1px solid #0f172a", background: "#0f172a", color: "#fff", cursor: "pointer" },
  tiny: { fontSize: 12, color: "#64748b", lineHeight: 1.45 },
  warningBox: { padding: 12, borderRadius: 14, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0 },
  th: { textAlign: "left", fontSize: 12, color: "#334155", padding: 10, background: "#f8fafc", borderBottom: "1px solid #e2e8f0" },
  td: { padding: 10, borderBottom: "1px solid #e2e8f0", verticalAlign: "top" },
};

function safe(v) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : "—";
}

export default function EntityExportsPage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [uboThreshold, setUboThreshold] = useState(25);
  const [entity, setEntity] = useState(null);
  const [associates, setAssociates] = useState([]);
  const [miniKycByAssoc, setMiniKycByAssoc] = useState({});
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const settings = await getOrCreateOrgSettings();
        const threshold = Number(settings?.ubo_threshold || 25);

        const lp = await getLegalPerson(id);
        const assoc = await listAssociates(id);

        const mkMap = {};
        for (const a of assoc) mkMap[a.id] = await getOrCreateMiniKyc(a.id);

        if (!mounted) return;
        setUboThreshold(threshold);
        setEntity(lp);
        setAssociates(assoc || []);
        setMiniKycByAssoc(mkMap);
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setErrorMsg(e?.message || "Unable to load exports.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const uboCountMeeting = useMemo(() => {
    return associates.filter(a => a.role === "ubo" && Number(a.ownership_percent || 0) >= Number(uboThreshold || 25)).length;
  }, [associates, uboThreshold]);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.cardBody}>(Loading exports…)</div>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div style={styles.page}>
        <div style={styles.warningBox}>
          <b>Action needed:</b> {errorMsg || "Entity not found or access denied."}
        </div>
        <div style={{ marginTop: 12 }}>
          <Link href="/entities" style={{ ...styles.btn, textDecoration: "none", display: "inline-block" }}>
            Back to Legal Persons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.h1}>Exports</h1>
          <p style={styles.sub}>
            Print/export inspection-ready records for {entity.name}. These exports are designed for documentation and review.
            They do not submit anything to regulators.
          </p>

          <div style={styles.badgeRow}>
            <span style={styles.badge}>Status: <b>{entity.status}</b></span>
            <span style={styles.badge}>UBO threshold: <b>≥ {uboThreshold}%</b></span>
            <span style={styles.badge}>UBOs meeting threshold: <b>{uboCountMeeting}</b></span>
            <span style={styles.badge}>Associated persons: <b>{associates.length}</b></span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href={`/entities/${id}`} style={{ ...styles.btn, textDecoration: "none", display: "inline-block" }}>
            ← Back to entity
          </Link>
          <Link href="/entities" style={{ ...styles.btn, textDecoration: "none", display: "inline-block" }}>
            Legal Persons
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 14, ...styles.warningBox }}>
        <b>Inspection-safe note:</b> These materials use neutral, factual language and support an evidence-based review workflow.
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ fontWeight: 700 }}>Ownership & Control Register (CSV)</div>
            <div style={styles.tiny}>Includes roles, ownership %, indirect flag, and Mini-KYC indicators.</div>
          </div>
          <div style={styles.cardBody}>
            <button
              type="button"
              style={styles.btnPrimary}
              onClick={() => {
                const csvRows = associates.map((a) => {
                  const mk = miniKycByAssoc[a.id] || {};
                  return {
                    "Entity Name": entity.name,
                    "Associate Role": a.role,
                    "Person Name": mk.full_name || "",
                    "Ownership %": a.role === "ubo" ? Number(a.ownership_percent || 0) : "",
                    "Indirect": a.role === "ubo" ? (a.is_indirect ? "Y" : "N") : "",
                    "PEP": mk.pep_status || "",
                    "Sanctions screening": mk.sanctions_screening || "",
                    "ID doc collected": mk.id_doc_collected ? "Y" : "N",
                    "Address doc collected": mk.address_doc_collected ? "Y" : "N",
                    "Notes": mk.notes || a.notes || "",
                  };
                });

                const safeName = (entity.name || "entity").replace(/[^\w\-]+/g, "_");
                downloadCsv({
                  filename: `entity_register_${safeName}.csv`,
                  rows: csvRows,
                });
              }}
            >
              Download CSV
            </button>
            <div style={{ marginTop: 10, ...styles.tiny }}>
              Tip: Save to your case file, share with your consultant, or include in an inspection pack.
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ fontWeight: 700 }}>Entity Snapshot (PDF)</div>
            <div style={styles.tiny}>Printable snapshot of entity details + ownership/control overview.</div>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.warningBox}>
              <b>Next:</b> I’ll add the PDF generator in a dedicated utility (matching your existing pdf utilities style),
              then expose it here as a download.
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, ...styles.card }}>
        <div style={styles.cardHeader}>
          <div style={{ fontWeight: 700 }}>Preview (read-only)</div>
          <div style={styles.tiny}>Quick view of what will appear in the register export.</div>
        </div>
        <div style={styles.cardBody}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Ownership</th>
                <th style={styles.th}>Indirect</th>
                <th style={styles.th}>PEP</th>
                <th style={styles.th}>Sanctions</th>
              </tr>
            </thead>
            <tbody>
              {associates.map(a => {
                const mk = miniKycByAssoc[a.id] || {};
                return (
                  <tr key={a.id}>
                    <td style={styles.td}>{safe(a.role)}</td>
                    <td style={styles.td}>{safe(mk.full_name)}</td>
                    <td style={styles.td}>{a.role === "ubo" ? `${Number(a.ownership_percent || 0)}%` : "—"}</td>
                    <td style={styles.td}>{a.role === "ubo" ? (a.is_indirect ? "Yes" : "No") : "—"}</td>
                    <td style={styles.td}>{safe(mk.pep_status)}</td>
                    <td style={styles.td}>{safe(mk.sanctions_screening)}</td>
                  </tr>
                );
              })}
              {associates.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={6}>No associated persons yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
