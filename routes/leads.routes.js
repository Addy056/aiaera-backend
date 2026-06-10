import express from "express";

import {
  createLead,
  getLeads,
  deleteLead,
  exportLeadsCSV,
  getLeadStats,
} from "../controllers/leads.controller.js";

import { authMiddleware } from "../middleware/auth.js";

import { checkSubscription } from "../middleware/subscription.js";

const router = express.Router();

/*
========================================
PUBLIC ROUTES
========================================
*/

/*
========================================
CREATE LEAD
========================================
Used by:
- Website chatbot
- Public chatbot
- WhatsApp automation
- Facebook automation
- Instagram automation
========================================
*/
router.post("/", createLead);

/*
========================================
HEALTH CHECK
========================================
*/
router.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Leads routes working ✅",
    timestamp: new Date().toISOString(),
  });
});

/*
========================================
DEBUG ROUTES
========================================
*/
router.get("/debug/routes", (req, res) => {
  return res.status(200).json({
    success: true,
    routes: {
      create: "POST /api/leads",
      getAll: "GET /api/leads",
      delete: "DELETE /api/leads/:id",
      export: "GET /api/leads/export/csv",
      stats: "GET /api/leads/stats",
      health: "GET /api/leads/health",
    },
  });
});

/*
========================================
PROTECTED ROUTES
========================================
Requires Authentication
========================================
*/

/*
========================================
GET ALL LEADS
========================================
Dashboard page
========================================
*/
router.get(
  "/",
  authMiddleware,
  getLeads
);

/*
========================================
LEAD STATS
========================================
Returns:
- total leads
- emails collected
- messages collected
- phones collected
========================================
*/
router.get(
  "/stats",
  authMiddleware,
  getLeadStats
);

/*
========================================
EXPORT CSV
========================================
Requires Active Subscription
========================================
*/
router.get(
  "/export/csv",
  authMiddleware,
  checkSubscription,
  exportLeadsCSV
);

/*
========================================
DELETE LEAD
========================================
Requires Active Subscription
========================================
*/
router.delete(
  "/:id",
  authMiddleware,
  checkSubscription,
  deleteLead
);

export default router;