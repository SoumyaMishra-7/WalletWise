const User = require('../models/User');

// Define Badge Catalog
const BADGES = {
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

// Calculate level based on XP formula
// example: Level 1 = 0-99 XP, Level 2 = 100-299 XP, etc. 
// simple formula: level = floor(sqrt(totalXP / 100)) + 1
const calculateLevel = (totalXP) => {
  return Math.floor(Math.sqrt((totalXP || 0) / 100)) + 1;
};

// Calculate XP required for NEXT level
const getNextLevelXP = (currentLevel) => {
  // inverse of formula: totalXP = (level - 1)^2 * 100
  return Math.pow(currentLevel, 2) * 100;
};

// Check and award daily action (Streaks)
const recordUserActivity = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    if (lastActive) lastActive.setHours(0, 0, 0, 0);

    let xpGain = 0;
    let unlockedBadges = [];

    // Check streak
    if (!lastActive) {
      // First day
      user.currentStreak = 1;
      user.highestStreak = 1;
      xpGain += 50; // Welcome bonus
    } else {
      const diffTime = Math.abs(today - lastActive);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        user.currentStreak += 1;
        if (user.currentStreak > user.highestStreak) {
          user.highestStreak = user.currentStreak;
        }
        xpGain += 10; // Daily streak XP
        
        // Check for streak badges
        if (user.currentStreak === 7 && !user.unlockedBadges.includes(BADGES.STREAK_7.id)) {
          user.unlockedBadges.push(BADGES.STREAK_7.id);
          unlockedBadges.push(BADGES.STREAK_7);
          xpGain += 100;
        }
      } else if (diffDays > 1) {
        // Streak broken
        user.currentStreak = 1;
        xpGain += 5; // Base XP for returning
      }
      // If diffDays === 0, they already got their daily XP. No change.
    }

    user.lastActiveDate = new Date();
    
    if (xpGain > 0) {
      user.totalXP = (user.totalXP || 0) + xpGain;
    }

    // Check level up badge
    const newLevel = calculateLevel(user.totalXP);
    if (newLevel >= 5 && !user.unlockedBadges.includes(BADGES.LEVEL_5.id)) {
        user.unlockedBadges.push(BADGES.LEVEL_5.id);
        unlockedBadges.push(BADGES.LEVEL_5);
    }

    await user.save();
    return { xpGained: xpGain, unlockedBadges, newTotalXP: user.totalXP, newLevel: calculateLevel(user.totalXP) };
  } catch (err) {
    console.error('Error recording user activity:', err);
    return null;
  }
};

// General function to award specific badges
const awardBadge = async (userId, badgeKey) => {
  try {
    const badge = BADGES[badgeKey];
    if (!badge) return null;

    const user = await User.findById(userId);
    if (!user || user.unlockedBadges.includes(badge.id)) return null;

    user.unlockedBadges.push(badge.id);
    user.totalXP = (user.totalXP || 0) + 50; // Flat 50 XP for any achievement badge

    const newLevel = calculateLevel(user.totalXP);
    if (newLevel >= 5 && !user.unlockedBadges.includes(BADGES.LEVEL_5.id)) {
        user.unlockedBadges.push(BADGES.LEVEL_5.id);
    }

    await user.save();
    return { badge, xpGained: 50, newTotalXP: user.totalXP, newLevel: calculateLevel(user.totalXP) };
  } catch (err) {
    console.error('Error awarding badge:', err);
    return null;
  }
};

const getStatus = async (userId) => {
    const user = await User.findById(userId);
    if (!user) return null;
    
    const level = calculateLevel(user.totalXP);
    const nextLevelXP = getNextLevelXP(level);
    const prevLevelXP = level === 1 ? 0 : getNextLevelXP(level - 1);
    const progress = Math.max(0, Math.min(100, Math.round(((user.totalXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100)));

    return {
        totalXP: user.totalXP || 0,
        level,
        progress,
        nextLevelXP,
        currentStreak: user.currentStreak || 0,
        highestStreak: user.highestStreak || 0,
        unlockedBadges: user.unlockedBadges || [],
        allBadges: Object.values(BADGES)
    };
};

module.exports = {
  BADGES,
  recordUserActivity,
  awardBadge,
  calculateLevel,
  getNextLevelXP,
  getStatus
};
