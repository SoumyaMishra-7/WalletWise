/**
 * MockGamificationService — no-op gamification that records calls for assertion.
 * Implements IGamificationService.
 */
class MockGamificationService {
    constructor() {
        this.calls = {
            recordUserActivity: [],
            awardBadge: [],
            getStatus: []
        };
    }

    async recordUserActivity(userId) {
        this.calls.recordUserActivity.push({ userId });
        return { xpGained: 10, unlockedBadges: [], newTotalXP: 10, newLevel: 1 };
    }

    async awardBadge(userId, badgeKey) {
        this.calls.awardBadge.push({ userId, badgeKey });
        return null; // Simulate: badge already awarded or not found
    }

    async getStatus(userId) {
        this.calls.getStatus.push({ userId });
        return {
            totalXP: 0,
            level: 1,
            progress: 0,
            nextLevelXP: 100,
            currentStreak: 0,
            highestStreak: 0,
            unlockedBadges: [],
            allBadges: []
        };
    }

    /**
     * Clear all recorded calls.
     */
    clear() {
        this.calls = { recordUserActivity: [], awardBadge: [], getStatus: [] };
    }
}

module.exports = MockGamificationService;
