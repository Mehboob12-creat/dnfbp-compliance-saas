// utils/entities/legalPersonRepo.js
import { supabase } from "../supabase";

/**
 * Small helper to normalize Supabase "no rows" situations without crashing.
 */
function isNoRowsError(err) {
  // PostgREST "No rows found" can appear as code PGRST116
  return err && (err.code === "PGRST116" || /No rows/i.test(err.message || ""));
}

function requireId(id, label = "id") {
  if (!id) throw new Error(`Missing ${label}.`);
}

/**
 * Ensures org_settings exists for the current user (ubo_threshold default 25).
 * Returns { user_id, ubo_threshold, ... }.
 */
export async function getOrCreateOrgSettings() {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes?.user?.id;
  if (!userId) throw new Error("Not authenticated.");

  const { data, error } = await supabase
    .from("org_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!error && data) return data;
  if (error && !isNoRowsError(error)) throw error;

  const { data: inserted, error: insErr } = await supabase
    .from("org_settings")
    .insert([{ user_id: userId, ubo_threshold: 25 }])
    .select("*")
    .single();

  if (insErr) throw insErr;
  return inserted;
}

/**
 * Creates a legal person in 'draft' state.
 */
export async function createLegalPersonDraft(payload) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes?.user?.id;
  if (!userId) throw new Error("Not authenticated.");

  const row = {
    user_id: userId,
    name: payload?.name?.trim() || "",
    ntn: payload?.ntn?.trim() || null,
    secp_registration: payload?.secp_registration?.trim() || null,
    address: payload?.address?.trim() || null,
    sector: payload?.sector?.trim() || null,
    has_cross_border: !!payload?.has_cross_border,
    has_complex_ownership: !!payload?.has_complex_ownership,
    has_bearer_shares: !!payload?.has_bearer_shares,
    status: "draft",
  };

  if (!row.name) throw new Error("Entity name is required.");

  const { data, error } = await supabase
    .from("legal_persons")
    .insert([row])
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a legal person (draft/active). Only passes known fields.
 */
export async function updateLegalPerson(legalPersonId, patch) {
  requireId(legalPersonId, "legalPersonId");

  const allowed = [
    "name",
    "ntn",
    "secp_registration",
    "address",
    "sector",
    "has_cross_border",
    "has_complex_ownership",
    "has_bearer_shares",
    "status",
  ];

  const update = {};
  for (const k of allowed) {
    if (k in (patch || {})) update[k] = patch[k];
  }
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("legal_persons")
    .update(update)
    .eq("id", legalPersonId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getLegalPerson(legalPersonId) {
  requireId(legalPersonId, "legalPersonId");
  const { data, error } = await supabase
    .from("legal_persons")
    .select("*")
    .eq("id", legalPersonId)
    .single();
  if (error) throw error;
  return data;
}

export async function listAssociates(legalPersonId) {
  requireId(legalPersonId, "legalPersonId");
  const { data, error } = await supabase
    .from("legal_person_associates")
    .select("*")
    .eq("legal_person_id", legalPersonId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Upserts an associate.
 * - If associate.id provided: update
 * - Else: insert
 */
export async function upsertAssociate(legalPersonId, associate) {
  requireId(legalPersonId, "legalPersonId");

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes?.user?.id;
  if (!userId) throw new Error("Not authenticated.");

  const clean = {
    user_id: userId,
    legal_person_id: legalPersonId,
    customer_id: associate?.customer_id || null,
    role: associate?.role,
    ownership_percent: typeof associate?.ownership_percent === "number" ? associate.ownership_percent : Number(associate?.ownership_percent || 0),
    is_indirect: !!associate?.is_indirect,
    notes: associate?.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (!clean.role) throw new Error("Associate role is required.");

  if (associate?.id) {
    const { data, error } = await supabase
      .from("legal_person_associates")
      .update(clean)
      .eq("id", associate.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  clean.created_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("legal_person_associates")
    .insert([clean])
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAssociate(associateId) {
  requireId(associateId, "associateId");
  const { error } = await supabase
    .from("legal_person_associates")
    .delete()
    .eq("id", associateId);
  if (error) throw error;
  return true;
}

/**
 * Gets mini-KYC for an associate, or creates an empty row.
 */
export async function getOrCreateMiniKyc(associateId) {
  requireId(associateId, "associateId");

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes?.user?.id;
  if (!userId) throw new Error("Not authenticated.");

  const { data, error } = await supabase
    .from("legal_person_mini_kyc")
    .select("*")
    .eq("legal_person_associate_id", associateId)
    .single();

  if (!error && data) return data;
  if (error && !isNoRowsError(error)) throw error;

  const { data: inserted, error: insErr } = await supabase
    .from("legal_person_mini_kyc")
    .insert([
      {
        user_id: userId,
        legal_person_associate_id: associateId,
        pep_status: "unknown",
        sanctions_screening: "not_done",
      },
    ])
    .select("*")
    .single();

  if (insErr) throw insErr;
  return inserted;
}

export async function updateMiniKyc(associateId, patch) {
  requireId(associateId, "associateId");

  // ensure row exists
  await getOrCreateMiniKyc(associateId);

  const allowed = [
    "full_name",
    "cnic",
    "nationality",
    "pep_status",
    "sanctions_screening",
    "source_of_wealth",
    "source_of_funds",
    "id_doc_collected",
    "address_doc_collected",
    "notes",
  ];

  const update = {};
  for (const k of allowed) {
    if (k in (patch || {})) update[k] = patch[k];
  }
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("legal_person_mini_kyc")
    .update(update)
    .eq("legal_person_associate_id", associateId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
