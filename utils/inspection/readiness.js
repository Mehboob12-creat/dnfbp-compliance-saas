import archiver from "archiver";
import { computeInspectionReadiness } from "../../utils/inspection/readiness";
import { createClient } from "@supabase/supabase-js";
import { generateRiskAssessmentPdf } from "../../utils/pdf/riskAssessmentPdf";

function safeText(x) {
  return typeof x === "string" ? x.trim() : "";
}

function isoDateOnly(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toFileSafeName(input) {
  return safeText(String(input || ""))
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80) || "customer";
}

function isKycComplete(customer) {
  if (!customer) return false;
  const name = safeText(customer.full_name || customer.name);
  const cnic = safeText(customer.cnic);
  const city = safeText(customer.city || customer.district);
  return Boolean(name && cnic && city);
}

function normalizeRiskBandFromRiskRow(riskRow) {
  const raw = safeText(
    riskRow?.risk_band || riskRow?.band || riskRow?.riskBand || riskRow?.risk_level || "UNKNOWN"
  ).toUpperCase();

  if (raw === "VERY HIGH" || raw === "VERY-HIGH") return "VERY_HIGH";
  if (["LOW", "MEDIUM", "HIGH", "VERY_HIGH"].includes(raw)) return raw;
  return "UNKNOWN";
}

function buildInspectionSafeReadme({ customerId, customerName }) {
  const lines = [
    "DNFBP AML/CFT Compliance SaaS — Inspection Pack (Export)",
    "",
    "Purpose:",
    "- This export is intended for inspection preparation and internal recordkeeping.",
    "- It consolidates evidence snapshots captured in the platform at the time of export.",
    "",
    "Important:",
    "- This platform does not automatically file STR/CTR or communicate with regulators.",
    "- Regulatory reporting and escalation decisions remain subject to human review and approval.",
    "- Some items may be placeholders in the current version and should be supplied by the Compliance Officer/Consultant as applicable.",
    "",
    `Customer ID: ${customerId}`,
    `Customer Name: ${customerName || "—"}`,
    `Export Date (UTC): ${new Date().toISOString()}`,
    "",
  ];
  return lines.join("\n");
}

function placeholderText(title, guidance) {
  return [
    title,
    "",
    "Status: Placeholder (not generated within the platform in the current version).",
    "Guidance:",
    guidance,
    "",
    "Inspection-safe note:",
    "This document is provided for inspection preparation and internal recordkeeping.",
    "Final decisions and regulator communications remain subject to human review and approval.",
    "",
  ].join("\n");
}

function getEnv(name) {
  return process.env[name];
}

function getSupabaseUrl() {
  return (
    getEnv("NEXT_PUBLIC_SUPABASE_URL") ||
    getEnv("SUPABASE_URL") ||
    ""
  );
}

function getSupabaseAnonKey() {
  return (
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    getEnv("NEXT_PUBLIC_SUPABASE_KEY") ||
    getEnv("SUPABASE_ANON_KEY") ||
    ""
  );
}

const TRAINING_VALID_DAYS = 365;

function isWithinDays(isoDate, days) {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return d >= cutoff;
}

async function fetchBinary(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const auth = safeText(req.headers.authorization || "");
    if (!auth.toLowerCase().startsWith("bearer ")) {
      res.status(401).json({
        error: "Unauthorized",
        detail: "Missing Authorization bearer token.",
      });
      return;
    }

    const accessToken = auth.slice("bearer ".length).trim();
    const { customerId } = req.body || {};
    const id = safeText(customerId);

    // Validate UUID (friendly error)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      res.status(400).json({
        error: "Invalid customerId",
        detail: "The customerId must be a UUID.",
      });
      return;
    }

    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();

    if (!supabaseUrl || !supabaseAnonKey) {
      res.status(500).json({
        error: "Server misconfiguration",
        detail: "Supabase URL / anon key env vars are missing in this deployment.",
      });
      return;
    }

    // Create a Supabase client that runs queries AS the logged-in user (RLS-safe)
    const authedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // 1) Load customer (RLS applies)
    const customerRes = await authedSupabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .limit(1);

    if (customerRes.error) throw customerRes.error;

    const customer = Array.isArray(customerRes.data) ? customerRes.data[0] : null;
    if (!customer) {
      res.status(404).json({
        error: "Customer not found",
        detail:
          "No customer record exists for this customerId under the current account (RLS).",
      });
      return;
    }

    // 2) Latest risk (adjust table name here if needed)
    const riskRes = await authedSupabase
      .from("risk_assessments")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const risk = riskRes?.data || null;

    // 3) Transactions count + sample (adjust table name here if needed)
    const txCountRes = await authedSupabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id);

    if (txCountRes.error) throw txCountRes.error;

    const txSampleRes = await authedSupabase
      .from("transactions")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(25);

    const txSample = txSampleRes?.data || [];

    // 4) Compute readiness
    const screeningDone = Boolean(
      customer?.screening_status ||
        customer?.screening_done ||
        customer?.screening_result ||
        customer?.screeningResult
    );

    // 4.5) Real training evidence for readiness (logged-in user)
    let trainingEvidence = {
      completed: false,
      certificateUrl: null,
      completedAt: null,
      moduleId: null,
      moduleVersion: null,
    };

    try {
      const { data: userData, error: userErr } = await authedSupabase.auth.getUser(accessToken);
      const user = userData?.user || null;

      if (!userErr && user?.id) {
        const { data: trainingRow, error: trainingErr } = await authedSupabase
          .from("training_completions")
          .select("certificate_url, completed_at, created_at, passed, module_id, module_version")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!trainingErr && trainingRow) {
          const completedAt = trainingRow.completed_at || trainingRow.created_at || null;
          const hasCert = !!trainingRow.certificate_url;
          const passedOrComplete =
            trainingRow.passed === true || !!trainingRow.completed_at || !!trainingRow.created_at;
          const withinValidity = isWithinDays(completedAt, TRAINING_VALID_DAYS);

          trainingEvidence = {
            completed: !!(hasCert && passedOrComplete && withinValidity),
            certificateUrl: trainingRow.certificate_url || null,
            completedAt,
            moduleId: trainingRow.module_id || null,
            moduleVersion: trainingRow.module_version || null,
          };
        }
      }
    } catch (e) {
      // Inspection-safe fallback: treat as not available
      trainingEvidence.completed = false;
    }

    const readiness = computeInspectionReadiness({
      kycComplete: isKycComplete(customer),
      transactionRecorded: (txCountRes.count || 0) > 0,
      screeningDone,
      riskSaved: Boolean(risk?.id),

      // ✅ Align with your readiness.js input name
      eddDocsUploaded: Boolean(customer?.edd_uploaded || customer?.eddEvidenceUploaded),

      // ✅ Real training evidence (certificate-backed)
      trainingCompleted: Boolean(trainingEvidence.completed),

      policyExists: Boolean(customer?.policy_exists || customer?.policyExists),
    });

    const dateTag = isoDateOnly(new Date());
    const customerName = safeText(customer?.full_name || customer?.name);
    const baseFolder = `Inspection_Pack_${toFileSafeName(customerName || id)}_${dateTag}`;

    // 5) Stream ZIP
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${baseFolder}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(res);

    archive.append(buildInspectionSafeReadme({ customerId: id, customerName }), {
      name: `${baseFolder}/00_README_FOR_INSPECTION.txt`,
    });

    archive.append(JSON.stringify(readiness, null, 2), {
      name: `${baseFolder}/01_Readiness_Summary.json`,
    });

    archive.append(JSON.stringify(customer, null, 2), {
      name: `${baseFolder}/02_Customer_Record.json`,
    });

    const txSummary = {
      customer_id: id,
      count: txCountRes.count || 0,
      sample_latest_25: txSample,
      exported_at: new Date().toISOString(),
      note:
        "This is a snapshot for inspection preparation and internal recordkeeping. It may not include all historical transactions.",
    };

    archive.append(JSON.stringify(txSummary, null, 2), {
      name: `${baseFolder}/03_Transactions_Summary.json`,
    });

    archive.append(JSON.stringify(risk || { note: "No saved risk record found for this customer." }, null, 2), {
      name: `${baseFolder}/04_Risk_Record.json`,
    });

    // ---- Risk Assessment PDF (inspection-safe, explainable) ----
    const riskForPdf = risk
      ? {
          ...risk,
          // normalize common fields used by the shared generator
          score: risk.score ?? risk.overall_score ?? "",
          risk_band: risk.risk_band || risk.risk_category || risk.risk_category || "UNKNOWN",
          // If your DB stores breakdown rows differently, this still produces a valid PDF.
          factors: (() => {
            // If DB stores breakdown as an object (score_breakdown), convert to readable lines
            const sb = risk.score_breakdown;
            if (sb && typeof sb === "object" && !Array.isArray(sb)) {
              return Object.entries(sb).map(([k, v]) => ({
                label: String(k),
                value: typeof v === "object" ? JSON.stringify(v) : String(v),
              }));
            }

            // If it's already an array of factors, keep as-is
            if (Array.isArray(sb)) return sb;

            return undefined;
          })(),
        }
      : { score: "", risk_band: "UNKNOWN" };

    const RED_FLAG_DESCRIPTIONS = {
      CASH_LARGE: "Large cash transaction (higher vulnerability due to limited traceability).",
      NON_FILER_LARGE: "Non-filer with high-value transaction (documentation gap risk).",
      INCOME_MISMATCH: "Transaction significantly exceeds declared income (inconsistency indicator).",
      VAGUE_SOURCE: "Source of funds not clearly identified or documented.",
      HIGH_RISK_AREA: "Higher geographic vulnerability combined with a high-value transaction.",
      PEP_CASH: "PEP exposure with cash payment (requires enhanced review).",
    };

    const redFlagsForPdf = Array.isArray(risk?.red_flags)
      ? risk.red_flags.map((rf) => {
          // If stored as string
          if (typeof rf === "string") {
            const desc = RED_FLAG_DESCRIPTIONS[rf];
            return desc ? `${rf}: ${desc}` : rf;
          }

          // If stored as object
          const code = rf?.flag || rf?.code || rf?.type || "RED_FLAG";
          const desc =
            rf?.description ||
            rf?.note ||
            rf?.reason ||
            RED_FLAG_DESCRIPTIONS[code] ||
            "Indicator recorded in the system (description not provided).";

          return `${code}: ${desc}`;
        })
      : [];

    const pdfDoc = generateRiskAssessmentPdf({
      customer: {
        ...customer,
        full_name: customer.full_name || customer.name || "-",
        city: customer.city || customer.city_district || customer.district || "-",
      },
      risk: riskForPdf,
      redFlags: redFlagsForPdf,
      generatedBy: "Compliance Officer",
    });

    // jsPDF -> Buffer (Node)
    const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer"));

    archive.append(pdfBuffer, {
      name: `${baseFolder}/04_Risk_Assessment.pdf`,
    });

    // =========================
    // Training certificate (real evidence if available)
    // =========================
    let addedTrainingEvidence = false;

    if (trainingEvidence?.certificateUrl) {
      try {
        const certBuf = await fetchBinary(trainingEvidence.certificateUrl);
        archive.append(certBuf, {
          name: `${baseFolder}/06_Training_Certificate.pdf`,
        });
        addedTrainingEvidence = true;
      } catch (e) {
        console.error("Training certificate fetch failed", e);
      }
    }

    if (!addedTrainingEvidence) {
      // Inspection-safe placeholder (neutral, factual)
      archive.append(
        [
          "Training Evidence",
          "",
          "Training completion certificate was not available for inclusion in this inspection pack based on the current user session and available records.",
          "",
          "Suggested action:",
          "- Complete the assigned AML/CFT training module and generate the training certificate for inspection records.",
          "",
          "Note: This platform does not submit anything to regulators. All regulatory actions remain human-controlled.",
          "",
        ].join("\n"),
        {
          name: `${baseFolder}/06_Training_Evidence_Pending.txt`,
        }
      );
    }

    // ---- Inspection Register (CSV) ----
    // Inspection-safe export record for audits/inspections.
    // This is a snapshot generated at export time.

    const csvEscape = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      // Quote if contains comma, quote, or newline
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const readinessItemStatus = (key) => {
      const row = readiness?.checklist?.find((x) => x.key === key);
      return row?.status ? "OK" : "PENDING";
    };

    const kycStatus = readinessItemStatus("kycComplete");
    const txnStatus = readinessItemStatus("transactionRecorded");
    const screeningStatus = readinessItemStatus("screeningDone");
    const riskStatus = readinessItemStatus("riskSaved");
    const eddStatus = readinessItemStatus("eddDocsUploaded");
    const trainingStatus = readinessItemStatus("trainingCompleted");
    const policyStatus = readinessItemStatus("policyExists");

    const eddRequired =
      normalizeRiskBandFromRiskRow(risk) === "HIGH" ||
      normalizeRiskBandFromRiskRow(risk) === "VERY_HIGH";

    const docsAvailable = [
      "Readiness Summary",
      "Customer Snapshot",
      "Transactions Summary",
      "Risk Snapshot",
      "Risk Assessment PDF",
    ].join("; ");

    const notes = [
      "Prepared for inspection export; internal recordkeeping.",
      "Human review required for regulatory decisions.",
    ].join(" ");

    const csvHeader = [
      "Customer ID",
      "Customer Name",
      "Export Date (UTC)",
      "Risk Band",
      "Risk Score",
      "Readiness Score",
      "KYC Record",
      "Transaction Record",
      "Screening Evidence",
      "Risk Saved",
      "EDD Required",
      "EDD Evidence",
      "Training Evidence",
      "Policy Document",
      "Documents Available",
      "Notes",
    ].join(",") + "\n";

    const csvRow = [
      csvEscape(id),
      csvEscape(customerName || ""),
      csvEscape(new Date().toISOString()),
      csvEscape(riskForPdf?.risk_band || "UNKNOWN"),
      csvEscape(riskForPdf?.score ?? ""),
      csvEscape(readiness?.score ?? ""),
      csvEscape(kycStatus),
      csvEscape(txnStatus),
      csvEscape(screeningStatus),
      csvEscape(riskStatus),
      csvEscape(eddRequired ? "Yes" : "No"),
      csvEscape(eddStatus),
      csvEscape(trainingStatus),
      csvEscape(policyStatus),
      csvEscape(docsAvailable),
      csvEscape(notes),
    ].join(",") + "\n";

    archive.append(csvHeader + csvRow, {
      name: `${baseFolder}/05_Inspection_Register.csv`,
    });

    // Placeholders (v1)
    archive.append(
      placeholderText(
        "AML/CFT Policy Document",
        "Attach the approved AML/CFT policy PDF for the DNFBP (or generate via the Policy module when implemented)."
      ),
      { name: `${baseFolder}/90_Policy_PLACEHOLDER.txt` }
    );

    // Updated: Only include training placeholder if no certificate was added
    if (!addedTrainingEvidence) {
      archive.append(
        placeholderText(
          "Training Evidence",
          "Attach training completion evidence (e.g., certificate, attendance logs) for relevant staff roles (or generate via Training module when implemented)."
        ),
        { name: `${baseFolder}/91_Training_PLACEHOLDER.txt` }
      );
    }

    const eddItem = readiness.checklist.find((x) => x.key === "eddDocsUploaded");
    const eddMissing = eddItem && !eddItem.status;
    if (eddMissing) {
      archive.append(
        placeholderText(
          "Enhanced Due Diligence Evidence (EDD)",
          "For HIGH/VERY_HIGH risk cases, attach relevant EDD evidence (source of funds documents, approval notes, supporting documentation) and record the reviewer decision."
        ),
        { name: `${baseFolder}/92_EDD_PLACEHOLDER.txt` }
      );
    }

    await archive.finalize();
  } catch (err) {
    if (res.headersSent) {
      try { res.end(); } catch {}
      return;
    }
    res.status(500).json({
      error: "Failed to generate inspection pack",
      detail: err?.message || String(err),
    });
  }
}
