/**
 * @interface IUserRepository
 * 
 * Data access contract for User entities.
 * 
 * @typedef {Object} IUserRepository
 * 
 * @property {function(string): Promise<Object|null>} findById
 *   Find a user by their ID.
 * 
 * @property {function(Object): Promise<Object|null>} findOne
 *   Find a single user matching a query.
 * 
 * @property {function(Object): Promise<Object>} create
 *   Create a new user.
 * 
 * @property {function(string, number): Promise<Object|null>} updateBalance
 *   Atomically adjust a user's wallet balance by a delta amount.
 * 
 * @property {function(string, Object): Promise<Object|null>} updateById
 *   Update user fields by ID.
 */

module.exports = {};
