import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../utils/supabase";

export default function CustomersList() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("Loading...");
  const [highOnly, setHighOnly] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setMsg("Loading...");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      window.location.href = "/login";
      return;
    }

    // Customers
    const { data: customers, error } = await supabase
      .from("customers")
      .select("id, client_id, full_name, cnic, city_district, annual_income, filer_status, created_at")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      setMsg(error.message);
      return;
    }

    // Latest risk per customer (pull recent risk rows and map first occurrence)
    const { data: risks } = await supabase
      .from("risk_assessments")
      .select("customer_id, overall_score, risk_category, created_at")
      .order("created_at", { ascending: false })
      .limit(1200);

    const riskMap = new Map();
    for (const r of risks || []) {
      if (!riskMap.has(r.customer_id)) riskMap.set(r.customer_id, r);
    }

    const enriched = (customers || []).map((c) => ({
      ...c,
      risk: riskMap.get(c.id) || null,
    }));

    setRows(enriched);
    setMsg("");
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows;

    if (needle) {
      out = out.filter((r) =>
        [r.full_name, r.cnic, r.city_district]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(needle))
      );
    }

    if (highOnly) {
      out = out.filter(
        (r) => r?.risk?.risk_category === "HIGH" || r?.risk?.risk_category === "VERY_HIGH"
      );
    }

    return out;
  }, [rows, q, highOnly]);

  async function runRiskNow(customer) {
    try {
      setBusyId(customer.id);

      // 1) Find latest transaction for this customer
      const { data: tx, error: txErr } = await supabase
        .from("transactions")
        .select("id, amount, purpose, payment_mode, source_of_funds, pep_status, created_at")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (txErr) throw txErr;
      if (!tx) {
        alert("No transaction found for this customer. Add a transaction first.");
        return;
      }

      // 2) Calculate risk (simple, explainable scoring)
      const risk = calculateRisk({
        amount: tx.amount,
        annual_income: customer.annual_income,
        filer_status: customer.filer_status,
        payment_mode: tx.payment_mode,
        source_of_funds: tx.source_of_funds,
        pep_status: tx.pep_status,
        city: customer.city_district,
      });

      // 3) Save risk (upsert by customer+transaction)
      const payload = {
        client_id: customer.client_id,
        customer_id: customer.id,
        transaction_id: tx.id,
        overall_score: risk.overallScore,
        risk_category: risk.category,
        score_breakdown: risk.breakdown,
        red_flags: risk.redFlags,
        str_recommended: risk.recommendations.str,
        ctr_recommended: risk.recommendations.ctr,
        edd_required: risk.recommendations.edd,
        reasons: risk.recommendations.reasons,
      };

      const { error: saveErr } = await supabase
        .from("risk_assessments")
        .upsert([payload], { onConflict: "customer_id,transaction_id" });

      if (saveErr) throw saveErr;

      // 4) Reload list so badge updates
      await loadAll();

      alert("Risk saved ✅");
    } catch (e) {
      alert(e?.message || "Risk save failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#f8fafc" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Header />

        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, CNIC, or city…"
            style={searchStyle}
          />

          <label style={toggleStyle}>
            <input
              type="checkbox"
              checked={highOnly}
              onChange={(e) => setHighOnly(e.target.checked)}
            />
            High risk only
          </label>

          <button onClick={loadAll} style={ghostBtn}>
            Refresh
          </button>
        </div>

        {msg && <div style={{ marginTop: 12 }}>{msg}</div>}

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {!msg && filtered.length === 0 ? <Empty /> : null}

          {filtered.map((c) => (
            <div key={c.id} style={rowWrap}>
              <a href={`/customers/${c.id}`} style={rowLeft}>
                <div style={{ fontWeight: 950, fontSize: 16 }}>
                  {c.full_name || "Unnamed Customer"}
                </div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                  CNIC: {c.cnic || "-"} • City: {c.city_district || "-"}
                </div>
              </a>

              <div style={rowRight}>
                {c.risk ? (
                  <Badge
                    label={`${c.risk.risk_category} (${c.risk.overall_score}/100)`}
                    tone={toneOf(c.risk.risk_category)}
                  />
                ) : (
                  <Badge label="NO RISK YET" tone="neutral" />
                )}

                <button
                  onClick={() => runRiskNow(c)}
                  disabled={busyId === c.id}
                  style={{
                    ...primaryBtn,
                    opacity: busyId === c.id ? 0.6 : 1,
                    cursor: busyId === c.id ? "not-allowed" : "pointer",
                  }}
                >
                  {busyId === c.id ? "Running..." : "Run Risk Now"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
      <div>
        <a href="/dashboard" style={{ textDecoration: "none" }}>← Dashboard</a>
        <h1 style={{ fontSize: 28, fontWeight: 950, margin: "8px 0 0" }}>Customers</h1>
        <p style={{ color: "#64748b", marginTop: 6 }}>
          Review customers and run risk instantly on the latest transaction.
        </p>
      </div>

      <a href="/customers/new" style={addBtn}>
        + Add Customer
      </a>
    </div>
  );
}

function Empty() {
  return (
    <div style={emptyStyle}>
      <div style={{ fontWeight: 900, color: "#0f172a" }}>No customers found</div>
      <div style={{ marginTop: 6 }}>
        Try a different search, or click <b>“Add Customer”</b>.
      </div>
    </div>
  );
}

function toneOf(cat) {
  if (cat === "LOW") return "ok";
  if (cat === "MEDIUM") return "warn";
  if (cat === "HIGH") return "danger";
  if (cat === "VERY_HIGH") return "danger";
  return "neutral";
}

function Badge({ label, tone }) {
  const styles =
    tone === "danger"
      ? { bg: "#fff1f2", bd: "#fecdd3", tx: "#9f1239" }
      : tone === "warn"
      ? { bg: "#fffbeb", bd: "#fde68a", tx: "#92400e" }
      : tone === "ok"
      ? { bg: "#ecfeff", bd: "#a5f3fc", tx: "#155e75" }
      : { bg: "#f1f5f9", bd: "#e2e8f0", tx: "#334155" };

  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${styles.bd}`,
        background: styles.bg,
        color: styles.tx,
        fontWeight: 950,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

/**
 * Simple, explainable risk logic (same idea as your blueprint, lightweight MVP).
 * You can expand this later.
 */
function calculateRisk(d) {
  const breakdown = {};
  const redFlags = [];

  // Filer score (0/10/20)
  let filerScore = 0;
  if ((d.filer_status || "").toLowerCase() === "non-filer") filerScore = 20;
  else if (!d.filer_status) filerScore = 10;
  breakdown.filer_status = filerScore;

  // Payment mode score
  const pm = (d.payment_mode || "").toLowerCase();
  const paymentScore =
    pm === "cash" ? 15 : pm === "foreign_remittance" ? 8 : pm === "cheque" ? 5 : pm === "digital_wallet" ? 3 : 0;
  breakdown.payment_mode = paymentScore;

  // Source of funds score
  const sof = (d.source_of_funds || "").toLowerCase();
  const sofScore =
    sof === "salary" ? 0 :
    sof === "business_income" ? 5 :
    sof === "sale_of_asset" ? 10 :
    sof === "foreign_remittance" ? 15 :
    sof === "inheritance_gift" ? 12 :
    sof ? 10 : 20;
  breakdown.source_of_funds = sofScore;

  // PEP score
  const pep = (d.pep_status || "").toLowerCase();
  const pepScore = pep === "yes" ? 10 : pep === "family" ? 5 : 0;
  breakdown.pep_status = pepScore;

  // Income ratio score
  let ratioScore = 10; // default if unknown
  if (Number(d.annual_income) > 0 && Number(d.amount) > 0) {
    const ratio = (Number(d.amount) / Number(d.annual_income)) * 100;
    if (ratio < 50) ratioScore = 0;
    else if (ratio < 150) ratioScore = 15;
    else ratioScore = 25;
  }
  breakdown.income_ratio = ratioScore;

  // Geographic score (simple: editable later)
  const city = (d.city || "").toLowerCase();
  const geoScore = ["mohmand", "bajaur", "north waziristan", "south waziristan", "chaman", "turbat"]
    .some((x) => city.includes(x)) ? 10 : 0;
  breakdown.geographic = geoScore;

  // Total
  let total = filerScore + paymentScore + sofScore + pepScore + ratioScore + geoScore;
  if (total > 100) total = 100;

  // Red flags
  if (pm === "cash" && Number(d.amount) > 500000) redFlags.push({ flag: "CASH_LARGE", severity: "HIGH" });
  if ((d.filer_status || "").toLowerCase() === "non-filer" && Number(d.amount) > 1000000)
    redFlags.push({ flag: "NON_FILER_LARGE", severity: "HIGH" });

  // Category
  let category = "LOW";
  if (total > 80) category = "VERY_HIGH";
  else if (total > 60) category = "HIGH";
  else if (total > 30) category = "MEDIUM";

  // Recommendations
  const recommendations = {
    str: total > 80 || redFlags.length >= 3,
    ctr: pm === "cash" && Number(d.amount) >= 2000000,
    edd: total > 60 || pep === "yes" || redFlags.length >= 2,
    reasons: [],
  };

  if (recommendations.str) recommendations.reasons.push("High risk score and/or multiple red flags");
  if (recommendations.ctr) recommendations.reasons.push("Cash transaction meets CTR threshold");
  if (recommendations.edd) recommendations.reasons.push("EDD triggered by risk score/PEP/red flags");

  return {
    overallScore: total,
    category,
    breakdown,
    redFlags,
    recommendations,
  };
}

const searchStyle = {
  flex: 1,
  minWidth: 260,
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  outline: "none",
  background: "white",
};

const toggleStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: "10px 12px",
  userSelect: "none",
  cursor: "pointer",
  fontWeight: 800,
};

const ghostBtn = {
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "white",
  cursor: "pointer",
  fontWeight: 900,
};

const rowWrap = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 16,
};

const rowLeft = {
  textDecoration: "none",
  color: "inherit",
  flex: 1,
  minWidth: 0,
};

const rowRight = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const primaryBtn = {
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid #0f172a",
  background: "#0f172a",
  color: "white",
  fontWeight: 950,
};

const addBtn = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "white",
  fontWeight: 950,
  textDecoration: "none",
  color: "#0f172a",
};

const emptyStyle = {
  padding: 18,
  borderRadius: 18,
  border: "1px dashed #cbd5e1",
  background: "white",
  color: "#64748b",
};
