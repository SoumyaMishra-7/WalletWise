# Financial Habit Gamification & Rewards

**Issue:** #272
**Branch:** `feature/gamification-rewards`

## Overview
Budgeting can often feel like a chore. To solve this and keep users engaged, we implemented a non-intrusive gamification engine that rewards positive financial behaviors. The system introduces transaction streaks, XP progression, level milestones, and unlockable badges.

## Backend Implementation
- **User Schema Enhancements:**
  Added `totalXP`, `currentStreak`, `highestStreak`, `lastTransactionDate`, and `unlockedBadges` to the `User` model (`backend/models/User.js`).
- **Gamification Engine:**
  Created `backend/utils/gamificationEngine.js` containing the core logic to calculate XP, manage daily streaks, and evaluate badge conditions based on predefined rules in `gamificationConstants.js`.
- **API Integration:**
  - `authController.js` now exposes gamification fields via `safeUser`.
  - `transactionController.js` hooks into the gamification engine during `addTransaction`, returning a `gamification` payload if XP was gained or a badge was unlocked.

## Frontend Implementation
- **Gamification Constants:**
  Created `frontend/src/utils/gamificationConstants.js` representing the single source of truth for Badge metadata and Level formulas.
- **Reward Celebrations:**
  Implemented `frontend/src/utils/RewardCelebration.js` leveraging `canvas-confetti` and `react-toastify` to trigger celebratory visual queues when users level up or earn a badge after adding a transaction.
- **Dashboard UI Updates:**
  The `Dashboard.jsx` header now prominently displays the user's active Streak (🔥) and their current Level (⭐).
- **Badge Gallery:**
  Built a new `BadgeGallery` component inside `frontend/src/components/Gamification/BadgeGallery.jsx`. This component renders beautifully on the `Profile` page, showcasing all available badges (greying out the ones that are still locked).

## Verification
- Add a new transaction on the dashboard. You will see an immediate toast celebration indicating XP gain (`+10 XP`).
- Check the navbar in the dashboard; your streak and level will update.
- Navigate to the **Profile** page and scroll to the bottom. The "Your Achievements" section will display your earned "First Steps" badge, while higher-streak badges remain locked.

🎉 *Budgeting is now rewarding!*
