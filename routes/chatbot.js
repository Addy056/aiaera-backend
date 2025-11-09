import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createChatbot,
  getUserChatbots,
  updateChatbot,
  deleteChatbot,
  retrainChatbot,
  previewChat,
  publicChatbot,
} from "../controllers/chatbotController.js";

const router = express.Router();

/* ------------------------------
   Async handler wrapper
------------------------------ */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* ------------------------------
   🔹 Public chatbot route (for deployed widgets)
   Example: POST /api/chatbot/public/:id
------------------------------ */
router.post(
  "/public/:id",
  asyncHandler(async (req, res) => {
    await publicChatbot(req, res);
  })
);

/* ------------------------------
   🔹 Preview chatbot (Builder Preview)
   Example: POST /api/chatbot/preview
------------------------------ */
router.post("/preview", asyncHandler(previewChat));

/* ------------------------------
   🔒 Protected Routes (Require Auth)
------------------------------ */
router.use(requireAuth);

/* --- CRUD Routes --- */
router.post("/", asyncHandler(createChatbot));
router.get("/", asyncHandler(getUserChatbots));
router.put("/:id", asyncHandler(updateChatbot));
router.delete("/:id", asyncHandler(deleteChatbot));

/* --- Retrain Chatbot --- */
router.post(
  "/retrain",
  asyncHandler(async (req, res) => {
    if (req.user?.id) req.body.userId = req.user.id;
    await retrainChatbot(req, res);
  })
);

export default router;
