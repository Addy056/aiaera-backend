/*
========================================
LEAD SERVICE
========================================
*/

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_REGEX =
  /^\+?[0-9\s\-()]{7,20}$/;

const LEAD_KEYWORDS = [
  "quote",
  "pricing",
  "price",
  "buy",
  "purchase",
  "demo",
  "meeting",
  "appointment",
  "consultation",
  "contact",
  "call me",
  "interested",
  "service",
  "services",
  "need",
  "help",
];

/*
========================================
MATCH KEYWORD
========================================
*/

const matchesKeyword = (
  text,
  keyword
) => {
  if (keyword.includes(" ")) {
    return text.includes(keyword);
  }

  return new RegExp(
    `\\b${keyword}\\b`,
    "i"
  ).test(text);
};

/*
========================================
CHECK IF USER IS A LEAD
========================================
*/

export const isLeadIntent = (
  message = ""
) => {

  const text = String(message)
    .trim()
    .toLowerCase();

  if (!text) {
    return false;
  }

  return LEAD_KEYWORDS.some(
    (keyword) =>
      matchesKeyword(
        text,
        keyword
      )
  );
};

/*
========================================
EXTRACT EMAIL
========================================
*/

export const extractEmail = (
  message = ""
) => {

  const match = String(message).match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  if (!match) {
    return null;
  }

  const email =
    match[0].trim().toLowerCase();

  return EMAIL_REGEX.test(email)
    ? email
    : null;
};

/*
========================================
EXTRACT PHONE
========================================
*/

export const extractPhone = (
  message = ""
) => {

  const match = String(message).match(
    /(\+?\d[\d\s\-()]{6,20})/
  );

  if (!match) {
    return null;
  }

  const cleaned = match[0]
    .trim()
    .replace(/[^\d+]/g, "");

  return PHONE_REGEX.test(cleaned)
    ? cleaned
    : null;
};

/*
========================================
EXTRACT NAME
========================================
*/

export const extractName = (
  message = ""
) => {

  const patterns = [
    /my name is\s+([a-zA-Z ]+)/i,
    /i am\s+([a-zA-Z ]+)/i,
    /i'm\s+([a-zA-Z ]+)/i,
  ];

  for (const pattern of patterns) {

    const match =
      String(message).match(pattern);

    if (!match) {
      continue;
    }

    const name =
      match[1]
        .trim()
        .replace(/\s+/g, " ");

    if (
      name.length >= 2 &&
      name.length <= 100
    ) {
      return name;
    }
  }

  return null;
};

/*
========================================
BUILD LEAD
========================================
*/

export const buildLead = ({
  message,
}) => ({
  name:
    extractName(message),

  email:
    extractEmail(message),

  phone:
    extractPhone(message),
});

/*
========================================
CHECK IF LEAD IS COMPLETE
========================================
*/

export const isLeadComplete = (
  lead = {}
) => {

  return Boolean(
    lead.name &&
    lead.email &&
    lead.phone
  );
};

/*
========================================
GET MISSING FIELDS
========================================
*/

export const getMissingLeadFields = (
  lead = {}
) => {

  const missing = [];

  if (!lead.name) {
    missing.push("name");
  }

  if (!lead.email) {
    missing.push("email");
  }

  if (!lead.phone) {
    missing.push("phone");
  }

  return missing;
};

/*
========================================
NEXT LEAD QUESTION
========================================
*/

export const getNextLeadQuestion = (
  lead = {}
) => {

  const missing =
    getMissingLeadFields(
      lead
    );

  if (!missing.length) {
    return null;
  }

  switch (missing[0]) {

    case "name":
      return "May I have your name?";

    case "email":
      return "Could you please share your email address?";

    case "phone":
      return "Could you please share your phone number?";

    default:
      return null;
  }
};