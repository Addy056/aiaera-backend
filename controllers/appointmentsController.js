// backend/controllers/appointmentsController.js

import supabase from "../config/supabaseClient.js";

// ----------------------------------------------------
// UUID Validator (secure + universal)
// ----------------------------------------------------
const isUUID = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );

// ----------------------------------------------------
// GET ALL APPOINTMENTS FOR USER
// ----------------------------------------------------
export const getAppointments = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, chatbot_id, customer_name, customer_email, calendly_event_link, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, appointments: data || [] });
  } catch (err) {
    console.error("❌ getAppointments error:", err);
    next(err);
  }
};

// ----------------------------------------------------
// GET SINGLE APPOINTMENT BY ID
// ----------------------------------------------------
export const getAppointmentById = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    if (!isUUID(id))
      return res
        .status(400)
        .json({ success: false, error: "Invalid appointment ID" });

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!data)
      return res
        .status(404)
        .json({ success: false, error: "Appointment not found" });

    res.json({ success: true, appointment: data });
  } catch (err) {
    console.error("❌ getAppointmentById error:", err);
    next(err);
  }
};

// ----------------------------------------------------
// CREATE APPOINTMENT
// ----------------------------------------------------
export const createAppointment = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { chatbot_id, customer_name, customer_email, calendly_event_link } =
      req.body;

    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    // Validate fields
    if (!chatbot_id || !customer_name || !customer_email || !calendly_event_link)
      return res.status(400).json({
        success: false,
        error:
          "chatbot_id, customer_name, customer_email and calendly_event_link are required",
      });

    if (!isUUID(chatbot_id))
      return res
        .status(400)
        .json({ success: false, error: "Invalid chatbot_id" });

    // Check chatbot belongs to user
    const { data: bot, error: botErr } = await supabase
      .from("chatbots")
      .select("id")
      .eq("id", chatbot_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (botErr) throw botErr;
    if (!bot)
      return res
        .status(403)
        .json({ success: false, error: "Chatbot does not belong to you" });

    // Insert appointment
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        user_id: userId,
        chatbot_id,
        customer_name,
        customer_email,
        calendly_event_link,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, appointment: data });
  } catch (err) {
    console.error("❌ createAppointment error:", err);
    next(err);
  }
};

// ----------------------------------------------------
// DELETE APPOINTMENT
// ----------------------------------------------------
export const deleteAppointment = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    if (!isUUID(id))
      return res.status(400).json({
        success: false,
        error: "Invalid appointment ID",
      });

    const { data, error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) throw error;

    if (!data?.length)
      return res
        .status(404)
        .json({ success: false, error: "Appointment not found" });

    res.json({
      success: true,
      message: "Appointment deleted successfully",
    });
  } catch (err) {
    console.error("❌ deleteAppointment error:", err);
    next(err);
  }
};

// ----------------------------------------------------
// UPDATE APPOINTMENT
// ----------------------------------------------------
export const updateAppointment = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    if (!isUUID(id))
      return res.status(400).json({
        success: false,
        error: "Invalid appointment ID",
      });

    const allowedFields = [
      "customer_name",
      "customer_email",
      "calendly_event_link",
      "chatbot_id",
    ];

    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0)
      return res.status(400).json({
        success: false,
        error: "No valid fields provided for update",
      });

    // If updating chatbot_id → verify ownership
    if (updates.chatbot_id && !isUUID(updates.chatbot_id))
      return res
        .status(400)
        .json({ success: false, error: "Invalid chatbot_id" });

    if (updates.chatbot_id) {
      const { data: bot, error: botErr } = await supabase
        .from("chatbots")
        .select("id")
        .eq("id", updates.chatbot_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (botErr) throw botErr;
      if (!bot)
        return res.status(403).json({
          success: false,
          error: "New chatbot_id does not belong to you",
        });
    }

    const { data, error } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, appointment: data });
  } catch (err) {
    console.error("❌ updateAppointment error:", err);
    next(err);
  }
};
