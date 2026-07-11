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
FRONTEND REDIRECT
========================================
*/
const createFrontendRedirect = (
  status,
  options = {}
) => {

  const frontend =
    process.env.FRONTEND_URL ||
    "http://localhost:5173";

 const defaultRedirect =
  new URL(
    "/app/integrations",
    frontend
  );

const redirectUrl =
  options.returnTo
    ? (
        getSafeRedirectUrl(
          options.returnTo
        ) || defaultRedirect
      )
    : defaultRedirect;
  redirectUrl.searchParams.set(
    "meta_status",
    status
  );

  if (options.facebookPageId) {

    redirectUrl.searchParams.set(
      "facebook_page_id",
      options.facebookPageId
    );

  }

  if (options.instagramBusinessId) {

    redirectUrl.searchParams.set(
      "instagram_business_id",
      options.instagramBusinessId
    );

  }

  if (options.reason) {

    redirectUrl.searchParams.set(
      "reason",
      options.reason
    );

  }

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

  console.error(
    "Meta OAuth Error:",
    error,
    error_description
  );

  const redirectUrl =
    createFrontendRedirect(
      "cancelled",
      {
        reason:
          error_description ||
          error,
      }
    );

  return res.redirect(
    redirectUrl.toString()
  );

}
      const result =
        await completeMetaOAuth({
          code,
          state,
          pageId:
            page_id,
        });

      const redirectUrl =
  createFrontendRedirect(
    "success",
    {
      returnTo:
        result.returnTo,

      facebookPageId:
        result.page.id,

      instagramBusinessId:
        result.instagram?.id,

      reason:
        result.instagram
          ? undefined
          : "instagram_not_connected",
    }
  );

return res.redirect(
  redirectUrl.toString()
);

      
} catch (err) {

  console.error(
    "Meta OAuth Callback Failed:",
    err
  );

  const redirectUrl =
    createFrontendRedirect(
      "error",
      {
        reason:
          err.message ||
          "oauth_failed",
      }
    );

  return res.redirect(
    redirectUrl.toString()
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
