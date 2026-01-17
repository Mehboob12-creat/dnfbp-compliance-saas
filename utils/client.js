import { supabase } from "./supabase";

/**
 * Returns the current logged-in user's "client" record (DNFBP business profile).
 * If it doesn't exist yet, it creates a default one.
 *
 * Why this exists:
 * - Every customer/transaction must belong to a client_id
 * - client_id = your DNFBP business account in the SaaS
 */
export async function getOrCreateClient() {
  // 1) Must be logged in
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(`Auth error: ${userErr.message}`);
  if (!userData?.user) throw new Error("Not logged in. Please login again.");

  const userId = userData.user.id;

  // 2) Try fetch an existing client row for this user
  const { data: rows, error: fetchErr } = await supabase
    .from("clients")
    .select("id, owner_user_id, business_name, sector, ntn, city, phone, created_at")
    .eq("owner_user_id", userId)
    .limit(1);

  if (fetchErr) throw new Error(`DB error (clients select): ${fetchErr.message}`);

  if (rows && rows.length > 0) {
    return rows[0];
  }

  // 3) If missing, create default client row
  // You can later build a "Business Profile Setup" page to edit this.
  const defaultClient = {
    owner_user_id: userId,
    business_name: "My DNFBP Business",
    sector: "real_estate",
    city: "Karachi",
    ntn: null,
    phone: null,
  };

  const { data: created, error: createErr } = await supabase
    .from("clients")
    .insert([defaultClient])
    .select("id, owner_user_id, business_name, sector, ntn, city, phone, created_at")
    .single();

  if (createErr) throw new Error(`DB error (clients insert): ${createErr.message}`);

  return created;
}
