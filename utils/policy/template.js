function safeText(x) {
  return typeof x === "string" ? x.trim() : "";
}

function safeInt(x) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
}

function mdLine(label, value) {
  const v = safeText(value);
  return v ? `- **${label}:** ${v}` : `- **${label}:** —`;
}

export function generatePolicyDraftMarkdown(input = {}) {
  const sector = safeText(input.sector);
  const staffCount = safeInt(input.staff_count);
  const turnoverBand = safeText(input.turnover_band);
  const customerProfile = safeText(input.customer_profile);
  const transactionProfile = safeText(input.transaction_profile);
  const geographyProfile = safeText(input.geography_profile);
  const existingControls = safeText(input.existing_controls);

  const profileBlock = [
    "## Organization profile (for internal reference)",
    mdLine("Sector", sector || "DNFBP"),
    mdLine("Staff count", staffCount === null ? "" : String(staffCount)),
    mdLine("Turnover band", turnoverBand),
    mdLine("Customer profile", customerProfile),
    mdLine("Transaction profile", transactionProfile),
    mdLine("Geography profile", geographyProfile),
    mdLine("Existing controls", existingControls),
    "",
  ].join("\n");

  // Inspection-safe policy language: factual, process-focused, no claims.
  return [
    "# AML/CFT Policy (Draft — Human Review Required)",
    "",
    "**Inspection-safe note:** This document is a draft prepared for internal controls and inspection preparation. Final approval, implementation, and any regulatory reporting decisions remain subject to human review and management oversight.",
    "",
    profileBlock,
    "## 1. Purpose",
    "This policy describes the organization’s AML/CFT controls to support risk-based customer due diligence, recordkeeping, and internal escalation processes. It is designed for inspection preparation and consistent internal procedures.",
    "",
    "## 2. Scope",
    "This policy applies to relevant staff and covered business activities, including customer onboarding, transaction processing, and record maintenance.",
    "",
    "## 3. Governance & roles",
    "- **Management / Owner:** Approves the policy and ensures resources for implementation.",
    "- **Compliance officer / consultant (as applicable):** Maintains procedures, provides guidance, supports internal reviews, and assists with inspection preparation.",
    "- **Staff:** Follow onboarding, screening, and recordkeeping procedures; escalate concerns through the internal process.",
    "",
    "## 4. Risk-based approach",
    "The organization applies a risk-based approach consistent with FATF-aligned principles. Risk assessment outcomes guide the level of due diligence and ongoing review.",
    "",
    "## 5. Customer Due Diligence (CDD)",
    "- Collect and verify customer identification information appropriate to the customer type.",
    "- Record the purpose and intended nature of the business relationship/transaction.",
    "- Maintain records in a retrievable manner for inspection preparation and internal oversight.",
    "",
    "## 6. Enhanced Due Diligence (EDD) (when applicable)",
    "EDD may be performed based on higher-risk indicators (e.g., higher risk score, multiple red flags, or screening outcomes). EDD steps may include:",
    "- Additional verification and documentation of source of funds/source of wealth (as applicable).",
    "- Senior/management review and documented rationale.",
    "- More frequent updates to records (as appropriate).",
    "",
    "## 7. Screening",
    "The organization performs screening checks using available sources (e.g., sanctions/TFS lists) as implemented in internal tools. Screening outcomes are recorded as evidence snapshots for audit/inspection preparation.",
    "",
    "## 8. Transactions & ongoing monitoring",
    "- Record relevant transaction details (amount, purpose, payment mode, and source of funds as applicable).",
    "- Review higher-risk patterns based on documented indicators and internal thresholds.",
    "- Document review notes and outcomes in an inspection-safe manner.",
    "",
    "## 9. Internal escalation (STR/CTR decision support)",
    "**Important:** This organization’s software tools do not automatically file STR/CTR and do not communicate with regulators. Internal escalation is designed to support human review.",
    "- If indicators suggest elevated concern (e.g., very high risk score, multiple red flags, or screening match), staff should escalate to the compliance officer/management for review.",
    "- Final decisions (including whether to file any report) remain a human responsibility and must be documented internally.",
    "",
    "## 10. Recordkeeping",
    "- Maintain CDD records, risk rationale, screening evidence, and transaction records in an organized manner.",
    "- Keep evidence exportable/printable for inspection preparation.",
    "",
    "## 11. Training",
    "- Staff should complete role-appropriate AML/CFT training modules.",
    "- Training completion evidence (e.g., certificates) should be maintained for inspection preparation.",
    "",
    "## 12. Audit trail & change control",
    "- Document changes to risk decisions and policy updates with dates and reasons.",
    "- Maintain versioned exports when needed for inspection preparation.",
    "",
    "## 13. Data protection & confidentiality",
    "Customer information should be handled confidentially with access restricted to authorized users.",
    "",
    "## 14. Review & approval",
    "- **Draft prepared on:** " + new Date().toISOString(),
    "- **Status:** Draft (human review required)",
    "",
    "### Sign-off (to be completed by management)",
    "- Approved by (name/title): __________________________",
    "- Signature: __________________________",
    "- Date: __________________________",
    "",
  ].join("\n");
}
