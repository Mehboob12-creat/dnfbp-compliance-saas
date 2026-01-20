import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { supabase } from "../../../utils/supabase";

function safeLabel(key) {
  // Convert snake_case / camelCase into a readable label
  if (!key) return "";
  const spaced = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatValue(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v.trim() ? v : "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CddCaseDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [caseRow, setCaseRow] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) return;

      setLoading(true);
      setError("");
      setCaseRow(null);

      // Ensure user session exists (inspection-safe; no sensitive leakage)
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userErr) {
        setError("Unable to verify session. Please refresh and try again.");
        setLoading(false);
        return;
      }
      if (!user) {
        // redirect to login if your app has a login route
        router.replace("/login");
        return;
      }

      // Fetch the case (RLS should enforce tenant isolation)
      const { data, error: fetchErr } = await supabase
        .from("cdd_cases")
        .select("*")
        .eq("id", id)
        .single();

      if (cancelled) return;

      if (fetchErr) {
        // Keep messaging inspection-safe and generic
        setError("Case not found or access is not permitted.");
        setLoading(false);
        return;
      }

      setCaseRow(data);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const answersObject = useMemo(() => {
    if (!caseRow) return {};
    // Common patterns: answers stored in "answers" jsonb; fallback to "data"
    const a = caseRow.answers ?? caseRow.data ?? {};
    return typeof a === "object" && a ? a : {};
  }, [caseRow]);

  const answersEntries = useMemo(() => {
    return Object.entries(answersObject || {}).sort(([a], [b]) => a.localeCompare(b));
  }, [answersObject]);

  return (
    <AppShell>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0 }}>CDD Case</h1>
            <p style={{ marginTop: 6, marginBottom: 0, color: "#555" }}>
              Read-only view. Exportable for review and inspection use.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/cdd" style={{ textDecoration: "none" }}>
              ← Back
            </Link>

            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading || !!error || !caseRow}
              style={{ padding: "8px 12px" }}
              title="Print or Save as PDF"
            >
              Print / PDF
            </button>

            <button
              type="button"
              onClick={() => {
                if (!caseRow) return;
                downloadJson(`cdd_case_${caseRow.id}.json`, caseRow);
              }}
              disabled={loading || !!error || !caseRow}
              style={{ padding: "8px 12px" }}
              title="Download a JSON export of this case"
            >
              Export JSON
            </button>
          </div>
        </div>

        <hr style={{ margin: "16px 0" }} />

        {loading && <p>Loading…</p>}

        {!loading && error && (
          <div style={{ padding: 12, border: "1px solid #ddd" }}>
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {!loading && !error && caseRow && (
          <>
            {/* Metadata */}
            <section style={{ padding: 12, border: "1px solid #ddd", marginBottom: 12 }}>
              <h2 style={{ marginTop: 0 }}>Case Details</h2>
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", rowGap: 8, columnGap: 12 }}>
                <div style={{ color: "#555" }}>Case ID</div>
                <div>{caseRow.id}</div>

                <div style={{ color: "#555" }}>Customer Type</div>
                <div>{caseRow.customer_type || "—"}</div>

                <div style={{ color: "#555" }}>Customer ID</div>
                <div>{caseRow.customer_id || "—"}</div>

                <div style={{ color: "#555" }}>Status</div>
                <div>{caseRow.status || "—"}</div>

                <div style={{ color: "#555" }}>Created</div>
                <div>{caseRow.created_at ? new Date(caseRow.created_at).toLocaleString() : "—"}</div>

                <div style={{ color: "#555" }}>Last Updated</div>
                <div>{caseRow.updated_at ? new Date(caseRow.updated_at).toLocaleString() : "—"}</div>
              </div>
            </section>

            {/* Placeholders: Screening + Risk */}
            <section style={{ padding: 12, border: "1px solid #ddd", marginBottom: 12 }}>
              <h2 style={{ marginTop: 0 }}>Screening & Risk (Placeholders)</h2>

              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", rowGap: 8, columnGap: 12 }}>
                <div style={{ color: "#555" }}>Screening Status</div>
                <div>
                  <strong>Not evaluated</strong>
                  <div style={{ color: "#666", marginTop: 4 }}>
                    Placeholder only. Evidence and outcomes must be reviewed and confirmed by a human compliance role.
                  </div>
                </div>

                <div style={{ color: "#555" }}>Risk Rating</div>
                <div>
                  <strong>Not calculated</strong>
                  <div style={{ color: "#666", marginTop: 4 }}>
                    Placeholder only. Final risk rating should be confirmed with human review and documented rationale.
                  </div>
                </div>
              </div>
            </section>

            {/* Answers */}
            <section style={{ padding: 12, border: "1px solid #ddd" }}>
              <h2 style={{ marginTop: 0 }}>Answers</h2>

              {answersEntries.length === 0 ? (
                <p style={{ margin: 0, color: "#666" }}>No answers available on this case.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", rowGap: 10, columnGap: 16 }}>
                  {answersEntries.map(([k, v]) => (
                    <div key={k} style={{ display: "contents" }}>
                      <div style={{ color: "#555" }}>{safeLabel(k)}</div>
                      <div style={{ whiteSpace: typeof v === "object" ? "pre-wrap" : "normal" }}>
                        {formatValue(v)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Print-friendly tweaks (logic-first; minimal styling) */}
      <style jsx global>{`
        @media print {
          a,
          button {
            display: none !important;
          }
          hr {
            border: 0;
            border-top: 1px solid #ccc;
          }
        }
      `}</style>
    </AppShell>
  );
}
