import { supabase } from "../config/supabaseClient.js";

// CREATE
export const createAppointment = async (req, res) => {
  const {
    customer_name,
    customer_email,
    chatbot_id,
    user_id,
    calendly_event_link
  } = req.body;

  try {
    const { error } = await supabase.from("appointments").insert([
      {
        customer_name,
        customer_email,
        chatbot_id,
        user_id,
        calendly_event_link
      }
    ]);

    if (error) throw error;

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET
export const getAppointments = async (req, res) => {
const userId = req.user.id;
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error });

  res.json(data);
};