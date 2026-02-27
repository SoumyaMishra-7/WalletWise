/**
 * @interface IBudgetRepository
 * 
 * Data access contract for Budget entities.
 * 
 * @typedef {Object} IBudgetRepository
 * 
 * @property {function(Object): Promise<Object>} create
 *   Create a new budget document.
 * 
 * @property {function(Object): Promise<Object|null>} findOne
 *   Find a single budget matching a query.
 * 
 * @property {function(Object, Object?): Promise<Array<Object>>} find
 *   Find budgets matching a query.
 * 
 * @property {function(string, Object): Promise<Object|null>} updateById
 *   Update a budget by ID.
 * 
 * @property {function(string): Promise<Object|null>} findById
 *   Find a budget by its ID.
 */

module.exports = {};
