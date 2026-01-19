import { createClient } from "@supabase/supabase-js";
import { generatePolicyPdf } from "../../utils/pdf/policyPdf";

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
    const { policyId, version } = req.body || {};
    const id = safeText(policyId);
    const ver = safeText(version || "FINAL").toUpperCase(); // FINAL or DRAFT

    if (!id) return res.status(400).json({ error: "Missing policyId" });

    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: "Server misconfiguration", detail: "Missing Supabase env vars." });
    }

    const authedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: row, error } = await authedSupabase
      .from("policy_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    const markdown = ver === "DRAFT" ? row.draft_markdown : (row.final_markdown || row.draft_markdown || "");
    const title = ver === "DRAFT" ? "AML/CFT Policy (Draft)" : "AML/CFT Policy (Final)";

    const doc = generatePolicyPdf({ title, markdown });
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="AML_CFT_Policy_${ver}_${id}.pdf"`);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    return res.status(500).json({ error: "Failed to export policy PDF", detail: err?.message || String(err) });
  }
}
