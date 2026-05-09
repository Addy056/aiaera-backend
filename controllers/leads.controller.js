import { supabase } from "../config/supabaseClient.js";

// CREATE LEAD
export const createLead = async (req, res) => {
  const { name, email, message, chatbot_id, user_id } = req.body;

  try {
    const { error } = await supabase.from("leads").insert([
      {
        name,
        email,
        message,
        chatbot_id,
        user_id
      }
    ]);

    if (error) throw error;

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET LEADS
export const getLeads = async (req, res) => {
  const user_id = req.user.id;

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error });

  res.json(data);
};