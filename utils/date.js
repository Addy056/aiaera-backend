// backend/utils/date.js

/**
 * Adds a specified number of months to a given date
 * @param {Date|string|number} date - The original date
 * @param {number} months - Number of months to add
 * @returns {Date} - New date with months added
 */
export const addMonths = (date, months) => {
  if (!date || typeof months !== "number") {
    throw new Error("Invalid arguments: date and months are required");
  }

  const originalDate = new Date(date);
  if (isNaN(originalDate)) {
    throw new Error("Invalid date provided");
  }

  const newDate = new Date(originalDate);
  const targetMonth = newDate.getMonth() + months;
  newDate.setMonth(targetMonth);

  // Handle month overflow (e.g., adding 1 month to Jan 31 → Feb 28/29)
  if (newDate.getMonth() !== ((targetMonth % 12 + 12) % 12)) {
    newDate.setDate(0); // last day of previous month
  }

  return newDate;
};

/**
 * Checks if a given date has expired (i.e., is in the past)
 * @param {Date|string|number} date - The date to check
 * @returns {boolean} - true if expired, false otherwise
 */
export const isExpired = (date) => {
  if (!date) throw new Error("Date is required");
  const compareDate = new Date(date);
  if (isNaN(compareDate)) throw new Error("Invalid date provided");
  return compareDate < new Date();
};
