// backend/utils/gamificationConstants.js

const XP_AWARDS = {
    TRANSACTION: 10,
    STREAK_BONUS_MULTIPLIER: 5, // 5 XP extra per day of streak
    BUDGET_MET: 50,
};

const LEVELS = [
    { level: 1, requiredXP: 0, title: "Budget Beginner" },
    { level: 2, requiredXP: 100, title: "Penny Pincher" },
    { level: 3, requiredXP: 300, title: "Saver Scholar" },
    { level: 4, requiredXP: 600, title: "Finance Fanatic" },
    { level: 5, requiredXP: 1000, title: "Wealth Wizard" },
    { level: 6, requiredXP: 1500, title: "Master of Coin" },
    { level: 7, requiredXP: 2500, title: "Financial Guru" },
];

const BADGES = [
    {
        id: "FIRST_TRANSACTION",
        name: "First Steps",
        description: "Logged your first transaction!",
        icon: "🌱",
        condition: { type: "FIRST_TRANSACTION" }
    },
    {
        id: "STREAK_3",
        name: "On a Roll",
        description: "Maintained a 3-day transaction streak.",
        icon: "🔥",
        condition: { type: "STREAK", value: 3 }
    },
    {
        id: "STREAK_7",
        name: "Week Warrior",
        description: "Maintained a 7-day transaction streak.",
        icon: "⚡",
        condition: { type: "STREAK", value: 7 }
    },
    {
        id: "XP_500",
        name: "XP Achiever",
        description: "Earned 500 total XP.",
        icon: "⭐",
        condition: { type: "XP_MILESTONE", value: 500 }
    }
];

module.exports = {
    XP_AWARDS,
    LEVELS,
    BADGES
};
