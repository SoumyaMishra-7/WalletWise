/**
 * Adds n months to a date, clamping the day-of-month to the last valid day
 * of the target month (e.g., Jan 31 + 1 month = Feb 28/29, not Mar 3).
 *
 * Prevents the JavaScript setMonth() overflow bug where a recurring date on
 * the 29th/30th/31st silently drifts forward and can skip whole months.
 *
 * @param {Date} date - The base date
 * @param {number} [n=1] - Number of months to add
 * @returns {Date} A new Date; the original is not modified
 */
const addMonthsClamped = (date, n = 1) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() < day) d.setDate(0); // overflowed, clamp to last day of previous month
  return d;
};

module.exports = { escapeRegex, addMonthsClamped };
