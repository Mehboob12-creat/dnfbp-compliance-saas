import { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabase";
import { TRAINING_MODULES } from "../utils/training/modules";
import { jsPDF } from "jspdf";

export default function TrainingPage() {
  const [msg, setMsg] = useState("Loading...");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [completions, setCompletions] = useState(new Set());
  const [activeKey, setActiveKey] = useState(TRAINING_MODULES[0]?.key || "");
  const [quizAnswers, setQuizAnswers] = useState({});

  const active = useMemo(
    () => TRAINING_MODULES.find((m) => m.key === activeKey) || TRAINING_MODULES[0],
    [activeKey]
  );

  const completionPct = useMemo(() => {
    if (!TRAINING_MODULES.length) return 0;
    const done = TRAINING_MODULES.filter((m) => completions.has(m.key)).length;
    return Math.round((done / TRAINING_MODULES.length) * 100);
  }, [completions]);

  const allCompleted = useMemo(() => {
    return TRAINING_MODULES.every((m) => completions.has(m.key));
  }, [completions]);

  useEffect(() => {
    let cancelled = false;

    async function guardAndLoad() {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        if (!cancelled) setMsg(error.message);
        return;
      }
      if (!data?.user) {
        window.location.href = "/login";
        return;
      }

      if (cancelled) return;

      setUserEmail(data.user.email || "");
      setUserId(data.user.id || "");

      // Load completions (scoped to current user; RLS-safe)
      const { data: rows, error: loadErr } = await supabase
        .from("training_completions")
        .select("module_key")
        .eq("user_id", data.user.id);

      if (loadErr) {
        if (!cancelled) setMsg(loadErr.message);
        return;
      }

      const s = new Set((rows || []).map((r) => r.module_key));
      setCompletions(s);
      setMsg("");
    }

    guardAndLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  function resetQuiz() {
    setQuizAnswers({});
  }

  function scoreQuiz(module) {
    const quiz = module?.quiz || [];
    if (quiz.length === 0) return { correct: 0, total: 0 };
    let correct = 0;
    for (let i = 0; i < quiz.length; i++) {
      const chosen = quizAnswers[`${module.key}_${i}`];
      if (chosen === quiz[i].answerIndex) correct++;
    }
    return { correct, total: quiz.length };
  }

  async function markCompleted(module) {
    try {
      if (!userId) {
        setMsg("Please log in again to record training completion.");
        return;
      }

      setMsg("Saving completion...");

      const quizScore = scoreQuiz(module);
      const total = quizScore.total || 0;
      const correct = quizScore.correct || 0;
      const passed = total === 0 ? true : correct >= Math.ceil(total * 0.67);

      const { error } = await supabase
        .from("training_completions")
        .upsert(
          [
            {
              user_id: userId,
              module_key: module.key,
              completed_at: new Date().toISOString(),
              passed,
              score: total ? Math.round((correct / total) * 100) : 100,
            },
          ],
          { onConflict: "user_id,module_key" }
        );

      if (error) throw error;

      const next = new Set(completions);
      next.add(module.key);
      setCompletions(next);
      setMsg("Saved ✅");
      setTimeout(() => setMsg(""), 900);
    } catch (e) {
      setMsg(e?.message || "Failed to save completion");
    }
  }

  async function markIncomplete(module) {
    try {
      if (!userId) {
        setMsg("Please log in again to update training completion.");
        return;
      }

      setMsg("Updating...");

      // Scoped delete (RLS-safe)
      const { error } = await supabase
        .from("training_completions")
        .delete()
        .eq("user_id", userId)
        .eq("module_key", module.key);

      if (error) throw error;

      const next = new Set(completions);
      next.delete(module.key);
      setCompletions(next);
      setMsg("");
    } catch (e) {
      setMsg(e?.message || "Failed to update completion");
    }
  }

  function downloadCertificate() {
    const doc = new jsPDF();
    const y0 = 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Training Certificate", 14, y0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("For inspection preparation and internal recordkeeping.", 14, y0 + 8);
    doc.text("This platform does not automatically file reports or communicate with regulators.", 14, y0 + 14);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Issued to", 14, y0 + 28);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(userEmail || "—", 14, y0 + 36);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Modules completed", 14, y0 + 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const completedTitles = TRAINING_MODULES.map((m) => `• ${m.title}`);
    const wrapped = doc.splitTextToSize(completedTitles.join("\n"), 180);
    doc.text(wrapped, 14, y0 + 58);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Completion status: ${completionPct}%`, 14, 270);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 276);

    doc.save(`Training_Certificate_${(userEmail || "user").replace(/[^a-z0-9]+/gi, "_")}.pdf`);
  }

  if (!active) return <div style={{ padding: 24 }}>{msg || "No modules configured."}</div>;

  const completed = completions.has(active.key);
  const quizScore = scoreQuiz(active);
  const quizPassed =
    quizScore.total === 0 ? true : quizScore.correct >= Math.ceil(quizScore.total * 0.67); // 67% pass

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#f8fafc" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>
              DASHBOARD / TRAINING
            </div>
            <h1 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 950, color: "#0f172a" }}>
              Training Modules
            </h1>
            <p style={{ marginTop: 8, color: "#64748b", lineHeight: 1.6, maxWidth: 900 }}>
              Role-based modules for AML/CFT awareness, recordkeeping, and inspection preparation. Completion is tracked
              for internal evidence. Regulatory reporting decisions remain subject to human review and approval.
            </p>
          </div>

          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <Pill tone={completionPct >= 80 ? "good" : completionPct >= 50 ? "warn" : "neutral"}>
              Completion: {completionPct}%
            </Pill>

            <button
              onClick={() => downloadCertificate()}
              disabled={!allCompleted}
              title={allCompleted ? "Download certificate for inspection evidence." : "Complete all modules to download certificate."}
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid #0f172a",
                background: allCompleted ? "#0f172a" : "#e2e8f0",
                color: allCompleted ? "white" : "#475569",
                fontWeight: 900,
                cursor: allCompleted ? "pointer" : "not-allowed",
              }}
            >
              Download Training Certificate (PDF)
            </button>
          </div>
        </div>

        {msg ? <div style={{ marginTop: 10, color: "#0f172a" }}>{msg}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 12, marginTop: 14 }}>
          {/* Left list */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 12 }}>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Library</div>

            <div style={{ display: "grid", gap: 8 }}>
              {TRAINING_MODULES.map((m) => {
                const done = completions.has(m.key);
                return (
                  <button
                    key={m.key}
                    onClick={() => {
                      setActiveKey(m.key);
                      resetQuiz();
                    }}
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderRadius: 14,
                      border: m.key === activeKey ? "1px solid #0f172a" : "1px solid #e2e8f0",
                      background: m.key === activeKey ? "#f8fafc" : "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ fontWeight: 950, color: "#0f172a", lineHeight: 1.35 }}>{m.title}</div>
                      <Tag tone={done ? "good" : "neutral"}>{done ? "Completed" : "Pending"}</Tag>
                    </div>
                    <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
                      Audience: {m.audience} • {m.durationMinutes} min
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
              Tip: Keep training completion evidence updated for inspection readiness.
            </div>
          </div>

          {/* Right module view */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 950, color: "#0f172a" }}>{active.title}</div>
                <div style={{ marginTop: 6, color: "#64748b" }}>
                  Audience: <b>{active.audience}</b> • Estimated time: <b>{active.durationMinutes} min</b>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <Tag tone={completed ? "good" : "neutral"}>{completed ? "Completed" : "Pending"}</Tag>

                {completed ? (
                  <button onClick={() => markIncomplete(active)} style={ghostBtn} title="Mark incomplete (if you need to retrain).">
                    Mark Incomplete
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!quizPassed) {
                        alert("Please complete the quiz with a passing score before marking complete.");
                        return;
                      }
                      markCompleted(active);
                    }}
                    style={primaryBtn}
                    title="Marks this module as completed for evidence tracking."
                  >
                    Mark Completed
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <SubTitle>Learning objectives</SubTitle>
              <ul style={{ margin: 0, paddingLeft: 18, color: "#0f172a" }}>
                {active.objectives.map((x, i) => (
                  <li key={i} style={{ marginTop: 6 }}>
                    {x}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: 14 }}>
              <SubTitle>Module content</SubTitle>
              <div style={{ marginTop: 8, color: "#334155", lineHeight: 1.7 }}>
                {(active.content?.body || []).map((p, i) => (
                  <p key={i} style={{ margin: "10px 0" }}>
                    {p}
                  </p>
                ))}
              </div>

              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#334155",
                  lineHeight: 1.6,
                  fontSize: 13,
                }}
              >
                Inspection-safe note: Training supports internal controls and evidence preparation. Final regulatory decisions remain with
                the compliance officer / management.
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <SubTitle>Quick quiz</SubTitle>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>
                Passing threshold: 67% (supports consistent training evidence)
              </div>

              <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                {(active.quiz || []).map((q, idx) => {
                  const key = `${active.key}_${idx}`;
                  const chosen = quizAnswers[key];
                  return (
                    <div
                      key={key}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: "1px solid #e2e8f0",
                        background: "white",
                      }}
                    >
                      <div style={{ fontWeight: 950, color: "#0f172a" }}>
                        {idx + 1}. {q.q}
                      </div>

                      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                        {q.options.map((opt, oi) => (
                          <label
                            key={oi}
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              padding: 10,
                              borderRadius: 12,
                              border: "1px solid #e2e8f0",
                              background: chosen === oi ? "#f8fafc" : "white",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name={key}
                              checked={chosen === oi}
                              onChange={() => setQuizAnswers((s) => ({ ...s, [key]: oi }))}
                            />
                            <span style={{ fontWeight: 700, color: "#0f172a" }}>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
                <Pill tone={quizPassed ? "good" : "warn"}>
                  Quiz score: {quizScore.correct}/{quizScore.total || 0}{" "}
                  {quizScore.total ? (quizPassed ? "• Pass" : "• Not yet") : ""}
                </Pill>

                <button onClick={resetQuiz} style={ghostBtn}>
                  Reset quiz
                </button>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <a href="/dashboard" style={{ textDecoration: "none", fontWeight: 950, color: "#0f172a" }}>
                ← Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({ children, tone = "neutral" }) {
  const style =
    tone === "good"
      ? { bg: "#ecfeff", bd: "#a5f3fc", tx: "#155e75" }
      : tone === "warn"
      ? { bg: "#fffbeb", bd: "#fde68a", tx: "#92400e" }
      : { bg: "#f1f5f9", bd: "#e2e8f0", tx: "#0f172a" };

  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${style.bd}`,
        background: style.bg,
        color: style.tx,
        fontWeight: 950,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Tag({ children, tone = "neutral" }) {
  const style =
    tone === "good"
      ? { bg: "#ecfeff", bd: "#a5f3fc", tx: "#155e75" }
      : { bg: "#f1f5f9", bd: "#e2e8f0", tx: "#0f172a" };

  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${style.bd}`,
        background: style.bg,
        color: style.tx,
        fontWeight: 950,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function SubTitle({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 950, color: "#334155", marginTop: 8 }}>{children}</div>;
}

const primaryBtn = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid #0f172a",
  background: "#0f172a",
  color: "white",
  fontWeight: 950,
  cursor: "pointer",
};

const ghostBtn = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "white",
  color: "#0f172a",
  fontWeight: 950,
  cursor: "pointer",
};
