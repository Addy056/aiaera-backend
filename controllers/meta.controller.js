import {
  completeMetaOAuth,
  disconnectMetaIntegration,
  getMetaIntegrationStatus,
  getMetaOAuthUrl,
  syncMetaIntegration,
} from "../services/metaOAuth.service.js";

/*
========================================
ERROR RESPONSE
========================================
*/
const handleMetaError =
  (
    res,
    err,
    fallbackMessage
  ) => {

    console.error(
      "❌ META CONTROLLER ERROR:",
      err.details ||
        err.response?.data ||
        err.message ||
        err
    );

    return res
      .status(
        err.statusCode ||
          500
      )
      .json({
        success:
          false,

        error:
          err.message ||
          fallbackMessage,

        details:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : err.details || null,
      });
  };

/*
========================================
SAFE REDIRECT
========================================
*/
const getSafeRedirectUrl =
  (returnTo) => {

    if (!returnTo)
      return null;

    const fallbackOrigin =
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://aiaera.in",
      "https://www.aiaera.in",
      "https://aiaera-frontend.vercel.app",
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    const redirectUrl =
      new URL(
        returnTo,
        fallbackOrigin
      );

    const allowed =
      allowedOrigins.includes(
        redirectUrl.origin
      ) ||
      redirectUrl.hostname.endsWith(
        ".vercel.app"
      );

    if (!allowed)
      return null;

    return redirectUrl;
  };

/*
========================================
CONNECT URL
========================================
*/
export const getConnectUrl =
  async (
    req,
    res
  ) => {

    try {

      const {
        returnTo,
      } = req.query;

      const oauth =
        getMetaOAuthUrl({
          user_id:
            req.user.id,
          returnTo,
        });

      return res.json({
        success:
          true,

        url:
          oauth.url,
      });

    } catch (err) {

      return handleMetaError(
        res,
        err,
        "Failed to create Meta OAuth URL"
      );
    }
  };

/*
========================================
STATUS
========================================
*/
export const getMetaStatus =
  async (
    req,
    res
  ) => {

    try {

      const status =
        await getMetaIntegrationStatus({
          user_id:
            req.user.id,
        });

      return res.json({
        success:
          true,

        status,
      });

    } catch (err) {

      return handleMetaError(
        res,
        err,
        "Failed to fetch Meta integration status"
      );
    }
  };

/*
========================================
OAUTH CALLBACK
========================================
*/
export const handleOAuthCallback =
  async (
    req,
    res
  ) => {

    try {

      const {
        code,
        state,
        error,
        error_description,
        page_id,
      } = req.query;

      if (error) {

        return res
          .status(400)
          .json({
            success:
              false,
            error:
              error_description ||
              error,
          });
      }

      const result =
        await completeMetaOAuth({
          code,
          state,
          pageId:
            page_id,
        });

      if (result.returnTo) {

        const redirectUrl =
          getSafeRedirectUrl(
            result.returnTo
          );

        if (!redirectUrl) {

          return res.json({
            success:
              true,

            message:
              "Meta integration connected",

            page:
              result.page,

            instagram:
              result.instagram,

            subscribed:
              result.subscribed,
          });
        }

        redirectUrl.searchParams.set(
          "meta_connected",
          "true"
        );

        redirectUrl.searchParams.set(
          "facebook_page_id",
          result.page.id
        );

        if (result.instagram?.id) {

          redirectUrl.searchParams.set(
            "instagram_business_id",
            result.instagram.id
          );
        }

        return res.redirect(
          redirectUrl.toString()
        );
      }

      return res.json({
        success:
          true,

        message:
          "Meta integration connected",

        page:
          result.page,

        instagram:
          result.instagram,

        subscribed:
          result.subscribed,
      });

    } catch (err) {

      return handleMetaError(
        res,
        err,
        "Failed to complete Meta OAuth"
      );
    }
  };

/*
========================================
SYNC
========================================
*/
export const syncMeta =
  async (
    req,
    res
  ) => {

    try {

      const result =
        await syncMetaIntegration({
          user_id:
            req.user.id,
        });

      return res.json({
        success:
          true,

        message:
          "Meta integration synced",

        integration:
          result.integration,
      });

    } catch (err) {

      return handleMetaError(
        res,
        err,
        "Failed to sync Meta integration"
      );
    }
  };

/*
========================================
DISCONNECT
========================================
*/
export const disconnectMeta =
  async (
    req,
    res
  ) => {

    try {

      const integration =
        await disconnectMetaIntegration({
          user_id:
            req.user.id,
        });

      return res.json({
        success:
          true,

        message:
          "Meta integration disconnected",

        integration,
      });

    } catch (err) {

      return handleMetaError(
        res,
        err,
        "Failed to disconnect Meta integration"
      );
    }
  };
