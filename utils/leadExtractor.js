/*
========================================
EXTRACT EMAIL
========================================
*/
export const extractEmail = (
  text = ""
) => {

  const emailRegex =
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

  const matches =
    text.match(
      emailRegex
    );

  return matches?.[0] || null;
};

/*
========================================
EXTRACT PHONE
========================================
*/
export const extractPhone = (
  text = ""
) => {

  const phoneRegex =
    /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4,6}/g;

  const matches =
    text.match(
      phoneRegex
    );

  if (!matches?.[0]) {
    return null;
  }

  return matches[0]
    .replace(/\s+/g, "")
    .trim();
};

/*
========================================
EXTRACT NAME
========================================
*/
export const extractName = (
  text = ""
) => {

  /*
  ========================================
  SIMPLE NAME PATTERNS
  ========================================
  */
  const patterns = [

    /my name is\s+([A-Za-z ]{2,30})/i,

    /i am\s+([A-Za-z ]{2,30})/i,

    /this is\s+([A-Za-z ]{2,30})/i,

    /I'm\s+([A-Za-z ]{2,30})/i,
  ];

  for (const pattern of patterns) {

    const match =
      text.match(
        pattern
      );

    if (
      match &&
      match[1]
    ) {

      return match[1]
        .trim()
        .split(" ")
        .slice(0, 3)
        .join(" ");
    }
  }

  return null;
};

/*
========================================
EXTRACT LEAD
========================================
*/
export const extractLeadData = (
  text = ""
) => {

  const email =
    extractEmail(
      text
    );

  const phone =
    extractPhone(
      text
    );

  const name =
    extractName(
      text
    );

  /*
  ========================================
  ONLY SAVE VALID LEADS
  ========================================
  */
  const isLead =
    email || phone;

  return {
    isLead,
    name,
    email,
    phone,
  };
};