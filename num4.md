# Issue #272: Financial Habit Gamification & Rewards

## Description
This PR implements gamification mechanics to make budgeting more engaging and fun for users. It introduces Expirience Points (XP), daily Streaks, Levels, and collectible Badges to reward consistent financial habits.

## Changes Included
- **User Schema Upgrade**: Added native gamification fields (`totalXP`, `currentStreak`, `highestStreak`, `lastActiveDate`, `unlockedBadges`) to the `User` model (`backend/models/User.js`). Existing users default to zero/empty.
- **Gamification Engine**: Created `backend/utils/gamification.js` to manage the core logic. Includes a centralized `BADGES` dictionary, functions for calculating XP leveling formulas, checking daily streaks, and awarding specific badges.
- **Controller Hooks**: 
  - Integrated `gamification.recordUserActivity()` into `transactionController.js` to build daily streaks.
  - Implemented the 'First Step' transaction badge.
  - Implemented the 'Budget Beginner' badge in `budgetController.js`.
  - Implemented the 'Emergency Fund Starter' badge in `savingGoalController.js`.
- **API Endpoints**: Deployed `/api/v1/gamification/status` route to fetch live user progression.
- **Frontend Dashboard UI**: Built `GamificationDashboard.jsx` featuring dynamic SVG progress rings, XP tracking, Streak display, and a CSS-styled grid layout for unlocked/locked badges. Used `canvas-confetti` for celebration triggers.
- **Navigation Integration**: Added the "Rewards" link to the Dashboard sidebar and `App.jsx` application router.

## Testing Instructions
1. Run both frontend and backend development servers.
2. Sign in or create a test account.
3. Access the `Rewards` tab from the Dashboard navigation menu. The initial level should render accurately as Lvl 1.
4. Set a monthly budget and observe the unlocking of the "Budget Beginner" badge.
5. Log a transaction and check for XP increment and the "First Step" achievement.
6. Create a Savings Goal to unlock the "Emergency Fund Starter" badge.

## Technical Notes
- Backward compatibility is maintained. Uninitialized user records simply evaluate `user.totalXP || 0`.
- Includes custom `GamificationDashboard.css` optimized for both light and dark modes within the WalletWise ecosystem.
