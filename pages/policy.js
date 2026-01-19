import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

function Card({ children }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      {children}
    </div>
  );
}

function Container({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "#e5e7eb" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px 64px" }}>{children}</div>
    </div>
  );
}

function Button({ children, onClick, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        borderRadius: 14,
        padding: "12px 14px",
        border: "1px solid rgba(255,255,255,0.12)",
        background: disabled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
        color: "#e5e7eb",
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      <input
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "12px 12px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
          color: "#e5e7eb",
          outline: "none",
        }}
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 6 }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "12px 12px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
          color: "#e5e7eb",
          outline: "none",
          lineHeight: 1.6,
          resize: "vertical",
        }}
      />
    </label>
  );
}

function Badge({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "#e5e7eb",
      }}
    >
      {children}
    </span>
  );
}

function safeText(x) {
  return typeof x === "string" ? x.trim() : "";
}

export default function PolicyPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [rows, setRows] = useState([]);

  // Wizard inputs
  const [sector, setSector] = useState("DNFBP (Pakistan)");
  const [staffCount, setStaffCount] = useState("3");
  const [turnoverBand, setTurnoverBand] = useState("PKR —");
  const [customerProfile, setCustomerProfile] = useState("Natural persons, local customers (typical).");
  const [transactionProfile, setTransactionProfile] = useState("Service-based transactions; mixed payment modes.");
  const [geographyProfile, setGeographyProfile] = useState("Pakistan (primary).");
  const [existingControls, setExistingControls] = useState("CDD collection, risk scoring, inspection pack exports.");

  const [selected, setSelected] = useState(null);
  const selectedRow = useMemo(() => rows.find((r) => r.id === selected) || null, [rows, selected]);

  async function refresh() {
    setLoading(true);
    setMsg("");
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("policy_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRows(data || []);
      if (!selected && (data || []).length) setSelected((data || [])[0].id);
    } catch (e) {
      setMsg(e?.message || "Failed to load policy requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateDraft() {
    setMsg("Generating draft (template)…");
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const token = sessionData?.session?.access_token;
      if (!token) {
        setMsg("Session expired. Please log in again.");
        return;
      }

      const payload = {
        sector: safeText(sector),
        staff_count: Number(staffCount || 0),
        turnover_band: safeText(turnoverBand),
        customer_profile: safeText(customerProfile),
        transaction_profile: safeText(transactionProfile),
        geography_profile: safeText(geographyProfile),
        existing_controls: safeText(existingControls),
      };

      const resp = await fetch("/api/policy-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const j = await resp.json().catch(() => null);
        throw new Error(j?.detail || j?.error || "Draft generation failed.");
      }

      await refresh();
      setMsg("Draft created. Please review and edit before finalizing.");
    } catch (e) {
      setMsg(e?.message || "Failed to generate draft.");
    }
  }

  async function updateSelected(patch) {
    if (!selectedRow) return;
    setMsg("Saving…");
    try {
      const { error } = await supabase
        .from("policy_requests")
        .update(patch)
        .eq("id", selectedRow.id);

      if (error) throw error;
      await refresh();
      setMsg("Saved.");
      setTimeout(() => setMsg(""), 800);
    } catch (e) {
      setMsg(e?.message || "Failed to save.");
    }
  }

  async function exportPdf(version) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        alert("Session expired. Please log in again.");
        return;
      }

      const resp = await fetch("/api/policy-export", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ policyId: selectedRow.id, version }),
      });

      if (!resp.ok) {
        const j = await resp.json().catch(() => null);
        alert(j?.detail || j?.error || "Export failed.");
        return;
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AML_CFT_Policy_${version}_${selectedRow.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.message || "Export failed.");
    }
  }

  return (
    <Container>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>
            <Link href="/dashboard" style={{ color: "#c7d2fe", textDecoration: "none" }}>Dashboard</Link>{" "}
            <span style={{ opacity: 0.5 }}>/</span> <span>Policy Generator</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 780, letterSpacing: -0.4 }}>AML/CFT Policy Generator</div>
          <div style={{ marginTop: 6, opacity: 0.78, lineHeight: 1.45, maxWidth: 860 }}>
            Draft policies for internal controls and inspection preparation. Drafts must be reviewed and approved by management/consultant.
            This platform does not submit anything to regulators or auto-file STR/CTR.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button onClick={generateDraft} disabled={loading} title="Creates a policy draft (template) and saves it for review.">
            New Draft
          </Button>
        </div>
      </div>

      {msg ? (
        <div style={{ marginTop: 12 }}>
          <Card>
            <div style={{ opacity: 0.9 }}>{msg}</div>
          </Card>
        </div>
      ) : null}

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "380px 1fr", gap: 14 }}>
        {/* Left: wizard + list */}
        <div style={{ display: "grid", gap: 14 }}>
          <Card>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Draft inputs</div>
            <div style={{ display: "grid", gap: 10 }}>
              <Input label="Sector" value={sector} onChange={setSector} placeholder="e.g., Real estate, Jewelry, etc." />
              <Input label="Staff count" value={staffCount} onChange={setStaffCount} type="number" placeholder="e.g., 5" />
              <Input label="Turnover band" value={turnoverBand} onChange={setTurnoverBand} placeholder="e.g., PKR 10–50m" />
              <TextArea label="Customer profile" value={customerProfile} onChange={setCustomerProfile} rows={4} />
              <TextArea label="Transaction profile" value={transactionProfile} onChange={setTransactionProfile} rows={4} />
              <TextArea label="Geography profile" value={geographyProfile} onChange={setGeographyProfile} rows={3} />
              <TextArea label="Existing controls" value={existingControls} onChange={setExistingControls} rows={4} />
              <Button onClick={generateDraft} disabled={loading} title="Creates a draft policy you can edit and finalize.">
                Generate draft (template)
              </Button>
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 800 }}>Saved drafts</div>
              <Badge>{rows.length} total</Badge>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {loading ? (
                <div style={{ opacity: 0.85 }}>Loading…</div>
              ) : rows.length === 0 ? (
                <div style={{ opacity: 0.85 }}>No policy drafts yet.</div>
              ) : (
                rows.map((r) => {
                  const isSel = r.id === selected;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelected(r.id)}
                      style={{
                        textAlign: "left",
                        borderRadius: 14,
                        padding: 12,
                        border: isSel ? "1px solid rgba(199,210,254,0.55)" : "1px solid rgba(255,255,255,0.10)",
                        background: isSel ? "rgba(199,210,254,0.08)" : "rgba(255,255,255,0.03)",
                        color: "#e5e7eb",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 780 }}>
                          {r.status === "FINALIZED" ? "Final" : r.status === "UNDER_REVIEW" ? "Under review" : "Draft"}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                        Sector: {r.sector || "—"}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right: editor/workflow */}
        <div style={{ display: "grid", gap: 14 }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 850, fontSize: 16 }}>Draft editor (human review)</div>
                <div style={{ marginTop: 6, opacity: 0.78, lineHeight: 1.5 }}>
                  Edit the draft in calm, inspection-safe language. When ready, move to <b>Under review</b> and then <b>Finalize</b>.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button
                  disabled={!selectedRow}
                  onClick={() => exportPdf("DRAFT")}
                  title="Exports the draft policy as a PDF for review."
                >
                  Export Draft PDF
                </Button>
                <Button
                  disabled={!selectedRow}
                  onClick={() => exportPdf("FINAL")}
                  title="Exports the final policy as a PDF (or draft if final is not set)."
                >
                  Export Final PDF
                </Button>
              </div>
            </div>

            {!selectedRow ? (
              <div style={{ marginTop: 12, opacity: 0.85 }}>Select a draft to view/edit.</div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <Badge>ID: {selectedRow.id}</Badge>
                  <Badge>Status: {selectedRow.status}</Badge>
                  <Badge>Updated: {new Date(selectedRow.updated_at).toLocaleString()}</Badge>
                </div>

                <label style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Draft (markdown)</div>
                  <textarea
                    value={selectedRow.draft_markdown || ""}
                    onChange={(e) => {
                      const next = rows.map((x) => (x.id === selectedRow.id ? { ...x, draft_markdown: e.target.value } : x));
                      setRows(next);
                    }}
                    rows={18}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#e5e7eb",
                      outline: "none",
                      lineHeight: 1.6,
                      resize: "vertical",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Consultant notes (optional)</div>
                  <textarea
                    value={selectedRow.consultant_notes || ""}
                    onChange={(e) => {
                      const next = rows.map((x) => (x.id === selectedRow.id ? { ...x, consultant_notes: e.target.value } : x));
                      setRows(next);
                    }}
                    rows={4}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#e5e7eb",
                      outline: "none",
                      lineHeight: 1.6,
                      resize: "vertical",
                    }}
                  />
                </label>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    onClick={() =>
                      updateSelected({
                        draft_markdown: selectedRow.draft_markdown || "",
                        consultant_notes: selectedRow.consultant_notes || null,
                      })
                    }
                    title="Saves draft and notes."
                  >
                    Save draft
                  </Button>

                  <Button
                    onClick={() => updateSelected({ status: "UNDER_REVIEW" })}
                    title="Marks this draft as under review (human review workflow)."
                  >
                    Move to Under Review
                  </Button>

                  <Button
                    onClick={() =>
                      updateSelected({
                        status: "FINALIZED",
                        final_markdown: selectedRow.final_markdown || selectedRow.draft_markdown || "",
                      })
                    }
                    title="Finalizes the policy (copies draft into final if final is blank)."
                  >
                    Finalize
                  </Button>
                </div>

                <div style={{ marginTop: 2, opacity: 0.8, lineHeight: 1.6 }}>
                  **Inspection-safe note:** This module drafts content for internal controls. Approval and implementation remain with management/consultant.
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Container>
  );
}
