import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

function Container({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "#e5e7eb" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px 64px" }}>{children}</div>
    </div>
  );
}

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
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Button({ children, onClick, disabled, title, tone = "default" }) {
  const bg =
    tone === "primary"
      ? "rgba(199,210,254,0.18)"
      : tone === "danger"
      ? "rgba(248,113,113,0.14)"
      : "rgba(255,255,255,0.08)";

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
        background: bg,
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

function safeText(x) {
  return typeof x === "string" ? x.trim() : "";
}

function statusLabel(s) {
  const v = safeText(s).toUpperCase();
  if (v === "RECEIVED") return "Received";
  if (v === "UNDER_REVIEW") return "Under review";
  if (v === "RESPONSE_DRAFTED") return "Response drafted";
  if (v === "DELIVERED") return "Delivered to client";
  return "Received";
}

export default function NoticesPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [userId, setUserId] = useState("");
  const [rows, setRows] = useState([]);

  // create notice form
  const [regulatorName, setRegulatorName] = useState("FMU / Relevant Authority");
  const [referenceNo, setReferenceNo] = useState("");
  const [noticeDate, setNoticeDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [noticeText, setNoticeText] = useState("");

  const totalCount = rows.length;

  const urgentCount = useMemo(() => {
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return rows.filter((r) => {
      if (!r.response_deadline) return false;
      const d = new Date(r.response_deadline);
      return d.toString() !== "Invalid Date" && d <= soon;
    }).length;
  }, [rows]);

  async function refresh() {
    setLoading(true);
    setMsg("");
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!userData?.user) {
        window.location.href = "/login";
        return;
      }
      setUserId(userData.user.id);

      const { data, error } = await supabase
        .from("regulator_notices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRows(data || []);
    } catch (e) {
      setMsg(e?.message || "Failed to load notices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createNotice() {
    setMsg("Saving notice…");
    try {
      if (!userId) {
        setMsg("Please log in again.");
        return;
      }

      const payload = {
        user_id: userId,
        regulator_name: safeText(regulatorName) || "Regulator",
        reference_no: safeText(referenceNo) || null,
        notice_date: noticeDate ? noticeDate : null,
        response_deadline: deadline ? deadline : null,
        notice_text: safeText(noticeText) || null,
        status: "RECEIVED",
      };

      const { error } = await supabase.from("regulator_notices").insert([payload]);
      if (error) throw error;

      setRegulatorName("FMU / Relevant Authority");
      setReferenceNo("");
      setNoticeDate("");
      setDeadline("");
      setNoticeText("");

      await refresh();
      setMsg("Notice saved. A consultant can now review and draft a response.");
      setTimeout(() => setMsg(""), 1200);
    } catch (e) {
      setMsg(e?.message || "Failed to save notice.");
    }
  }

  async function deleteNotice(id) {
    const ok = window.confirm(
      "Delete this notice record?\n\nThis only removes the record from the platform. It does not contact any regulator."
    );
    if (!ok) return;

    setMsg("Deleting…");
    try {
      const { error } = await supabase.from("regulator_notices").delete().eq("id", id);
      if (error) throw error;
      await refresh();
      setMsg("");
    } catch (e) {
      setMsg(e?.message || "Failed to delete.");
    }
  }

  return (
    <Container>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>
            <Link href="/dashboard" style={{ color: "#c7d2fe", textDecoration: "none" }}>
              Dashboard
            </Link>{" "}
            <span style={{ opacity: 0.5 }}>/</span> <span>Regulator Notices</span>
          </div>

          <div style={{ fontSize: 26, fontWeight: 780, letterSpacing: -0.4 }}>Regulator Notices & Responses</div>
          <div style={{ marginTop: 6, opacity: 0.78, lineHeight: 1.45, maxWidth: 900 }}>
            Record notices, manage drafting, and export responses. This platform does not submit responses to regulators.
            Drafting and final decisions remain subject to human review and approval.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Badge>Total: {totalCount}</Badge>
          <Badge>Due within 7 days: {urgentCount}</Badge>
          <Button onClick={refresh} disabled={loading} title="Refresh notices list">
            Refresh
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

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "420px 1fr", gap: 14 }}>
        {/* Create notice */}
        <Card>
          <div style={{ fontWeight: 850, fontSize: 16 }}>Upload notice details</div>
          <div style={{ marginTop: 6, opacity: 0.78, lineHeight: 1.55 }}>
            Use this form to record a notice for internal tracking. If you have a PDF, you can paste key text here for
            drafting. File upload can be added later without changing this workflow.
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <Input
              label="Regulator / Authority"
              value={regulatorName}
              onChange={setRegulatorName}
              placeholder="e.g., FMU, SECP, FBR, Provincial Authority"
            />
            <Input label="Reference no. (optional)" value={referenceNo} onChange={setReferenceNo} placeholder="e.g., XYZ/2026/..." />
            <Input label="Notice date (optional)" value={noticeDate} onChange={setNoticeDate} type="date" />
            <Input label="Response deadline (optional)" value={deadline} onChange={setDeadline} type="date" />
            <TextArea
              label="Notice summary / key points (optional)"
              value={noticeText}
              onChange={setNoticeText}
              rows={8}
              placeholder="Paste the key points of the notice here. Keep neutral, factual wording."
            />

            <Button onClick={createNotice} disabled={loading} tone="primary" title="Saves this notice for consultant-controlled drafting workflow.">
              Save Notice
            </Button>

            <div style={{ marginTop: 2, fontSize: 12, opacity: 0.78, lineHeight: 1.6 }}>
              Inspection-safe note: saving a notice here does not contact any regulator. Response drafting and submission
              remain human-controlled.
            </div>
          </div>
        </Card>

        {/* List */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 850, fontSize: 16 }}>Notices</div>
              <div style={{ marginTop: 6, opacity: 0.78, lineHeight: 1.55 }}>
                Open a notice to draft a response and export a final response PDF for client submission.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {loading ? (
              <div style={{ opacity: 0.85 }}>Loading…</div>
            ) : rows.length === 0 ? (
              <div style={{ opacity: 0.85 }}>No notices yet.</div>
            ) : (
              rows.map((r) => (
                <div
                  key={r.id}
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.03)",
                    padding: 14,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 800 }}>
                      {r.regulator_name || "Regulator"}{" "}
                      {r.reference_no ? <span style={{ opacity: 0.75, fontWeight: 650 }}>• {r.reference_no}</span> : null}
                    </div>
                    <Badge>{statusLabel(r.status)}</Badge>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, opacity: 0.82 }}>
                    <span>Created: {new Date(r.created_at).toLocaleDateString()}</span>
                    {r.response_deadline ? <span>Deadline: {new Date(r.response_deadline).toLocaleDateString()}</span> : null}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link href={`/notices/${r.id}`} style={{ textDecoration: "none" }}>
                      <Button title="Open notice and draft response">Open</Button>
                    </Link>

                    <Button
                      tone="danger"
                      onClick={() => deleteNotice(r.id)}
                      title="Deletes this record from the platform (does not contact any regulator)."
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </Container>
  );
}
