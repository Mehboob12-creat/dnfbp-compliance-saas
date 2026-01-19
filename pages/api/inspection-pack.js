import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";
import { generateRiskAssessmentPdf } from "../../utils/pdf/riskAssessmentPdf";

const TRAINING_VALID_DAYS = 365;

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
  return (
    safeText(String(input || ""))
      .replace(/[^\w\-]+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 80) || "customer"
  );
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

function isWithinDays(isoDate, days) {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return d >= cutoff;
}

function buildInspectionSafeReadme({ customerId, customerName }) {
  return [
    "DNFBP AML/CFT Compliance SaaS — Inspection Pack (Export)",
    "",
    "Purpose:",
    "- This export is intended for inspection preparation and internal recordkeeping.",
    "- It consolidates evidence snapshots captured in the platform at the time of export.",
    "",
    "Important:",
    "- This platform does not automatically file STR/CTR or communicate with regulators.",
    "- Regulatory reporting and escalation decisions remain subject to human review and approval.",
    "- Some items may be placeholders and should be supplied by the Compliance Officer/Consultant as applicable.",
    "",
    `Customer ID: ${customerId}`,
    `Customer Name: ${customerName || "—"}`,
    `Export Date (UTC): ${new Date().toISOString()}`,
    "",
  ].join("\n");
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
  return getEnv("NEXT_PUBLIC_SUPABASE_URL") || getEnv("SUPABASE_URL") || "";
}

function getSupabaseAnonKey() {
  return (
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    getEnv("NEXT_PUBLIC_SUPABASE_KEY") ||
    getEnv("SUPABASE_ANON_KEY") ||
    ""
  );
}

async function fetchBinary(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const auth = safeText(req.headers.authorization || "");
    if (!auth.toLowerCase().startsWith("bearer ")) {
      return res.status(401).json({ error: "Unauthorized", detail: "Missing Authorization bearer token." });
    }

    const accessToken = auth.slice("bearer ".length).trim();
    const { customerId } = req.body || {};
    const id = safeText(customerId);

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: "Invalid customerId", detail: "The customerId must be a UUID." });
    }

    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({
        error: "Server misconfiguration",
        detail: "Supabase URL / anon key env vars are missing in this deployment.",
      });
    }

    // RLS-safe: run as user
    const authedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // Load customer
    const customerRes = await authedSupabase.from("customers").select("*").eq("id", id).limit(1);
    if (customerRes.error) throw customerRes.error;
    const customer = Array.isArray(customerRes.data) ? customerRes.data[0] : null;
    if (!customer) {
      return res.status(404).json({
        error: "Customer not found",
        detail: "No customer record exists for this customerId under the current account (RLS).",
      });
    }

    // Latest risk
    const riskRes = await authedSupabase
      .from("risk_assessments")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const risk = riskRes?.data || null;

    // Transactions
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

    // Training evidence (real)
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
          .order("created_at", { ascending: false })
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
    } catch {
      trainingEvidence.completed = false;
    }

    // Readiness (inline minimal — avoids importing readiness.js if you prefer)
    // BUT you can keep using computeInspectionReadiness if you want.
    const screeningDone = Boolean(
      customer?.screening_status ||
        customer?.screening_done ||
        customer?.screening_result ||
        customer?.screeningResult
    );

    // Importing computeInspectionReadiness is safe (pure file) after your readiness.js fix.
    const { computeInspectionReadiness } = await import("../../utils/inspection/readiness.js");
    const readiness = computeInspectionReadiness({
      kycComplete: isKycComplete(customer),
      transactionRecorded: (txCountRes.count || 0) > 0,
      screeningDone,
      riskSaved: Boolean(risk?.id),
      eddDocsUploaded: Boolean(customer?.edd_uploaded || customer?.eddEvidenceUploaded),
      trainingCompleted: Boolean(trainingEvidence.completed),
      policyExists: Boolean(customer?.policy_exists || customer?.policyExists),
    });

    // Build ZIP
    const dateTag = isoDateOnly(new Date());
    const customerName = safeText(customer?.full_name || customer?.name);
    const baseFolder = `Inspection_Pack_${toFileSafeName(customerName || id)}_${dateTag}`;

    const zip = new JSZip();
    zip.file(`${baseFolder}/00_README_FOR_INSPECTION.txt`, buildInspectionSafeReadme({ customerId: id, customerName }));
    zip.file(`${baseFolder}/01_Readiness_Summary.json`, JSON.stringify(readiness, null, 2));
    zip.file(`${baseFolder}/02_Customer_Record.json`, JSON.stringify(customer, null, 2));

    const txSummary = {
      customer_id: id,
      count: txCountRes.count || 0,
      sample_latest_25: txSample,
      exported_at: new Date().toISOString(),
      note: "Snapshot for inspection preparation and internal recordkeeping.",
    };
    zip.file(`${baseFolder}/03_Transactions_Summary.json`, JSON.stringify(txSummary, null, 2));
    zip.file(`${baseFolder}/04_Risk_Record.json`, JSON.stringify(risk || { note: "No saved risk record found for this customer." }, null, 2));

    // Risk Assessment PDF
    const riskForPdf = risk
      ? {
          ...risk,
          score: risk.score ?? risk.overall_score ?? "",
          risk_band: risk.risk_band || risk.risk_category || "UNKNOWN",
          factors: (() => {
            const sb = risk.score_breakdown;
            if (sb && typeof sb === "object" && !Array.isArray(sb)) {
              return Object.entries(sb).map(([k, v]) => ({
                label: String(k),
                value: typeof v === "object" ? JSON.stringify(v) : String(v),
              }));
            }
            if (Array.isArray(sb)) return sb;
            return undefined;
          })(),
        }
      : { score: "", risk_band: "UNKNOWN" };

    const pdfDoc = generateRiskAssessmentPdf({
      customer: {
        ...customer,
        full_name: customer.full_name || customer.name || "-",
        city: customer.city || customer.city_district || customer.district || "-",
      },
      risk: riskForPdf,
      redFlags: Array.isArray(risk?.red_flags) ? risk.red_flags : [],
      generatedBy: "Compliance Officer",
    });
    const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer"));
    zip.file(`${baseFolder}/04_Risk_Assessment.pdf`, pdfBuffer);

    // Training certificate / placeholder
    let addedTrainingEvidence = false;
    if (trainingEvidence?.completed && trainingEvidence?.certificateUrl) {
      try {
        const certBuf = await fetchBinary(trainingEvidence.certificateUrl);
        zip.file(`${baseFolder}/06_Training_Certificate.pdf`, certBuf);
        addedTrainingEvidence = true;
      } catch {
        addedTrainingEvidence = false;
      }
    }

    if (!addedTrainingEvidence) {
      zip.file(
        `${baseFolder}/06_Training_Evidence_Pending.txt`,
        [
          "Training Evidence",
          "",
          "A training certificate was not available for inclusion in this inspection pack based on the current user session and available records.",
          "",
          "Suggested action:",
          "- Complete the assigned AML/CFT training module and generate the training certificate for inspection records.",
          "",
          "Note: This platform does not submit anything to regulators. All regulatory actions remain human-controlled.",
          "",
        ].join("\n")
      );
    }

    // Inspection Register CSV
    const csvEscape = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const readinessItemStatus = (key) => {
      const row = readiness?.checklist?.find((x) => x.key === key);
      return row?.status ? "OK" : "PENDING";
    };

    const eddRequired =
      normalizeRiskBandFromRiskRow(risk) === "HIGH" || normalizeRiskBandFromRiskRow(risk) === "VERY_HIGH";

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
      "Notes",
    ].join(",") + "\n";

    const csvRow = [
      csvEscape(id),
      csvEscape(customerName || ""),
      csvEscape(new Date().toISOString()),
      csvEscape(riskForPdf?.risk_band || "UNKNOWN"),
      csvEscape(riskForPdf?.score ?? ""),
      csvEscape(readiness?.score ?? ""),
      csvEscape(readinessItemStatus("kycComplete")),
      csvEscape(readinessItemStatus("transactionRecorded")),
      csvEscape(readinessItemStatus("screeningDone")),
      csvEscape(readinessItemStatus("riskSaved")),
      csvEscape(eddRequired ? "Yes" : "No"),
      csvEscape(readinessItemStatus("eddDocsUploaded")),
      csvEscape(readinessItemStatus("trainingCompleted")),
      csvEscape(readinessItemStatus("policyExists")),
      csvEscape("Prepared for inspection export; internal recordkeeping. Human review required for regulatory decisions."),
    ].join(",") + "\n";

    zip.file(`${baseFolder}/05_Inspection_Register.csv`, csvHeader + csvRow);

    // Placeholders
    zip.file(
      `${baseFolder}/90_Policy_PLACEHOLDER.txt`,
      placeholderText(
        "AML/CFT Policy Document",
        "Attach the approved AML/CFT policy PDF for the DNFBP (or generate via the Policy module when implemented)."
      )
    );

    if (!addedTrainingEvidence) {
      zip.file(
        `${baseFolder}/91_Training_PLACEHOLDER.txt`,
        placeholderText(
          "Training Evidence",
          "Attach training completion evidence (e.g., certificate, attendance logs) for relevant staff roles."
        )
      );
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${baseFolder}.zip"`);
    return res.status(200).send(zipBuffer);
  } catch (err) {
    return res.status(500).json({
      error: "Failed to generate inspection pack",
      detail: err?.message || String(err),
    });
  }
}
