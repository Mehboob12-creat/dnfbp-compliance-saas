// utils/admin/adminRepo.js
import { supabase } from "../supabase";
import { logAuditEvent } from "../audit/logEvent";

export async function getOrCreateProfile() {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes?.user?.id;
  if (!userId) throw new Error("Not authenticated.");

  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).single();

  if (!error && data) return data;

  // Create default profile
  const { data: inserted, error: insErr } = await supabase
    .from("profiles")
    .insert([{ user_id: userId, role: "client" }])
    .select("*")
    .single();

  if (insErr) throw insErr;
  return inserted;
}

export async function getOrCreateOrgSettings() {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes?.user?.id;
  if (!userId) throw new Error("Not authenticated.");

  const { data, error } = await supabase.from("org_settings").select("*").eq("user_id", userId).single();
  if (!error && data) return data;

  const { data: inserted, error: insErr } = await supabase
    .from("org_settings")
    .insert([{ user_id: userId, ubo_threshold: 25 }])
    .select("*")
    .single();

  if (insErr) throw insErr;
  return inserted;
}

export async function updateOrgSettings(patch) {
  const settings = await getOrCreateOrgSettings();

  const update = {};
  if ("ubo_threshold" in patch) update.ubo_threshold = Number(patch.ubo_threshold);
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("org_settings")
    .update(update)
    .eq("user_id", settings.user_id)
    .select("*")
    .single();

  if (error) throw error;

  await logAuditEvent({
    action: "admin.org_settings.updated",
    summary: "Updated organization settings.",
    object_type: "org_settings",
    object_id: settings.user_id,
    metadata: { updated_fields: Object.keys(update).filter(k => k !== "updated_at") },
  });

  return data;
}
