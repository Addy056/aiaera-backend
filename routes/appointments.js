// backend/routes/appointments.js
import express from "express";
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  deleteAppointment,
  updateAppointment,
} from "../controllers/appointmentsController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireActiveSubscription } from "../middleware/subscriptionMiddleware.js";

const router = express.Router();

// -----------------------------------------------------
// 🔐 Protect all appointment routes 
// -----------------------------------------------------
router.use(requireAuth, requireActiveSubscription);

// -----------------------------------------------------
// 🔍 UUID Validator (accepts ALL UUID versions)
// -----------------------------------------------------
router.param("id", (req, res, next, id) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    return res.status(400).json({ message: "Invalid appointment ID" });
  }
  next();
});

// -----------------------------------------------------
// 📌 Appointment Routes
// -----------------------------------------------------

// Get all appointments
router.get("/", getAppointments);

// Create a new appointment
router.post("/", createAppointment);

// Get single appointment
router.get("/:id", getAppointmentById);

// Update appointment
router.patch("/:id", updateAppointment);

// Delete appointment
router.delete("/:id", deleteAppointment);

export default router;
