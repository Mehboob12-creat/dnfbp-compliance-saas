// pages/admin/index.js
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getOrCreateProfile, getOrCreateOrgSettings, updateOrgSettings } from "../../utils/admin/adminRepo";

const styles = {
  page: { padding: 24, maxWidth: 1100, margin: "0 auto" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  h1: { margin: 0, color: "#0f172a", fontSize: 26, letterSpacing: "-0.01em" },
  sub: { marginTop: 8, color: "#64748b", lineHeight: 1.5, maxWidth: 780 },
  card: { border: "1px solid #e2e8f0", borderRadius: 16, background: "#ffffff", overflow: "hidden" },
  cardHeader: { padding: 14, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#334155" },
  cardBody: { padding: 16 },
  row: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" },
  field: { display: "flex", flexDirection: "column", gap: 6, minWidth: 240, flex: 1 },
  label: { fontSize: 12, color: "#334155" },
  input: { padding: "10px 12px", borderRadius: 12, border: "1px solid #e2e8f0", outline: "none" },
  btn: { padding: "10px 14px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" },
  btnPrimary: { padding: "10px 14px", borderRadius: 12, border: "1px solid #0f172a", background: "#0f172a", color: "#fff", cursor: "pointer" },
  tiny: { fontSize: 12, color: "#64748b", lineHeight: 1.45 },
  warn: { padding: 12, borderRadius: 14, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e" },
  ok: { padding: 12, borderRadius: 14, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534" },
};

function toJsonDownload(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [uboThreshold, setUboThreshold] = useState(25);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const p = await getOrCreateProfile();
        const s = await getOrCreateOrgSettings();
        if (!mounted) return;

        setProfile(p);
        setSettings(s);
        setUboThreshold(Number(s.ubo_threshold || 25));
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setErrorMsg(e?.message || "Unable to load admin settings.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const isAdminLike = useMemo(() => {
    return ["admin", "consultant"].includes(profile?.role || "client");
  }, [profile]);

  async function save() {
    setSaving(true);
    setErrorMsg("");
    setOkMsg("");
    try {
      if (!isAdminLike) {
        setErrorMsg("Access note: only admin/consultant roles can change settings.");
        return;
      }

      const updated = await updateOrgSettings({ ubo_threshold: uboThreshold });
      setSettings(updated);
      setOkMsg("Settings saved.");
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}><div style={styles.cardBody}>(Loading admin panel…)</div></div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.h1}>Admin Control Panel</h1>
          <p style={styles.sub}>
            Admin-controlled settings for compliance workflows. Changes are recorded in the audit log.
            No regulator integrations or automated filing.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href="/dashboard" style={{ ...styles.btn, textDecoration: "none", display: "inline-block" }}>
            ← Dashboard
          </Link>
          <Link href="/audit" style={{ ...styles.btn, textDecoration: "none", display: "inline-block" }}>
            Audit Log
          </Link>
        </div>
      </div>

      {errorMsg ? <div style={{ marginTop: 14, ...styles.warn }}><b>Action needed:</b> {errorMsg}</div> : null}
      {okMsg ? <div style={{ marginTop: 14, ...styles.ok }}><b>Saved:</b> {okMsg}</div> : null}

      <div style={{ marginTop: 14, ...styles.card }}>
        <div style={styles.cardHeader}>
          <div style={{ fontWeight: 700 }}>Access</div>
          <div style={styles.tiny}>Role controls are lightweight. You can expand to multi-user org later.</div>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.row}>
            <div style={styles.field}>
              <div style={styles.label}>Role</div>
              <input value={profile?.role || "client"} readOnly style={{ ...styles.input, background: "#f8fafc" }} />
              <div style={styles.tiny}>
                Current policy: <b>admin</b> and <b>consultant</b> can change settings on this page.
              </div>
            </div>
            <div style={styles.field}>
              <div style={styles.label}>Export settings</div>
              <button
                type="button"
                style={styles.btn}
                onClick={() => toJsonDownload("org_settings.json", { profile, settings })}
              >
                Download settings (JSON)
              </button>
              <div style={styles.tiny}>Useful for documentation and inspection packs.</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, ...styles.card }}>
        <div style={styles.cardHeader}>
          <div style={{ fontWeight: 700 }}>CDD / Entity settings</div>
          <div style={styles.tiny}>These settings affect onboarding prompts and completeness checks.</div>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.row}>
            <div style={styles.field}>
              <div style={styles.label}>UBO threshold (%)</div>
              <input
                value={uboThreshold}
                onChange={(e) => setUboThreshold(Number(e.target.value))}
                style={styles.input}
                inputMode="numeric"
                disabled={!isAdminLike}
              />
              <div style={styles.tiny}>Default is 25%. Keep within 0–100.</div>
            </div>

            <button type="button" style={styles.btnPrimary} onClick={save} disabled={saving || !isAdminLike}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

          <div style={{ marginTop: 12, ...styles.warn }}>
            <b>Reminder:</b> This panel changes internal workflow settings only. It does not submit to regulators or file STR/CTR.
          </div>
        </div>
      </div>
    </div>
  );
}
