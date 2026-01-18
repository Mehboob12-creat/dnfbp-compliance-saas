import archiver from "archiver";
import { computeInspectionReadiness } from "../../utils/inspection/readiness";
import { supabase } from "../../utils/supabase";

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
    "Contents:",
    "- Readiness Summary (score + checklist)",
    "- Customer Record Snapshot",
    "- Transactions Summary Snapshot",
    "- Risk Record Snapshot",
    "- Placeholders (where applicable)",
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

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const customerId = safeText(req.query.customerId);
    if (!customerId) {
      res.status(400).json({ error: "Missing customerId" });
      return;
    }

    // 1) Load customer
    // Validate UUID early (prevents "<CUSTOMER_ID>" mistakes)
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (!uuidRegex.test(customerId)) {
  res.status(400).json({
    error: "Invalid customerId",
    detail: "The customerId must be a UUID. Open Inspection Mode from a real customer record.",
  });
  return;
}

// 1) Load customer (robust: do not use .single())
const customerRes = await supabase
  .from("customers")
  .select("*")
  .eq("id", customerId)
  .limit(1);

if (customerRes.error) throw customerRes.error;

const customer = Array.isArray(customerRes.data)
  ? customerRes.data[0]
  : null;

if (!customer) {
  res.status(404).json({
    error: "Customer not found",
    detail: "No customer record exists for the provided customerId.",
  });
  return;
}

    // 2) Load latest risk (adjust table name here if needed)
    const riskRes = await supabase
      .from("risk_assessments")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const risk = riskRes?.data || null;

    // 3) Transactions count + small sample (adjust table name here if needed)
    const txCountRes = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId);

    if (txCountRes.error) throw txCountRes.error;

    const txSampleRes = await supabase
      .from("transactions")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(25);

    // txSampleRes.error is non-fatal (we can still export count + placeholder)
    const txSample = txSampleRes?.data || [];

    // 4) Compute readiness
    const screeningDone = Boolean(
      customer?.screening_status ||
        customer?.screening_done ||
        customer?.screening_result ||
        customer?.screeningResult
    );

    const readiness = computeInspectionReadiness({
      kycComplete: isKycComplete(customer),
      transactionRecorded: (txCountRes.count || 0) > 0,
      screeningDone,
      riskSaved: Boolean(risk?.id),
      riskBand: normalizeRiskBandFromRiskRow(risk),
      eddEvidenceUploaded: Boolean(customer?.edd_uploaded || customer?.eddEvidenceUploaded),
      trainingCompleted: Boolean(customer?.training_completed || customer?.trainingCompleted),
      policyExists: Boolean(customer?.policy_exists || customer?.policyExists),
    });

    const dateTag = isoDateOnly(new Date());
    const customerName = safeText(customer?.full_name || customer?.name);
    const baseFolder = `Inspection_Pack_${toFileSafeName(customerName || customerId)}_${dateTag}`;

    // 5) Stream ZIP
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${baseFolder}.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(res);

    // README
    archive.append(buildInspectionSafeReadme({ customerId, customerName }), {
      name: `${baseFolder}/00_README_FOR_INSPECTION.txt`,
    });

    // Readiness summary
    archive.append(JSON.stringify(readiness, null, 2), {
      name: `${baseFolder}/01_Readiness_Summary.json`,
    });

    // Customer snapshot
    archive.append(JSON.stringify(customer, null, 2), {
      name: `${baseFolder}/02_Customer_Record.json`,
    });

    // Transactions summary snapshot
    const txSummary = {
      customer_id: customerId,
      count: txCountRes.count || 0,
      sample_latest_25: txSample,
      exported_at: new Date().toISOString(),
      note:
        "This is a snapshot for inspection preparation and internal recordkeeping. It may not include all historical transactions.",
    };
    archive.append(JSON.stringify(txSummary, null, 2), {
      name: `${baseFolder}/03_Transactions_Summary.json`,
    });

    // Risk snapshot
    archive.append(JSON.stringify(risk || { note: "No saved risk record found for this customer." }, null, 2), {
      name: `${baseFolder}/04_Risk_Record.json`,
    });

    // Placeholders (v1)
    const policyPlaceholder = placeholderText(
      "AML/CFT Policy Document",
      "Attach the approved AML/CFT policy PDF for the DNFBP (or generate via the Policy module when implemented)."
    );
    archive.append(policyPlaceholder, { name: `${baseFolder}/90_Policy_PLACEHOLDER.txt` });

    const trainingPlaceholder = placeholderText(
      "Training Evidence",
      "Attach training completion evidence (e.g., certificate, attendance logs) for relevant staff roles (or generate via Training module when implemented)."
    );
    archive.append(trainingPlaceholder, { name: `${baseFolder}/91_Training_PLACEHOLDER.txt` });

    // If EDD is required and missing, add EDD placeholder
    const eddItem = readiness.items.find((x) => x.key === "edd_evidence");
    const eddMissing = eddItem && eddItem.status === "PENDING";
    if (eddMissing) {
      const eddPlaceholder = placeholderText(
        "Enhanced Due Diligence Evidence (EDD)",
        "For HIGH/VERY_HIGH risk cases, attach relevant EDD evidence (source of funds documents, approval notes, supporting documentation) and record the reviewer decision."
      );
      archive.append(eddPlaceholder, { name: `${baseFolder}/92_EDD_PLACEHOLDER.txt` });
    }

    // Finalize
    await archive.finalize();
  } catch (err) {
    // Important: if headers already sent, just end.
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
