import { createClient } from "@supabase/supabase-js";
import { generatePolicyDraftMarkdown } from "../../utils/policy/template";

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

    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: "Server misconfiguration", detail: "Missing Supabase env vars." });
    }

    const authedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: userData, error: userErr } = await authedSupabase.auth.getUser(accessToken);
    if (userErr || !userData?.user?.id) {
      return res.status(401).json({ error: "Unauthorized", detail: "Invalid session." });
    }

    const input = req.body || {};
    const draft = generatePolicyDraftMarkdown(input);

    const { data: row, error } = await authedSupabase
      .from("policy_requests")
      .insert([
        {
          user_id: userData.user.id,
          sector: input.sector || null,
          staff_count: input.staff_count ?? null,
          turnover_band: input.turnover_band || null,
          customer_profile: input.customer_profile || null,
          transaction_profile: input.transaction_profile || null,
          geography_profile: input.geography_profile || null,
          existing_controls: input.existing_controls || null,
          status: "DRAFT",
          draft_markdown: draft,
        },
      ])
      .select("*")
      .single();

    if (error) throw error;

    return res.status(200).json({ policy: row });
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate policy draft", detail: err?.message || String(err) });
  }
}
