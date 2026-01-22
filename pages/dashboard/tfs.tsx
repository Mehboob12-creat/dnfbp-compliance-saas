import { useState } from "react";
import { supabase } from "../../utils/supabase";

type SubjectType = "CUSTOMER" | "ENTITY";
type TriggerType = "ONBOARDING" | "PERIODIC" | "PROFILE_UPDATE" | "MANUAL";

export default function TfsScreeningPage() {
  const [subjectType, setSubjectType] = useState<SubjectType>("CUSTOMER");
  const [subjectId, setSubjectId] = useState<string>("");
  const [cddCaseId, setCddCaseId] = useState<string>("");
  const [trigger, setTrigger] = useState<TriggerType>("ONBOARDING");

  const [fullName, setFullName] = useState("");
  const [cnic, setCnic] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("PK");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function runScreening() {
    setErrorMsg("");
    setResult(null);

    if (!subjectId) {
      setErrorMsg("Subject ID is required.");
      return;
    }
    if (!fullName && !cnic) {
      setErrorMsg("Provide at least Full Name or CNIC.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: fullName,
        cnic,
        dob,
        nationality,
      };

      const { data, error } = await supabase.rpc("run_tfs_screening", {
        p_subject_type: subjectType,
        p_subject_id: subjectId,
        p_trigger: trigger,
        p_cdd_case_id: cddCaseId || null,
        p_subject_snapshot: payload,
      });

      if (error) throw error;
      setResult(data);
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to run screening.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>TFS / Sanctions Screening</h1>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <label>
          Subject Type
          <select
            value={subjectType}
            onChange={(e) => setSubjectType(e.target.value as SubjectType)}
            style={{ display: "block", width: "100%", padding: 8 }}
          >
            <option value="CUSTOMER">Customer (Natural Person)</option>
            <option value="ENTITY">Entity (Legal Person)</option>
          </select>
        </label>

        <label>
          Subject ID (uuid)
          <input
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            placeholder="e.g. 9f1c... (uuid)"
            style={{ display: "block", width: "100%", padding: 8 }}
          />
        </label>

        <label>
          CDD Case ID (optional)
          <input
            value={cddCaseId}
            onChange={(e) => setCddCaseId(e.target.value)}
            placeholder="uuid (optional)"
            style={{ display: "block", width: "100%", padding: 8 }}
          />
        </label>

        <label>
          Trigger
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value as TriggerType)}
            style={{ display: "block", width: "100%", padding: 8 }}
          >
            <option value="ONBOARDING">Onboarding</option>
            <option value="PERIODIC">Periodic</option>
            <option value="PROFILE_UPDATE">Profile Update</option>
            <option value="MANUAL">Manual</option>
          </select>
        </label>

        <hr />

        <h3 style={{ margin: 0 }}>Snapshot (from KYC)</h3>

        <label>
          Full Name
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ali Ahmed"
            style={{ display: "block", width: "100%", padding: 8 }}
          />
        </label>

        <label>
          CNIC
          <input
            value={cnic}
            onChange={(e) => setCnic(e.target.value)}
            placeholder="12345-1234567-1"
            style={{ display: "block", width: "100%", padding: 8 }}
          />
        </label>

        <label>
          DOB (YYYY-MM-DD)
          <input
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            placeholder="1990-01-01"
            style={{ display: "block", width: "100%", padding: 8 }}
          />
        </label>

        <label>
          Nationality
          <input
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="PK"
            style={{ display: "block", width: "100%", padding: 8 }}
          />
        </label>

        <button
          onClick={runScreening}
          disabled={loading}
          style={{ padding: 10, fontWeight: 700 }}
        >
          {loading ? "Running..." : "Run Screening"}
        </button>

        {errorMsg && (
          <div style={{ color: "crimson", fontWeight: 600 }}>{errorMsg}</div>
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
      </div>
    </div>
  );
}
