// backend/routes/leads.js
import express from "express";
import {
  getLeads,
  addLead,
  deleteLead,
} from "../controllers/leadsController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireActiveSubscription } from "../middleware/subscriptionMiddleware.js";

const router = express.Router();

/* ------------------------------------------------------
   Async wrapper to prevent repeating try/catch
------------------------------------------------------ */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* ------------------------------------------------------
   Validate Lead ID (UUID v4)
------------------------------------------------------ */
router.param("id", (req, res, next, id) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      error: "Invalid lead ID format",
    });
  }

  next();
});

/* ------------------------------------------------------
   Protect ALL lead routes
------------------------------------------------------ */
router.use(requireAuth, requireActiveSubscription);

/* ------------------------------------------------------
   ROUTES
------------------------------------------------------ */

// GET /api/leads → Fetch all leads
router.get(
  "/",
  asyncHandler(async (req, res) => {
    return getLeads(req, res);
  })
);

// POST /api/leads → Add a new lead
router.post(
  "/",
  asyncHandler(async (req, res) => {
    return addLead(req, res);
  })
);

// DELETE /api/leads/:id → Delete a lead
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    return deleteLead(req, res);
  })
);

/* ------------------------------------------------------
   ERROR HANDLER (for Leads Router only)
------------------------------------------------------ */
router.use((err, req, res, next) => {
  console.error("❌ Leads Route Error:", err.stack || err.message);

  res.status(err.statusCode || 500).json({
    success: false,
    error: "Internal server error in leads route",
    message: err.message || "Unexpected error",
  });
});

export default router;
