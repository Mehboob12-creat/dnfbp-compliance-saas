// components/evidence/EvidenceLocker.js
import { useEffect, useMemo, useState } from "react";
import {
  uploadEvidence,
  listEvidenceFor,
  getEvidenceDownloadUrl,
  deleteEvidence,
  logEvidenceDownloaded,
} from "../../utils/evidence/evidenceRepo";

const styles = {
  card: { border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", overflow: "hidden" },
  header: { padding: 14, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#334155" },
  body: { padding: 16 },
  row: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" },
  field: { display: "flex", flexDirection: "column", gap: 6, minWidth: 220, flex: 1 },
  label: { fontSize: 12, color: "#334155" },
  input: { padding: "10px 12px", borderRadius: 12, border: "1px solid #e2e8f0", outline: "none" },
  btn: { padding: "10px 14px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" },
  btnPrimary: { padding: "10px 14px", borderRadius: 12, border: "1px solid #0f172a", background: "#0f172a", color: "#fff", cursor: "pointer" },
  linkBtn: { padding: 0, border: "none", background: "transparent", cursor: "pointer", color: "#0f172a", textDecoration: "underline", fontSize: 12 },
  tiny: { fontSize: 12, color: "#64748b", lineHeight: 1.45 },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, marginTop: 12 },
  th: { textAlign: "left", fontSize: 12, color: "#334155", padding: 10, background: "#f8fafc", borderBottom: "1px solid #e2e8f0" },
  td: { padding: 10, borderBottom: "1px solid #e2e8f0", verticalAlign: "top" },
  warn: { padding: 12, borderRadius: 14, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e" },
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

export default function EvidenceLocker({ object_type, object_id, title = "Evidence Locker" }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [items, setItems] = useState([]);

  const [file, setFile] = useState(null);
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  async function refresh() {
    setLoading(true);
    setErrorMsg("");
    try {
      const rows = await listEvidenceFor({ object_type, object_id });
      setItems(rows);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Unable to load evidence.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!object_type || !object_id) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object_type, object_id]);

  const exportRows = useMemo(() => {
    return (items || []).map((x) => ({
      "Object type": object_type,
      "Object id": object_id,
      "Filename": x.filename,
      "Category": x.category,
      "Tags": (x.tags || []).join("; "),
      "Description": x.description || "",
      "Uploaded at": x.created_at,
    }));
  }, [items, object_type, object_id]);

  async function handleUpload() {
    if (!file) {
      setErrorMsg("Please choose a file.");
      return;
    }
    setBusy(true);
    setErrorMsg("");
    try {
      await uploadEvidence({
        file,
        category,
        description,
        tags: tags.split(",").map(s => s.trim()).filter(Boolean),
        object_type,
        object_id,
      });
      setFile(null);
      setDescription("");
      setTags("");
      await refresh();
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(item) {
    setBusy(true);
    setErrorMsg("");
    try {
      const url = await getEvidenceDownloadUrl({ bucket: item.bucket, object_path: item.object_path });
      window.open(url, "_blank", "noopener,noreferrer");

      await logEvidenceDownloaded({
        object_type,
        object_id,
        evidenceId: item.id,
        filename: item.filename,
      });
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Download failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item) {
    const ok = window.confirm("Delete this evidence file from the locker? This cannot be undone.");
    if (!ok) return;

    setBusy(true);
    setErrorMsg("");
    try {
      await deleteEvidence({ evidenceId: item.id });
      await refresh();
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={styles.tiny}>Private evidence storage for inspection readiness. Neutral, factual descriptions only.</div>
      </div>

      <div style={styles.body}>
        {errorMsg ? <div style={{ marginBottom: 12, ...styles.warn }}><b>Action needed:</b> {errorMsg}</div> : null}

        <div style={styles.row}>
          <div style={styles.field}>
            <div style={styles.label}>File</div>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <div style={styles.label}>Category</div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.input}>
              <option value="general">General</option>
              <option value="identity">Identity</option>
              <option value="address">Address</option>
              <option value="ownership">Ownership</option>
              <option value="governance">Governance</option>
              <option value="policy">Policy</option>
              <option value="training">Training</option>
              <option value="transactions">Transactions</option>
              <option value="risk">Risk</option>
              <option value="notice">Notice</option>
              <option value="response">Response</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={styles.field}>
            <div style={styles.label}>Tags (comma-separated)</div>
            <input value={tags} onChange={(e) => setTags(e.target.value)} style={styles.input} placeholder="e.g., board_resolution, ubo_doc" />
          </div>

          <button type="button" style={styles.btnPrimary} onClick={handleUpload} disabled={busy}>
            {busy ? "Working..." : "Upload"}
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={styles.label}>Description (inspection-safe)</div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={styles.input}
            placeholder="Optional. Keep factual and review-based."
          />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            style={styles.btn}
            onClick={() => {
              const safe = `${object_type}_${object_id}`.replace(/[^\w\-]+/g, "_");
              downloadCsv({ filename: `evidence_register_${safe}.csv`, rows: exportRows });
            }}
            disabled={busy}
          >
            Export register (CSV)
          </button>

          <button type="button" style={styles.btn} onClick={refresh} disabled={busy}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ marginTop: 12, color: "#64748b" }}>Loading…</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Filename</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Notes</th>
                <th style={styles.th}>Uploaded</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{x.filename}</div>
                    <div style={styles.tiny}>{(x.tags || []).length ? `Tags: ${(x.tags || []).join(", ")}` : "—"}</div>
                  </td>
                  <td style={styles.td}>{x.category}</td>
                  <td style={styles.td}>{x.description || "—"}</td>
                  <td style={styles.td}>
                    <div style={styles.tiny}>{new Date(x.created_at).toLocaleString()}</div>
                    <button type="button" style={styles.linkBtn} onClick={() => handleDownload(x)} disabled={busy}>
                      Download
                    </button>
                  </td>
                  <td style={styles.td}>
                    <button type="button" style={styles.linkBtn} onClick={() => handleDelete(x)} disabled={busy}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={5}>No evidence uploaded yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: 12, ...styles.warn }}>
          <b>Reminder:</b> Evidence locker supports recordkeeping and inspection readiness. It does not submit to regulators or file any reports.
        </div>
      </div>
    </div>
  );
}
