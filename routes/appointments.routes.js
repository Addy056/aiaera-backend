import express from "express";
import {
  createAppointment,
  getAppointments
} from "../controllers/appointments.controller.js";

import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Create appointment (from chatbot)
router.post("/", createAppointment);

// Get all appointments
router.get("/", authMiddleware, getAppointments);

export default router;