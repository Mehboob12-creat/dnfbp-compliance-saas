/**
 * Inspection Readiness Evaluator (v1)
 * - Inspection-safe language (no “compliant / non-compliant” claims)
 * - Evidence coverage scoring (explainable)
 * - Pure function: NO imports, NO Node-only dependencies
 */

/**
 * @typedef {"LOW"|"MEDIUM"|"HIGH"|"VERY_HIGH"|"UNKNOWN"} RiskBand
 */

/**
 * Inspection-safe readiness computation.
 * This function never infers evidence; it only reflects the boolean inputs provided.
 *
 * @param {Object} input
 * @param {boolean} input.kycComplete
 * @param {boolean} input.transactionRecorded
 * @param {boolean} input.screeningDone
 * @param {boolean} input.riskSaved
 * @param {boolean} input.eddDocsUploaded
 * @param {boolean} input.trainingCompleted
 * @param {boolean} input.policyExists
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

  // Weights total 100
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

  let score = 0;
  if (kycComplete) score += weights.kycComplete;
  if (transactionRecorded) score += weights.transactionRecorded;
  if (screeningDone) score += weights.screeningDone;
  if (riskSaved) score += weights.riskSaved;
  if (eddDocsUploaded) score += weights.eddDocsUploaded;
  if (trainingCompleted) score += weights.trainingCompleted;
  if (policyExists) score += weights.policyExists;

  // Hard gate: training missing caps readiness at 85
  if (!trainingCompleted && score > 85) score = 85;

  const missingKeys = checklist.filter((c) => !c.status).map((c) => c.key);

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
