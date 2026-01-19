import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../utils/supabase";

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

function TextArea({ label, value, onChange, placeholder, rows = 10 }) {
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

function safeText(x) {
  return typeof x === "string" ? x.trim() : "";
}

function noticeStatusLabel(s) {
  const v = safeText(s).toUpperCase();
  if (v === "RECEIVED") return "Received";
  if (v === "UNDER_REVIEW") return "Under review";
  if (v === "RESPONSE_DRAFTED") return "Response drafted";
  if (v === "DELIVERED") return "Delivered to client";
  return "Received";
}

export default function NoticeDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [notice, setNotice] = useState(null);
  const [responseRow, setResponseRow] = useState(null);

  // editable response fields
  const [responseText, setResponseText] = useState("");
  const [consultantNotes, setConsultantNotes] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [timelineDays, setTimelineDays] = useState("");

  const hasResponse = useMemo(() => !!responseRow?.id, [responseRow]);

  async function refresh() {
    if (!id) return;
    setLoading(true);
    setMsg("");
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!userData?.user) {
        window.location.href = "/login";
        return;
      }

      const { data: n, error: nErr } = await supabase
        .from("regulator_notices")
        .select("*")
        .eq("id", id)
        .single();

      if (nErr) throw nErr;

      const { data: r, error: rErr } = await supabase
        .from("regulator_responses")
        .select("*")
        .eq("notice_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rErr) throw rErr;

      setNotice(n || null);
      setResponseRow(r || null);

      setResponseText(r?.response_text || defaultResponseTemplate(n));
      setConsultantNotes(r?.consultant_notes || "");
      setFeeAmount(r?.fee_amount != null ? String(r.fee_amount) : "");
      setTimelineDays(r?.timeline_days != null ? String(r.timeline_days) : "");

      setMsg("");
    } catch (e) {
      setMsg(e?.message || "Failed to load notice.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function defaultResponseTemplate(n) {
    const regulator = safeText(n?.regulator_name) || "the relevant authority";
    const ref = safeText(n?.reference_no);
    const refLine = ref ? `Reference: ${ref}` : "Reference: —";

    return [
      "Subject: Response to Notice (Human-Reviewed Draft)",
      "",
      `To: ${regulator}`,
      refLine,
      "",
      "We acknowledge receipt of the referenced notice.",
      "",
      "Summary of response (inspection-safe):",
      "- We are reviewing the notice and compiling the requested information from internal records.",
      "- Where applicable, supporting evidence will be organized and provided in a structured format.",
      "",
      "Information provided / actions taken:",
      "1) [Add itemized response points here]",
      "2) [Attach documents / references as applicable]",
      "",
      "Notes:",
      "- This response is prepared for client submission. Submission remains the responsibility of the client / authorized representative.",
      "- Final decisions remain subject to management approval.",
      "",
      "Sincerely,",
      "[Name / Title]",
      "[Organization]",
      "",
    ].join("\n");
  }

  async function setNoticeStatus(status) {
    if (!notice?.id) return;
    setMsg("Updating status…");
    try {
      const { error } = await supabase.from("regulator_notices").update({ status }).eq("id", notice.id);
      if (error) throw error;
      await refresh();
      setMsg("Saved.");
      setTimeout(() => setMsg(""), 800);
    } catch (e) {
      setMsg(e?.message || "Failed to update status.");
    }
  }

  async function saveDraft() {
    if (!notice?.id) return;

    setMsg("Saving draft…");
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const draftedBy = userData?.user?.id || null;

      const payload = {
        notice_id: notice.id,
        drafted_by: draftedBy,
        response_text: responseText || "",
        consultant_notes: consultantNotes || null,
        fee_amount: feeAmount ? Number(feeAmount) : null,
        timeline_days: timelineDays ? Number(timelineDays) : null,
        status: "DRAFT",
      };

      const { data: up, error } = await supabase
        .from("regulator_responses")
        .upsert([payload], { onConflict: "notice_id" })
        .select("*")
        .single();

      if (error) throw error;

      // reflect notice workflow status
      await supabase.from("regulator_notices").update({ status: "RESPONSE_DRAFTED" }).eq("id", notice.id);

      setResponseRow(up);
      setMsg("Draft saved.");
      setTimeout(() => setMsg(""), 900);
      await refresh();
    } catch (e) {
      setMsg(e?.message || "Failed to save draft.");
    }
  }

  async function finalizeForClient() {
    if (!notice?.id) return;

    const ok = window.confirm(
      "Mark as delivered to client?\n\nThis only updates internal workflow status. It does not contact any regulator."
    );
    if (!ok) return;

    setMsg("Marking delivered…");
    try {
      if (responseRow?.id) {
        const { error } = await supabase
          .from("regulator_responses")
          .update({ status: "FINALIZED", response_text: responseText || "" })
          .eq("id", responseRow.id);
        if (error) throw error;
      } else {
        // ensure at least one save exists
        await saveDraft();
      }

      await setNoticeStatus("DELIVERED");
      setMsg("Delivered status recorded.");
      setTimeout(() => setMsg(""), 900);
    } catch (e) {
      setMsg(e?.message || "Failed to finalize.");
    }
  }

  async function exportPdf() {
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const token = sessionData?.session?.access_token;
      if (!token) {
        alert("Session expired. Please log in again.");
        return;
      }

      const resp = await fetch("/api/notice-response-export", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ noticeId: id }),
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
      a.download = `Notice_Response_${id}.pdf`;
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
            <Link href="/dashboard" style={{ color: "#c7d2fe", textDecoration: "none" }}>
              Dashboard
            </Link>{" "}
            <span style={{ opacity: 0.5 }}>/</span>{" "}
            <Link href="/notices" style={{ color: "#c7d2fe", textDecoration: "none" }}>
              Notices
            </Link>{" "}
            <span style={{ opacity: 0.5 }}>/</span> <span>Notice</span>
          </div>

          <div style={{ fontSize: 26, fontWeight: 780, letterSpacing: -0.4 }}>Notice Review & Response Draft</div>
          <div style={{ marginTop: 6, opacity: 0.78, lineHeight: 1.45, maxWidth: 900 }}>
            Draft responses in a consultant-controlled workflow. This platform does not submit responses to regulators.
            Submission remains the responsibility of the client / authorized representative.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button onClick={refresh} disabled={loading} title="Refresh">
            Refresh
          </Button>
          <Button onClick={exportPdf} disabled={loading || !id} title="Export current saved response as PDF">
            Export Response PDF
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

      {loading ? (
        <div style={{ marginTop: 14 }}>
          <Card>Loading…</Card>
        </div>
      ) : !notice ? (
        <div style={{ marginTop: 14 }}>
          <Card>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Notice not available</div>
            <div style={{ opacity: 0.85 }}>This record may not exist or is not accessible under current permissions.</div>
          </Card>
        </div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "420px 1fr", gap: 14 }}>
          {/* Notice details */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 850, fontSize: 16 }}>Notice details</div>
              <Badge>{noticeStatusLabel(notice.status)}</Badge>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8, fontSize: 13, opacity: 0.9, lineHeight: 1.55 }}>
              <div>
                <span style={{ opacity: 0.75 }}>Authority:</span> <span style={{ fontWeight: 750 }}>{notice.regulator_name}</span>
              </div>
              <div>
                <span style={{ opacity: 0.75 }}>Reference:</span> {notice.reference_no || "—"}
              </div>
              <div>
                <span style={{ opacity: 0.75 }}>Notice date:</span>{" "}
                {notice.notice_date ? new Date(notice.notice_date).toLocaleDateString() : "—"}
              </div>
              <div>
                <span style={{ opacity: 0.75 }}>Deadline:</span>{" "}
                {notice.response_deadline ? new Date(notice.response_deadline).toLocaleDateString() : "—"}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <TextArea
                label="Notice summary / key points (read-only here)"
                value={notice.notice_text || ""}
                onChange={() => {}}
                rows={10}
                placeholder="—"
              />
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button onClick={() => setNoticeStatus("UNDER_REVIEW")} title="Marks this notice as under review (internal workflow).">
                Mark Under Review
              </Button>
              <Button onClick={() => setNoticeStatus("RECEIVED")} title="Marks this notice as received (internal workflow).">
                Mark Received
              </Button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.78, lineHeight: 1.6 }}>
              Inspection-safe note: status updates are internal workflow labels and do not imply regulatory outcomes.
            </div>
          </Card>

          {/* Draft response */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 850, fontSize: 16 }}>Response draft (human-reviewed)</div>
                <div style={{ marginTop: 6, opacity: 0.78, lineHeight: 1.55 }}>
                  Draft in neutral, factual language. Avoid definitive legal conclusions inside the tool. Final review and submission remain
                  human-controlled.
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Badge>{hasResponse ? "Saved draft exists" : "Not saved yet"}</Badge>
                <Badge>{responseRow?.status === "FINALIZED" ? "Finalized" : "Draft"}</Badge>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <TextArea
                label="Response text"
                value={responseText}
                onChange={setResponseText}
                rows={16}
                placeholder="Draft response text…"
              />

              <TextArea
                label="Consultant notes (optional, internal)"
                value={consultantNotes}
                onChange={setConsultantNotes}
                rows={4}
                placeholder="Optional notes for internal workflow (not required)."
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input
                  label="Fee (optional)"
                  value={feeAmount}
                  onChange={setFeeAmount}
                  placeholder="e.g., 25000"
                  type="number"
                />
                <Input
                  label="Timeline days (optional)"
                  value={timelineDays}
                  onChange={setTimelineDays}
                  placeholder="e.g., 3"
                  type="number"
                />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button onClick={saveDraft} tone="primary" title="Saves the response draft and marks notice as Response Drafted.">
                  Save Draft
                </Button>
                <Button
                  onClick={finalizeForClient}
                  title="Marks as delivered to client for submission. Does not contact regulators."
                >
                  Mark Delivered to Client
                </Button>
              </div>

              <div style={{ marginTop: 2, fontSize: 12, opacity: 0.78, lineHeight: 1.6 }}>
                Inspection-safe note: exporting a response is for internal review and client submission preparation. This platform does not
                submit responses to regulators.
              </div>
            </div>
          </Card>
        </div>
      )}
    </Container>
  );
}
