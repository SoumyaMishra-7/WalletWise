/**
 * Escapes all special RegExp characters in a user-provided string,
 * preventing Regex Injection (crash on invalid patterns) and ReDoS attacks.
 *
 * Usage:
 *   const safeSearch = escapeRegex(userInput);
 *   const regex = new RegExp(safeSearch, 'i');
 *
 * @param {string} string - The raw user input to escape
 * @returns {string} The escaped string safe for use in new RegExp()
 */
const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { escapeRegex };
