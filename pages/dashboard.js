export function InspectionReadinessWidget() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [avgScore, setAvgScore] = useState(null);
  const [pctReady, setPctReady] = useState(null);
  const [topNeedingAttention, setTopNeedingAttention] = useState([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr("");

        // 1) Load customers (lightweight fields)
        const { data: customers, error: custErr } = await supabase
          .from("customers")
          .select("id, full_name, cnic, city_district")
          .order("created_at", { ascending: false })
          .limit(100);

        if (custErr) throw custErr;

        const list = customers || [];
        if (list.length === 0) {
          if (!alive) return;
          setAvgScore(0);
          setPctReady(0);
          setTopNeedingAttention([]);
          setLoading(false);
          return;
        }

        const ids = list.map((c) => c.id);

        // 2) Transactions presence per customer
        const { data: txRows, error: txErr } = await supabase
          .from("transactions")
          .select("customer_id")
          .in("customer_id", ids)
          .limit(5000);

        if (txErr) throw txErr;
        const txSet = new Set((txRows || []).map((x) => x.customer_id));

        // 3) Latest risk per customer (we'll take the newest row we receive)
        const { data: riskRows, error: riskErr } = await supabase
          .from("risk_assessments")
          .select("customer_id, risk_category, overall_score, created_at")
          .in("customer_id", ids)
          .order("created_at", { ascending: false })
          .limit(5000);

        if (riskErr) throw riskErr;

        const latestRiskByCustomer = new Map();
        for (const r of riskRows || []) {
          if (!latestRiskByCustomer.has(r.customer_id)) {
            latestRiskByCustomer.set(r.customer_id, r);
          }
        }

        // 4) Compute readiness per customer using your existing readiness engine
        const scored = list.map((c) => {
          const risk = latestRiskByCustomer.get(c.id) || null;
          const screeningDone = false; // v1: screening evidence not yet wired on dashboard

          const readiness = computeInspectionReadiness({
            kycComplete: isKycComplete(c),
            transactionRecorded: txSet.has(c.id),
            screeningDone,
            riskSaved: Boolean(risk),
            riskBand: normalizeRiskBand(risk),
            // v1 placeholders — we'll wire to Evidence Locker later
            eddEvidenceUploaded: Boolean(c.edd_uploaded || c.eddEvidenceUploaded),
            trainingCompleted: Boolean(c.training_completed || c.trainingCompleted),
            policyExists: Boolean(c.policy_exists || c.policyExists),
          });

          return {
            id: c.id,
            name: (c.full_name || "Customer").trim(),
            score: readiness.score || 0,
          };
        });

        // Aggregate
        const total = scored.reduce((s, x) => s + x.score, 0);
        const avg = Math.round(total / scored.length);
        const readyCount = scored.filter((x) => x.score >= 80).length;
        const pct = Math.round((readyCount / scored.length) * 100);

        // Top needing attention (lowest readiness)
        const bottom = [...scored].sort((a, b) => a.score - b.score).slice(0, 5);

        if (!alive) return;
        setAvgScore(avg);
        setPctReady(pct);
        setTopNeedingAttention(bottom);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load inspection readiness.");
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const tone =
    avgScore >= 80 ? "good" : avgScore >= 50 ? "warn" : "bad";

  return (
    <CardShell
      title="Inspection Readiness"
      right={
        <Pill tone={tone}>
          {loading ? "Loading…" : `${avgScore ?? 0}/100`}
        </Pill>
      }
    >
      <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
        Evidence coverage score for inspection preparation and internal recordkeeping.
        Regulatory reporting decisions remain subject to human review and approval.
      </div>

      {err ? (
        <div style={{ marginTop: 10, color: "#9f1239", fontWeight: 700 }}>
          {err}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <Pill tone="neutral">
          {loading ? "…" : `${pctReady ?? 0}%`} customers ≥ 80
        </Pill>
        <Pill tone="neutral">
          {loading ? "…" : `${topNeedingAttention.length}`} in attention list
        </Pill>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 900, color: "#0f172a" }}>
          Needs attention
        </div>

        {loading ? (
          <div style={{ color: "#64748b" }}>Loading customers…</div>
        ) : topNeedingAttention.length === 0 ? (
          <div style={{ color: "#64748b" }}>
            No customer records found.
          </div>
        ) : (
          topNeedingAttention.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                padding: 10,
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                background: "#f8fafc",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontWeight: 900 }}>{c.name}</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>
                  Readiness: {c.score}/100
                </div>
              </div>

              <button
                onClick={() => (window.location.href = `/inspection/${c.id}`)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px solid #cbd5e1",
                  background: "white",
                  color: "#0f172a",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
                title="Open Inspection Mode for this customer."
              >
                Open Inspection Mode
              </button>
            </div>
          ))
        )}
      </div>
    </CardShell>
  );
}
