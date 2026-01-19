// utils/risk/legalPersonRisk.js
import { supabase } from "../supabase";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function scoreToBand(score) {
  if (score >= 80) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

export async function computeLegalPersonRisk({ legalPersonId }) {
  // 1) Fetch legal person
  const { data: entity, error: e1 } = await supabase
    .from("legal_persons")
    .select("*")
    .eq("id", legalPersonId)
    .single();

  if (e1) throw e1;

  // 2) Fetch associates + their linked customer risk (if you store it in risk_assessments)
  const { data: associates, error: e2 } = await supabase
    .from("legal_person_associates")
    .select("id, role, ownership_percent, is_indirect, customer_id")
    .eq("legal_person_id", legalPersonId);

  if (e2) throw e2;

  const customerIds = (associates || [])
    .map(a => a.customer_id)
    .filter(Boolean);

  let customerRiskMap = {};
  if (customerIds.length) {
    // If your risk engine stores per-customer in risk_assessments, fetch the latest-ish record.
    // (If your schema differs, adapt the select accordingly.)
    const { data: ras, error: e3 } = await supabase
      .from("risk_assessments")
      .select("customer_id, total_score, risk_level, created_at")
      .in("customer_id", customerIds);

    if (!e3 && ras) {
      for (const r of ras) {
        // Prefer max score in case multiple records (simple, conservative)
        const prev = customerRiskMap[r.customer_id];
        const score = typeof r.total_score === "number" ? r.total_score : null;
        if (!prev || (score != null && score > prev.score)) {
          customerRiskMap[r.customer_id] = {
            score: score ?? (r.risk_level === "High" ? 80 : r.risk_level === "Medium" ? 50 : 20),
            band: r.risk_level || (score != null ? scoreToBand(score) : "Unknown"),
          };
        }
      }
    }
  }

  // 3) Entity base risk (simple + explainable)
  let baseScore = 20;
  const reasons = [];

  if (entity.sector) {
    // Keep inspection-safe: no accusations, only “risk indicators”
    const s = entity.sector.toLowerCase();
    if (s.includes("real estate") || s.includes("property")) {
      baseScore += 10;
      reasons.push("Sector indicator: property/real estate (increased inherent exposure).");
    }
    if (s.includes("jew") || s.includes("gold") || s.includes("precious")) {
      baseScore += 15;
      reasons.push("Sector indicator: precious metals/stones (increased inherent exposure).");
    }
  }

  if (entity.has_cross_border) {
    baseScore += 15;
    reasons.push("Complexity indicator: cross-border exposure selected.");
  }
  if (entity.has_complex_ownership) {
    baseScore += 15;
    reasons.push("Complexity indicator: complex ownership structure selected.");
  }
  if (entity.has_bearer_shares) {
    baseScore += 25;
    reasons.push("Complexity indicator: bearer shares selected.");
  }

  baseScore = clamp(baseScore, 0, 100);

  // 4) Associate max score
  let maxAssociateScore = 0;
  let maxAssociateRole = null;

  for (const a of associates || []) {
    if (!a.customer_id) continue;
    const r = customerRiskMap[a.customer_id];
    const score = r?.score ?? 20; // conservative default if missing
    if (score > maxAssociateScore) {
      maxAssociateScore = score;
      maxAssociateRole = a.role;
    }
  }

  if (maxAssociateScore > 0) {
    reasons.push(`Highest linked-person indicator comes from: ${maxAssociateRole || "associate"} (using stored customer risk where available).`);
  } else {
    reasons.push("No linked-person risk records found; entity risk uses entity indicators only until onboarding is completed.");
  }

  // 5) Final (highest + small booster for many associates)
  const associateCount = (associates || []).length;
  let booster = 0;
  if (associateCount >= 5) {
    booster += 5;
    reasons.push("Complexity indicator: multiple associated persons (≥5).");
  }

  const finalScore = clamp(Math.max(baseScore, maxAssociateScore) + booster, 0, 100);

  return {
    legal_person_id: legalPersonId,
    score: finalScore,
    band: scoreToBand(finalScore),
    explainability: reasons,
    inputs: {
      baseScore,
      maxAssociateScore,
      booster,
      associateCount,
    },
  };
}
