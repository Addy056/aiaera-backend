import { supabase } from "../config/supabaseClient.js";

/*
========================================
AUTH MIDDLEWARE
========================================
Verifies Supabase JWT token
and attaches authenticated
user to req.user
========================================
*/

export const authMiddleware = async (
  req,
  res,
  next
) => {
  try {
    /*
    ========================================
    GET AUTH HEADER
    ========================================
    */
    const authHeader =
      req.headers.authorization;

    /*
    ========================================
    VALIDATE HEADER
    ========================================
    */
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: "Authorization header missing",
      });
    }

    /*
    ========================================
    VALIDATE BEARER FORMAT
    ========================================
    */
    if (
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        error: "Invalid authorization format",
      });
    }

    /*
    ========================================
    EXTRACT TOKEN
    ========================================
    */
    const token =
      authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token missing",
      });
    }

    /*
    ========================================
    VERIFY USER
    ========================================
    */
    const {
      data,
      error,
    } = await supabase.auth.getUser(
      token
    );

    /*
    ========================================
    INVALID TOKEN
    ========================================
    */
    if (
      error ||
      !data?.user
    ) {
      return res.status(401).json({
        success: false,
        error:
          "Invalid or expired token",
      });
    }

    /*
    ========================================
    ATTACH USER
    ========================================
    */
    req.user = {
      id: data.user.id,
      email: data.user.email,
    };

    /*
    ========================================
    CONTINUE
    ========================================
    */
    next();

  } catch (err) {

    console.error(
      "AUTH MIDDLEWARE ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      error: "Authentication failed",
    });
  }
};