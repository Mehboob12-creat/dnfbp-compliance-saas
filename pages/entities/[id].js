// pages/entities/[id].js
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import {
  getLegalPerson,
  updateLegalPerson,
  getOrCreateOrgSettings,
  listAssociates,
  upsertAssociate,
  deleteAssociate,
  getOrCreateMiniKyc,
  updateMiniKyc,
} from "../../utils/entities/legalPersonRepo";

// Optional (recommended): if you created utils/risk/legalPersonRisk.js earlier
let computeLegalPersonRisk;
try {
  // eslint-disable-next-line global-require
  ({ computeLegalPersonRisk } = require("../../utils/risk/legalPersonRisk"));
} catch (e) {
  computeLegalPersonRisk = null;
}

const styles = {
  page: { padding: 24, maxWidth: 1200, margin: "0 auto" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  h1: { margin: 0, color: "#0f172a", fontSize: 26, letterSpacing: "-0.01em" },
  sub: { marginTop: 8, color: "#64748b", lineHeight: 1.5, maxWidth: 760 },
  badgeRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 },
  badge: { display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, border: "1px solid #e2e8f0", background: "#fff", color: "#334155", fontSize: 12 },
  card: { border: "1px solid #e2e8f0", borderRadius: 16, background: "#ffffff", overflow: "hidden" },
  cardHeader: { padding: 14, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#334155" },
  cardBody: { padding: 16 },
  row: { display: "flex", gap: 12, flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: 6, minWidth: 240, flex: 1 },
  label: { fontSize: 12, color: "#334155" },
  input: { padding: "10px 12px", borderRadius: 12, border: "1px solid #e2e8f0", outline: "none" },
  checkboxRow: { display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 12 },
  btnRow: { display: "flex", justifyContent: "space-between", gap: 12, marginTop: 16, flexWrap: "wrap" },
  btn: { padding: "10px 14px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" },
  btnPrimary: { padding: "10px 14px", borderRadius: 12, border: "1px solid #0f172a", background: "#0f172a", color: "#fff", cursor: "pointer" },
  btnDanger: { padding: "10px 14px", borderRadius: 12, border: "1px solid #fecaca", background: "#fff", color: "#991b1b", cursor: "pointer" },
  tiny: { fontSize: 12, color: "#64748b", lineHeight: 1.45 },
  warningBox: { padding: 12, borderRadius: 14, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e" },
  okBox: { padding: 12, borderRadius: 14, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534" },
  tabRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  tab: (active) => ({
    padding: "8px 10px",
    borderRadius: 999,
    border: `1px solid ${active ? "#0f172a" : "#e2e8f0"}`,
    background: active ? "#0f172a" : "#fff",
    color: active ? "#fff" : "#334155",
    fontSize: 12,
    cursor: "pointer",
  }),
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0 },
  th: { textAlign: "left", fontSize: 12, color: "#334155", padding: 10, background: "#f8fafc", borderBottom: "1px solid #e2e8f0" },
  td: { padding: 10, borderBottom: "1px solid #e2e8f0", verticalAlign: "top" },
  linkBtn: { padding: 0, border: "none", background: "transparent", cursor: "pointer", color: "#0f172a", textDecoration: "underline", fontSize: 12 },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.40)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50,
  },
  modal: { width: "100%", maxWidth: 920, borderRadius: 18, border: "1px solid #e2e8f0", background: "#fff", overflow: "hidden" },
  modalHeader: { padding: 14, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  modalBody: { padding: 16 },
};

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "ownership", label: "Ownership & UBO" },
  { key: "controllers", label: "Controllers" },
  { key: "exports", label: "Exports" },
];

function clampPercent(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function safeTrim(v) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : "";
}

function roleLabel(role) {
  if (role === "ubo") return "UBO / Owner";
  if (role === "controller") return "Controller";
  if (role === "director") return "Director";
  if (role === "signatory") return "Signatory";
  return role || "—";
}

function scoreBand(score) {
  const n = Number(score || 0);
  if (n >= 80) return "High";
  if (n >= 50) return "Medium";
  return "Low";
}

function completenessSummary({ entity, associates, miniKycByAssoc, uboThreshold }) {
  const issues = [];

  if (!safeTrim(entity?.name)) issues.push("Entity name is missing.");
  if (!safeTrim(entity?.sector)) issues.push("Sector is not set (recommended for risk indicators).");

  const owners = (associates || []).filter(a => a.role === "ubo");
  const controllers = (associates || []).filter(a => ["controller", "director", "signatory"].includes(a.role));

  const meets = owners.filter(o => Number(o.ownership_percent || 0) >= Number(uboThreshold || 25));
  if (meets.length === 0) issues.push(`No UBO currently meets the threshold (≥ ${uboThreshold || 25}%).`);

  if (controllers.length === 0) issues.push("No controllers/directors/signatories recorded yet (recommended).");

  for (const a of associates || []) {
    const mk = miniKycByAssoc[a.id];
    const name = safeTrim(mk?.full_name) || `${roleLabel(a.role)}`;
    if (!safeTrim(mk?.full_name)) issues.push(`Mini-KYC: name missing for ${roleLabel(a.role)}.`);
    if ((mk?.pep_status || "unknown") === "unknown") issues.push(`Mini-KYC: PEP status not recorded for ${name}.`);
    if ((mk?.sanctions_screening || "not_done") === "not_done") issues.push(`Mini-KYC: sanctions screening not recorded for ${name}.`);
  }

  return issues;
}

function Tabs({ active, setActive }) {
  return (
    <div style={styles.tabRow}>
      {TABS.map(t => (
        <button key={t.key} type="button" style={styles.tab(active === t.key)} onClick={() => setActive(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function MiniKycModal({ open, onClose, associate, miniKyc, onSave, saving, uboThreshold }) {
  if (!open) return null;
  const titleName = safeTrim(miniKyc?.full_name) || roleLabel(associate?.role);

  return (
    <div style={styles.modalOverlay} role="dialog" aria-modal="true">
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>Mini-KYC</div>
            <div style={styles.tiny}>
              For inspection recordkeeping. Keep language factual and review-based. No automated regulatory actions.
            </div>
          </div>
          <button type="button" style={styles.btn} onClick={onClose} disabled={saving}>
            Close
          </button>
        </div>

        <div style={styles.modalBody}>
          <div style={styles.row}>
            <div style={styles.field}>
              <div style={styles.label}>Role</div>
              <input value={roleLabel(associate?.role)} readOnly style={{ ...styles.input, background: "#f8fafc" }} />
              {associate?.role === "ubo" ? (
                <div style={styles.tiny}>
                  Ownership: <b>{Number(associate?.ownership_percent || 0)}%</b>{" "}
                  {Number(associate?.ownership_percent || 0) >= Number(uboThreshold || 25) ? "• Meets threshold." : "• Below threshold."}
                </div>
              ) : null}
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Full name *</div>
              <input
                value={miniKyc?.full_name || ""}
                onChange={(e) => onSave({ ...miniKyc, full_name: e.target.value }, { immediate: false })}
                style={styles.input}
                placeholder="Required"
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>CNIC (optional)</div>
              <input
                value={miniKyc?.cnic || ""}
                onChange={(e) => onSave({ ...miniKyc, cnic: e.target.value }, { immediate: false })}
                style={styles.input}
                placeholder="Optional"
              />
            </div>
          </div>

          <div style={{ ...styles.row, marginTop: 12 }}>
            <div style={styles.field}>
              <div style={styles.label}>Nationality</div>
              <input
                value={miniKyc?.nationality || ""}
                onChange={(e) => onSave({ ...miniKyc, nationality: e.target.value }, { immediate: false })}
                style={styles.input}
                placeholder="e.g., Pakistani"
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>PEP status</div>
              <select
                value={miniKyc?.pep_status || "unknown"}
                onChange={(e) => onSave({ ...miniKyc, pep_status: e.target.value }, { immediate: false })}
                style={styles.input}
              >
                <option value="unknown">Unknown</option>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Sanctions screening</div>
              <select
                value={miniKyc?.sanctions_screening || "not_done"}
                onChange={(e) => onSave({ ...miniKyc, sanctions_screening: e.target.value }, { immediate: false })}
                style={styles.input}
              >
                <option value="not_done">Not recorded</option>
                <option value="clear">Clear</option>
                <option value="possible_match">Possible match (review)</option>
              </select>
            </div>
          </div>

          <div style={{ ...styles.row, marginTop: 12 }}>
            <div style={styles.field}>
              <div style={styles.label}>Source of wealth (optional)</div>
              <input
                value={miniKyc?.source_of_wealth || ""}
                onChange={(e) => onSave({ ...miniKyc, source_of_wealth: e.target.value }, { immediate: false })}
                style={styles.input}
                placeholder="Optional"
              />
            </div>
            <div style={styles.field}>
              <div style={styles.label}>Source of funds (optional)</div>
              <input
                value={miniKyc?.source_of_funds || ""}
                onChange={(e) => onSave({ ...miniKyc, source_of_funds: e.target.value }, { immediate: false })}
                style={styles.input}
                placeholder="Optional"
              />
            </div>
          </div>

          <div style={{ ...styles.row, marginTop: 12 }}>
            <div style={styles.field}>
              <div style={styles.label}>Evidence checklist</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={!!miniKyc?.id_doc_collected}
                    onChange={(e) => onSave({ ...miniKyc, id_doc_collected: e.target.checked }, { immediate: false })}
                  />
                  <span style={{ fontSize: 12, color: "#334155" }}>ID doc</span>
                </label>

                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={!!miniKyc?.address_doc_collected}
                    onChange={(e) => onSave({ ...miniKyc, address_doc_collected: e.target.checked }, { immediate: false })}
                  />
                  <span style={{ fontSize: 12, color: "#334155" }}>Address doc</span>
                </label>
              </div>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Notes (inspection-safe)</div>
              <input
                value={miniKyc?.notes || ""}
                onChange={(e) => onSave({ ...miniKyc, notes: e.target.value }, { immediate: false })}
                style={styles.input}
                placeholder="Optional, factual notes only"
              />
            </div>
          </div>

          <div style={{ ...styles.btnRow, marginTop: 14 }}>
            <div style={{ color: "#64748b", fontSize: 12 }}>
              Editing: <b>{titleName}</b>
            </div>

            <button
              type="button"
              style={styles.btnPrimary}
              disabled={saving}
              onClick={() => onSave(miniKyc, { immediate: true })}
            >
              {saving ? "Saving..." : "Save Mini-KYC"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EntityDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [activeTab, setActiveTab] = useState("overview");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [uboThreshold, setUboThreshold] = useState(25);

  const [entity, setEntity] = useState(null);
  const [associates, setAssociates] = useState([]);
  const [miniKycByAssoc, setMiniKycByAssoc] = useState({});

  // Add-person forms
  const [newOwner, setNewOwner] = useState({ role: "ubo", ownership_percent: 25, is_indirect: false, notes: "" });
  const [newController, setNewController] = useState({ role: "controller", notes: "" });

  // Mini-KYC modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAssociate, setModalAssociate] = useState(null);
  const [modalMiniKyc, setModalMiniKyc] = useState(null);

  // Risk preview
  const [riskPreview, setRiskPreview] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);

  async function refreshAll(entityId) {
    setLoading(true);
    setErrorMsg("");
    try {
      const settings = await getOrCreateOrgSettings();
      setUboThreshold(Number(settings?.ubo_threshold || 25));

      const lp = await getLegalPerson(entityId);
      setEntity(lp);

      const assoc = await listAssociates(entityId);
      setAssociates(assoc);

      const mkMap = {};
      for (const a of assoc) {
        mkMap[a.id] = await getOrCreateMiniKyc(a.id);
      }
      setMiniKycByAssoc(mkMap);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Unable to load entity.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    refreshAll(id);
  }, [id]);

  const owners = useMemo(() => associates.filter(a => a.role === "ubo"), [associates]);
  const controllers = useMemo(
    () => associates.filter(a => ["controller", "director", "signatory"].includes(a.role)),
    [associates]
  );

  const uboMeeting = useMemo(
    () => owners.filter(o => Number(o.ownership_percent || 0) >= Number(uboThreshold || 25)),
    [owners, uboThreshold]
  );

  const issues = useMemo(() => {
    if (!entity) return [];
    return completenessSummary({ entity, associates, miniKycByAssoc, uboThreshold });
  }, [entity, associates, miniKycByAssoc, uboThreshold]);

  async function saveEntityPatch(patch) {
    if (!id) return;
    setSaving(true);
    setErrorMsg("");
    try {
      const updated = await updateLegalPerson(id, patch);
      setEntity(updated);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function addOwner() {
    if (!id) return;
    setSaving(true);
    setErrorMsg("");
    try {
      const saved = await upsertAssociate(id, {
        role: "ubo",
        ownership_percent: clampPercent(newOwner.ownership_percent),
        is_indirect: !!newOwner.is_indirect,
        notes: newOwner.notes || "",
      });
      await getOrCreateMiniKyc(saved.id);
      setNewOwner({ role: "ubo", ownership_percent: 25, is_indirect: false, notes: "" });
      await refreshAll(id);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Unable to add UBO.");
    } finally {
      setSaving(false);
    }
  }

  async function addController() {
    if (!id) return;
    setSaving(true);
    setErrorMsg("");
    try {
      const saved = await upsertAssociate(id, {
        role: newController.role,
        ownership_percent: 0,
        is_indirect: false,
        notes: newController.notes || "",
      });
      await getOrCreateMiniKyc(saved.id);
      setNewController({ role: "controller", notes: "" });
      await refreshAll(id);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Unable to add controller.");
    } finally {
      setSaving(false);
    }
  }

  async function removeAssociate(assocId) {
    if (!id) return;
    const ok = window.confirm("Remove this person from the entity record? This does not delete the person elsewhere.");
    if (!ok) return;

    setSaving(true);
    setErrorMsg("");
    try {
      await deleteAssociate(assocId);
      await refreshAll(id);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Unable to remove person.");
    } finally {
      setSaving(false);
    }
  }

  function openMiniKyc(assoc) {
    const mk = miniKycByAssoc[assoc.id];
    setModalAssociate(assoc);
    setModalMiniKyc({ ...(mk || {}) });
    setModalOpen(true);
  }

  async function saveMiniKyc(next, { immediate }) {
    // next is local modal state; update local always
    setModalMiniKyc({ ...(next || {}) });
    if (!immediate) return;

    if (!modalAssociate?.id) return;
    const name = safeTrim(next?.full_name);
    if (!name) {
      setErrorMsg("Mini-KYC name is required.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    try {
      const updated = await updateMiniKyc(modalAssociate.id, { ...next, full_name: name });
      setMiniKycByAssoc((p) => ({ ...p, [modalAssociate.id]: updated }));
      setModalOpen(false);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Unable to save Mini-KYC.");
    } finally {
      setSaving(false);
    }
  }

  async function markStatus(nextStatus) {
    const label = nextStatus === "active" ? "mark this entity as Active" : nextStatus === "archived" ? "archive this entity" : "mark as Draft";
    const ok = window.confirm(`Confirm: ${label}?`);
    if (!ok) return;

    await saveEntityPatch({ status: nextStatus });
  }

  async function runRiskPreview() {
    if (!id) return;
    if (!computeLegalPersonRisk) {
      setErrorMsg("Risk preview utility not found. Ensure utils/risk/legalPersonRisk.js exists.");
      return;
    }
    setRiskLoading(true);
    setErrorMsg("");
    try {
      const r = await computeLegalPersonRisk({ legalPersonId: id });
      setRiskPreview(r);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Unable to compute risk preview.");
    } finally {
      setRiskLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.cardBody}>(Loading entity…)</div>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div style={styles.page}>
        <div style={styles.warningBox}>
          <b>Unable to load entity.</b> {errorMsg || "Please check the link or your permissions."}
        </div>
        <div style={{ marginTop: 12 }}>
          <Link href="/entities" style={{ ...styles.btn, display: "inline-block", textDecoration: "none" }}>
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
          <h1 style={styles.h1}>{entity.name}</h1>
          <p style={styles.sub}>
            Maintain ownership/control and inspection-ready Mini-KYC. This module supports review and documentation. It does not submit anything to regulators.
          </p>

          <div style={styles.badgeRow}>
            <span style={styles.badge}>Status: <b>{entity.status}</b></span>
            <span style={styles.badge}>UBO threshold: <b>≥ {uboThreshold}%</b></span>
            <span style={styles.badge}>UBOs meeting threshold: <b>{uboMeeting.length}</b></span>
            <span style={styles.badge}>Associated persons: <b>{associates.length}</b></span>
          </div>

          {issues.length ? (
            <div style={{ marginTop: 12, ...styles.warningBox }}>
              <b>Items to review:</b>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {issues.slice(0, 6).map((x, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>{x}</li>
                ))}
              </ul>
              {issues.length > 6 ? <div style={styles.tiny}>+ {issues.length - 6} more</div> : null}
            </div>
          ) : (
            <div style={{ marginTop: 12, ...styles.okBox }}>
              <b>Baseline completeness looks good.</b> You can still refine ownership/control and evidence over time.
            </div>
          )}

          {errorMsg ? (
            <div style={{ marginTop: 12, ...styles.warningBox }}>
              <b>Action needed:</b> {errorMsg}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href="/entities" style={{ ...styles.btn, textDecoration: "none", display: "inline-block" }}>
            ← Legal Persons
          </Link>
          <Link
            href={`/entities/${id}/exports`}
            style={{ ...styles.btnPrimary, textDecoration: "none", display: "inline-block" }}
          >
            Exports
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Tabs active={activeTab} setActive={setActiveTab} />
      </div>

      <div style={{ marginTop: 12 }}>
        {activeTab === "overview" ? (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ fontWeight: 700 }}>Overview</div>
              <div style={styles.tiny}>Edit entity details and maintain a calm, inspection-safe record.</div>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.row}>
                <div style={styles.field}>
                  <div style={styles.label}>Entity name</div>
                  <input
                    value={entity.name || ""}
                    onChange={(e) => setEntity((p) => ({ ...p, name: e.target.value }))}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>NTN (optional)</div>
                  <input
                    value={entity.ntn || ""}
                    onChange={(e) => setEntity((p) => ({ ...p, ntn: e.target.value }))}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>SECP registration (optional)</div>
                  <input
                    value={entity.secp_registration || ""}
                    onChange={(e) => setEntity((p) => ({ ...p, secp_registration: e.target.value }))}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={{ ...styles.row, marginTop: 12 }}>
                <div style={{ ...styles.field, minWidth: 320 }}>
                  <div style={styles.label}>Address (optional)</div>
                  <input
                    value={entity.address || ""}
                    onChange={(e) => setEntity((p) => ({ ...p, address: e.target.value }))}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>Sector (recommended)</div>
                  <input
                    value={entity.sector || ""}
                    onChange={(e) => setEntity((p) => ({ ...p, sector: e.target.value }))}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14, fontWeight: 700, color: "#0f172a" }}>
                Complexity indicators (risk drafting only)
              </div>
              <div style={{ ...styles.row, marginTop: 8 }}>
                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={!!entity.has_cross_border}
                    onChange={(e) => setEntity((p) => ({ ...p, has_cross_border: e.target.checked }))}
                  />
                  <span style={{ fontSize: 12, color: "#334155" }}>Cross-border exposure</span>
                </label>

                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={!!entity.has_complex_ownership}
                    onChange={(e) => setEntity((p) => ({ ...p, has_complex_ownership: e.target.checked }))}
                  />
                  <span style={{ fontSize: 12, color: "#334155" }}>Complex ownership structure</span>
                </label>

                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={!!entity.has_bearer_shares}
                    onChange={(e) => setEntity((p) => ({ ...p, has_bearer_shares: e.target.checked }))}
                  />
                  <span style={{ fontSize: 12, color: "#334155" }}>Bearer shares</span>
                </label>
              </div>

              <div style={styles.btnRow}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" style={styles.btn} disabled={saving} onClick={() => markStatus("draft")}>
                    Mark Draft
                  </button>
                  <button type="button" style={styles.btn} disabled={saving} onClick={() => markStatus("archived")}>
                    Archive
                  </button>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={styles.btn}
                    disabled={saving || riskLoading}
                    onClick={runRiskPreview}
                    title="Draft-only: for internal review. Not a decision."
                  >
                    {riskLoading ? "Computing…" : "Risk preview"}
                  </button>

                  <button
                    type="button"
                    style={styles.btnPrimary}
                    disabled={saving}
                    onClick={() => saveEntityPatch({
                      name: safeTrim(entity.name),
                      ntn: safeTrim(entity.ntn) || null,
                      secp_registration: safeTrim(entity.secp_registration) || null,
                      address: safeTrim(entity.address) || null,
                      sector: safeTrim(entity.sector) || null,
                      has_cross_border: !!entity.has_cross_border,
                      has_complex_ownership: !!entity.has_complex_ownership,
                      has_bearer_shares: !!entity.has_bearer_shares,
                    })}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>

                  {entity.status !== "active" ? (
                    <button type="button" style={styles.btnPrimary} disabled={saving} onClick={() => markStatus("active")}>
                      Mark Active
                    </button>
                  ) : null}
                </div>
              </div>

              {riskPreview ? (
                <div style={{ marginTop: 14, ...styles.card, borderRadius: 14 }}>
                  <div style={styles.cardHeader}>
                    <div style={{ fontWeight: 700 }}>Risk preview (draft-only)</div>
                    <div style={styles.tiny}>
                      This is an internal drafting aid. It supports explainability and review. It does not make legal conclusions.
                    </div>
                  </div>
                  <div style={styles.cardBody}>
                    <div style={styles.row}>
                      <span style={styles.badge}>
                        Score: <b>{riskPreview.score}</b>
                      </span>
                      <span style={styles.badge}>
                        Band: <b>{riskPreview.band || scoreBand(riskPreview.score)}</b>
                      </span>
                      <span style={styles.badge}>
                        Base: <b>{riskPreview.inputs?.baseScore ?? "—"}</b>
                      </span>
                      <span style={styles.badge}>
                        Linked max: <b>{riskPreview.inputs?.maxAssociateScore ?? "—"}</b>
                      </span>
                      <span style={styles.badge}>
                        Booster: <b>{riskPreview.inputs?.booster ?? "—"}</b>
                      </span>
                    </div>

                    <div style={{ marginTop: 10, fontWeight: 700, color: "#0f172a" }}>Explainability (risk indicators)</div>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {(riskPreview.explainability || []).map((x, i) => (
                        <li key={i} style={{ marginBottom: 6, color: "#334155" }}>{x}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === "ownership" ? (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ fontWeight: 700 }}>Ownership & UBO</div>
              <div style={styles.tiny}>
                Record ownership and beneficial owners. Threshold: <b>≥ {uboThreshold}%</b>. Indirect ownership supported via flag + notes.
              </div>
            </div>
            <div style={styles.cardBody}>
              <div style={{ ...styles.row, alignItems: "flex-end" }}>
                <div style={{ ...styles.field, minWidth: 140 }}>
                  <div style={styles.label}>Ownership %</div>
                  <input
                    value={newOwner.ownership_percent}
                    onChange={(e) => setNewOwner(p => ({ ...p, ownership_percent: clampPercent(e.target.value) }))}
                    style={styles.input}
                    inputMode="numeric"
                  />
                </div>

                <div style={{ ...styles.field, minWidth: 160 }}>
                  <div style={styles.label}>Indirect</div>
                  <label style={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={!!newOwner.is_indirect}
                      onChange={(e) => setNewOwner(p => ({ ...p, is_indirect: e.target.checked }))}
                    />
                    <span style={{ fontSize: 12, color: "#334155" }}>Yes</span>
                  </label>
                </div>

                <div style={{ ...styles.field, minWidth: 320 }}>
                  <div style={styles.label}>Notes (optional)</div>
                  <input
                    value={newOwner.notes}
                    onChange={(e) => setNewOwner(p => ({ ...p, notes: e.target.value }))}
                    style={styles.input}
                    placeholder="Optional, factual notes"
                  />
                </div>

                <button type="button" style={styles.btnPrimary} disabled={saving} onClick={addOwner}>
                  {saving ? "Adding..." : "+ Add UBO entry"}
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                {owners.length === 0 ? (
                  <div style={{ color: "#475569" }}>No ownership entries yet.</div>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>UBO / Owner</th>
                        <th style={styles.th}>Ownership</th>
                        <th style={styles.th}>Indirect</th>
                        <th style={styles.th}>Mini-KYC</th>
                        <th style={styles.th}>Notes</th>
                        <th style={styles.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {owners.map((o) => {
                        const mk = miniKycByAssoc[o.id] || {};
                        const nm = safeTrim(mk.full_name) || "Name not recorded";
                        const meets = Number(o.ownership_percent || 0) >= Number(uboThreshold || 25);
                        return (
                          <tr key={o.id}>
                            <td style={styles.td}>
                              <div style={{ fontWeight: 700, color: "#0f172a" }}>{nm}</div>
                              <div style={styles.tiny}>{meets ? "Meets threshold" : "Below threshold"}</div>
                            </td>
                            <td style={styles.td}>{Number(o.ownership_percent || 0)}%</td>
                            <td style={styles.td}>{o.is_indirect ? "Yes" : "No"}</td>
                            <td style={styles.td}>
                              <div style={styles.tiny}>
                                PEP: <b>{mk.pep_status || "unknown"}</b> • Sanctions: <b>{mk.sanctions_screening || "not_done"}</b>
                              </div>
                              <button type="button" style={styles.linkBtn} onClick={() => openMiniKyc(o)}>
                                Edit Mini-KYC
                              </button>
                            </td>
                            <td style={styles.td}>{o.notes || "—"}</td>
                            <td style={styles.td}>
                              <button type="button" style={styles.linkBtn} onClick={() => removeAssociate(o.id)}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ marginTop: 12, color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
                Note: Ownership entries support inspection recordkeeping and review. They do not trigger any automatic reporting.
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "controllers" ? (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ fontWeight: 700 }}>Controllers</div>
              <div style={styles.tiny}>Record directors, controllers, and signatories with Mini-KYC (inspection-ready).</div>
            </div>
            <div style={styles.cardBody}>
              <div style={{ ...styles.row, alignItems: "flex-end" }}>
                <div style={{ ...styles.field, minWidth: 220 }}>
                  <div style={styles.label}>Role</div>
                  <select
                    value={newController.role}
                    onChange={(e) => setNewController(p => ({ ...p, role: e.target.value }))}
                    style={styles.input}
                  >
                    <option value="controller">Controller</option>
                    <option value="director">Director</option>
                    <option value="signatory">Signatory</option>
                  </select>
                </div>

                <div style={{ ...styles.field, minWidth: 420 }}>
                  <div style={styles.label}>Notes (optional)</div>
                  <input
                    value={newController.notes}
                    onChange={(e) => setNewController(p => ({ ...p, notes: e.target.value }))}
                    style={styles.input}
                    placeholder="Optional, factual notes"
                  />
                </div>

                <button type="button" style={styles.btnPrimary} disabled={saving} onClick={addController}>
                  {saving ? "Adding..." : "+ Add controller"}
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                {controllers.length === 0 ? (
                  <div style={{ color: "#475569" }}>No controllers recorded yet.</div>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Person</th>
                        <th style={styles.th}>Role</th>
                        <th style={styles.th}>Mini-KYC</th>
                        <th style={styles.th}>Notes</th>
                        <th style={styles.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {controllers.map((c) => {
                        const mk = miniKycByAssoc[c.id] || {};
                        const nm = safeTrim(mk.full_name) || "Name not recorded";
                        return (
                          <tr key={c.id}>
                            <td style={styles.td}>
                              <div style={{ fontWeight: 700, color: "#0f172a" }}>{nm}</div>
                              <div style={styles.tiny}>Nationality: {mk.nationality || "—"}</div>
                            </td>
                            <td style={styles.td}>{roleLabel(c.role)}</td>
                            <td style={styles.td}>
                              <div style={styles.tiny}>
                                PEP: <b>{mk.pep_status || "unknown"}</b> • Sanctions: <b>{mk.sanctions_screening || "not_done"}</b>
                              </div>
                              <button type="button" style={styles.linkBtn} onClick={() => openMiniKyc(c)}>
                                Edit Mini-KYC
                              </button>
                            </td>
                            <td style={styles.td}>{c.notes || "—"}</td>
                            <td style={styles.td}>
                              <button type="button" style={styles.linkBtn} onClick={() => removeAssociate(c.id)}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ marginTop: 12, color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
                Note: Controllers list is maintained for inspection readiness and governance documentation. No regulator integrations.
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "exports" ? (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ fontWeight: 700 }}>Exports</div>
              <div style={styles.tiny}>Everything is printable/exportable. These exports are inspection-safe and review-based.</div>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.row}>
                <Link
                  href={`/entities/${id}/exports`}
                  style={{ ...styles.btnPrimary, textDecoration: "none", display: "inline-block" }}
                >
                  Open exports
                </Link>

                <Link
                  href={`/entities/new?id=${id}`}
                  style={{ ...styles.btn, textDecoration: "none", display: "inline-block" }}
                  title="Resume wizard view"
                >
                  Open wizard view
                </Link>
              </div>

              <div style={{ marginTop: 12, ...styles.warningBox }}>
                <b>Reminder:</b> exports support evidence packages and inspection conversations. They do not submit to regulators or file STR/CTR.
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <MiniKycModal
        open={modalOpen}
        onClose={() => { if (!saving) setModalOpen(false); }}
        associate={modalAssociate}
        miniKyc={modalMiniKyc}
        onSave={saveMiniKyc}
        saving={saving}
        uboThreshold={uboThreshold}
      />
    </div>
  );
}
