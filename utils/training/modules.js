export const TRAINING_MODULES = [
  {
    key: "aml_basics_dnfbp_pk_v1",
    title: "AML/CFT Fundamentals for Pakistani DNFBPs (v1)",
    audience: "All staff",
    durationMinutes: 18,
    objectives: [
      "Understand AML/CFT purpose and risk-based approach",
      "Know what CDD/EDD means in daily operations",
      "Recognize why documentation matters for inspections",
    ],
    content: {
      type: "text",
      body: [
        "This module provides foundational AML/CFT concepts for DNFBPs in Pakistan.",
        "It is designed for training evidence and inspection preparation.",
        "This platform supports drafting and organizing evidence; it does not file reports or communicate with regulators automatically.",
      ],
    },
    quiz: [
      {
        q: "What does a risk-based approach mean?",
        options: [
          "Treat all customers the same",
          "Apply stronger controls when risk indicators are higher",
          "Only review when asked by regulators",
        ],
        answerIndex: 1,
      },
      {
        q: "Which is inspection-friendly evidence?",
        options: ["Verbal assurance", "Documented CDD record and risk rationale", "A chat message"],
        answerIndex: 1,
      },
      {
        q: "Does this platform automatically file STR/CTR?",
        options: ["Yes", "No"],
        answerIndex: 1,
      },
    ],
  },
  {
    key: "cdd_edd_workflow_v1",
    title: "CDD → EDD Workflow (Explainable, Human Review)",
    audience: "Compliance officer / consultant",
    durationMinutes: 22,
    objectives: [
      "Understand when EDD is recommended",
      "Record rationale in inspection-safe language",
      "Prepare an inspection-ready file and export pack",
    ],
    content: {
      type: "text",
      body: [
        "CDD and EDD are control steps used to manage risk and maintain inspection-ready evidence.",
        "Decisions such as escalation and regulatory reporting remain subject to human review and approval.",
      ],
    },
    quiz: [
      {
        q: "EDD is generally appropriate when:",
        options: ["Risk is LOW", "Risk is HIGH/VERY_HIGH or indicators are elevated", "Never"],
        answerIndex: 1,
      },
      {
        q: "What is the best practice for decisions?",
        options: ["Auto-decide in software", "Document rationale and obtain human approval", "Avoid documentation"],
        answerIndex: 1,
      },
      {
        q: "Inspection pack exports should be:",
        options: ["Fear-inducing", "Evidence-first and printable", "Hidden"],
        answerIndex: 1,
      },
    ],
  },
  {
    key: "recordkeeping_inspection_pack_v1",
    title: "Recordkeeping & Inspection Pack Preparation",
    audience: "All staff",
    durationMinutes: 14,
    objectives: [
      "Understand what inspectors typically ask for",
      "Maintain consistent records (CDD, risk, transactions)",
      "Use the platform export safely",
    ],
    content: {
      type: "text",
      body: [
        "This module focuses on recordkeeping and inspection preparation.",
        "Maintain consistent customer identification fields, transaction records, and saved risk rationale.",
      ],
    },
    quiz: [
      {
        q: "Inspection readiness primarily reflects:",
        options: ["Marketing score", "Evidence coverage and record completeness", "Profitability"],
        answerIndex: 1,
      },
      {
        q: "Which item belongs in an inspection pack?",
        options: ["Unverified rumors", "Risk assessment and documented rationale", "Private opinions"],
        answerIndex: 1,
      },
      {
        q: "Who makes final regulatory decisions?",
        options: ["Software", "Compliance officer / management", "No one"],
        answerIndex: 1,
      },
    ],
  },
];
