/**
 * @interface IGamificationService
 * 
 * Contract for gamification operations (XP, badges, streaks).
 * Concrete implementation: services/GamificationService.js
 * Mock implementation: tests/mocks/MockGamificationService.js
 */

/**
 * @typedef {Object} IGamificationService
 * 
 * @property {function(string): Promise<Object|null>} recordUserActivity
 *   Record daily user activity for streak tracking and XP.
 *   Returns { xpGained, unlockedBadges, newTotalXP, newLevel } or null.
 * 
 * @property {function(string, string): Promise<Object|null>} awardBadge
 *   Award a specific badge to a user by badge key.
 *   Returns { badge, xpGained, newTotalXP, newLevel } or null.
 * 
 * @property {function(string): Promise<Object|null>} getStatus
 *   Get full gamification status for a user.
 *   Returns { totalXP, level, progress, currentStreak, ... } or null.
 */

module.exports = {};
