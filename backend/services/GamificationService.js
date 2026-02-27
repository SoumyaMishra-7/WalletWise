/**
 * GamificationService — implements IGamificationService
 * 
 * Wraps gamification logic (XP, badges, streaks) behind a service interface.
 * Accepts a userRepository dependency instead of directly importing the User model.
 * 
 * @param {Object} deps
 * @param {Object} deps.userRepository — IUserRepository implementation
 * @param {Object} deps.logger — ILogger implementation
 */
class GamificationService {
    constructor({ userRepository, logger }) {
        /** @type {import('../interfaces/IUserRepository')} */
        this.userRepo = userRepository;
        /** @type {import('../interfaces/ILogger')} */
        this.logger = logger;

        this.BADGES = {
            FIRST_BUDGET: {
                id: 'first_budget',
                name: 'Budget Beginner',
                description: 'Set your first budget',
                icon: '🎯'
            },
            FIRST_TRANSACTION: {
                id: 'first_transaction',
                name: 'First Step',
                description: 'Logged your very first transaction',
                icon: '🌱'
            },
            STREAK_7: {
                id: 'streak_7',
                name: 'Consistency Planner',
                description: 'Maintained a 7-day transaction tracking streak',
                icon: '🔥'
            },
            SAVINGS_GOAL_STARTED: {
                id: 'savings_goal_started',
                name: 'Emergency Fund Starter',
                description: 'Created your first savings goal',
                icon: '🏦'
            },
            LEVEL_5: {
                id: 'level_5',
                name: 'Financial Padawan',
                description: 'Reached Level 5',
                icon: '⭐'
            }
        };
    }

    /**
     * Calculate level based on XP.
     * @param {number} totalXP
     * @returns {number}
     */
    calculateLevel(totalXP) {
        return Math.floor(Math.sqrt((totalXP || 0) / 100)) + 1;
    }

    /**
     * Calculate XP required for the next level.
     * @param {number} currentLevel
     * @returns {number}
     */
    getNextLevelXP(currentLevel) {
        return Math.pow(currentLevel, 2) * 100;
    }

    /**
     * Record daily user activity for streak tracking.
     * @param {string} userId
     * @returns {Promise<Object|null>}
     */
    async recordUserActivity(userId) {
        try {
            const user = await this.userRepo.findById(userId);
            if (!user) return null;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
            if (lastActive) lastActive.setHours(0, 0, 0, 0);

            let xpGain = 0;
            let unlockedBadges = [];

            if (!lastActive) {
                user.currentStreak = 1;
                user.highestStreak = 1;
                xpGain += 50;
            } else {
                const diffTime = Math.abs(today - lastActive);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    user.currentStreak += 1;
                    if (user.currentStreak > user.highestStreak) {
                        user.highestStreak = user.currentStreak;
                    }
                    xpGain += 10;

                    if (user.currentStreak === 7 && !user.unlockedBadges.includes(this.BADGES.STREAK_7.id)) {
                        user.unlockedBadges.push(this.BADGES.STREAK_7.id);
                        unlockedBadges.push(this.BADGES.STREAK_7);
                        xpGain += 100;
                    }
                } else if (diffDays > 1) {
                    user.currentStreak = 1;
                    xpGain += 5;
                }
            }

            user.lastActiveDate = new Date();

            if (xpGain > 0) {
                user.totalXP = (user.totalXP || 0) + xpGain;
            }

            const newLevel = this.calculateLevel(user.totalXP);
            if (newLevel >= 5 && !user.unlockedBadges.includes(this.BADGES.LEVEL_5.id)) {
                user.unlockedBadges.push(this.BADGES.LEVEL_5.id);
                unlockedBadges.push(this.BADGES.LEVEL_5);
            }

            await user.save();
            return { xpGained: xpGain, unlockedBadges, newTotalXP: user.totalXP, newLevel: this.calculateLevel(user.totalXP) };
        } catch (err) {
            this.logger.error('Error recording user activity:', err);
            return null;
        }
    }

    /**
     * Award a specific badge to a user.
     * @param {string} userId
     * @param {string} badgeKey
     * @returns {Promise<Object|null>}
     */
    async awardBadge(userId, badgeKey) {
        try {
            const badge = this.BADGES[badgeKey];
            if (!badge) return null;

            const user = await this.userRepo.findById(userId);
            if (!user || user.unlockedBadges.includes(badge.id)) return null;

            user.unlockedBadges.push(badge.id);
            user.totalXP = (user.totalXP || 0) + 50;

            const newLevel = this.calculateLevel(user.totalXP);
            if (newLevel >= 5 && !user.unlockedBadges.includes(this.BADGES.LEVEL_5.id)) {
                user.unlockedBadges.push(this.BADGES.LEVEL_5.id);
            }

            await user.save();
            return { badge, xpGained: 50, newTotalXP: user.totalXP, newLevel: this.calculateLevel(user.totalXP) };
        } catch (err) {
            this.logger.error('Error awarding badge:', err);
            return null;
        }
    }

    /**
     * Get full gamification status for a user.
     * @param {string} userId
     * @returns {Promise<Object|null>}
     */
    async getStatus(userId) {
        const user = await this.userRepo.findById(userId);
        if (!user) return null;

        const level = this.calculateLevel(user.totalXP);
        const nextLevelXP = this.getNextLevelXP(level);
        const prevLevelXP = level === 1 ? 0 : this.getNextLevelXP(level - 1);
        const progress = Math.max(0, Math.min(100, Math.round(((user.totalXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100)));

        return {
            totalXP: user.totalXP || 0,
            level,
            progress,
            nextLevelXP,
            currentStreak: user.currentStreak || 0,
            highestStreak: user.highestStreak || 0,
            unlockedBadges: user.unlockedBadges || [],
            allBadges: Object.values(this.BADGES)
        };
    }
}

module.exports = GamificationService;
