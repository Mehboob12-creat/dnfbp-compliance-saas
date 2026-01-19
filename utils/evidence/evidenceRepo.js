// utils/evidence/evidenceRepo.js
import { supabase } from "../supabase";
import { logAuditEvent } from "../audit/logEvent";

function safeName(name) {
  return (name || "file")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

export async function uploadEvidence({
  file,
  category = "general",
  description = "",
  tags = [],
  object_type,
  object_id,
}) {
  if (!file) throw new Error("No file selected.");
  if (!object_type || !object_id) throw new Error("Missing link target (object_type/object_id).");

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes?.user?.id;
  if (!userId) throw new Error("Not authenticated.");

  const bucket = "evidence_locker";
  const filename = safeName(file.name);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const object_path = `${userId}/${object_type}/${object_id}/${ts}_${filename}`;

  // 1) Upload to Storage
  const { error: upErr } = await supabase.storage.from(bucket).upload(object_path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (upErr) throw upErr;

  // 2) Insert metadata row
  const { data: item, error: insErr } = await supabase
    .from("evidence_items")
    .insert([{
      user_id: userId,
      bucket,
      object_path,
      filename,
      mime_type: file.type || null,
      size_bytes: file.size || null,
      category,
      description: description || null,
      tags: Array.isArray(tags) ? tags : [],
    }])
    .select("*")
    .single();

  if (insErr) throw insErr;

  // 3) Link to target record
  const { error: linkErr } = await supabase
    .from("evidence_links")
    .insert([{
      user_id: userId,
      evidence_id: item.id,
      object_type,
      object_id,
    }]);

  if (linkErr) throw linkErr;

  // 4) Audit (non-blocking)
  await logAuditEvent({
    action: "evidence.uploaded",
    summary: `Uploaded evidence file for recordkeeping: ${filename}.`,
    object_type,
    object_id,
    metadata: { category },
  });

  return item;
}

export async function listEvidenceFor({ object_type, object_id }) {
  const { data, error } = await supabase
    .from("evidence_links")
    .select("id, evidence_id, object_type, object_id, evidence_items(*)")
    .eq("object_type", object_type)
    .eq("object_id", object_id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Flatten: evidence_items is nested
  return (data || []).map((row) => ({
    link_id: row.id,
    ...row.evidence_items,
  }));
}

export async function getEvidenceDownloadUrl({ bucket, object_path }) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(object_path, 60); // 60 seconds

  if (error) throw error;
  return data?.signedUrl;
}

export async function deleteEvidence({ evidenceId }) {
  // Fetch item first (to remove storage object)
  const { data: item, error: fetchErr } = await supabase
    .from("evidence_items")
    .select("*")
    .eq("id", evidenceId)
    .single();

  if (fetchErr) throw fetchErr;

  // Remove storage object
  const { error: rmErr } = await supabase.storage
    .from(item.bucket)
    .remove([item.object_path]);

  if (rmErr) throw rmErr;

  // Delete metadata (links cascade via FK)
  const { error: delErr } = await supabase
    .from("evidence_items")
    .delete()
    .eq("id", evidenceId);

  if (delErr) throw delErr;

  await logAuditEvent({
    action: "evidence.deleted",
    summary: `Deleted evidence file from evidence locker.`,
    object_type: "evidence_item",
    object_id: evidenceId,
  });

  return true;
}
