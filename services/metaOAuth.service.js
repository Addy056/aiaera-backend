import axios from "axios";
import crypto from "crypto";

import { supabase }
  from "../config/supabaseClient.js";

/*
========================================
META CONFIG
========================================
*/
const META_GRAPH_VERSION =
  process.env.META_GRAPH_VERSION ||
  "v19.0";

const META_GRAPH_BASE_URL =
  `https://graph.facebook.com/${META_GRAPH_VERSION}`;

const META_DIALOG_URL =
  `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`;

const META_APP_ID =
  process.env.META_APP_ID ||
  process.env.FACEBOOK_APP_ID;

const META_APP_SECRET =
  process.env.META_APP_SECRET ||
  process.env.FACEBOOK_APP_SECRET;

const META_REDIRECT_URI =
  process.env.META_REDIRECT_URI ||
  process.env.FACEBOOK_REDIRECT_URI;

const META_STATE_SECRET =
  process.env.META_STATE_SECRET ||
  META_APP_SECRET;

const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "pages_messaging",
  "instagram_basic",
  "instagram_manage_messages",
  "business_management",
];

const STATE_TTL_MS =
  10 * 60 * 1000;

/*
========================================
ERROR HELPERS
========================================
*/
class MetaOAuthError extends Error {

  constructor(
    message,
    statusCode = 500,
    details = null
  ) {

    super(message);

    this.name =
      "MetaOAuthError";

    this.statusCode =
      statusCode;

    this.details =
      details;
  }
}

const assertMetaConfig =
  () => {

    const missing = [];

    if (!META_APP_ID)
      missing.push("META_APP_ID");

    if (!META_APP_SECRET)
      missing.push("META_APP_SECRET");

    if (!META_REDIRECT_URI)
      missing.push("META_REDIRECT_URI");

    if (!META_STATE_SECRET)
      missing.push("META_STATE_SECRET");

    if (missing.length) {

      throw new MetaOAuthError(
        `Missing Meta OAuth config: ${missing.join(", ")}`,
        500
      );
    }
  };

const getMetaError =
  (err) => {

    return err.response?.data?.error ||
      err.response?.data ||
      err.message;
  };

const logMeta =
  (
    label,
    data = {}
  ) => {

    console.log(
      "========================================"
    );
    console.log(
      `META OAUTH: ${label}`
    );
    console.log(
      JSON.stringify(
        data,
        null,
        2
      )
    );
    console.log(
      "========================================"
    );
  };

/*
========================================
SIGNED STATE
========================================
*/
const base64UrlEncode =
  (value) =>
    Buffer
      .from(value)
      .toString("base64url");

const signStatePayload =
  (payload) =>
    crypto
      .createHmac(
        "sha256",
        META_STATE_SECRET
      )
      .update(payload)
      .digest("base64url");

const createSignedState =
  ({
    user_id,
    returnTo,
  }) => {

    const payload =
      base64UrlEncode(
        JSON.stringify({
          user_id,
          returnTo:
            returnTo || null,
          nonce:
            crypto
              .randomBytes(16)
              .toString("hex"),
          issuedAt:
            Date.now(),
        })
      );

    const signature =
      signStatePayload(
        payload
      );

    return `${payload}.${signature}`;
  };

const verifySignedState =
  (state) => {

    if (!state) {

      throw new MetaOAuthError(
        "OAuth state is missing",
        400
      );
    }

    const [
      payload,
      signature,
    ] = state.split(".");

    if (
      !payload ||
      !signature
    ) {

      throw new MetaOAuthError(
        "OAuth state is invalid",
        400
      );
    }

    const expectedSignature =
      signStatePayload(
        payload
      );

    if (
      signature.length !==
      expectedSignature.length
    ) {

      throw new MetaOAuthError(
        "OAuth state signature is invalid",
        400
      );
    }

    const valid =
      crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

    if (!valid) {

      throw new MetaOAuthError(
        "OAuth state signature is invalid",
        400
      );
    }

    let data;

    try {

      data =
        JSON.parse(
          Buffer
            .from(
              payload,
              "base64url"
            )
            .toString("utf8")
        );

    } catch (err) {

      throw new MetaOAuthError(
        "OAuth state payload is invalid",
        400
      );
    }

    if (
      Date.now() -
        Number(data.issuedAt) >
      STATE_TTL_MS
    ) {

      throw new MetaOAuthError(
        "OAuth state expired",
        400
      );
    }

    return data;
  };

/*
========================================
STATUS
========================================
*/
export const getMetaIntegrationStatus =
  async ({
    user_id,
  }) => {

    const {
      data,
      error,
    } =
      await supabase
        .from("user_integrations")
        .select(`
          facebook_page_id,
          facebook_page_access_token,
          facebook_enabled,
          instagram_business_id,
          instagram_access_token,
          instagram_enabled,
          updated_at
        `)
        .eq(
          "user_id",
          user_id
        )
        .maybeSingle();

    if (error) {

      throw new MetaOAuthError(
        "Failed to load Meta integration status",
        500,
        error.message
      );
    }

    return {
      connected:
        Boolean(
          data?.facebook_page_id &&
          data?.facebook_page_access_token
        ),

      facebook: {
        connected:
          Boolean(
            data?.facebook_page_id &&
            data?.facebook_page_access_token
          ),

        enabled:
          Boolean(
            data?.facebook_enabled
          ),

        page_id:
          data?.facebook_page_id ||
          null,

        has_token:
          Boolean(
            data?.facebook_page_access_token
          ),
      },

      instagram: {
        connected:
          Boolean(
            data?.instagram_business_id &&
            data?.instagram_access_token
          ),

        enabled:
          Boolean(
            data?.instagram_enabled
          ),

        business_id:
          data?.instagram_business_id ||
          null,

        has_token:
          Boolean(
            data?.instagram_access_token
          ),
      },

      updated_at:
        data?.updated_at ||
        null,
    };
  };

/*
========================================
GRAPH API
========================================
*/
const graphGet =
  async (
    path,
    params = {}
  ) => {

    try {

      const response =
        await axios.get(
          `${META_GRAPH_BASE_URL}${path}`,
          {
            params,
          }
        );

      return response.data;

    } catch (err) {

      throw new MetaOAuthError(
        "Meta Graph API request failed",
        err.response?.status || 500,
        getMetaError(err)
      );
    }
  };

const graphPost =
  async (
    path,
    params = {}
  ) => {

    try {

      const response =
        await axios.post(
          `${META_GRAPH_BASE_URL}${path}`,
          null,
          {
            params,
          }
        );

      return response.data;

    } catch (err) {

      throw new MetaOAuthError(
        "Meta Graph API request failed",
        err.response?.status || 500,
        getMetaError(err)
      );
    }
  };

/*
========================================
OAUTH URL
========================================
*/
export const getMetaOAuthUrl =
  ({
    user_id,
    returnTo,
  }) => {

    assertMetaConfig();

    const state =
      createSignedState({
        user_id,
        returnTo,
      });

    const params =
      new URLSearchParams({
        client_id:
          META_APP_ID,
        redirect_uri:
          META_REDIRECT_URI,
        response_type:
          "code",
        auth_type:
          "rerequest",
        state,
        scope:
          META_SCOPES.join(","),
      });

    return {
      url:
        `${META_DIALOG_URL}?${params.toString()}`,
      state,
    };
  };

/*
========================================
TOKEN EXCHANGE
========================================
*/
const exchangeCodeForShortLivedToken =
  async (code) => {

    return await graphGet(
      "/oauth/access_token",
      {
        client_id:
          META_APP_ID,
        client_secret:
          META_APP_SECRET,
        redirect_uri:
          META_REDIRECT_URI,
        code,
      }
    );
  };

const exchangeForLongLivedToken =
  async (accessToken) => {

    return await graphGet(
      "/oauth/access_token",
      {
        grant_type:
          "fb_exchange_token",
        client_id:
          META_APP_ID,
        client_secret:
          META_APP_SECRET,
        fb_exchange_token:
          accessToken,
      }
    );
  };

/*
========================================
PAGE DISCOVERY
========================================
*/
const discoverPages =
  async (userAccessToken) => {

    const response =
      await graphGet(
        "/me/accounts",
        {
          access_token:
            userAccessToken,
          fields:
            "id,name,access_token,instagram_business_account{id,username,name},tasks",
          limit:
            100,
        }
      );

    return response.data || [];
  };

const choosePage =
  (
    pages,
    preferredPageId
  ) => {

    if (!pages.length) {

      throw new MetaOAuthError(
        "No Facebook Pages were found for this account",
        400
      );
    }

    if (preferredPageId) {

      const page =
        pages.find(
          (item) =>
            item.id ===
            preferredPageId
        );

      if (!page) {

        throw new MetaOAuthError(
          "Selected Facebook Page was not found on this account",
          400
        );
      }

      return page;
    }

    return pages[0];
  };

const subscribePageToWebhooks =
  async ({
    pageId,
    pageAccessToken,
  }) => {

    try {

      await graphPost(
        `/${pageId}/subscribed_apps`,
        {
          subscribed_fields:
            "messages,messaging_postbacks,message_deliveries,message_reads",
          access_token:
            pageAccessToken,
        }
      );

      return true;

    } catch (err) {

      console.error(
        "❌ META PAGE SUBSCRIBE ERROR:",
        err.details ||
          err.message
      );

      return false;
    }
  };

/*
========================================
STORE INTEGRATION
========================================
*/
const upsertMetaIntegration =
  async ({
    user_id,
    page,
    instagramBusinessAccount,
    longLivedToken,
  }) => {

    const {
      data: existingIntegration,
      error: existingError,
    } =
      await supabase
        .from("user_integrations")
        .select("*")
        .eq(
          "user_id",
          user_id
        )
        .maybeSingle();

    if (existingError) {

      throw new MetaOAuthError(
        "Failed to load existing integration",
        500,
        existingError.message
      );
    }

    const payload = {
      user_id,

      whatsapp_access_token:
        existingIntegration
          ?.whatsapp_access_token ||
        null,

      whatsapp_phone_id:
        existingIntegration
          ?.whatsapp_phone_id ||
        null,

      whatsapp_enabled:
        existingIntegration
          ?.whatsapp_enabled ||
        false,

      facebook_page_id:
        page.id,

      facebook_page_access_token:
        page.access_token,

      facebook_enabled:
        true,

      instagram_business_id:
        instagramBusinessAccount?.id ||
        null,

      instagram_access_token:
        instagramBusinessAccount?.id
          ? page.access_token
          : null,

      instagram_enabled:
        Boolean(
          instagramBusinessAccount?.id
        ),

      meeting_provider:
        existingIntegration
          ?.meeting_provider ||
        "calendly",

      meeting_link:
        existingIntegration
          ?.meeting_link ||
        null,

      maps_link:
        existingIntegration
          ?.maps_link ||
        null,

      updated_at:
        new Date().toISOString(),
    };

    const {
      data,
      error,
    } =
      await supabase
        .from("user_integrations")
        .upsert(
          payload,
          {
            onConflict:
              "user_id",
          }
        )
        .select()
        .maybeSingle();

    if (error) {

      throw new MetaOAuthError(
        "Failed to save Meta integration",
        500,
        error.message
      );
    }

    logMeta(
      "INTEGRATION SAVED",
      {
        user_id,
        page_id:
          page.id,
        instagram_business_id:
          instagramBusinessAccount?.id ||
          null,
        long_lived_user_token_received:
          Boolean(
            longLivedToken?.access_token
          ),
      }
    );

    return data;
  };

/*
========================================
COMPLETE CALLBACK
========================================
*/
export const completeMetaOAuth =
  async ({
    code,
    state,
    pageId,
  }) => {

    assertMetaConfig();

    if (!code) {

      throw new MetaOAuthError(
        "OAuth code is missing",
        400
      );
    }

    const verifiedState =
      verifySignedState(
        state
      );

    logMeta(
      "CALLBACK START",
      {
        user_id:
          verifiedState.user_id,
        selected_page_id:
          pageId || null,
      }
    );

    const shortLivedToken =
      await exchangeCodeForShortLivedToken(
        code
      );

    const longLivedToken =
      await exchangeForLongLivedToken(
        shortLivedToken.access_token
      );

    const pages =
      await discoverPages(
        longLivedToken.access_token
      );

    const page =
      choosePage(
        pages,
        pageId
      );

    if (!page.access_token) {

      throw new MetaOAuthError(
        "Selected Page did not return a Page access token",
        400
      );
    }

    const instagramBusinessAccount =
      page.instagram_business_account ||
      null;

    const subscribed =
      await subscribePageToWebhooks({
        pageId:
          page.id,
        pageAccessToken:
          page.access_token,
      });

    const integration =
      await upsertMetaIntegration({
        user_id:
          verifiedState.user_id,
        page,
        instagramBusinessAccount,
        longLivedToken,
      });

    return {
      integration,
      page: {
        id:
          page.id,
        name:
          page.name,
      },
      instagram: instagramBusinessAccount
        ? {
            id:
              instagramBusinessAccount.id,
            username:
              instagramBusinessAccount.username ||
              null,
          }
        : null,
      subscribed,
      returnTo:
        verifiedState.returnTo ||
        null,
    };
  };

/*
========================================
SYNC CURRENT USER
========================================
*/
export const syncMetaIntegration =
  async ({
    user_id,
  }) => {

    const {
      data: integration,
      error,
    } =
      await supabase
        .from("user_integrations")
        .select("*")
        .eq(
          "user_id",
          user_id
        )
        .maybeSingle();

    if (error) {

      throw new MetaOAuthError(
        "Failed to load Meta integration",
        500,
        error.message
      );
    }

    if (
      !integration?.facebook_page_id ||
      !integration
        ?.facebook_page_access_token
    ) {

      throw new MetaOAuthError(
        "Meta integration is not connected",
        404
      );
    }

    const page =
      await graphGet(
        `/${integration.facebook_page_id}`,
        {
          access_token:
            integration
              .facebook_page_access_token,
          fields:
            "id,name,instagram_business_account{id,username,name}",
        }
      );

    const updateData = {
      instagram_business_id:
        page.instagram_business_account
          ?.id || null,

      instagram_access_token:
        page.instagram_business_account
          ?.id
          ? integration
              .facebook_page_access_token
          : null,

      instagram_enabled:
        Boolean(
          page.instagram_business_account
            ?.id
        ),

      updated_at:
        new Date().toISOString(),
    };

    const {
      data,
      error: updateError,
    } =
      await supabase
        .from("user_integrations")
        .update(updateData)
        .eq(
          "user_id",
          user_id
        )
        .select()
        .maybeSingle();

    if (updateError) {

      throw new MetaOAuthError(
        "Failed to update Meta integration",
        500,
        updateError.message
      );
    }

    return {
      integration:
        data,
      page,
    };
  };

/*
========================================
DISCONNECT
========================================
*/
export const disconnectMetaIntegration =
  async ({
    user_id,
  }) => {

    const {
      data,
      error,
    } =
      await supabase
        .from("user_integrations")
        .update({
          facebook_page_id:
            null,
          facebook_page_access_token:
            null,
          facebook_enabled:
            false,
          instagram_business_id:
            null,
          instagram_access_token:
            null,
          instagram_enabled:
            false,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "user_id",
          user_id
        )
        .select()
        .maybeSingle();

    if (error) {

      throw new MetaOAuthError(
        "Failed to disconnect Meta integration",
        500,
        error.message
      );
    }

    return data;
  };

export { MetaOAuthError };
