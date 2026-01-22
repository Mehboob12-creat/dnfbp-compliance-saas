import { useMemo, useState } from "react";
import { supabase } from "../utils/supabase";

/**
 * ✅ ScreeningPage.jsx (Aligned with YOUR DB list codes)
 *
 * Your DB codes (from public.tfs_lists):
 * EU, OFAC, UKHMT, UNSC, UNSC_1267, UNSC_1988, UNSC_CONSOLIDATED, ...
 * PK_NACTA, PK_NACTA_PERSONS, PK_NACTA_ORGS, PK_MOFA_SRO, PK_SECDIV_SRO, etc.
 *
 * RPC:
 * - public.run_tfs_screening(...) returns jsonb with keys:
 *   { screeningId, overallResult, riskScore, pfIndicator, matchesCount }
 * - If 6-arg exists: pass p_lists_requested (text[])
 * - Otherwise: fall back to 5-arg version.
 */

const LISTS_UI = [
  // ✅ Your agreed sources (mapped to your DB codes)
  {
    code: "UNSC_CONSOLIDATED",
    name: "UN Security Council Consolidated Sanctions List",
    url: "https://www.un.org/sc/suborg/en/sanctions/un-sc-consolidated-list",
    group: "UN",
  },
  {
    code: "UNSC_1267",
    name: "UNSC 1267 (Da’esh/Al-Qaida) Sanctions Committee",
    url: "http://www.mofa.gov.pk/contentsro1.php",
    group: "UN / MOFA",
  },
  {
    code: "UNSC_1988",
    name: "UNSC 1988 (Taliban) Sanctions Committee",
    url: "http://www.mofa.gov.pk/contentsro2.php",
    group: "UN / MOFA",
  },
  {
    code: "PK_NACTA_PERSONS",
    name: "UNSCR 1373 – NACTA Proscribed Persons",
    url: "https://nacta.gov.pk/proscribed-persons-2/",
    group: "Pakistan (NACTA)",
  },
  {
    code: "PK_NACTA_ORGS",
    name: "UNSCR 1373 – NACTA Proscribed Organizations",
    url: "https://nacta.gov.pk/proscribed-organizations/",
    group: "Pakistan (NACTA)",
  },

  // ✅ Extra lists you already have enabled (optional to show; useful for future expansion)
  { code: "UNSC", name: "UNSC (General / Other UNSC feeds)", url: "", group: "UN" },
  { code: "UNSC_1718", name: "UNSC 1718 (DPRK) – if used", url: "", group: "UN" },
  { code: "UNSC_2231", name: "UNSC 2231 (Iran) – if used", url: "", group: "UN" },
  { code: "UNSC_1718", name: "UNSC 1718 – if used", url: "", group: "UN" },
  { code: "UNSC_2231", name: "UNSC 2231 – if used", url: "", group: "UN" },
  { code: "UNSC_1718", name: "UNSC 1718 – if used", url: "", group: "UN" },

  { code: "PK_NACTA", name: "PK NACTA (general feed)", url: "", group: "Pakistan" },
  { code: "PK_MOFA_SRO", name: "PK MOFA SRO (general)", url: "http://www.mofa.gov.pk/", group: "Pakistan (MOFA)" },
  { code: "PK_SECDIV_SRO", name: "PK Securities Division SRO", url: "", group: "Pakistan" },
  { code: "PK_PUNJAB_PROSCRIBED", name: "Punjab Proscribed (if used)", url: "", group: "Pakistan" },

  { code: "OFAC", name: "US OFAC (if used)", url: "", group: "International" },
  { code: "UKHMT", name: "UK HMT (if used)", url: "", group: "International" },
  { code: "EU", name: "EU Sanctions (if used)", url: "", group: "International" },
];

function trim(s) {
  return (s || "").trim();
}

function parseListsUsed(listsUsed) {
  if (!listsUsed) return [];
  if (Array.isArray(listsUsed)) return listsUsed;
  if (typeof listsUsed === "object" && Array.isArray(listsUsed.items)) return listsUsed.items;
  return [];
}

function lookupMeta(code) {
  return LISTS_UI.find((l) => l.code === code) || null;
}

export default function ScreeningPage() {
  const [subjectType, setSubjectType] = useState("CUSTOMER");
  const [subjectId, setSubjectId] = useState("");
  const [cddCaseId, setCddCaseId] = useState("");

  const [fullName, setFullName] = useState("");
  const [cnic, setCnic] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("PK");

  // default: enable only the 5 “agreed sources”
  const DEFAULT_ON = new Set([
    "UNSC_CONSOLIDATED",
    "UNSC_1267",
    "UNSC_1988",
    "PK_NACTA_PERSONS",
    "PK_NACTA_ORGS",
  ]);

  const [enabledLists, setEnabledLists] = useState(() =>
    Object.fromEntries(LISTS_UI.map((l) => [l.code, DEFAULT_ON.has(l.code)]))
  );

  const selectedListCodes = useMemo(
    () => LISTS_UI.filter((l) => enabledLists[l.code]).map((l) => l.code),
    [enabledLists]
  );

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [result, setResult] = useState(null);
  const [latest, setLatest] = useState(null);

  const [requestedListsAtRun, setRequestedListsAtRun] = useState([]);

  function setAllLists(on) {
    setEnabledLists(Object.fromEntries(LISTS_UI.map((l) => [l.code, on])));
  }

  async function runScreening() {
    setErrorMsg("");
    setInfoMsg("");
    setResult(null);

    const sid = trim(subjectId);
    const cid = trim(cddCaseId);

    if (!sid) return setErrorMsg("Subject ID (uuid) is required.");
    if (!fullName && !cnic) return setErrorMsg("Provide at least Full Name or CNIC.");
    if (!selectedListCodes.length) return setErrorMsg("Select at least one list to screen.");

    setRequestedListsAtRun(selectedListCodes);

    setLoading(true);
    try {
      const snapshot = {
        full_name: fullName || null,
        cnic: cnic || null,
        dob: dob || null,
        nationality: nationality || null,
      };

      // Attempt 1: 6-arg (filterable)
      let { data, error } = await supabase.rpc("run_tfs_screening", {
        p_subject_type: subjectType,
        p_subject_id: sid,
        p_trigger: "ONBOARDING",
        p_cdd_case_id: cid || null,
        p_subject_snapshot: snapshot,
        p_lists_requested: selectedListCodes,
      });

      // Fallback: 5-arg
      if (error && /p_lists_requested|function|parameters|argument/i.test(error.message || "")) {
        setInfoMsg("Your DB is using the 5-arg RPC (no list filtering). Running without list filter.");

        const attempt2 = await supabase.rpc("run_tfs_screening", {
          p_subject_type: subjectType,
          p_subject_id: sid,
          p_trigger: "ONBOARDING",
          p_cdd_case_id: cid || null,
          p_subject_snapshot: snapshot,
        });

        data = attempt2.data;
        error = attempt2.error;
      }

      if (error) throw error;

      setResult(data);
      await fetchByScreeningId(data?.screeningId);
    } catch (e) {
      setErrorMsg(e?.message || "Failed to run screening.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchByScreeningId(screeningId) {
    setErrorMsg("");
    setLatest(null);

    if (!screeningId) return;

    const { data, error } = await supabase
      .from("tfs_screenings")
      .select(
        "id, screened_at, overall_result, risk_score, pf_indicator, matches_count, system_recommendation, final_decision, decision_notes, lists_used, subject_snapshot"
      )
      .eq("id", screeningId)
      .single();

    if (error) return setErrorMsg(error.message);
    setLatest(data);
  }

  async function fetchLatest() {
    setErrorMsg("");
    setLatest(null);

    const sid = trim(subjectId);
    if (!sid) return setErrorMsg("Subject ID (uuid) is required to fetch latest.");

    const { data, error } = await supabase
      .from("tfs_screenings")
      .select(
        "id, screened_at, overall_result, risk_score, pf_indicator, matches_count, system_recommendation, final_decision, decision_notes, lists_used, subject_snapshot"
      )
      .eq("subject_type", subjectType)
      .eq("subject_id", sid)
      .order("screened_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        setInfoMsg("No prior screening found for this subject.");
        return;
      }
      return setErrorMsg(error.message);
    }

    setLatest(data);
  }

  async function downloadSummaryPdf() {
    setErrorMsg("");
    if (!latest) return setErrorMsg("Fetch latest screening first.");

    const lists = parseListsUsed(latest.lists_used);

    const listsBlock = lists.length
      ? lists
          .map((x) => {
            const meta = lookupMeta(x.code);
            return `- ${meta?.name ?? x.code}
  Source: ${meta?.url || "-"}
  Code: ${x.code ?? "-"}
  List Version ID: ${x.list_version_id ?? "-"}
  Synced At: ${x.synced_at ?? "-"}
  Records: ${x.record_count ?? "-"}
  SHA256: ${x.sha256 ?? "-"}`;
          })
          .join("\n")
      : JSON.stringify(latest.lists_used, null, 2);

    const text = `
TFS SCREENING REPORT (SUMMARY)

Screening ID: ${latest.id}
Screened At: ${latest.screened_at}
Result: ${latest.overall_result}
Risk Score: ${latest.risk_score}
PF Indicator: ${String(latest.pf_indicator)}
Matches Count: ${latest.matches_count}
System Recommendation: ${latest.system_recommendation ?? "-"}
Final Decision: ${latest.final_decision ?? "-"}
Decision Notes: ${latest.decision_notes ?? "-"}

Requested Lists:
${requestedListsAtRun.map((c) => `- ${c}`).join("\n") || "-"}

Subject Snapshot (from CDD/KYC/EDD):
${JSON.stringify(latest.subject_snapshot, null, 2)}

Lists Used (DB output with versions):
${listsBlock}
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

  const listsUsedParsed = useMemo(() => parseListsUsed(latest?.lists_used), [latest?.lists_used]);

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>TFS Screening Evidence</h1>
      <p style={{ marginTop: 6, color: "#444" }}>
        Fetches identity snapshot from CDD/KYC/EDD (manual for MVP) and screens against selected sanctions/proscribed lists.
      </p>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>Subject Type</label>
          <select value={subjectType} onChange={(e) => setSubjectType(e.target.value)} style={{ padding: 10 }}>
            <option value="CUSTOMER">Customer (Natural Person)</option>
            <option value="ENTITY">Entity (Legal Person)</option>
          </select>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>Subject ID (uuid)</label>
          <input
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            placeholder="Paste uuid from customers/entities"
            style={{ padding: 10 }}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>CDD Case ID (optional uuid)</label>
          <input
            value={cddCaseId}
            onChange={(e) => setCddCaseId(e.target.value)}
            placeholder="Optional: link to cdd_cases"
            style={{ padding: 10 }}
          />
        </div>

        <hr style={{ margin: "8px 0" }} />

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>Lists to Screen (DB Codes)</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setAllLists(true)} style={{ padding: "6px 10px", fontWeight: 700 }}>
              Enable All
            </button>
            <button type="button" onClick={() => setAllLists(false)} style={{ padding: "6px 10px", fontWeight: 700 }}>
              Disable All
            </button>
          </div>
        </div>

        <div style={{ border: "1px solid #e5e5e5", padding: 12, borderRadius: 8 }}>
          {LISTS_UI.map((l) => (
            <label key={l.code} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0" }}>
              <input
                type="checkbox"
                checked={!!enabledLists[l.code]}
                onChange={(e) => setEnabledLists((prev) => ({ ...prev, [l.code]: e.target.checked }))}
                style={{ marginTop: 3 }}
              />
              <div>
                <div style={{ fontWeight: 700 }}>{l.name}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                  Code: <code>{l.code}</code> {l.group ? <>· <span>{l.group}</span></> : null}
                </div>
                {l.url ? (
                  <a href={l.url} target="_blank" rel="noreferrer" style={{ color: "#1a73e8" }}>
                    {l.url}
                  </a>
                ) : (
                  <div style={{ fontSize: 12, color: "#888" }}>No public URL configured (internal feed)</div>
                )}
              </div>
            </label>
          ))}
        </div>

        <hr style={{ margin: "8px 0" }} />

        <h3 style={{ margin: 0 }}>Snapshot (from CDD/KYC/EDD)</h3>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>Full Name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ali Ahmed" style={{ padding: 10 }} />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>CNIC</label>
          <input value={cnic} onChange={(e) => setCnic(e.target.value)} placeholder="12345-1234567-1" style={{ padding: 10 }} />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>DOB (YYYY-MM-DD)</label>
          <input value={dob} onChange={(e) => setDob(e.target.value)} placeholder="1990-01-01" style={{ padding: 10 }} />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>Nationality</label>
          <input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="PK" style={{ padding: 10 }} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
          <button onClick={runScreening} disabled={loading} style={{ padding: "10px 14px", fontWeight: 800 }}>
            {loading ? "Running..." : "Run Screening"}
          </button>

          <button onClick={fetchLatest} disabled={loading} style={{ padding: "10px 14px", fontWeight: 800 }}>
            Fetch Latest
          </button>

          <button
            onClick={downloadSummaryPdf}
            disabled={!latest}
            style={{ padding: "10px 14px", fontWeight: 800 }}
            title={!latest ? "Fetch latest screening first" : "Download Summary PDF"}
          >
            Download Summary PDF
          </button>
        </div>

        {errorMsg && <div style={{ color: "crimson", fontWeight: 700, marginTop: 10 }}>{errorMsg}</div>}
        {infoMsg && <div style={{ color: "#444", fontWeight: 600, marginTop: 10 }}>{infoMsg}</div>}

        {result && (
          <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd" }}>
            <div><b>Screening ID:</b> {result.screeningId}</div>
            <div><b>Overall Result:</b> {result.overallResult}</div>
            <div><b>Risk Score:</b> {result.riskScore}</div>
            <div><b>PF Indicator:</b> {String(result.pfIndicator)}</div>
            <div><b>Matches:</b> {result.matchesCount}</div>
            <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
              Requested list codes: {requestedListsAtRun.map((c) => c).join(", ")}
            </div>
          </div>
        )}

        {latest && (
          <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd" }}>
            <h3 style={{ marginTop: 0 }}>Latest Screening (Inspection Evidence)</h3>
            <div><b>ID:</b> {latest.id}</div>
            <div><b>Screened At:</b> {latest.screened_at}</div>
            <div><b>Result:</b> {latest.overall_result}</div>
            <div><b>Risk Score:</b> {latest.risk_score}</div>
            <div><b>PF Indicator:</b> {String(latest.pf_indicator)}</div>
            <div><b>Matches:</b> {latest.matches_count}</div>
            <div><b>System Recommendation:</b> {latest.system_recommendation ?? "-"}</div>
            <div><b>Final Decision:</b> {latest.final_decision ?? "-"}</div>
            {latest.decision_notes ? <div><b>Decision Notes:</b> {latest.decision_notes}</div> : null}

            <div style={{ marginTop: 10 }}>
              <b>Lists Used (DB output with versions):</b>
              <ul style={{ margin: "6px 0 0 18px" }}>
                {listsUsedParsed.map((x, idx) => {
                  const meta = lookupMeta(x.code);
                  return (
                    <li key={`${x.code}-${idx}`}>
                      <div style={{ fontWeight: 700 }}>
                        {meta?.name ?? x.code}{" "}
                        {meta?.url ? (
                          <a href={meta.url} target="_blank" rel="noreferrer">
                            (source)
                          </a>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 13, color: "#555" }}>
                        Code: <code>{x.code ?? "-"}</code> · Version: <code>{x.list_version_id ?? "-"}</code> · Synced:{" "}
                        {x.synced_at ?? "-"} · Records: {x.record_count ?? "-"}
                      </div>
                      {x.sha256 ? (
                        <div style={{ fontSize: 12, color: "#777" }}>
                          SHA256: <code>{x.sha256}</code>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>View lists_used (raw JSON)</summary>
                <pre style={{ marginTop: 8, padding: 10, background: "#fafafa", border: "1px solid #eee", overflowX: "auto" }}>
                  {JSON.stringify(latest.lists_used, null, 2)}
                </pre>
              </details>
            </div>

            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>View Subject Snapshot Used (raw JSON)</summary>
              <pre style={{ marginTop: 8, padding: 10, background: "#fafafa", border: "1px solid #eee", overflowX: "auto" }}>
                {JSON.stringify(latest.subject_snapshot, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      <p style={{ marginTop: 18, color: "#666" }}>
        Note: This module stores screening evidence for inspection. It does not submit reports to regulators.
      </p>
    </div>
  );
}
