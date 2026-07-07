import express from "express";

import {
  disconnectMeta,
  getConnectUrl,
  getMetaStatus,
  handleOAuthCallback,
  syncMeta,
} from "../controllers/meta.controller.js";

import {
  authMiddleware,
} from "../middleware/auth.js";

import {
  requireSubscription,
} from "../middleware/subscription.js";

const router =
  express.Router();

/*
========================================
META OAUTH CALLBACK
========================================
Public endpoint used by Meta redirect.
State is signed and contains user id.
========================================
*/
router.get(
  "/oauth/callback",
  handleOAuthCallback
);

/*
========================================
CONNECT URL
========================================
Authenticated owner starts OAuth.
========================================
*/
router.get(
  "/connect",
  authMiddleware,
  requireSubscription,
  getConnectUrl
);

/*
========================================
META STATUS
========================================
*/
router.get(
  "/status",
  authMiddleware,
  getMetaStatus
);

/*
========================================
SYNC META DATA
========================================
*/
router.post(
  "/sync",
  authMiddleware,
  requireSubscription,
  syncMeta
);

/*
========================================
DISCONNECT META
========================================
*/
router.delete(
  "/disconnect",
  authMiddleware,
  requireSubscription,
  disconnectMeta
);

export default router;
