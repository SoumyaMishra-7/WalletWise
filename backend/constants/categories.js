// Transaction categories used across the app.
// Includes both expense and income categories to keep the transaction API consistent with the UI.
const CATEGORIES = [
  // Expense categories
  'food',
  'transport',
  'shopping',
  'entertainment',
  'education',
  'healthcare',
  'housing',

  // Income categories
  'pocket_money',
  'salary',
  'freelance',
  'gift',
  'investment',

  // Shared
  'other'
];

module.exports = { CATEGORIES };
