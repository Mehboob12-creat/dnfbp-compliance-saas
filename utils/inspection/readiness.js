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

export function computeInspectionReadiness(input) {
  const weights = DEFAULT_WEIGHTS;

  const totalWeights =
    weights.kycComplete +
    weights.transactionRecorded +
    weights.screeningDone +
    weights.riskSaved +
    weights.eddEvidence +
    weights.trainingEvidence +
    weights.policyDocument;

  const riskBand = normalizeRiskBand(input.riskBand);
  const eddRequired = isEddRequired(riskBand);

  const items = [];

  function addItem({ key, title, ok, notRequired, weight, noteOk, notePending, noteNotRequired }) {
    const status = notRequired ? "NOT_REQUIRED" : ok ? "OK" : "PENDING";
    const pointsAwarded = notRequired ? weight : ok ? weight : 0;

    items.push({
      key,
      title,
      status,
      weight,
      pointsAwarded,
      note: notRequired ? noteNotRequired : ok ? noteOk : notePending,
    });
  }

  addItem({
    key: "kyc_complete",
    title: "Customer identification record",
    ok: !!input.kycComplete,
    notRequired: false,
    weight: weights.kycComplete,
    noteOk: "Core identification fields are present in the customer record.",
    notePending: "Complete the customer identification fields to strengthen the inspection record.",
  });

  addItem({
    key: "transaction_recorded",
    title: "Transaction record",
    ok: !!input.transactionRecorded,
    notRequired: false,
    weight: weights.transactionRecorded,
    noteOk: "Transaction details are recorded for evidence continuity.",
    notePending: "Record transaction activity or explicitly note no activity for the period.",
  });

  addItem({
    key: "screening_done",
    title: "Screening evidence",
    ok: !!input.screeningDone,
    notRequired: false,
    weight: weights.screeningDone,
    noteOk: "Screening status is available as part of the inspection record.",
    notePending: "Run screening or upload existing screening evidence.",
  });

  addItem({
    key: "risk_saved",
    title: "Risk assessment saved",
    ok: !!input.riskSaved,
    notRequired: false,
    weight: weights.riskSaved,
    noteOk: "Risk score and band are saved and available.",
    notePending: "Run and save the risk assessment.",
  });

  addItem({
    key: "edd_evidence",
    title: "Enhanced Due Diligence evidence",
    ok: !!input.eddEvidenceUploaded,
    notRequired: !eddRequired,
    weight: weights.eddEvidence,
    noteOk: "EDD supporting evidence is available.",
    notePending: "EDD evidence required for HIGH/VERY_HIGH risk cases.",
    noteNotRequired: "EDD not required based on current risk band.",
  });

  const rawScore = items.reduce((s, i) => s + i.pointsAwarded, 0);
  const score = round1(clampNumber((rawScore / totalWeights) * 100, 0, 100));

  const missing = items.filter(i => i.status === "PENDING").map(i => i.key);

  let band = "NEEDS_EVIDENCE";
  if (!input.kycComplete || !input.transactionRecorded || !input.screeningDone || !input.riskSaved) {
    band = "INCOMPLETE_RECORD";
  } else if (score >= 85 && missing.length === 0) {
    band = "READY";
  }

  return {
    score,
    band,
    generatedAtISO: new Date().toISOString(),
    items,
    missing,
    inspectionSafeSummary: inspectionSafeSummaryLines(),
  };
}
