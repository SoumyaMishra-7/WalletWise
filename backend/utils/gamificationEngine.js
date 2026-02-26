// backend/utils/gamificationEngine.js
const { BADGES, LEVELS, XP_AWARDS } = require('./gamificationConstants');

/**
 * Calculates user level based on total XP
 */
const calculateLevel = (totalXP) => {
    let currentLevel = 1;
    for (const level of LEVELS) {
        if (totalXP >= level.requiredXP) {
            currentLevel = level.level;
        } else {
            break;
        }
    }
    return currentLevel;
};

/**
 * Evaluates conditions and unlocks new badges
 * @param {Object} user User document
 * @param {Object} context Context of current action (e.g. { event: 'TRANSACTION_ADDED', transactionCount: 1 })
 * @returns {Array<String>} Array of newly unlocked badge IDs
 */
const evaluateBadges = (user, context) => {
    const newBadges = [];
    const currentBadges = new Set(user.unlockedBadges || []);

    for (const badge of BADGES) {
        if (!currentBadges.has(badge.id)) {
            let conditionsMet = false;

            if (badge.condition.type === 'FIRST_TRANSACTION' && context.event === 'TRANSACTION_ADDED') {
                conditionsMet = true;
            } else if (badge.condition.type === 'STREAK') {
                if (user.currentStreak >= badge.condition.value) {
                    conditionsMet = true;
                }
            } else if (badge.condition.type === 'XP_MILESTONE') {
                if (user.totalXP >= badge.condition.value) {
                    conditionsMet = true;
                }
            }

            if (conditionsMet) {
                newBadges.push(badge.id);
            }
        }
    }

    return newBadges;
};

/**
 * Submits a gamification event, updating the user's XP, streaks, and badges.
 * @param {Object} user User document object
 * @param {String} eventType Type of event (e.g., 'TRANSACTION_ADDED')
 * @returns {Object} Gamification updates (XP gained, new badges, etc.) to show user
 */
const processEvent = (user, eventType) => {
    let xpAwarded = 0;
    let oldLevel = calculateLevel(user.totalXP || 0);
    const result = {
        xpGained: 0,
        streakUpdated: false,
        streakReset: false,
        newBadges: [],
        levelUp: false,
        newLevel: oldLevel
    };

    if (eventType === 'TRANSACTION_ADDED') {
        xpAwarded += XP_AWARDS.TRANSACTION;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        let lastDate = null;
        if (user.lastTransactionDate) {
            const d = new Date(user.lastTransactionDate);
            lastDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }

        // Streak logic
        if (!lastDate) {
            user.currentStreak = 1;
            result.streakUpdated = true;
        } else {
            const diffTime = Math.abs(today - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

            if (diffDays === 1) {
                // Consecutive day
                user.currentStreak += 1;
                result.streakUpdated = true;
            } else if (diffDays > 1) {
                // Streak broken
                user.currentStreak = 1;
                result.streakReset = true;
            }
            // If diffDays === 0, same day, no streak update.
        }

        if (user.currentStreak > (user.highestStreak || 0)) {
            user.highestStreak = user.currentStreak;
        }

        // Add bonus XP for streaks safely avoiding huge numbers, caps at 50 extra
        const streakBonus = Math.min(user.currentStreak * XP_AWARDS.STREAK_BONUS_MULTIPLIER, 50);
        xpAwarded += streakBonus;

        user.lastTransactionDate = now;
    }

    user.totalXP = (user.totalXP || 0) + xpAwarded;
    result.xpGained = xpAwarded;

    const newLevel = calculateLevel(user.totalXP);
    if (newLevel > oldLevel) {
        result.levelUp = true;
        result.newLevel = newLevel;
    } else {
        result.newLevel = oldLevel;
    }

    // Evaluate Badges
    const newlyUnlocked = evaluateBadges(user, { event: eventType });
    if (newlyUnlocked.length > 0) {
        user.unlockedBadges = [...(user.unlockedBadges || []), ...newlyUnlocked];
        result.newBadges = newlyUnlocked;
    }

    return result;
};

module.exports = {
    calculateLevel,
    evaluateBadges,
    processEvent
};
