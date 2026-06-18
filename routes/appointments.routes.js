import express from "express";

import {

  createAppointment,

  getAppointments,

  updateAppointmentStatus,

  deleteAppointment,

  getAppointmentStats,

} from "../controllers/appointments.controller.js";

import {
  authMiddleware,
} from "../middleware/auth.js";

import {
  checkSubscription,
} from "../middleware/subscription.js";

const router =
  express.Router();

/*
========================================
PUBLIC ROUTES
========================================
*/

/*
========================================
CREATE APPOINTMENT
========================================
Used by:
- Website chatbot
- Public chatbot
- WhatsApp automation
- Facebook automation
- Instagram automation
========================================
*/
router.post(
  "/",
  createAppointment
);

/*
========================================
HEALTH CHECK
========================================
*/
router.get(
  "/health",
  (req, res) => {

    return res.status(200).json({

      success: true,

      message:
        "Appointments routes working ✅",

      timestamp:
        new Date(),
    });
  }
);

/*
========================================
DEBUG ROUTES
========================================
*/
router.get(
  "/debug/routes",
  (req, res) => {

    return res.status(200).json({

      success: true,

      routes: {

        create:
          "POST /api/appointments",

        getAll:
          "GET /api/appointments",

        updateStatus:
          "PATCH /api/appointments/:id/status",

        delete:
          "DELETE /api/appointments/:id",

        stats:
          "GET /api/appointments/stats",
      },
    });
  }
);

/*
========================================
PROTECTED ROUTES
========================================
Requires Authentication
========================================
*/

/*
========================================
GET ALL APPOINTMENTS
========================================
*/
router.get(
  "/",
  authMiddleware,
  getAppointments
);

/*
========================================
APPOINTMENT STATS
========================================
*/
router.get(
  "/stats",
  authMiddleware,
  getAppointmentStats
);

/*
========================================
UPDATE APPOINTMENT STATUS
========================================
Statuses:
- pending
- accepted
- rejected
- completed
========================================
*/
router.patch(
  "/:id/status",
  authMiddleware,
  checkSubscription,
  updateAppointmentStatus
);

/*
========================================
DELETE APPOINTMENT
========================================
*/
router.delete(
  "/:id",
  authMiddleware,
  checkSubscription,
  deleteAppointment
);

export default router;