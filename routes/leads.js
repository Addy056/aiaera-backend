// backend/routes/leads.js
import express from "express";
import {
  getLeads,
  addLead,
  deleteLead,
} from "../controllers/leadsController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ------------------------------------------------------
 * Leads Routes (all require authentication)
 * ------------------------------------------------------
 */

// GET /api/leads
// Fetch all leads for authenticated user
router.get("/", requireAuth, async (req, res, next) => {
  try {
    await getLeads(req, res);
  } catch (err) {
    console.error("❌ Error in GET /leads:", err.stack || err.message);
    next(err);
  }
});

// POST /api/leads
// Add a new lead for authenticated user
router.post("/", requireAuth, async (req, res, next) => {
  try {
    await addLead(req, res);
  } catch (err) {
    console.error("❌ Error in POST /leads:", err.stack || err.message);
    next(err);
  }
});

// DELETE /api/leads/:id
// Delete a lead for authenticated user
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    await deleteLead(req, res);
  } catch (err) {
    console.error("❌ Error in DELETE /leads/:id:", err.stack || err.message);
    next(err);
  }
});

/**
 * ------------------------------------------------------
 * Global Error Handling for Leads Routes
 * ------------------------------------------------------
 */
router.use((err, req, res, next) => {
  console.error("❌ Leads route unhandled error:", err.stack || err.message);
  res.status(500).json({
    error: "Internal server error in leads route",
    message: err.message || "Unexpected error",
  });
});

export default router;
