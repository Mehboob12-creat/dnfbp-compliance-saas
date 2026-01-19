// pages/entities/new.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import {
  createLegalPersonDraft,
  getLegalPerson,
  updateLegalPerson,
  getOrCreateOrgSettings,
  listAssociates,
  upsertAssociate,
  deleteAssociate,
  getOrCreateMiniKyc,
  updateMiniKyc,
} from "../../utils/entities/legalPersonRepo";

const styles = {
  page: { padding: 24, maxWidth: 1100, margin: "0 auto" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
  h1: { margin: 0, color: "#0f172a", fontSize: 26, letterSpacing: "-0.01em" },
  sub: { marginTop: 8, color: "#64748b", lineHeight: 1.5, maxWidth: 720 },
  card: { border: "1px solid #e2e8f0", borderRadius: 16, background: "#ffffff", overflow: "hidden" },
  cardHeader: { padding: 14, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#334155" },
  cardBody: { padding: 16 },
  row: { display: "flex", gap: 12, flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: 6, minWidth: 240, flex: 1 },
  label: { fontSize: 12, color: "#334155" },
  input: { padding: "10px 12px", borderRadius: 12, border: "1px solid #e2e8f0", outline: "none" },
  checkboxRow: { display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 12 },
  btnRow: { display: "flex", justifyContent: "space-between", gap: 12, marginTop: 16 },
  btn: { padding: "10px 14px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" },
  btnPrimary: { padding: "10px 14px", borderRadius: 12, border: "1px solid #0f172a", background: "#0f172a", color: "#fff", cursor: "pointer" },
  badge: { display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, border: "1px solid #e2e8f0", background: "#fff", color: "#334155", fontSize: 12 },
  stepper: { display: "flex", gap: 10, flexWrap: "wrap" },
  step: (active) => ({
    padding: "8px 10px",
    borderRadius: 999,
    border: `1px solid ${active ? "#0f172a" : "#e2e8f0"}`,
    background: active ? "#0f172a" : "#fff",
    color: active ? "#fff" : "#334155",
    fontSize: 12,
  }),
  hr: { height: 1, background: "#e2e8f0", border: "none", margin: "14px 0" },
  tiny: { fontSize: 12, color: "#64748b", lineHeight: 1.45 },
  warningBox: { padding: 12, borderRadius: 14, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e" },
  okBox: { padding: 12, borderRadius: 14, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0 },
  th: { textAlign: "left", fontSize: 12, color: "#334155", padding: 10, background: "#f8fafc", borderBottom: "1px solid #e2e8f0" },
  td: { padding: 10, borderBottom: "1px solid #e2e8f0", verticalAlign: "top" },
  linkBtn: { padding: 0, border: "none", background: "transparent", cursor: "pointer", color: "#0f172a", textDecoration: "underline", fontSize: 12 },
};

const STEPS = [
  { key: "entity", label: "Entity" },
  { key: "ownership", label: "Ownership & UBO" },
  { key: "controllers", label: "Controllers" },
  { key: "review", label: "Review" },
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

function summarizeCompleteness({ entity, associates, miniKycByAssociateId, uboThreshold }) {
  const issues = [];

  if (!entity?.name) issues.push("Entity name is missing.");
  if (!entity?.sector) issues.push("Sector is not set (recommended for risk indicators).");

  const owners = (associates || []).filter(a => a.role === "ubo");
  const controllers = (associates || []).filter(a => ["controller", "director", "signatory"].includes(a.role));

  const uboMeeting = owners.filter(a => Number(a.ownership_percent || 0) >= Number(uboThreshold || 25));
  if (uboMeeting.length === 0) {
    issues.push(`No UBO currently meets the threshold (≥ ${uboThreshold || 25}%). Add UBO(s) or record rationale in notes.`);
  }

  if (controllers.length === 0) {
    issues.push("No controllers/directors/signatories added yet (recommended for completeness).");
  }

  // Mini-KYC completeness (lightweight, inspection-friendly)
  for (const a of associates || []) {
    const mk = miniKycByAssociateId[a.id];
    const name = safeTrim(mk?.full_name);
    if (!name) {
      issues.push(`Mini-KYC: name missing for a ${a.role}.`);
    }
    // pep/sanctions can be unknown/not_done initially, but flag for review
    if ((mk?.pep_status || "unknown") === "unknown") {
      issues.push(`Mini-KYC: PEP status not recorded for ${name || a.role}.`);
    }
    if ((mk?.sanctions_screening || "not_done") === "not_done") {
      issues.push(`Mini-KYC: sanctions screening not recorded for ${name || a.role}.`);
    }
  }

  return issues;
}

function Stepper({ stepIndex, setStepIndex, disabled }) {
  return (
    <div style={styles.stepper}>
      {STEPS.map((s, idx) => (
        <button
          key={s.key}
          type="button"
          disabled={disabled}
          onClick={() => setStepIndex(idx)}
          style={styles.step(idx === stepIndex)}
          title={disabled ? "Complete the current step first." : `Go to ${s.label}`}
        >
          {idx + 1}. {s.label}
        </button>
      ))}
    </div>
  );
}

function AssociateEditor({ title, roleOptions, rows, onAdd, onUpdate, onDelete, uboThreshold, showOwnership }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{title}</div>
            {showOwnership ? (
              <div style={styles.tiny}>
                UBO threshold: <b>≥ {uboThreshold}%</b> (admin-editable later). Indirect ownership is supported via a simple flag + notes.
              </div>
            ) : (
              <div style={styles.tiny}>Add key persons for governance and control (inspection-ready recordkeeping).</div>
            )}
          </div>
          <button type="button" style={styles.btn} onClick={onAdd}>
            + Add
          </button>
        </div>
      </div>

      <div style={styles.cardBody}>
        {rows.length === 0 ? (
          <div style={{ color: "#475569" }}>No entries yet.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Role</th>
                {showOwnership && <th style={styles.th}>Ownership %</th>}
                {showOwnership && <th style={styles.th}>Indirect</th>}
                <th style={styles.th}>Mini-KYC</th>
                <th style={styles.th}>Notes</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.client_key}>
                  <td style={styles.td}>
                    <select
                      value={r.role}
                      onChange={(e) => onUpdate(r.client_key, { role: e.target.value })}
                      style={styles.input}
                    >
                      {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {showOwnership && (
                    <td style={styles.td}>
                      <input
                        value={r.ownership_percent}
                        onChange={(e) => onUpdate(r.client_key, { ownership_percent: clampPercent(e.target.value) })}
                        style={styles.input}
                        inputMode="numeric"
                        placeholder="e.g., 25"
                      />
                      {Number(r.ownership_percent || 0) >= Number(uboThreshold || 25) && r.role === "ubo" ? (
                        <div style={styles.tiny}>Meets threshold.</div>
                      ) : null}
                    </td>
                  )}

                  {showOwnership && (
                    <td style={styles.td}>
                      <label style={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={!!r.is_indirect}
                          onChange={(e) => onUpdate(r.client_key, { is_indirect: e.target.checked })}
                        />
                        <span style={{ fontSize: 12, color: "#334155" }}>Indirect</span>
                      </label>
                    </td>
                  )}

                  <td style={styles.td}>
                    <div style={styles.row}>
                      <div style={{ ...styles.field, minWidth: 220 }}>
                        <div style={styles.label}>Full name</div>
                        <input
                          value={r.miniKyc.full_name || ""}
                          onChange={(e) => onUpdate(r.client_key, { miniKyc: { ...r.miniKyc, full_name: e.target.value } })}
                          style={styles.input}
                          placeholder="Name for inspection record"
                        />
                      </div>

                      <div style={{ ...styles.field, minWidth: 160 }}>
                        <div style={styles.label}>CNIC (optional)</div>
                        <input
                          value={r.miniKyc.cnic || ""}
                          onChange={(e) => onUpdate(r.client_key, { miniKyc: { ...r.miniKyc, cnic: e.target.value } })}
                          style={styles.input}
                          placeholder="Optional"
                        />
                      </div>

                      <div style={{ ...styles.field, minWidth: 160 }}>
                        <div style={styles.label}>Nationality</div>
                        <input
                          value={r.miniKyc.nationality || ""}
                          onChange={(e) => onUpdate(r.client_key, { miniKyc: { ...r.miniKyc, nationality: e.target.value } })}
                          style={styles.input}
                          placeholder="e.g., Pakistani"
                        />
                      </div>

                      <div style={{ ...styles.field, minWidth: 160 }}>
                        <div style={styles.label}>PEP status</div>
                        <select
                          value={r.miniKyc.pep_status || "unknown"}
                          onChange={(e) => onUpdate(r.client_key, { miniKyc: { ...r.miniKyc, pep_status: e.target.value } })}
                          style={styles.input}
                        >
                          <option value="unknown">Unknown</option>
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>

                      <div style={{ ...styles.field, minWidth: 200 }}>
                        <div style={styles.label}>Sanctions screening</div>
                        <select
                          value={r.miniKyc.sanctions_screening || "not_done"}
                          onChange={(e) =>
                            onUpdate(r.client_key, { miniKyc: { ...r.miniKyc, sanctions_screening: e.target.value } })
                          }
                          style={styles.input}
                        >
                          <option value="not_done">Not recorded</option>
                          <option value="clear">Clear</option>
                          <option value="possible_match">Possible match (review)</option>
                        </select>
                      </div>

                      <div style={{ ...styles.field, minWidth: 220 }}>
                        <div style={styles.label}>Source of wealth (optional)</div>
                        <input
                          value={r.miniKyc.source_of_wealth || ""}
                          onChange={(e) =>
                            onUpdate(r.client_key, { miniKyc: { ...r.miniKyc, source_of_wealth: e.target.value } })
                          }
                          style={styles.input}
                          placeholder="Optional"
                        />
                      </div>

                      <div style={{ ...styles.field, minWidth: 220 }}>
                        <div style={styles.label}>Source of funds (optional)</div>
                        <input
                          value={r.miniKyc.source_of_funds || ""}
                          onChange={(e) =>
                            onUpdate(r.client_key, { miniKyc: { ...r.miniKyc, source_of_funds: e.target.value } })
                          }
                          style={styles.input}
                          placeholder="Optional"
                        />
                      </div>

                      <div style={{ ...styles.field, minWidth: 220 }}>
                        <div style={styles.label}>Evidence</div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <label style={styles.checkboxRow}>
                            <input
                              type="checkbox"
                              checked={!!r.miniKyc.id_doc_collected}
                              onChange={(e) =>
                                onUpdate(r.client_key, { miniKyc: { ...r.miniKyc, id_doc_collected: e.target.checked } })
                              }
                            />
                            <span style={{ fontSize: 12, color: "#334155" }}>ID doc</span>
                          </label>

                          <label style={styles.checkboxRow}>
                            <input
                              type="checkbox"
                              checked={!!r.miniKyc.address_doc_collected}
                              onChange={(e) =>
                                onUpdate(r.client_key, {
                                  miniKyc: { ...r.miniKyc, address_doc_collected: e.target.checked },
                                })
                              }
                            />
                            <span style={{ fontSize: 12, color: "#334155" }}>Address doc</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={styles.label}>Mini-KYC notes (inspection-safe)</div>
                      <input
                        value={r.miniKyc.notes || ""}
                        onChange={(e) => onUpdate(r.client_key, { miniKyc: { ...r.miniKyc, notes: e.target.value } })}
                        style={styles.input}
                        placeholder="Optional, factual notes only"
                      />
                    </div>
                  </td>

                  <td style={styles.td}>
                    <input
                      value={r.notes || ""}
                      onChange={(e) => onUpdate(r.client_key, { notes: e.target.value })}
                      style={styles.input}
                      placeholder="Optional"
                    />
                  </td>

                  <td style={styles.td}>
                    <button type="button" style={styles.linkBtn} onClick={() => onDelete(r.client_key)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showOwnership ? (
          <div style={{ marginTop: 12, color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
            Note: This module records ownership/control for inspection readiness. It does not submit anything to regulators.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function NewEntityWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fatalError, setFatalError] = useState("");

  const [uboThreshold, setUboThreshold] = useState(25);

  const [legalPersonId, setLegalPersonId] = useState(null);
  const [entity, setEntity] = useState({
    name: "",
    ntn: "",
    secp_registration: "",
    address: "",
    sector: "",
    has_cross_border: false,
    has_complex_ownership: false,
    has_bearer_shares: false,
    status: "draft",
  });

  // We keep wizard rows client-side with stable keys, then persist to DB.
  const [ownershipRows, setOwnershipRows] = useState([]);
  const [controllerRows, setControllerRows] = useState([]);

  // For review step (fresh from DB)
  const [reviewAssociates, setReviewAssociates] = useState([]);
  const [reviewMiniKycByAssociateId, setReviewMiniKycByAssociateId] = useState({});

  const step = STEPS[stepIndex]?.key;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setFatalError("");

        const settings = await getOrCreateOrgSettings();
        if (!mounted) return;
        setUboThreshold(Number(settings?.ubo_threshold || 25));

        // Support resuming via ?id=
        const id = router.query?.id;
        if (id) {
          const lp = await getLegalPerson(id);
          if (!mounted) return;
          setLegalPersonId(lp.id);
          setEntity({
            name: lp.name || "",
            ntn: lp.ntn || "",
            secp_registration: lp.secp_registration || "",
            address: lp.address || "",
            sector: lp.sector || "",
            has_cross_border: !!lp.has_cross_border,
            has_complex_ownership: !!lp.has_complex_ownership,
            has_bearer_shares: !!lp.has_bearer_shares,
            status: lp.status || "draft",
          });

          const assoc = await listAssociates(lp.id);
          if (!mounted) return;

          // Pull mini-kyc for each associate (create if missing)
          const mkMap = {};
          for (const a of assoc) {
            const mk = await getOrCreateMiniKyc(a.id);
            mkMap[a.id] = mk;
          }

          // Rehydrate client-side rows for wizard editing
          const owners = assoc
            .filter(a => a.role === "ubo")
            .map(a => ({
              id: a.id,
              client_key: a.id,
              role: a.role,
              ownership_percent: Number(a.ownership_percent || 0),
              is_indirect: !!a.is_indirect,
              notes: a.notes || "",
              miniKyc: {
                ...mkMap[a.id],
              },
            }));

          const ctrls = assoc
            .filter(a => ["controller", "director", "signatory"].includes(a.role))
            .map(a => ({
              id: a.id,
              client_key: a.id,
              role: a.role,
              ownership_percent: Number(a.ownership_percent || 0),
              is_indirect: !!a.is_indirect,
              notes: a.notes || "",
              miniKyc: {
                ...mkMap[a.id],
              },
            }));

          setOwnershipRows(owners);
          setControllerRows(ctrls);
        }
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setFatalError(e?.message || "Unable to load wizard.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router.query?.id]);

  const canNavigateSteps = useMemo(() => !saving && !loading, [saving, loading]);

  async function persistEntityAndContinue() {
    setSaving(true);
    setFatalError("");
    try {
      let lpId = legalPersonId;

      if (!lpId) {
        const created = await createLegalPersonDraft(entity);
        lpId = created.id;
        setLegalPersonId(lpId);

        // Keep URL resumable
        router.replace(
          { pathname: "/entities/new", query: { id: lpId } },
          undefined,
          { shallow: true }
        );
      } else {
        await updateLegalPerson(lpId, entity);
      }

      setStepIndex(1);
    } catch (e) {
      console.error(e);
      setFatalError(e?.message || "Could not save entity.");
    } finally {
      setSaving(false);
    }
  }

  function addOwnershipRow() {
    setOwnershipRows((prev) => [
      ...prev,
      {
        id: null,
        client_key: `new_${crypto.randomUUID()}`,
        role: "ubo",
        ownership_percent: 25,
        is_indirect: false,
        notes: "",
        miniKyc: {
          full_name: "",
          cnic: "",
          nationality: "",
          pep_status: "unknown",
          sanctions_screening: "not_done",
          source_of_wealth: "",
          source_of_funds: "",
          id_doc_collected: false,
          address_doc_collected: false,
          notes: "",
        },
      },
    ]);
  }

  function addControllerRow() {
    setControllerRows((prev) => [
      ...prev,
      {
        id: null,
        client_key: `new_${crypto.randomUUID()}`,
        role: "controller",
        ownership_percent: 0,
        is_indirect: false,
        notes: "",
        miniKyc: {
          full_name: "",
          cnic: "",
          nationality: "",
          pep_status: "unknown",
          sanctions_screening: "not_done",
          source_of_wealth: "",
          source_of_funds: "",
          id_doc_collected: false,
          address_doc_collected: false,
          notes: "",
        },
      },
    ]);
  }

  function updateRow(setter, key, patch) {
    setter((prev) =>
      prev.map((r) => (r.client_key === key ? { ...r, ...patch, miniKyc: patch.miniKyc ?? r.miniKyc } : r))
    );
  }

  function deleteRow(setter, key) {
    setter((prev) => prev.filter((r) => r.client_key !== key));
  }

  async function persistAssociatesAndContinue(nextStepIndex) {
    if (!legalPersonId) {
      setFatalError("Create the entity first.");
      return;
    }

    setSaving(true);
    setFatalError("");
    try {
      // Persist ownership rows
      for (const r of ownershipRows) {
        // Minimal validation: role + name (miniKYC)
        const nm = safeTrim(r?.miniKyc?.full_name);
        if (!nm) throw new Error("Ownership/UBO: each entry must include a name in Mini-KYC.");

        const savedAssoc = await upsertAssociate(legalPersonId, {
          id: r.id || null,
          role: r.role,
          ownership_percent: clampPercent(r.ownership_percent),
          is_indirect: !!r.is_indirect,
          notes: r.notes || "",
        });

        // Ensure wizard row knows its DB id
        r.id = savedAssoc.id;
        r.client_key = savedAssoc.id;

        await updateMiniKyc(savedAssoc.id, {
          ...r.miniKyc,
          full_name: nm,
        });
      }

      // Persist controller rows
      for (const r of controllerRows) {
        const nm = safeTrim(r?.miniKyc?.full_name);
        if (!nm) throw new Error("Controllers: each entry must include a name in Mini-KYC.");

        const savedAssoc = await upsertAssociate(legalPersonId, {
          id: r.id || null,
          role: r.role,
          ownership_percent: 0,
          is_indirect: false,
          notes: r.notes || "",
        });

        r.id = savedAssoc.id;
        r.client_key = savedAssoc.id;

        await updateMiniKyc(savedAssoc.id, {
          ...r.miniKyc,
          full_name: nm,
        });
      }

      // Handle deletions: we only delete DB rows that existed but were removed from the wizard
      // (Best effort: safe, avoids leaving stale associates around)
      const existing = await listAssociates(legalPersonId);
      const keepIds = new Set(
        [...ownershipRows, ...controllerRows]
          .map(r => r.id)
          .filter(Boolean)
      );

      for (const ex of existing) {
        const isOwner = ex.role === "ubo";
        const isCtrl = ["controller", "director", "signatory"].includes(ex.role);
        if ((isOwner || isCtrl) && !keepIds.has(ex.id)) {
          await deleteAssociate(ex.id);
        }
      }

      // Refresh URL in case IDs changed from temporary client keys
      router.replace(
        { pathname: "/entities/new", query: { id: legalPersonId } },
        undefined,
        { shallow: true }
      );

      setStepIndex(nextStepIndex);
    } catch (e) {
      console.error(e);
      setFatalError(e?.message || "Could not save persons.");
    } finally {
      setSaving(false);
    }
  }

  async function loadReview() {
    if (!legalPersonId) return;
    setSaving(true);
    setFatalError("");
    try {
      const lp = await getLegalPerson(legalPersonId);
      const assoc = await listAssociates(legalPersonId);

      const mkMap = {};
      for (const a of assoc) {
        mkMap[a.id] = await getOrCreateMiniKyc(a.id);
      }

      setEntity({
        name: lp.name || "",
        ntn: lp.ntn || "",
        secp_registration: lp.secp_registration || "",
        address: lp.address || "",
        sector: lp.sector || "",
        has_cross_border: !!lp.has_cross_border,
        has_complex_ownership: !!lp.has_complex_ownership,
        has_bearer_shares: !!lp.has_bearer_shares,
        status: lp.status || "draft",
      });

      setReviewAssociates(assoc || []);
      setReviewMiniKycByAssociateId(mkMap);
      setStepIndex(3);
    } catch (e) {
      console.error(e);
      setFatalError(e?.message || "Could not load review.");
    } finally {
      setSaving(false);
    }
  }

  async function markActive() {
    if (!legalPersonId) return;
    setSaving(true);
    setFatalError("");
    try {
      await updateLegalPerson(legalPersonId, { status: "active" });
      // Send to entity detail page (we’ll build it next), but don’t block you.
      router.push(`/entities/${legalPersonId}`);
    } catch (e) {
      console.error(e);
      setFatalError(e?.message || "Could not mark entity as active.");
    } finally {
      setSaving(false);
    }
  }

  const reviewIssues = useMemo(() => {
    if (!step || step !== "review") return [];
    return summarizeCompleteness({
      entity,
      associates: reviewAssociates,
      miniKycByAssociateId: reviewMiniKycByAssociateId,
      uboThreshold,
    });
  }, [step, entity, reviewAssociates, reviewMiniKycByAssociateId, uboThreshold]);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.cardBody}>(Loading wizard…)</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.h1}>New Legal Person</h1>
          <p style={styles.sub}>
            Create an inspection-ready entity profile with UBOs and controllers. This module supports review and documentation.
            It does not submit anything to regulators.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <span style={styles.badge}>Status: <b>{entity.status || "draft"}</b></span>
            <span style={styles.badge}>UBO threshold: <b>≥ {uboThreshold}%</b></span>
            {legalPersonId ? <span style={styles.badge}>Draft ID: <b>{legalPersonId.slice(0, 8)}…</b></span> : null}
          </div>
        </div>

        <div style={{ minWidth: 260 }}>
          <Stepper stepIndex={stepIndex} setStepIndex={setStepIndex} disabled={!canNavigateSteps} />
        </div>
      </div>

      {fatalError ? (
        <div style={{ marginTop: 14, ...styles.warningBox }}>
          <b>Action needed:</b> {fatalError}
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        {step === "entity" ? (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ fontWeight: 600 }}>Step 1 — Entity</div>
              <div style={styles.tiny}>Record the entity profile. Keep notes factual and inspection-safe.</div>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.row}>
                <div style={styles.field}>
                  <div style={styles.label}>Entity name *</div>
                  <input
                    value={entity.name}
                    onChange={(e) => setEntity((p) => ({ ...p, name: e.target.value }))}
                    style={styles.input}
                    placeholder="e.g., ABC Developers (Pvt.) Ltd."
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>NTN (optional)</div>
                  <input
                    value={entity.ntn}
                    onChange={(e) => setEntity((p) => ({ ...p, ntn: e.target.value }))}
                    style={styles.input}
                    placeholder="Optional"
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>SECP registration (optional)</div>
                  <input
                    value={entity.secp_registration}
                    onChange={(e) => setEntity((p) => ({ ...p, secp_registration: e.target.value }))}
                    style={styles.input}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div style={{ ...styles.row, marginTop: 12 }}>
                <div style={{ ...styles.field, minWidth: 320 }}>
                  <div style={styles.label}>Address (optional)</div>
                  <input
                    value={entity.address}
                    onChange={(e) => setEntity((p) => ({ ...p, address: e.target.value }))}
                    style={styles.input}
                    placeholder="Optional"
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Sector (recommended)</div>
                  <input
                    value={entity.sector}
                    onChange={(e) => setEntity((p) => ({ ...p, sector: e.target.value }))}
                    style={styles.input}
                    placeholder="e.g., Real estate, Jewellery, Accounting"
                  />
                </div>
              </div>

              <hr style={styles.hr} />

              <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>
                Complexity indicators (for risk drafting only)
              </div>
              <div style={styles.row}>
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
                <div />
                <button type="button" style={styles.btnPrimary} disabled={saving} onClick={persistEntityAndContinue}>
                  {saving ? "Saving..." : "Save & continue"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "ownership" ? (
          <>
            <AssociateEditor
              title="Step 2 — Ownership & UBO"
              roleOptions={[
                { value: "ubo", label: "UBO / Owner" },
              ]}
              rows={ownershipRows}
              onAdd={addOwnershipRow}
              onUpdate={(key, patch) => updateRow(setOwnershipRows, key, patch)}
              onDelete={(key) => deleteRow(setOwnershipRows, key)}
              uboThreshold={uboThreshold}
              showOwnership
            />

            <div style={styles.btnRow}>
              <button type="button" style={styles.btn} disabled={saving} onClick={() => setStepIndex(0)}>
                Back
              </button>

              <button
                type="button"
                style={styles.btnPrimary}
                disabled={saving}
                onClick={() => persistAssociatesAndContinue(2)}
              >
                {saving ? "Saving..." : "Save & continue"}
              </button>
            </div>
          </>
        ) : null}

        {step === "controllers" ? (
          <>
            <AssociateEditor
              title="Step 3 — Controllers"
              roleOptions={[
                { value: "controller", label: "Controller" },
                { value: "director", label: "Director" },
                { value: "signatory", label: "Signatory" },
              ]}
              rows={controllerRows}
              onAdd={addControllerRow}
              onUpdate={(key, patch) => updateRow(setControllerRows, key, patch)}
              onDelete={(key) => deleteRow(setControllerRows, key)}
              uboThreshold={uboThreshold}
              showOwnership={false}
            />

            <div style={styles.btnRow}>
              <button type="button" style={styles.btn} disabled={saving} onClick={() => setStepIndex(1)}>
                Back
              </button>

              <button type="button" style={styles.btnPrimary} disabled={saving} onClick={loadReview}>
                {saving ? "Preparing..." : "Review"}
              </button>
            </div>
          </>
        ) : null}

        {step === "review" ? (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ fontWeight: 600 }}>Step 4 — Review</div>
              <div style={styles.tiny}>
                Confirm completeness. You can keep the profile as <b>draft</b> until ready. No automated regulatory actions.
              </div>
            </div>
            <div style={styles.cardBody}>
              {reviewIssues.length ? (
                <div style={styles.warningBox}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Items to review</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {reviewIssues.map((x, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div style={styles.okBox}>
                  <b>Looks good.</b> This entity record appears complete for an inspection-ready baseline.
                </div>
              )}

              <hr style={styles.hr} />

              <div style={{ fontWeight: 700, color: "#0f172a" }}>Next actions</div>
              <p style={styles.tiny}>
                You can mark the entity as Active (recommended once reviewed). You can also keep it in Draft while collecting
                remaining documents or clarifying ownership/control.
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                <button type="button" style={styles.btn} disabled={saving} onClick={() => setStepIndex(2)}>
                  Back
                </button>

                <button
                  type="button"
                  style={styles.btn}
                  disabled={saving}
                  onClick={() => router.push(`/entities/${legalPersonId}`)}
                  title="Open detail page (we’ll build next; route can exist already in your app)"
                >
                  Open entity
                </button>

                <button type="button" style={styles.btnPrimary} disabled={saving} onClick={markActive}>
                  {saving ? "Updating..." : "Mark Active"}
                </button>
              </div>

              <div style={{ marginTop: 12, color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
                Inspection-safe note: this record supports evidence and review. It does not file STR/CTR or submit to regulators.
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
