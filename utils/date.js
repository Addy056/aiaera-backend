// backend/utils/date.js

/**
 * Safely adds a number of months to a date.
 * Handles:
 *  - Leap years
 *  - End-of-month overflow (e.g., Jan 31 + 1 month -> Feb 28/29)
 *  - String, number, or Date input
 *
 * @param {Date|string|number} date
 * @param {number} months
 * @returns {Date}
 */
export const addMonths = (date, months) => {
  if (!date || typeof months !== "number") {
    throw new Error("Invalid arguments: date and months are required");
  }

  const original = new Date(date);
  if (isNaN(original.getTime())) {
    throw new Error("Invalid date provided");
  }

  const year = original.getFullYear();
  const month = original.getMonth();
  const day = original.getDate();

  // Create target date (initial guess)
  const result = new Date(original);
  result.setMonth(month + months);

  // If month changed more than expected, adjust day (overflow fix)
  if (result.getMonth() !== ((month + months) % 12 + 12) % 12) {
    result.setDate(0); // Move to last day of previous month
  }

  return result;
};

/**
 * Check if a date is expired (date < now).
 * Always compares using UTC to avoid timezone issues.
 *
 * @param {Date|string|number} date
 * @returns {boolean}
 */
export const isExpired = (date) => {
  if (!date) throw new Error("Date is required");

  const target = new Date(date);
  if (isNaN(target.getTime())) {
    throw new Error("Invalid date provided");
  }

  const now = new Date();

  return target.getTime() < now.getTime();
};
