const mongoose = require('mongoose');

/**
 * MockUserRepository — in-memory user store.
 * Implements IUserRepository.
 */
class MockUserRepository {
    constructor() {
        this.users = [];
    }

    _generateId() {
        return new mongoose.Types.ObjectId();
    }

    async create(data) {
        const user = {
            _id: this._generateId(),
            walletBalance: 0,
            unlockedBadges: [],
            totalXP: 0,
            currentStreak: 0,
            highestStreak: 0,
            ...data,
            save: async function () { return this; }
        };
        this.users.push(user);
        return user;
    }

    async findById(id) {
        return this.users.find(u => u._id.toString() === id.toString()) || null;
    }

    async findOne(query) {
        return this.users.find(u => {
            for (const [key, value] of Object.entries(query)) {
                if (u[key]?.toString() !== value?.toString()) return false;
            }
            return true;
        }) || null;
    }

    async updateBalance(userId, delta) {
        const user = await this.findById(userId);
        if (!user) return null;
        user.walletBalance = (user.walletBalance || 0) + delta;
        return user;
    }

    async updateById(id, data) {
        const user = await this.findById(id);
        if (!user) return null;
        Object.assign(user, data);
        return user;
    }

    /**
     * Clear all data.
     */
    clear() {
        this.users = [];
    }
}

module.exports = MockUserRepository;
