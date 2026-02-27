const mongoose = require('mongoose');

/**
 * MockTransactionRepository — in-memory array-based implementation.
 * Implements ITransactionRepository.
 */
class MockTransactionRepository {
    constructor() {
        this.transactions = [];
        this._idCounter = 1;
    }

    _generateId() {
        return new mongoose.Types.ObjectId();
    }

    async create(data) {
        const repo = this;
        const doc = {
            _id: this._generateId(),
            ...data,
            date: data.date || new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            save: async function () { return this; },
            deleteOne: null // will be set below
        };
        doc.deleteOne = async () => {
            const idx = repo.transactions.findIndex(t => t._id.toString() === doc._id.toString());
            if (idx >= 0) repo.transactions.splice(idx, 1);
        };
        this.transactions.push(doc);
        return doc;
    }

    async findById(id) {
        return this.transactions.find(t => t._id.toString() === id.toString()) || null;
    }

    async find(query, options = {}) {
        let results = this._applyQuery(query);
        if (options.sort) {
            const sortKey = Object.keys(options.sort)[0];
            const sortDir = options.sort[sortKey];
            results.sort((a, b) => sortDir * ((a[sortKey] > b[sortKey]) ? 1 : -1));
        }
        if (options.skip) results = results.slice(options.skip);
        if (options.limit) results = results.slice(0, options.limit);
        return results;
    }

    async findOne(query) {
        const results = this._applyQuery(query);
        return results[0] || null;
    }

    async countDocuments(query) {
        return this._applyQuery(query).length;
    }

    async updateById(id, data) {
        const doc = await this.findById(id);
        if (!doc) return null;
        Object.assign(doc, data, { updatedAt: new Date() });
        return doc;
    }

    async deleteById(id) {
        const idx = this.transactions.findIndex(t => t._id.toString() === id.toString());
        if (idx < 0) return null;
        return this.transactions.splice(idx, 1)[0];
    }

    async aggregate(pipeline) {
        // Simplified: return empty array for mock.
        // Real aggregation testing should use MongoMemoryServer.
        return [];
    }

    async findOneAndUpdate(filter, update, options) {
        const doc = await this.findOne(filter);
        if (!doc) return null;
        if (typeof update === 'object' && !Array.isArray(update)) {
            Object.assign(doc, update);
        }
        return doc;
    }

    async insertMany(docs) {
        const results = [];
        for (const data of docs) {
            results.push(await this.create(data));
        }
        return results;
    }

    /**
     * Basic query matching (supports simple equality).
     * @private
     */
    _applyQuery(query) {
        return this.transactions.filter(t => {
            for (const [key, value] of Object.entries(query)) {
                if (key === '$or' || key === '$and') continue; // Skip complex operators
                if (typeof value === 'object' && value !== null) {
                    // Handle $gte, $lte, etc.
                    if (value.$gte && t[key] < value.$gte) return false;
                    if (value.$lte && t[key] > value.$lte) return false;
                } else {
                    if (t[key]?.toString() !== value?.toString()) return false;
                }
            }
            return true;
        });
    }

    /**
     * Clear all data.
     */
    clear() {
        this.transactions = [];
    }
}

module.exports = MockTransactionRepository;
