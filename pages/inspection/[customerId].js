import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

// Step 1 readiness engine (already added in utils/inspection/readiness.js)
import { computeInspectionReadiness } from "../../utils/inspection/readiness";

// ✅ Supabase client (your project's pattern)
import { supabase } from "../../utils/supabase";

const TRAINING_VALID_DAYS = 365;

function isWithinDays(isoDate, days) {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return d >= cutoff;
}

// ----------------------
// Premium UI primitives
// ----------------------
function Container({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "#e5e7eb" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px 64px" }}>
        {children}
      </div>
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
      }}
    >
      {children}
    </span>
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
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

function SoftLink({ href, children }) {
  return (
    <Link href={href} style={{ color: "#c7d2fe", textDecoration: "none" }}>
      {children}
    </Link>
  );
}

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      style={{
        height: 10,
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.10)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: "rgba(199,210,254,0.55)",
        }}
      />
    </div>
  );
}

// ----------------------
// Data helpers (v1)
// ----------------------
function safeText(x) {
  return typeof x === "string" ? x.trim() : "";
}

/**
 * Minimal KYC completeness check for v1.
 * Refine later as your CDD wizard becomes stricter.
 */
function isKycComplete(customer) {
  if (!customer) return false;

  // Common fields; adjust if your schema differs
  const name = safeText(customer.full_name || customer.name);
  const cnic = safeText(customer.cnic);
  const city = safeText(customer.city || customer.district);

  return Boolean(name && cnic && city);
}

function bandLabel(readinessBand) {
  if (readinessBand === "READY") return "Inspection export ready";
  if (readinessBand === "INCOMPLETE_RECORD") return "Core record incomplete";
  return "Evidence pending";
}

function statusColor(status) {
  if (status === "OK") return "#86efac"; // soft green
  if (status === "NOT_REQUIRED") return "#93c5fd"; // soft blue
  return "#fde68a"; // soft amber
}

function statusLabel(status) {
  if (status === "OK") return "Available";
  if (status === "NOT_REQUIRED") return "Not required for this case";
  return "Pending";
}

/**
 * Attempts to interpret the risk band from whatever your risk table stores.
 * Supported: LOW, MEDIUM, HIGH, VERY_HIGH. Unknown -> UNKNOWN
 */
function normalizeRiskBandFromRiskRow(riskRow) {
  const raw = safeText(
    riskRow?.risk_band || riskRow?.band || riskRow?.riskBand || riskRow?.risk_level || "UNKNOWN"
  ).toUpperCase();

  if (raw === "VERY HIGH") return "VERY_HIGH";
  if (raw === "VERY-HIGH") return "VERY_HIGH";

  if (["LOW", "MEDIUM", "HIGH", "VERY_HIGH"].includes(raw)) return raw;
  return "UNKNOWN";
}

export default function InspectionModePage() {
  const router = useRouter();
  const { customerId } = router.query;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [customer, setCustomer] = useState(null);
  const [risk, setRisk] = useState(null);
  const [txCount, setTxCount] = useState(0);
  
  // NEW: real training evidence for logged-in user
  const [trainingEvidence, setTrainingEvidence] = useState({
    completed: false,
    certificateUrl: null,
    completedAt: null,
    moduleId: null,
    moduleVersion: null,
  });

  // ----------------------
  // Fetch inspection data (v1) - UPDATED with training evidence
  // ----------------------
  useEffect(() => {
    if (!customerId) return;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setLoadError("");

      try {
        // 1) Auth user
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          console.error("Inspection: session error", sessionErr);
        }
        const user = sessionData?.session?.user || null;

        // 2) Customer record
        const customerRes = await supabase
          .from("customers")
          .select("*")
          .eq("id", customerId)
          .single();

        if (customerRes.error) throw customerRes.error;

        // 3) Latest risk record
        const riskRes = await supabase
          .from("risk_assessments")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // 4) Transaction count
        const txRes = await supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", customerId);

        if (txRes.error) throw txRes.error;

        // 5) NEW: training evidence (logged-in user)
        let training = {
          completed: false,
          certificateUrl: null,
          completedAt: null,
          moduleId: null,
          moduleVersion: null,
        };

        if (user?.id) {
          const { data: trainingRow, error: trainingErr } = await supabase
            .from("training_completions")
            .select("id, user_id, module_id, module_version, completed_at, passed, score, certificate_url, created_at")
            .eq("user_id", user.id)
            .order("completed_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (trainingErr) {
            // Inspection-safe: treat as not available (do not crash the page)
            console.error("Training evidence query error", trainingErr);
          } else if (trainingRow) {
            const completedAt = trainingRow.completed_at || trainingRow.created_at;
            const hasCert = !!trainingRow.certificate_url;
            const passedOrComplete = trainingRow.passed === true || !!trainingRow.completed_at || !!trainingRow.created_at;
            const withinValidity = isWithinDays(completedAt, TRAINING_VALID_DAYS);

            training = {
              completed: !!(hasCert && passedOrComplete && withinValidity),
              certificateUrl: trainingRow.certificate_url || null,
              completedAt: completedAt || null,
              moduleId: trainingRow.module_id || null,
              moduleVersion: trainingRow.module_version || null,
            };
          }
        }

        if (cancelled) return;

        setCustomer(customerRes.data || null);
        setRisk(riskRes?.data || null);
        setTxCount(txRes.count || 0);
        setTrainingEvidence(training);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e?.message || "Failed to load inspection data.");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  // ----------------------
  // Compute readiness (Step 1 engine) - UPDATED with training evidence
  // ----------------------
  const readiness = useMemo(() => {
    const riskBand = normalizeRiskBandFromRiskRow(risk);

    // screeningDone:
    // If you store screening results elsewhere, wire it here later.
    // For now, it checks common "screening present" fields.
    const screeningDone = Boolean(
      customer?.screening_status ||
        customer?.screening_done ||
        customer?.screening_result ||
        customer?.screeningResult
    );

    return computeInspectionReadiness({
      kycComplete: isKycComplete(customer),
      transactionRecorded: (txCount || 0) > 0,
      screeningDone,
      riskSaved: Boolean(risk?.id),
      riskBand,
      
      // Updated with real training evidence
      eddDocsUploaded: Boolean(customer?.edd_uploaded || customer?.eddEvidenceUploaded),
      trainingCompleted: !!trainingEvidence.completed,
      policyExists: Boolean(customer?.policy_exists || customer?.policyExists),
    });
  }, [customer, risk, txCount, trainingEvidence]);

  return (
    <Container>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>
            <SoftLink href="/dashboard">Dashboard</SoftLink> <span style={{ opacity: 0.5 }}>/</span>{" "}
            <SoftLink href="/customers">Customers</SoftLink> <span style={{ opacity: 0.5 }}>/</span>{" "}
            <span>Inspection Mode</span>
          </div>

          <div style={{ fontSize: 26, fontWeight: 750, letterSpacing: -0.4 }}>Inspection Mode</div>

          <div style={{ marginTop: 6, opacity: 0.78, lineHeight: 1.45, maxWidth: 820 }}>
            Prepare an inspection-ready export using evidence coverage and clear, reviewable records. This platform does
            not automatically file reports or communicate with regulators.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button
            disabled={!customerId || loading}
            onClick={async () => {
              try {
                // Get logged-in session token from Supabase
                const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
                if (sessionErr) throw sessionErr;

                const accessToken = sessionData?.session?.access_token;
                if (!accessToken) {
                  alert("Your session has expired. Please log in again.");
                  return;
                }

                const resp = await fetch("/api/inspection-pack", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                  },
                  body: JSON.stringify({ customerId }),
                });

                if (!resp.ok) {
                  const errJson = await resp.json().catch(() => null);
                  const msg = errJson?.detail || errJson?.error || `Failed with status ${resp.status}`;
                  alert(msg);
                  return;
                }

                // Download ZIP
                const blob = await resp.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;

                // Try to get filename from header
                const cd = resp.headers.get("content-disposition") || "";
                const match = cd.match(/filename="([^"]+)"/);
                a.download = match?.[1] || `inspection_pack_${customerId}.zip`;

                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch (e) {
                alert(e?.message || "Failed to download inspection pack.");
              }
            }}
            title="Downloads an inspection pack ZIP containing readiness summary and evidence snapshots."
          >
            Download Inspection Pack (ZIP)
          </Button>
        </div>
      </div>

      {/* Loading / error */}
      {loading ? (
        <div style={{ marginTop: 18 }}>
          <Card>
            <div style={{ opacity: 0.85 }}>Loading inspection data…</div>
          </Card>
        </div>
      ) : loadError ? (
        <div style={{ marginTop: 18 }}>
          <Card>
            <div style={{ fontWeight: 750, marginBottom: 6 }}>Unable to load Inspection Mode</div>
            <div style={{ opacity: 0.85, marginBottom: 12 }}>{loadError}</div>
            <div style={{ opacity: 0.75, lineHeight: 1.5 }}>
              Most commonly, this means one of the Supabase table names in this page does not match your database.
              Update these three names in the code if needed:
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                <li><code>customers</code></li>
                <li><code>transactions</code></li>
                <li><code>risk_assessments</code></li>
              </ul>
            </div>
          </Card>
        </div>
      ) : (
        <>
          {/* Customer header */}
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14 }}>
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Customer</div>
                  <div style={{ fontSize: 18, fontWeight: 750 }}>
                    {customer?.full_name || customer?.name || "Unnamed customer"}
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.78 }}>
                    CNIC: {customer?.cnic || "-"} · City/District: {customer?.city || customer?.district || "-"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Badge>ID: {customerId}</Badge>
                  <Badge>Risk: {safeText(risk?.risk_band || risk?.band || "UNKNOWN") || "UNKNOWN"}</Badge>
                  <Badge>Tx: {txCount}</Badge>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Inspection readiness</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontSize: 34, fontWeight: 800 }}>{readiness.score}</div>
                <div style={{ opacity: 0.85 }}>
                  <div style={{ fontWeight: 650 }}>{readiness.summary}</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                    Evidence coverage score (inspection preparation)
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <ProgressBar value={readiness.score} />
              </div>
            </Card>
          </div>

          {/* Checklist */}
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 750 }}>Evidence checklist</div>
                  <div style={{ marginTop: 6, opacity: 0.78, maxWidth: 900, lineHeight: 1.5 }}>
                    Each item reflects whether key evidence is available for export. Items may be marked "Not required"
                    based on risk band (for example, EDD for LOW/MEDIUM cases).
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge>Generated: {new Date().toLocaleString()}</Badge>
                </div>
              </div>

              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {readiness.checklist.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.03)",
                      padding: 14,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 750 }}>{item.label}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: statusColor(item.status ? "OK" : "PENDING") }}>●</span>
                        <span style={{ fontSize: 12, opacity: 0.85 }}>{item.status ? "Available" : "Pending"}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 8, opacity: 0.8, lineHeight: 1.45 }}>{item.note}</div>
                    
                    {/* Training certificate details */}
                    {item.key === "trainingCompleted" && trainingEvidence?.certificateUrl && (
                      <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7, lineHeight: 1.4 }}>
                        Certificate recorded{trainingEvidence.completedAt ? ` (completed: ${new Date(trainingEvidence.completedAt).toLocaleDateString()})` : ""}
                      </div>
                    )}

                    <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", opacity: 0.75 }}>
                      <span>Score impact</span>
                      <span style={{ fontWeight: 650 }}>
                        {item.status ? "✓" : "✗"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Inspection-safe notes */}
            <Card>
              <div style={{ fontSize: 16, fontWeight: 750 }}>Inspection-safe notes</div>
              <div style={{ marginTop: 10, opacity: 0.85, lineHeight: 1.6 }}>
                {readiness.summary}
              </div>
              <ul style={{ marginTop: 10, opacity: 0.85, lineHeight: 1.6, paddingLeft: 20 }}>
                <li>This readiness score reflects evidence coverage for inspection preparation and internal recordkeeping.</li>
                <li>Regulatory reporting decisions (e.g., STR/CTR) remain subject to human review and approval.</li>
                <li>This platform supports drafting and organizing evidence; it does not file reports or communicate with regulators automatically.</li>
              </ul>
            </Card>
          </div>
        </>
      )}
    </Container>
  );
}
