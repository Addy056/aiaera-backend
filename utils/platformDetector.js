/*
========================================
DETECT META PLATFORM
========================================
*/
export const detectPlatform =
  (body) => {

    const object =
      body.object;

    if (
      object === "whatsapp_business_account"
    ) {

      return "whatsapp";
    }

    if (
      object === "page"
    ) {

      const messaging =
        body.entry?.[0]
          ?.messaging?.[0];

      if (
        messaging?.message &&
        messaging?.sender
      ) {

        return "facebook";
      }
    }

    if (
      object === "instagram"
    ) {

      return "instagram";
    }

    return "unknown";
  };