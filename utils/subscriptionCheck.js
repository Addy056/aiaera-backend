import { supabase } from "../config/supabaseClient.js";

export const checkSubscription = async (user_id) => {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user_id)
    .single();

  if (error || !data) return false;

  const now = new Date();
  const expiry = new Date(data.expires_at);

  return expiry > now;
};