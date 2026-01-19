import { createClient } from "@supabase/supabase-js";
import { generateNoticeResponsePdf } from "../../utils/pdf/noticeResponsePdf";

function safeText(x) {
  return typeof x === "string" ? x.trim() : "";
}

function getEnv(name) {
  return process.env[name];
}

function getSupabaseUrl() {
  return getEnv("NEXT_PUBLIC_SUPABASE_URL") || getEnv("SUPABASE_URL") || "";
}

function getSupabaseAnonKey() {
  return (
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    getEnv("NEXT_PUBLIC_SUPABASE_KEY") ||
    getEnv("SUPABASE_ANON_KEY") ||
    ""
  );
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const auth = safeText(req.headers.authorization || "");
    if (!auth.toLowerCase().startsWith("bearer ")) {
      return res.status(401).json({ error: "Unauthorized", detail: "Missing Authorization bearer token." });
    }
    const accessToken = auth.slice("bearer ".length).trim();

    const { noticeId } = req.body || {};
    const id = safeText(noticeId);
    if (!id) return res.status(400).json({ error: "Missing noticeId" });

    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: "Server misconfiguration", detail: "Missing Supabase env vars." });
    }

    const authedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // RLS-safe: notice owned by user
    const { data: notice, error: nErr } = await authedSupabase
      .from("regulator_notices")
      .select("*")
      .eq("id", id)
      .single();

    if (nErr) throw nErr;

    const { data: responseRow, error: rErr } = await authedSupabase
      .from("regulator_responses")
      .select("*")
      .eq("notice_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rErr) throw rErr;

    const doc = generateNoticeResponsePdf({
      notice,
      response: responseRow || { response_text: "—", consultant_notes: "" },
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Notice_Response_${id}.pdf"`);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    return res.status(500).json({
      error: "Failed to export response PDF",
      detail: err?.message || String(err),
    });
  }
}
