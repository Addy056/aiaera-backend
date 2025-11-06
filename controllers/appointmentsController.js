import supabase from "../config/supabaseClient.js"; // ✅ correct

// Centralized UUID validator
const uuidV4Regex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Get all appointments for the authenticated user
 */
export const getAppointments = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase error (getAppointments):", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to fetch appointments" });
    }

    return res.json({ success: true, appointments: data || [] });
  } catch (err) {
    console.error("❌ Unexpected error (getAppointments):", err);
    next(err);
  }
};

/**
 * Get single appointment by id (must belong to user)
 */
export const getAppointmentById = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const userId = req.user.id;
    const { id } = req.params;

    if (!uuidV4Regex.test(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid appointment ID" });
    }

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116" || error.message.includes("0 rows")) {
        return res
          .status(404)
          .json({ success: false, error: "Appointment not found" });
      }
      console.error("❌ Supabase error (getAppointmentById):", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to fetch appointment" });
    }

    return res.json({ success: true, appointment: data });
  } catch (err) {
    console.error("❌ Unexpected error (getAppointmentById):", err);
    next(err);
  }
};

/**
 * Create a new appointment
 * expected body: { chatbot_id, customer_name, customer_email, calendly_event_link }
 */
export const createAppointment = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const userId = req.user.id;
    const { chatbot_id, customer_name, customer_email, calendly_event_link } =
      req.body;

    if (!chatbot_id || !customer_name || !customer_email || !calendly_event_link) {
      return res.status(400).json({
        success: false,
        error:
          "chatbot_id, customer_name, customer_email and calendly_event_link are required",
      });
    }

    const payload = {
      user_id: userId,
      chatbot_id,
      customer_name,
      customer_email,
      calendly_event_link,
    };

    const { data, error } = await supabase
      .from("appointments")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase error (createAppointment):", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to create appointment" });
    }

    return res.status(201).json({ success: true, appointment: data });
  } catch (err) {
    console.error("❌ Unexpected error (createAppointment):", err);
    next(err);
  }
};

/**
 * Delete an appointment (only the owner can delete)
 */
export const deleteAppointment = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const userId = req.user.id;
    const { id } = req.params;

    if (!uuidV4Regex.test(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid appointment ID" });
    }

    const { data, error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) {
      console.error("❌ Supabase error (deleteAppointment):", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to delete appointment" });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Appointment not found or not allowed",
      });
    }

    return res.json({
      success: true,
      message: "Appointment deleted successfully",
    });
  } catch (err) {
    console.error("❌ Unexpected error (deleteAppointment):", err);
    next(err);
  }
};

/**
 * Update appointment (partial update allowed)
 * body may include: customer_name, customer_email, calendly_event_link, chatbot_id
 */
export const updateAppointment = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const userId = req.user.id;
    const { id } = req.params;
    const updates = {};

    const allowed = [
      "customer_name",
      "customer_email",
      "calendly_event_link",
      "chatbot_id",
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No valid fields provided for update" });
    }

    if (!uuidV4Regex.test(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid appointment ID" });
    }

    const { data, error } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase error (updateAppointment):", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to update appointment" });
    }

    return res.json({ success: true, appointment: data });
  } catch (err) {
    console.error("❌ Unexpected error (updateAppointment):", err);
    next(err);
  }
};
