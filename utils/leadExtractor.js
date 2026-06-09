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
    /(?:\+91|91)?[6-9]\d{9}/g;

  const matches =
    text.match(
      phoneRegex
    );

  if (!matches?.[0]) {
    return null;
  }

  return matches[0]
    .replace(/\D/g, "")
    .slice(-10);
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
  NORMAL NAME PATTERNS
  ========================================
  */
  const patterns = [

    /my name is\s+([A-Za-z ]{2,50})/i,

    /i am\s+([A-Za-z ]{2,50})/i,

    /this is\s+([A-Za-z ]{2,50})/i,

    /i'm\s+([A-Za-z ]{2,50})/i,
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

  /*
  ========================================
  CSV FORMAT
  Example:
  Aditya,aditya@gmail.com,9270099536
  ========================================
  */
  if (
    text.includes("@")
  ) {

    const parts =
      text
        .split(",")
        .map(
          (part) =>
            part.trim()
        );

    const possibleName =
      parts[0];

    if (
      possibleName &&
      /^[A-Za-z ]+$/.test(
        possibleName
      )
    ) {

      return possibleName;
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
  VALID LEAD
  ========================================
  */
  const isLead =
    !!(
      email ||
      phone
    );

  return {

    isLead,

    name:
      name || null,

    email:
      email || null,

    phone:
      phone || null,
  };
};