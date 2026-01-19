// utils/audit/logEvent.js
import { supabase } from "../supabase";

/**
 * Inspection-safe audit event logger.
 * - Never writes accusations
 * - No regulator actions
 * - Minimal metadata
 */
export async function logAuditEvent({
  action,
  summary,
  object_type,
  object_id = null,
  severity = "info",
  metadata = {},
  actor_role = null,
  actor_label = null,
}) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;

  const userId = userRes?.user?.id;
  if (!userId) throw new Error("Not authenticated.");

  const row = {
    user_id: userId,
    actor_role,
    actor_label,
    action,
    summary,
    severity,
    object_type,
    object_id,
    metadata,
  };

  const { error } = await supabase.from("audit_events").insert([row]);
  // We intentionally do not throw on audit failures in UI flows
  // to avoid blocking compliance work due to logging issues.
  if (error) console.error("Audit log insert failed:", error);
}
