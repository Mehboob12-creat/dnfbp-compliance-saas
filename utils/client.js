import { supabase } from "./supabase";

export async function getOrCreateClient() {
  // 1) Get logged-in user
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!userData.user) throw new Error("Not logged in");

  const userId = userData.user.id;

  // 2) Try to find existing client row for this user
  const { data: existing, error: selErr } = await supabase
    .from("clients")
    .select("*")
    .eq("owner_user_id", userId)
    .limit(1);

  if (selErr) throw selErr;

  if (existing && existing.length > 0) {
    return existing[0]; // already exists
  }

  // 3) Create a default client row (you can add a setup page later)
  const { data: inserted, error: insErr } = await supabase
    .from("clients")
    .insert([
      {
        owner_user_id: userId,
        business_name: "My DNFBP Business",
        sector: "real_estate",
        city: "Karachi"
      }
    ])
    .select()
    .single();

  if (insErr) throw insErr;

  return inserted;
}
