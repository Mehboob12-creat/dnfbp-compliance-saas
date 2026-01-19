import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../utils/supabase";

const NOTICE_BUCKET = "regulator_notices";
const RESPONSE_BUCKET = "regulator_responses";

function safeText(x) {
  return typeof x === "string" ? x.trim() : "";
}

function toFileSafeName(input) {
  return (
    safeText(String(input || ""))
      .replace(/[^\w.\-]+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 120) || "file"
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

function Button({ children, onClick, disabled, title, tone = "soft" }) {
  const bg =
    tone === "primary"
      ? "rgba(199,210,254,0.18)"
      : tone === "danger"
      ? "rgba(253,230,138,0.12)"
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
        fontWeight: 800,
      }}
    >
      {children}
    </button>
  );
}

export default function NoticeDetailPage() {
  const router = useRouter();
  const noticeId = safeText(router.query?.id);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [userId, setUserId] = useState("");
  const [notice, setNotice] = useState(null);
  const [noticePdfUrl, setNoticePdfUrl] = useState("");

  const [responses, setResponses] = useState([]);
  const [selectedResponseUrl, setSelectedResponseUrl] = useState("");

  // Consultant upload state
  const [responseFile, setResponseFile] = useState(null);
  const [versionNote, setVersionNote] = useState("");
  const [markFinal, setMarkFinal] = useState(true);

  const latestResponse = useMemo(() => {
    if (!responses?.length) return null;
    return responses[0];
  }, [responses]);

  async function refresh() {
    if (!noticeId) return;

    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!userData?.user) {
        router.replace("/login");
        return;
      }
      setUserId(userData.user.id);

      const { data: n, error: nErr } = await supabase
        .from("regulator_notices")
        .select("*")
        .eq("id", noticeId)
        .maybeSingle();

      if (nErr) throw nErr;
      if (!n) {
        setErr("Notice not found or not accessible under your account.");
        setLoading(false);
        return;
      }
      setNotice(n);

      // Notice PDF (private signed link)
      if (n.notice_file_path) {
        const { data: signed, error: sErr } = await supabase.storage
          .from(NOTICE_BUCKET)
          .createSignedUrl(n.notice_file_path, 60 * 30); // 30 minutes

        if (!sErr) setNoticePdfUrl(signed?.signedUrl || "");
        else setNoticePdfUrl("");
      } else {
        setNoticePdfUrl("");
      }

      // Responses list (latest first)
      const { data: rRows, error: rErr } = await supabase
        .from("regulator_responses")
        .select("id, notice_id, version, is_final, version_note, response_file_path, response_file_url, created_at, updated_at")
        .eq("notice_id", noticeId)
        .order("version", { ascending: false });

      if (rErr) throw rErr;

      setResponses(rRows || []);
      setSelectedResponseUrl("");

      setLoading(false);
    } catch (e) {
      setErr(e?.message || "Unable to load notice details.");
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticeId]);

  async function createSignedResponseUrl(row) {
    // Prefer storage path (recommended)
    if (row?.response_file_path) {
      const { data, error } = await supabase.storage
        .from(RESPONSE_BUCKET)
        .createSignedUrl(row.response_file_path, 60 * 30);

      if (error) throw error;
      return data?.signedUrl || "";
    }

    // Legacy URL fallback
    if (row?.response_file_url) return row.response_file_url;
    return "";
  }

  async function uploadConsultantResponse() {
    try {
      setMsg("");
      setErr("");

      if (!userId) {
        setErr("Please log in again.");
        return;
      }

      if (!responseFile) {
        setErr("Please choose a response PDF to upload.");
        return;
      }

      if (responseFile.type !== "application/pdf") {
        setErr("Please upload a PDF file.");
        return;
      }

      const maxBytes = 12 * 1024 * 1024; // 12MB
      if (responseFile.size > maxBytes) {
        setErr("PDF is too large. Please upload a file under 12MB.");
        return;
      }

      // Next version number (simple + reliable)
      const nextVersion = (responses?.[0]?.version || 0) + 1;

      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const safeName = toFileSafeName(responseFile.name || `response_v${nextVersion}.pdf`);

      // Storage path: {auth.uid()}/{noticeId}/v{n}_{timestamp}_{filename}.pdf
      const path = `${userId}/${noticeId}/v${nextVersion}_${ts}_${safeName}`;

      setMsg("Uploading response PDF…");

      const { error: upErr } = await supabase.storage
        .from(RESPONSE_BUCKET)
        .upload(path, responseFile, {
          upsert: false,
          contentType: "application/pdf",
        });

      if (upErr) throw upErr;

      setMsg("Saving response record…");

      const { error: insErr } = await supabase.from("regulator_responses").insert([
        {
          notice_id: noticeId,
          drafted_by: userId,
          version: nextVersion,
          is_final: !!markFinal,
          version_note: safeText(versionNote) || null,
          response_file_path: path,
          status: markFinal ? "FINALIZED" : "DRAFT",
        },
      ]);

      if (insErr) throw insErr;

      // If final, update notice status to DELIVERED (inspection-safe “delivered to client”)
      if (markFinal) {
        await supabase
          .from("regulator_notices")
          .update({ status: "DELIVERED" })
          .eq("id", noticeId);
      } else {
        await supabase
          .from("regulator_notices")
          .update({ status: "RESPONSE_DRAFTED" })
          .eq("id", noticeId);
      }

      setResponseFile(null);
      setVersionNote("");
      setMarkFinal(true);

      setMsg(markFinal ? "Final response uploaded and marked as ready for client submission." : "Draft response uploaded.");
      await refresh();
      setTimeout(() => setMsg(""), 1400);
    } catch (e) {
      setErr(e?.message || "Failed to upload response.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "#e5e7eb" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>
              <Link href="/dashboard" style={{ color: "#c7d2fe", textDecoration: "none" }}>
                Dashboard
              </Link>{" "}
              <span style={{ opacity: 0.5 }}>/</span>{" "}
              <Link href="/notices" style={{ color: "#c7d2fe", textDecoration: "none" }}>
                Regulator Notices
              </Link>{" "}
              <span style={{ opacity: 0.5 }}>/</span> <span>Notice</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 850, letterSpacing: -0.4 }}>Regulator Notice</div>
            <div style={{ marginTop: 6, opacity: 0.78, lineHeight: 1.45, maxWidth: 860 }}>
              Upload and review notices, draft responses, and deliver response PDFs for client submission. This platform does not
              submit anything to regulators automatically.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link href="/notices" style={{ textDecoration: "none" }}>
              <Button tone="soft" title="Back to notices">
                Back
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: 18 }}>
            <Card>Loading…</Card>
          </div>
        ) : err ? (
          <div style={{ marginTop: 18 }}>
            <Card>
              <div style={{ fontWeight: 850, marginBottom: 8 }}>Unable to load notice</div>
              <div style={{ opacity: 0.85, lineHeight: 1.6 }}>{err}</div>
            </Card>
          </div>
        ) : (
          <>
            {!!msg && (
              <div style={{ marginTop: 14 }}>
                <Card>
                  <div style={{ opacity: 0.9 }}>{msg}</div>
                </Card>
              </div>
            )}

            {!!err && (
              <div style={{ marginTop: 14 }}>
                <Card>
                  <div style={{ opacity: 0.9 }}>{err}</div>
                </Card>
              </div>
            )}

            {/* Notice summary */}
            <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14 }}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Notice</div>
                    <div style={{ fontSize: 18, fontWeight: 850 }}>
                      {notice?.regulator_name || "Regulator"}
                      {notice?.reference_no ? <span style={{ opacity: 0.75 }}> • {notice.reference_no}</span> : null}
                    </div>
                    <div style={{ marginTop: 8, opacity: 0.82, lineHeight: 1.5 }}>
                      Deadline:{" "}
                      <b>{notice?.response_deadline ? new Date(notice.response_deadline).toLocaleDateString() : "—"}</b>
                      {" · "}
                      Status: <b>{safeText(notice?.status || "RECEIVED")}</b>
                    </div>

                    {notice?.notice_text ? (
                      <div style={{ marginTop: 12, opacity: 0.85, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {notice.notice_text}
                      </div>
                    ) : (
                      <div style={{ marginTop: 12, opacity: 0.75 }}>No notice text provided.</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Badge>ID: {noticeId}</Badge>
                    {noticePdfUrl ? (
                      <a href={noticePdfUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                        <Button title="Open the uploaded notice PDF (private link).">Open Notice PDF</Button>
                      </a>
                    ) : (
                      <Badge>No PDF uploaded</Badge>
                    )}
                  </div>
                </div>
              </Card>

              {/* Response status */}
              <Card>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Response status</div>
                <div style={{ fontSize: 16, fontWeight: 850 }}>
                  {latestResponse?.is_final ? "Final response available" : latestResponse ? "Draft response available" : "No response uploaded"}
                </div>
                <div style={{ marginTop: 8, opacity: 0.82, lineHeight: 1.6 }}>
                  Responses are provided for client submission. This platform does not send responses to regulators automatically.
                </div>
                {latestResponse ? (
                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Button
                      onClick={async () => {
                        try {
                          const url = await createSignedResponseUrl(latestResponse);
                          if (!url) throw new Error("Response file is not available.");
                          window.open(url, "_blank", "noopener,noreferrer");
                        } catch (e) {
                          setErr(e?.message || "Unable to open response PDF.");
                        }
                      }}
                      title="Open the latest response PDF (private link)."
                      tone="primary"
                    >
                      Open Latest Response PDF
                    </Button>
                  </div>
                ) : null}
              </Card>
            </div>

            {/* Consultant upload */}
            <div style={{ marginTop: 14 }}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>Consultant response upload</div>
                    <div style={{ marginTop: 6, opacity: 0.82, lineHeight: 1.6, maxWidth: 900 }}>
                      Upload a drafted response PDF for client submission. Keep language inspection-safe and neutral. Final decisions remain human-reviewed.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <Badge>Bucket: {RESPONSE_BUCKET}</Badge>
                  </div>
                </div>

                <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Response PDF (required)</div>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setResponseFile(e.target.files?.[0] || null)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.04)",
                        color: "#e5e7eb",
                        outline: "none",
                      }}
                    />
                    <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>
                      Stored privately for audit-ready recordkeeping. No regulator integration.
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Version note (optional)</div>
                    <input
                      value={versionNote}
                      onChange={(e) => setVersionNote(e.target.value)}
                      placeholder="e.g., Updated dates and clarified scope"
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

                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, opacity: 0.9 }}>
                      <input
                        type="checkbox"
                        checked={markFinal}
                        onChange={(e) => setMarkFinal(e.target.checked)}
                      />
                      Mark as final (ready for client submission)
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    onClick={uploadConsultantResponse}
                    disabled={!responseFile}
                    tone="primary"
                    title="Uploads a response PDF and records a new version."
                  >
                    Upload Response PDF
                  </Button>
                </div>
              </Card>
            </div>

            {/* Response history */}
            <div style={{ marginTop: 14 }}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>Response history</div>
                    <div style={{ marginTop: 6, opacity: 0.82, lineHeight: 1.6 }}>
                      Versioned uploads support inspection preparation and internal tracking. Clients should submit responses themselves.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <Badge>{responses?.length || 0} versions</Badge>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {responses?.length ? (
                    responses.map((r) => (
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
                          <div style={{ fontWeight: 900 }}>
                            Version v{r.version} {r.is_final ? <span style={{ opacity: 0.75 }}>• Final</span> : <span style={{ opacity: 0.75 }}>• Draft</span>}
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Badge>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</Badge>
                            <Button
                              onClick={async () => {
                                try {
                                  const url = await createSignedResponseUrl(r);
                                  if (!url) throw new Error("Response file is not available.");
                                  setSelectedResponseUrl(url);
                                  window.open(url, "_blank", "noopener,noreferrer");
                                } catch (e) {
                                  setErr(e?.message || "Unable to open response PDF.");
                                }
                              }}
                              title="Open this version (private link)."
                            >
                              Open PDF
                            </Button>
                          </div>
                        </div>

                        {r.version_note ? (
                          <div style={{ opacity: 0.85, lineHeight: 1.55 }}>
                            Note: {r.version_note}
                          </div>
                        ) : (
                          <div style={{ opacity: 0.75 }}>No version note provided.</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ opacity: 0.85 }}>No response versions uploaded yet.</div>
                  )}
                </div>

                {selectedResponseUrl ? (
                  <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>
                    Latest opened response link is time-limited for privacy.
                  </div>
                ) : null}
              </Card>
            </div>

            {/* Inspection-safe footer note */}
            <div style={{ marginTop: 14 }}>
              <Card>
                <div style={{ fontSize: 16, fontWeight: 900 }}>Inspection-safe notes</div>
                <ul style={{ marginTop: 10, opacity: 0.85, lineHeight: 1.7, paddingLeft: 18 }}>
                  <li>This module supports drafting and organizing records for inspection preparation and internal recordkeeping.</li>
                  <li>Responses are delivered for client submission. The platform does not communicate with regulators automatically.</li>
                  <li>All reporting and escalation decisions remain subject to human review and approval.</li>
                </ul>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
