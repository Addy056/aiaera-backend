import supabase from '../config/supabaseClient.js';

/**
 * Get all leads for the authenticated user (with pagination)
 */
export const getLeads = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase error fetching leads:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch leads' });
    }

    res.json({
      success: true,
      total: count,
      page: Number(page),
      limit: Number(limit),
      leads: data || [],
    });
  } catch (err) {
    console.error('Unexpected error in getLeads:', err);
    next(err);
  }
};

/**
 * Add a new lead
 */
export const addLead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Name, email, and message are required' });
    }

    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([{ user_id: userId, name, email, message }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error inserting lead:', error);
      return res.status(500).json({ success: false, error: 'Failed to add lead' });
    }

    res.status(201).json({ success: true, lead: data });
  } catch (err) {
    console.error('Unexpected error in addLead:', err);
    next(err);
  }
};

/**
 * Delete a lead
 */
export const deleteLead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Validate UUID format
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidV4Regex.test(id)) {
      return res.status(400).json({ success: false, error: 'Invalid lead ID' });
    }

    const { error, count } = await supabase
      .from('leads')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase error deleting lead:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete lead' });
    }

    if (count === 0) {
      return res.status(404).json({ success: false, error: 'Lead not found or not yours' });
    }

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    console.error('Unexpected error in deleteLead:', err);
    next(err);
  }
};
