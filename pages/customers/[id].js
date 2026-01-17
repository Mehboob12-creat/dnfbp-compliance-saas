import jsPDF from "jspdf";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../utils/supabase";

export default function CustomerView() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("Loading...");

  useEffect(() => {
    async function load() {
      const id = window.location.pathname.split("/").pop();

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        window.location.href = "/login";
        return;
      }

      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (custErr) {
        setMsg(custErr.message);
        return;
      }

      const { data: txns, error: txnErr } = await supabase
        .from("transactions")
        .select("*")
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (txnErr) {
        setMsg(txnErr.message);
        return;
      }

      setData({ customer, latestTransaction: txns?.[0] || null });
      setMsg("");
    }

    load();
  }, []);

  const risk = useMemo(() => {
    if (!data?.customer || !data?.latestTransaction) return null;
    return calculateRisk(data.customer, data.latestTransaction);
  }, [data]);

  async function saveRisk() {
    if (!data?.customer || !data?.latestTransaction || !risk) return;
    setMsg("Saving risk assessment...");

    try {
  const { error } = await supabase
    .from("risk_assessments")
    .upsert(
      [
        {
          client_id: data.customer.client_id,
          customer_id: data.customer.id,
          transaction_id: data.latestTransaction.id,
          overall_score: risk.overallScore,
          risk_category: risk.category,
          score_breakdown: risk.breakdown,
          red_flags: risk.redFlags,
          str_recommended: risk.recommendations.str,
          ctr_recommended: risk.recommendations.ctr,
          edd_required: risk.recommendations.edd,
          reasons: risk.recommendations.reasons,
        },
      ],
      { onConflict: "customer_id,transaction_id" }
    );
<button onClick={downloadRiskPDF} style={{ ...primaryBtn, background: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0" }}>
  Download Risk PDF
</button>
function downloadRiskPDF() {
  if (!data?.customer || !data?.latestTransaction || !risk) {
    alert("Risk data not ready yet.");
    return;
  }

  const doc = new jsPDF();

  const c = data.customer;
  const t = data.latestTransaction;

  const lines = [];
  lines.push("DNFBP COMPLIANCE — RISK ASSESSMENT REPORT");
  lines.push(" ");
  lines.push(`Customer Name: ${c.full_name || ""}`);
  lines.push(`CNIC: ${c.cnic || ""}`);
  lines.push(`City/District: ${c.city_district || ""}`);
  lines.push(`Profession: ${c.profession || ""}`);
  lines.push(`Filer Status: ${c.filer_status || ""}`);
  lines.push(`Annual Income (PKR): ${c.annual_income || ""}`);
  lines.push(`NTN: ${c.ntn || ""}`);
  lines.push(" ");
  lines.push("LATEST TRANSACTION");
  lines.push(`Amount (PKR): ${t.amount || ""}`);
  lines.push(`Purpose: ${(t.purpose || "").toString().toUpperCase()}`);
  lines.push(`Payment Mode: ${(t.payment_mode || "").toString().toUpperCase()}`);
  lines.push(`Source of Funds: ${(t.source_of_funds || "").toString().toUpperCase()}`);
  lines.push(`PEP: ${(t.pep_status || "").toString().toUpperCase()}`);
  lines.push(`Previous STR/CTR: ${(t.previous_str_ctr || "").toString().toUpperCase()}`);
  lines.push(" ");
  lines.push("RISK SUMMARY");
  lines.push(`Risk Category: ${risk.category}`);
  lines.push(`Score: ${risk.overallScore}/100`);
  lines.push(`EDD Required: ${risk.recommendations?.edd ? "YES" : "NO"}`);
  lines.push(`STR Suggested: ${risk.recommendations?.str ? "YES" : "NO"}`);
  lines.push(`CTR Suggested: ${risk.recommendations?.ctr ? "YES" : "NO"}`);
  lines.push(" ");
  lines.push("SCORE BREAKDOWN");
  (risk.breakdown || []).forEach((b) => {
    lines.push(`${b.label}: ${b.score}/${b.max} — ${b.note}`);
  });
  lines.push(" ");
  lines.push("RED FLAGS");
  (risk.redFlags || []).forEach((rf) => {
    lines.push(`${rf.code}: ${rf.note}`);
  });
  lines.push(" ");
  lines.push("RECOMMENDATION (REGULATOR-SAFE)");
  (risk.recommendations?.reasons || []).forEach((r) => lines.push(`- ${r}`));

  // Write text to PDF
  let y = 14;
  doc.setFont("helvetica", "bold");
  doc.text(lines[0], 10, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  const body = lines.slice(1).join("\n");
  const wrapped = doc.splitTextToSize(body, 190);
  doc.text(wrapped, 10, y);

  const safeName = (c.full_name || "customer").replace(/[^a-z0-9]+/gi, "_");
  doc.save(`Risk_Report_${safeName}.pdf`);
}

  if (error) throw error;

      setMsg("Saved ✅");
      setTimeout(() => setMsg(""), 1200);
    } catch (e) {
      setMsg(e.message || "Failed to save risk assessment");
    }
  }

  if (!data) return <div style={{ padding: 24 }}>{msg}</div>;

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#f8fafc" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <a href="/dashboard" style={{ textDecoration: "none" }}>← Back</a>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginTop: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>
              {data.customer.full_name}
            </h1>
            <p style={{ color: "#64748b", marginTop: 6 }}>
              Customer File • {data.customer.customer_type?.toUpperCase() || "NATURAL"}
            </p>
          </div>

          {risk ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Badge label={`${risk.category} (${risk.overallScore}/100)`} tone={risk.tone} />
              <button
                onClick={saveRisk}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                Save Risk Assessment
              </button>
            </div>
          ) : null}
        </div>

        {msg ? (
          <div style={{ marginTop: 12, color: "#0f172a" }}>{msg}</div>
        ) : null}

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <Card title="Customer Profile">
            <Row k="CNIC" v={data.customer.cnic || "-"} />
            <Row k="City/District" v={data.customer.city_district || "-"} />
            <Row k="Profession" v={data.customer.profession || "-"} />
            <Row k="Filer Status" v={formatFiler(data.customer.filer_status)} />
            <Row k="Annual Income (PKR)" v={fmtMoney(data.customer.annual_income)} />
            <Row k="NTN" v={data.customer.ntn || "-"} />
          </Card>

          <Card title="Latest Transaction">
            <Row k="Amount (PKR)" v={fmtMoney(data.latestTransaction?.amount)} />
            <Row k="Purpose" v={pretty(data.latestTransaction?.purpose)} />
            <Row k="Payment Mode" v={pretty(data.latestTransaction?.payment_mode)} />
            <Row k="Source of Funds" v={pretty(data.latestTransaction?.source_of_funds)} />
            <Row k="PEP" v={pretty(data.latestTransaction?.pep_status)} />
            <Row k="Previous STR/CTR" v={pretty(data.latestTransaction?.previous_str_ctr)} />
          </Card>

          {risk ? (
            <Card title="Risk Assessment (Explainable)">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                <Badge label={`Risk: ${risk.category}`} tone={risk.tone} />
                <Badge label={`Score: ${risk.overallScore}/100`} tone={risk.tone} />
                {risk.recommendations.edd ? <Badge label="EDD Required" tone="warn" /> : <Badge label="EDD Not Required" tone="ok" />}
                {risk.recommendations.str ? <Badge label="STR Suggested" tone="danger" /> : <Badge label="STR Not Suggested" tone="ok" />}
                {risk.recommendations.ctr ? <Badge label="CTR Suggested" tone="danger" /> : <Badge label="CTR Not Suggested" tone="ok" />}
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <SubTitle>Score breakdown</SubTitle>
                {risk.breakdownRows.map((r) => (
                  <Row key={r.k} k={r.k} v={`${r.score}/${r.max} • ${r.note}`} />
                ))}

                <SubTitle>Red flags</SubTitle>
                {risk.redFlags.length === 0 ? (
                  <div style={{ color: "#64748b" }}>No red flags detected.</div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {risk.redFlags.map((rf) => (
                      <div key={rf.flag} style={{ padding: 10, borderRadius: 12, border: "1px solid #fee2e2", background: "#fff1f2" }}>
                        <div style={{ fontWeight: 900 }}>{rf.flag}</div>
                        <div style={{ color: "#991b1b", marginTop: 4 }}>{rf.description}</div>
                      </div>
                    ))}
                  </div>
                )}

                <SubTitle>Recommendation reasons (regulator-safe)</SubTitle>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#0f172a" }}>
                  {risk.recommendations.reasons.map((x, i) => <li key={i}>{x}</li>)}
                </ul>

                <div style={{ marginTop: 8, padding: 12, borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Neutral wording (inspection-safe)</div>
                  <div style={{ color: "#334155" }}>{risk.narrative}</div>
                </div>
              </div>
            </Card>
          ) : (
            <Card title="Risk Assessment">
              Add a transaction first to calculate risk.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/** -----------------------------
 *  Risk Engine (v1 - explainable)
 *  ----------------------------- */
function calculateRisk(customer, txn) {
  // Weights / Max scores (admin panel later; hardcoded for now)
  const MAX = {
    filer: 20,
    incomeRatio: 25,
    source: 20,
    payment: 15,
    geo: 10,
    pep: 10,
  };

  // 1) Filer score
  const filerScore =
    customer.filer_status === "non_filer" ? 20 :
    customer.filer_status === "unknown" ? 10 :
    0;

  // 2) Income ratio score (txn.amount vs annual_income)
  const income = Number(customer.annual_income || 0);
  const amount = Number(txn.amount || 0);
  const ratio = income > 0 ? (amount / income) * 100 : null;

  let incomeRatioScore = 0;
  let ratioNote = "Income not provided";
  if (ratio !== null) {
    ratioNote = `Transaction is ${Math.round(ratio)}% of declared income`;
    if (ratio < 50) incomeRatioScore = 0;
    else if (ratio < 100) incomeRatioScore = 5;
    else if (ratio < 150) incomeRatioScore = 10;
    else if (ratio < 200) incomeRatioScore = 15;
    else incomeRatioScore = 25;
  } else {
    incomeRatioScore = 15; // conservative when missing income
  }

  // 3) Source of funds score
  const src = txn.source_of_funds;
  const sourceScore =
    src === "salary" ? 0 :
    src === "business_income" ? 5 :
    src === "sale_of_asset" ? 10 :
    src === "foreign_remittance" ? 15 :
    src === "inheritance_gift" ? 12 :
    src === "unknown" ? 20 :
    15; // other

  // 4) Payment mode score
  const pm = txn.payment_mode;
  const paymentScore =
    pm === "bank_transfer" ? 0 :
    pm === "cheque" ? 5 :
    pm === "digital_wallet" ? 3 :
    pm === "foreign_remittance" ? 8 :
    15; // cash

  // 5) Geographic risk score (simple tier; admin editable later)
  const geoTier = geoTierOf(customer.city_district || "");
  const geoScore = geoTier === "high" ? 10 : geoTier === "medium" ? 5 : 0;

  // 6) PEP score
  const pep = txn.pep_status;
  const pepScore = pep === "yes" ? 10 : pep === "family" ? 5 : 0;

  // Base score (cap at 100)
  const baseScore =
    filerScore + incomeRatioScore + sourceScore + paymentScore + geoScore + pepScore;

  // Red flags (extra boosters)
  const redFlags = [];

  if (pm === "cash" && amount > 500000) {
    redFlags.push({
      flag: "CASH_LARGE",
      description: "Large cash transaction (higher vulnerability due to limited traceability).",
      weight: 15,
    });
  }

  if (customer.filer_status === "non_filer" && amount > 1000000) {
    redFlags.push({
      flag: "NON_FILER_LARGE",
      description: "Non-filer with high-value transaction (documentation gap risk).",
      weight: 20,
    });
  }

  if (income > 0 && amount > income * 2) {
    redFlags.push({
      flag: "INCOME_MISMATCH",
      description: "Transaction significantly exceeds declared income (inconsistency indicator).",
      weight: 25,
    });
  }

  if (src === "unknown" || src === "other") {
    redFlags.push({
      flag: "VAGUE_SOURCE",
      description: "Source of funds not clearly identified or documented.",
      weight: 15,
    });
  }

  if (geoTier === "high" && amount > 500000) {
    redFlags.push({
      flag: "HIGH_RISK_AREA",
      description: "Higher geographic vulnerability combined with a high-value transaction.",
      weight: 20,
    });
  }

  if (pep === "yes" && pm === "cash") {
    redFlags.push({
      flag: "PEP_CASH",
      description: "PEP exposure with cash payment (requires enhanced review).",
      weight: 25,
    });
  }

  const redBoost = redFlags.reduce((s, x) => s + x.weight, 0);
  const overallScore = Math.min(100, baseScore + redBoost);

  const category =
    overallScore <= 30 ? "LOW" :
    overallScore <= 60 ? "MEDIUM" :
    overallScore <= 80 ? "HIGH" :
    "VERY_HIGH";

  const tone =
    category === "LOW" ? "ok" :
    category === "MEDIUM" ? "warn" :
    "danger";

  // STR/CTR/EDD recommendations (v1)
  const recommendations = recommendFiling({ customer, txn, overallScore, redFlags, geoTier });

  const breakdown = {
    filerScore,
    incomeRatioScore,
    sourceScore,
    paymentScore,
    geoScore,
    pepScore,
    ratio,
  };

  const breakdownRows = [
    { k: "Filer status", score: filerScore, max: MAX.filer, note: formatFiler(customer.filer_status) },
    { k: "Income vs transaction", score: incomeRatioScore, max: MAX.incomeRatio, note: ratioNote },
    { k: "Source of funds", score: sourceScore, max: MAX.source, note: pretty(src) },
    { k: "Payment mode", score: paymentScore, max: MAX.payment, note: pretty(pm) },
    { k: "Geographic risk", score: geoScore, max: MAX.geo, note: `Tier: ${geoTier.toUpperCase()}` },
    { k: "PEP exposure", score: pepScore, max: MAX.pep, note: pretty(pep) },
  ];

  const narrative = makeNarrative({ category, overallScore, redFlags, recommendations });

  return { overallScore, category, tone, breakdown, breakdownRows, redFlags, recommendations, narrative };
}

function recommendFiling({ txn, overallScore, redFlags, geoTier }) {
  const amount = Number(txn.amount || 0);
  const pm = txn.payment_mode;

  const str =
    overallScore >= 81 ||
    redFlags.length >= 3 ||
    redFlags.some((x) => ["INCOME_MISMATCH", "PEP_CASH"].includes(x.flag));

  const ctr =
    pm === "cash" && amount >= 2000000;

  const edd =
    overallScore > 60 ||
    txn.pep_status === "yes" ||
    geoTier === "high" ||
    redFlags.length >= 2;

  const reasons = [];
  reasons.push(`Risk score computed using weighted factors + red flags (explainable scoring).`);
  reasons.push(`Human review is required before any regulatory filing decision.`);
  if (edd) reasons.push(`Enhanced Due Diligence is recommended due to elevated risk indicators.`);
  if (str) reasons.push(`An internal STR review is suggested because multiple risk indicators are present.`);
  if (ctr) reasons.push(`CTR review is suggested because cash threshold appears met/exceeded.`);

  return { str, ctr, edd, reasons };
}

function makeNarrative({ category, overallScore, redFlags, recommendations }) {
  const parts = [];
  parts.push(`Overall risk is categorized as ${category} with a score of ${overallScore}/100.`);
  if (redFlags.length > 0) {
    parts.push(`Key indicators observed: ${redFlags.map((x) => x.flag).join(", ")}.`);
  } else {
    parts.push(`No major red flags were detected based on the provided information.`);
  }
  if (recommendations.edd) parts.push(`Enhanced Due Diligence is recommended as a precautionary control.`);
  parts.push(`This output is a system recommendation for compliance support; final decisions remain with the compliance officer.`);
  return parts.join(" ");
}

/** -----------------------------
 *  Helpers
 *  ----------------------------- */
function geoTierOf(city) {
  const c = (city || "").toLowerCase();

  // high (illustrative defaults; later editable in admin panel)
  const high = ["mohmand", "bajaur", "khyber", "north waziristan", "south waziristan", "chaman", "turbat", "gwadar"];
  if (high.some((x) => c.includes(x))) return "high";

  // medium (illustrative)
  const medium = ["mardan", "swabi", "sialkot", "gujranwala", "sukkur", "larkana", "rahim yar khan", "sahiwal"];
  if (medium.some((x) => c.includes(x))) return "medium";

  return "low";
}

function fmtMoney(v) {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("en-PK");
}

function pretty(v) {
  if (!v) return "-";
  return String(v).replaceAll("_", " ").replaceAll("-", " ").toUpperCase();
}

function formatFiler(v) {
  if (!v) return "-";
  if (v === "non_filer") return "NON-FILER";
  if (v === "filer") return "FILER";
  return "UNKNOWN";
}

function Card({ title, children }) {
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}

function SubTitle({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 900, color: "#334155", marginTop: 8 }}>{children}</div>;
}

function Row({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <div style={{ color: "#64748b" }}>{k}</div>
      <div style={{ fontWeight: 700, textAlign: "right" }}>{String(v)}</div>
    </div>
  );
}

function Badge({ label, tone }) {
  const styles =
    tone === "danger"
      ? { bg: "#fff1f2", bd: "#fecdd3", tx: "#9f1239" }
      : tone === "warn"
      ? { bg: "#fffbeb", bd: "#fde68a", tx: "#92400e" }
      : { bg: "#ecfeff", bd: "#a5f3fc", tx: "#155e75" };

  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${styles.bd}`,
        background: styles.bg,
        color: styles.tx,
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
