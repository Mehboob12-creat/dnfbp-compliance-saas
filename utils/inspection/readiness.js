/**
 * Inspection Readiness Evaluator (v1)
 * - Inspection-safe language (no “compliant / non-compliant” claims)
 * - Explainable scoring
 * - Works even when Training/Policy modules aren’t implemented yet
 */

/**
 * @typedef {"LOW"|"MEDIUM"|"HIGH"|"VERY_HIGH"|"UNKNOWN"} RiskBand
 * @typedef {"OK"|"PENDING"|"NOT_REQUIRED"} ReadinessStatus
 *
 * @typedef {Object} ReadinessInput
 * @property {boolean} kycComplete
 * @property {boolean} transactionRecorded
 * @property {boolean} screeningDone
 * @property {boolean} riskSaved
 * @property {RiskBand} riskBand
 * @property {boolean} eddEvidenceUploaded
 * @property {boolean} trainingCompleted
 * @property {boolean} policyExists
 */

const DEFAULT_WEIGHTS = Object.freeze({
  kycComplete: 20,
  transactionRecorded: 15,
  screeningDone: 15,
  riskSaved: 20,
  eddEvidence: 15,
  trainingEvidence: 7.5,
  policyDocument: 7.5,
});

function inspectionSafeSummaryLines() {
  return [
    "This readiness score reflects evidence coverage for inspection preparation and internal recordkeeping.",
    "Regulatory reporting decisions (e.g., STR/CTR) remain subject to human review and approval.",
    "This platform supports drafting and organizing evidence; it does not file reports or communicate with regulators automatically.",
  ];
}

function clampNumber(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function isEddRequired(riskBand) {
  return riskBand === "HIGH" || riskBand === "VERY_HIGH" || riskBand === "UNKNOWN";
}

function normalizeRiskBand(riskBand) {
  const allowed = new Set(["LOW", "MEDIUM", "HIGH", "VERY_HIGH", "UNKNOWN"]);
  if (!riskBand || !allowed.has(riskBand)) return "UNKNOWN";
  return riskBand;
}

/**
 * Inspection-safe readiness computation.
 * This function never infers evidence; it only reflects persisted records.
 */
export function computeInspectionReadiness(input = {}) {
  const {
    kycComplete = false,
    transactionRecorded = false,
    screeningDone = false,
    riskSaved = false,
    eddDocsUploaded = false,
    trainingCompleted = false,
    policyExists = false,
  } = input;

  // Weights match the product bible intent (total 100)
  const weights = {
    kycComplete: 20,
    transactionRecorded: 10,
    screeningDone: 15,
    riskSaved: 15,
    eddDocsUploaded: 15,
    trainingCompleted: 15,
    policyExists: 10,
  };

  const checklist = [
    {
      key: "kycComplete",
      label: "Customer due diligence recorded",
      status: !!kycComplete,
      note: kycComplete ? "Available in records." : "Pending completion in records.",
    },
    {
      key: "transactionRecorded",
      label: "Transaction recorded",
      status: !!transactionRecorded,
      note: transactionRecorded ? "Available in records." : "Pending recording in records.",
    },
    {
      key: "screeningDone",
      label: "Screening completed",
      status: !!screeningDone,
      note: screeningDone ? "Available in records." : "Pending screening record.",
    },
    {
      key: "riskSaved",
      label: "Risk assessment saved",
      status: !!riskSaved,
      note: riskSaved ? "Available in records." : "Pending saved risk assessment.",
    },
    {
      key: "eddDocsUploaded",
      label: "EDD evidence (if applicable) uploaded",
      status: !!eddDocsUploaded,
      note: eddDocsUploaded ? "Available in records." : "Upload evidence if applicable.",
    },
    {
      key: "trainingCompleted",
      label: "Staff training evidence available",
      status: !!trainingCompleted,
      note: trainingCompleted
        ? "Training completion evidence is available."
        : "Training completion evidence is not yet available for the current user.",
    },
    {
      key: "policyExists",
      label: "AML/CFT policy available",
      status: !!policyExists,
      note: policyExists ? "Available in records." : "Policy document not yet available.",
    },
  ];

  // Score calculation
  let score = 0;
  if (kycComplete) score += weights.kycComplete;
  if (transactionRecorded) score += weights.transactionRecorded;
  if (screeningDone) score += weights.screeningDone;
  if (riskSaved) score += weights.riskSaved;
  if (eddDocsUploaded) score += weights.eddDocsUploaded;
  if (trainingCompleted) score += weights.trainingCompleted;
  if (policyExists) score += weights.policyExists;

  // Hard gate: if training evidence is missing, cap readiness at 85
  if (!trainingCompleted && score > 85) score = 85;

  const missingKeys = checklist.filter((c) => !c.status).map((c) => c.key);

  // Calm, inspection-safe summary (no fear language)
  const summary =
    missingKeys.length === 0
      ? "Inspection evidence appears complete based on available records."
      : "Some inspection evidence items are pending based on available records.";

  return {
    score: Math.max(0, Math.min(100, score)),
    summary,
    checklist,
    missingKeys,
  };
}
