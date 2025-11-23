// backend/controllers/leadsController.js
import supabase from "../config/supabaseClient.js";

/* -------------------------------------------------------
 * UUID Validator
 * ------------------------------------------------------- */
const uuidV4Regex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/* -------------------------------------------------------
 * GET LEADS (with pagination)
 * ------------------------------------------------------- */
export const getLeads = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    let { page = 1, limit = 20 } = req.query;

    page = Math.max(parseInt(page), 1);
    limit = Math.min(Math.max(parseInt(limit), 5), 100);

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    console.log(`📥 Fetching leads: user=${userId}, page=${page}, limit=${limit}`);

    const { data, error, count } = await supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) {
      console.error("❌ Error loading leads:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to load leads" });
    }

    return res.json({
      success: true,
      leads: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error("❌ getLeads unexpected error:", err);
    next(err);
  }
};

/* -------------------------------------------------------
 * ADD LEAD (from dashboard OR public chatbot)
 * ------------------------------------------------------- */
export const addLead = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.body.user_id; // Support public leads too
    if (!userId) {
      return res.status(401).json({ success: false, error: "Missing user_id" });
    }

    const { name, email, message, chatbot_id } = req.body;

    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ success: false, error: "Name, email, and message are required" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid email format" });
    }

    // Prevent duplicate lead (same email within 24 hours)
    const { data: existing } = await supabase
      .from("leads")
      .select("id, created_at")
      .eq("email", email)
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const createdAt = new Date(existing.created_at);
      const now = new Date();
      const diffHours = (now - createdAt) / (1000 * 60 * 60);

      if (diffHours < 24) {
        return res.status(200).json({
          success: true,
          message: "Lead already submitted recently",
          lead_id: existing.id,
        });
      }
    }

    // Insert new lead
    const { data, error } = await supabase
      .from("leads")
      .insert([
        {
          user_id: userId,
          chatbot_id: chatbot_id || null,
          name,
          email,
          message,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ addLead error:", error);
      return res.status(500).json({ success: false, error: "Failed to save lead" });
    }

    return res.status(201).json({
      success: true,
      lead: data,
    });
  } catch (err) {
    console.error("❌ addLead unexpected error:", err);
    next(err);
  }
};

/* -------------------------------------------------------
 * DELETE LEAD
 * ------------------------------------------------------- */
export const deleteLead = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!uuidV4Regex.test(id)) {
      return res.status(400).json({ success: false, error: "Invalid lead ID" });
    }

    const { data, error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) {
      console.error("❌ deleteLead error:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to delete lead" });
    }

    if (!data || data.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Lead not found or not yours" });
    }

    return res.json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (err) {
    console.error("❌ deleteLead unexpected error:", err);
    next(err);
  }
};
