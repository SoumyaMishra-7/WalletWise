const mongoose = require('mongoose');

/**
 * Validates if a string is a valid MongoDB ObjectId.
 * This prevents NoSQL injection attacks where an attacker might pass an object instead of a string.
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidObjectId = (id) => {
    if (!id || typeof id !== 'string') return false;
    return mongoose.Types.ObjectId.isValid(id);
};

module.exports = {
    isValidObjectId
};
