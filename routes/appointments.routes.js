import express from "express";

import {

  createAppointment,

  getAppointments,

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
Accessible without auth
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
Requires:
- Authentication
========================================
*/

/*
========================================
GET ALL APPOINTMENTS
========================================
Dashboard page
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
Returns:
- total appointments
- this month
- booked meetings
========================================
*/
router.get(
  "/stats",
  authMiddleware,
  getAppointmentStats
);

/*
========================================
DELETE APPOINTMENT
========================================
Requires active subscription
========================================
*/
router.delete(
  "/:id",
  authMiddleware,
  checkSubscription,
  deleteAppointment
);

export default router;