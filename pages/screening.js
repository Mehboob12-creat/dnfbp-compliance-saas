import { useState } from "react";
import { supabase } from "../utils/supabase";

/**
 * MVP TFS & PF Screening Evidence page:
 * - Runs screening using Supabase RPC: run_tfs_screening
 * - Shows result (CLEAR / POTENTIAL_MATCH / CONFIRMED_MATCH)
 * - Fetches latest screening for inspection view
 * - PDF generation: placeholder function (replace with your existing /utils/pdf/ generator)
 */

export default function ScreeningPage() {
  // Subject selection (you can later connect search dropdown)
  const [subjectType, setSubjectType] = useState("CUSTOMER"); // CUSTOMER | ENTITY
  const [subjectId, setSubjectId] = useState(""); // uuid from customers/entities
  const [cddCaseId, setCddCaseId] = useState(""); // optional (uuid)

  // Snapshot inputs (normally pulled from your CDD/KYC form)
  const [fullName, setFullName] = useState("");
  const [cnic, setCnic] = useState("");
  const [dob, setDob] = useState(""); // YYYY-MM-DD
  const [nationality, setNationality] = useState("PK");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState(null);
  const [latest, setLatest] = useState(null);

  async function runScreening() {
    setErrorMsg("");
    setResult(null);

    if (!subjectId) return setErrorMsg("Subject ID (uuid) is required.");
    if (!fullName && !cnic) return setErrorMsg("Provide at least Full Name or CNIC.");

    setLoading(true);
    try {
      const snapshot = {
        full_name: fullName,
        cnic,
        dob,
        nationality,
      };

      const { data, error } = await supabase.rpc("run_tfs_screening", {
        p_subject_type: subjectType,
        p_subject_id: subjectId,
        p_trigger: "ONBOARDING",
        p_cdd_case_id: cddCaseId || null,
        p_subject_snapshot: snapshot,
      });

      if (error) throw error;
      setResult(data);

      // Also fetch latest record for evidence view
      await fetchLatest();

    } catch (e) {
      setErrorMsg(e?.message || "Failed to run screening.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchLatest() {
    setErrorMsg("");
    setLatest(null);

    if (!subjectId) return setErrorMsg("Subject ID (uuid) is required to fetch latest.");

    const { data, error } = await supabase
      .from("tfs_screenings")
      .select(
        "id, screened_at, overall_result, risk_score, pf_indicator, matches_count, final_decision, lists_used, subject_snapshot"
      )
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId)
      .order("screened_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no rows exist, Supabase can return an error depending on settings
      // We'll show a friendly message
      if (error.code === "PGRST116") return;
      return setErrorMsg(error.message);
    }

    setLatest(data);
  }

  // ✅ Placeholder: Replace this with your existing /utils/pdf/ generator.
  async function downloadSummaryPdf() {
    if (!latest) return setErrorMsg("Fetch latest screening first.");

    // For now: create a simple text blob as "PDF placeholder"
    // Replace with your actual PDF bytes generator.
    const text = `
TFS / PF SCREENING REPORT (SUMMARY)

Screening ID: ${latest.id}
Screened At: ${latest.screened_at}
Result: ${latest.overall_result}
Risk Score: ${latest.risk_score}
PF: ${latest.pf_indicator}
Matches: ${latest.matches_count}

Customer Snapshot:
${JSON.stringify(latest.subject_snapshot, null, 2)}

Lists Used:
${JSON.stringify(latest.lists_used, null, 2)}
`.trim();

    const blob = new Blob([text], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `TFS_Summary_${latest.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>TFS & PF Screening Evidence</h1>
      <p style={{ marginTop: 6, color: "#444" }}>
        Sanctions and proscribed list screening records (inspection-ready storage).
      </p>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>Subject Type</label>
          <select
            value={subjectType}
            onChange={(e) => setSubjectType(e.target.value)}
            style={{ padding: 10 }}
          >
            <option value="CUSTOMER">Customer (Natural Person)</option>
            <option value="ENTITY">Entity (Legal Person)</option>
          </select>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>Subject ID (uuid)</label>
          <input
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            placeholder="Paste the uuid from customers/entities table"
            style={{ padding: 10 }}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>CDD Case ID (optional uuid)</label>
          <input
            value={cddCaseId}
            onChange={(e) => setCddCaseId(e.target.value)}
            placeholder="Optional: link screening to cdd_cases"
            style={{ padding: 10 }}
          />
        </div>

        <hr style={{ margin: "8px 0" }} />

        <h3 style={{ margin: 0 }}>Snapshot (from CDD/KYC/EDD)</h3>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>Full Name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ali Ahmed"
            style={{ padding: 10 }}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>CNIC</label>
          <input
            value={cnic}
            onChange={(e) => setCnic(e.target.value)}
            placeholder="12345-1234567-1"
            style={{ padding: 10 }}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>DOB (YYYY-MM-DD)</label>
          <input
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            placeholder="1990-01-01"
            style={{ padding: 10 }}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>Nationality</label>
          <input
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="PK"
            style={{ padding: 10 }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button
            onClick={runScreening}
            disabled={loading}
            style={{ padding: "10px 14px", fontWeight: 700 }}
          >
            {loading ? "Running..." : "Run Screening"}
          </button>

          <button
            onClick={fetchLatest}
            disabled={loading}
            style={{ padding: "10px 14px", fontWeight: 700 }}
          >
            Fetch Latest
          </button>

          <button
            onClick={downloadSummaryPdf}
            disabled={!latest}
            style={{ padding: "10px 14px", fontWeight: 700 }}
            title={!latest ? "Fetch latest screening first" : "Download Summary PDF"}
          >
            Download Summary PDF
          </button>
        </div>

        {errorMsg && (
          <div style={{ color: "crimson", fontWeight: 600, marginTop: 10 }}>
            {errorMsg}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd" }}>
            <div><b>Screening ID:</b> {result.screeningId}</div>
            <div><b>Overall Result:</b> {result.overallResult}</div>
            <div><b>Risk Score:</b> {result.riskScore}</div>
            <div><b>PF Indicator:</b> {String(result.pfIndicator)}</div>
            <div><b>Matches:</b> {result.matchesCount}</div>
          </div>
        )}

        {latest && (
          <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd" }}>
            <h3 style={{ marginTop: 0 }}>Latest Screening (Inspection Evidence)</h3>
            <div><b>ID:</b> {latest.id}</div>
            <div><b>Screened At:</b> {latest.screened_at}</div>
            <div><b>Result:</b> {latest.overall_result}</div>
            <div><b>Risk Score:</b> {latest.risk_score}</div>
            <div><b>PF:</b> {String(latest.pf_indicator)}</div>
            <div><b>Matches:</b> {latest.matches_count}</div>
            <div><b>Decision:</b> {latest.final_decision}</div>
          </div>
        )}
      </div>

      <p style={{ marginTop: 18, color: "#666" }}>
        Note: This module stores screening evidence for inspection. It does not submit reports to regulators.
      </p>
    </div>
  );
}
