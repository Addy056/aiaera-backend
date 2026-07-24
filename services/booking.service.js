/*
========================================
BOOKING SERVICE
========================================
*/

const BOOKING_KEYWORDS = [
  "book",
  "booking",
  "book a meeting",
  "book a call",
  "book an appointment",
  "appointment",
  "meeting",
  "schedule",
  "reschedule",
  "demo",
  "demo call",
  "consultation",
  "consult",
  "consulting",
  "call",
  "video call",
  "phone call",
  "google meet",
  "meet",
  "zoom",
  "teams",
  "microsoft teams",
  "calendar",
  "calendly",
  "reserve",
  "reservation",
  "slot",
  "time slot",
  "available time",
  "availability",
  "speak with",
  "talk to",
  "connect with",
];

/*
========================================
NEGATIVE BOOKING PHRASES
========================================
*/

const NEGATIVE_BOOKING_PHRASES = [
  "don't book",
  "do not book",
  "dont book",
  "no booking",
  "no appointment",
  "don't schedule",
  "do not schedule",
  "dont schedule",
];

/*
========================================
FORMAT PROVIDER NAME
========================================
*/

const formatProvider = (provider = "") => {
  const value = provider.trim().toLowerCase();

  const providers = {
    calendly: "Calendly",
    zoom: "Zoom",
    "google meet": "Google Meet",
    meet: "Google Meet",
    teams: "Microsoft Teams",
    "microsoft teams": "Microsoft Teams",
  };

  return (
    providers[value] ||
    provider.trim() ||
    "our booking platform"
  );
};

/*
========================================
VALIDATE URL
========================================
*/

const isValidUrl = (url = "") => {
  try {
    new URL(url.trim());
    return true;
  } catch {
    return false;
  }
};

/*
========================================
CHECK IF USER WANTS TO BOOK
========================================
*/

export const wantsBooking = (message = "") => {
  const text = String(message)
    .toLowerCase()
    .trim();

  if (!text) {
    return false;
  }

  const hasNegativePhrase =
    NEGATIVE_BOOKING_PHRASES.some((phrase) =>
      text.includes(phrase)
    );

  if (hasNegativePhrase) {
    return false;
  }

  return BOOKING_KEYWORDS.some((keyword) =>
    text.includes(keyword)
  );
};

/*
========================================
GET BOOKING RESPONSE
========================================
*/

export const getBookingResponse = ({
  meetingProvider = "",
  meetingLink = "",
}) => {
  const provider =
    formatProvider(meetingProvider);

  const link = meetingLink.trim();

  if (!link || !isValidUrl(link)) {
    return {
      available: false,
      message:
        "I'd be happy to help you schedule a meeting. Unfortunately, online booking is not available at the moment. Please contact the business directly and we'll be happy to assist you.",
    };
  }

  return {
    available: true,
    message: `I'd be happy to help you schedule a meeting.

You can book a convenient time using ${provider}:

${link}

If you have any questions before booking, feel free to ask. I'm happy to help.`,
  };
};

/*
========================================
SHOULD OFFER BOOKING
========================================
*/

export const shouldOfferBooking = ({
  intent = "general",
}) => {
  return [
    "booking",
    "lead",
    "consultation",
    "demo",
    "meeting",
  ].includes(
    String(intent).toLowerCase()
  );
};