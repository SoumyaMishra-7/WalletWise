// frontend/src/utils/gamificationConstants.js

export const XP_AWARDS = {
    TRANSACTION: 10,
    STREAK_BONUS_MULTIPLIER: 5,
    BUDGET_MET: 50,
};

export const LEVELS = [
    { level: 1, requiredXP: 0, title: "Budget Beginner" },
    { level: 2, requiredXP: 100, title: "Penny Pincher" },
    { level: 3, requiredXP: 300, title: "Saver Scholar" },
    { level: 4, requiredXP: 600, title: "Finance Fanatic" },
    { level: 5, requiredXP: 1000, title: "Wealth Wizard" },
    { level: 6, requiredXP: 1500, title: "Master of Coin" },
    { level: 7, requiredXP: 2500, title: "Financial Guru" },
];

export const BADGES = [
    {
        id: "FIRST_TRANSACTION",
        name: "First Steps",
        description: "Logged your first transaction!",
        icon: "🌱"
    },
    {
        id: "STREAK_3",
        name: "On a Roll",
        description: "Maintained a 3-day transaction streak.",
        icon: "🔥"
    },
    {
        id: "STREAK_7",
        name: "Week Warrior",
        description: "Maintained a 7-day transaction streak.",
        icon: "⚡"
    },
    {
        id: "XP_500",
        name: "XP Achiever",
        description: "Earned 500 total XP.",
        icon: "⭐"
    }
];

export const calculateLevel = (totalXP) => {
    let currentLevel = 1;
    let rankTitle = LEVELS[0].title;
    let nextLevelXP = LEVELS[1].requiredXP;
    let progress = 0;

    for (let i = 0; i < LEVELS.length; i++) {
        if (totalXP >= LEVELS[i].requiredXP) {
            currentLevel = LEVELS[i].level;
            rankTitle = LEVELS[i].title;
            if (i + 1 < LEVELS.length) {
                nextLevelXP = LEVELS[i + 1].requiredXP;
                const prevXP = LEVELS[i].requiredXP;
                progress = Math.min(100, ((totalXP - prevXP) / (nextLevelXP - prevXP)) * 100);
            } else {
                nextLevelXP = "Max";
                progress = 100;
            }
        } else {
            break;
        }
    }
    return { level: currentLevel, title: rankTitle, nextLevelXP, progress };
};
