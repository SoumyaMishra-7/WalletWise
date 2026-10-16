/**
 * Budget rollover helpers.
 *
 * Everything in this file is pure (no database access) so the maths and the
 * month handling can be unit-tested in isolation. Database orchestration lives
 * in `Budget.applyRollover` (models/Budget.js).
 *
 * Month strings are always "YYYY-MM" and are handled in UTC, matching the rest
 * of the codebase (`new Date().toISOString().slice(0, 7)`).
 */

const ROLLOVER_MODES = Object.freeze({
  POSITIVE: 'positive', // carry only unused money
  BOTH: 'both'          // carry unused money AND overspending (negative rollover)
});

const ROLLOVER_MODE_VALUES = Object.values(ROLLOVER_MODES);
const DEFAULT_ROLLOVER_MODE = ROLLOVER_MODES.POSITIVE;

const STRICT_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Round to 2 decimals, avoiding binary floating point noise (0.1 + 0.2). */
const roundMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  return rounded === 0 ? 0 : rounded; // normalise -0 to 0
};

const isValidMonth = (month) => typeof month === 'string' && STRICT_MONTH_REGEX.test(month);

/** Current month as "YYYY-MM" (UTC). */
const getCurrentMonth = (now = new Date()) => now.toISOString().slice(0, 7);

/**
 * Previous month using integer arithmetic only (no Date objects), so there are
 * no timezone surprises and Jan -> Dec of the previous year works.
 *   getPreviousMonth('2027-01') === '2026-12'
 */
const getPreviousMonth = (month) => {
  if (!isValidMonth(month)) {
    throw new RangeError(`Invalid month "${month}". Expected YYYY-MM.`);
  }
  let year = Number(month.slice(0, 4));
  let monthNumber = Number(month.slice(5, 7)) - 1;
  if (monthNumber === 0) {
    monthNumber = 12;
    year -= 1;
  }
  return `${String(year).padStart(4, '0')}-${String(monthNumber).padStart(2, '0')}`;
};

/** [start, end) UTC range for a month - use with $gte / $lt. */
const getMonthRange = (month) => {
  if (!isValidMonth(month)) {
    throw new RangeError(`Invalid month "${month}". Expected YYYY-MM.`);
  }
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)) // Dec rolls into Jan automatically
  };
};

const normaliseKey = (name) => String(name || '').trim().toLowerCase();

/**
 * Calculate the rollover that a new month's budget should receive.
 *
 * @param {Object}   params
 * @param {Object}   params.previousBudget  Previous month budget: { categories: [{ name, amount, rolloverAmount? }] }
 * @param {Array}    params.categories      Categories of the NEW budget: [{ name }]
 * @param {Object|Map} params.spentByCategory  Previous month expense totals keyed by lower-cased category name
 * @param {string}   [params.mode='positive']  'positive' | 'both'
 * @returns {{ total: number, categories: Array<{ name: string, rolloverAmount: number }> }}
 *
 * Rules
 *  - leftover = (budgeted + rollover received last month) - spent, per category.
 *  - 'positive' mode: negative leftovers become 0.
 *  - 'both' mode: negative leftovers are carried as a deduction.
 *  - A previous-month category that does not exist in the new budget is dropped,
 *    so  sum(category rollovers) === total  always holds.
 *  - Categories are matched case-insensitively. If a name appears twice, the
 *    first occurrence receives the rollover so nothing is counted twice.
 */
const calculateRollover = ({ previousBudget, categories, spentByCategory, mode = DEFAULT_ROLLOVER_MODE }) => {
  const safeMode = ROLLOVER_MODE_VALUES.includes(mode) ? mode : DEFAULT_ROLLOVER_MODE;
  const spentLookup = (key) => {
    if (!spentByCategory) return 0;
    const value = spentByCategory instanceof Map ? spentByCategory.get(key) : spentByCategory[key];
    return Number(value) || 0;
  };

  // Aggregate previous available amount per category name.
  const availableByKey = new Map();
  (previousBudget?.categories || []).forEach((cat) => {
    const key = normaliseKey(cat.name);
    if (!key) return;
    const available = (Number(cat.amount) || 0) + (Number(cat.rolloverAmount) || 0);
    availableByKey.set(key, (availableByKey.get(key) || 0) + available);
  });

  const claimed = new Set();
  const result = (categories || []).map((cat) => {
    const key = normaliseKey(cat.name);
    if (!key || claimed.has(key) || !availableByKey.has(key)) {
      return { name: cat.name, rolloverAmount: 0 };
    }
    claimed.add(key);

    const leftover = roundMoney(availableByKey.get(key) - spentLookup(key));
    const rolloverAmount = safeMode === ROLLOVER_MODES.BOTH ? leftover : Math.max(leftover, 0);
    return { name: cat.name, rolloverAmount: roundMoney(rolloverAmount) };
  });

  const total = roundMoney(result.reduce((sum, cat) => sum + cat.rolloverAmount, 0));
  return { total, categories: result };
};

/** Rollover that actually counts for a budget (0 when the feature is off). */
const getRolloverAmount = (budget) =>
  budget && budget.rolloverEnabled ? roundMoney(budget.rolloverAmount) : 0;

/** "Available this month" = base budget + rollover. Works for docs and plain objects. */
const getAvailableBudget = (budget) => {
  if (!budget) return 0;
  const base = Number(budget.totalBudget) || 0;
  const rollover = getRolloverAmount(budget);
  return rollover === 0 ? base : roundMoney(base + rollover); // untouched when rollover is off
};

/** Same idea for one category. */
const getCategoryAvailable = (budget, category) => {
  const base = Number(category?.amount) || 0;
  const rollover = budget && budget.rolloverEnabled ? roundMoney(category?.rolloverAmount) : 0;
  return rollover === 0 ? base : roundMoney(base + rollover);
};

/**
 * Percentage used, capped to 100. A budget that has been reduced to zero or
 * below by an overspend rollover counts as fully used once anything is spent.
 */
const calculateUtilization = (spent, available) => {
  const spentNumber = Number(spent) || 0;
  if (spentNumber <= 0) return 0;
  if (!(available > 0)) return 100;
  return Math.min((spentNumber / available) * 100, 100);
};

module.exports = {
  ROLLOVER_MODES,
  ROLLOVER_MODE_VALUES,
  DEFAULT_ROLLOVER_MODE,
  roundMoney,
  isValidMonth,
  getCurrentMonth,
  getPreviousMonth,
  getMonthRange,
  calculateRollover,
  getRolloverAmount,
  getAvailableBudget,
  getCategoryAvailable,
  calculateUtilization
};
