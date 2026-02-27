/**
 * @interface ITransactionRepository
 * 
 * Data access contract for Transaction entities.
 * Concrete implementation uses Mongoose Transaction model.
 * Mock implementation uses in-memory arrays.
 * 
 * @typedef {Object} ITransactionRepository
 * 
 * @property {function(Object): Promise<Object>} create
 *   Create a new transaction document.
 * 
 * @property {function(string): Promise<Object|null>} findById
 *   Find a transaction by its ID.
 * 
 * @property {function(Object, Object?): Promise<Array<Object>>} find
 *   Find transactions matching a query, with optional sort/limit/skip.
 * 
 * @property {function(Object): Promise<number>} countDocuments
 *   Count transactions matching a query.
 * 
 * @property {function(string, Object): Promise<Object|null>} updateById
 *   Update a transaction by ID, returning the updated document.
 * 
 * @property {function(string): Promise<Object|null>} deleteById
 *   Delete a transaction by ID, returning the deleted document.
 * 
 * @property {function(Array): Promise<Array>} aggregate
 *   Run a MongoDB-style aggregation pipeline.
 * 
 * @property {function(Object, Object?): Promise<Object|null>} findOne
 *   Find a single transaction matching a query.
 * 
 * @property {function(string, Object, Object?): Promise<Object|null>} findOneAndUpdate
 *   Find one and update, returning the updated document.
 * 
 * @property {function(Array<Object>): Promise<Array<Object>>} insertMany
 *   Insert multiple transaction documents.
 */

module.exports = {};
