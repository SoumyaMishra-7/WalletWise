# Feature Request: Financial Habit Gamification & Rewards

## 🛑 Level: Medium

## 📝 Description
Budgeting can feel like a chore. This feature aims to make it engaging by introducing gamified elements like "Streaks," "Badges," and "Levels." Students are motivated by progress; seeing a "Save-a-Lot" badge after a week of being under budget can reinforce good habits.

**Key Requirements**:
- **Streak Tracking**: Number of consecutive days the user has logged a transaction or stayed under their daily budget.
- **Badge System**: Achievement-based icons (e.g., "First Goal Hit," "Monthly Master," "Emergency Fund Starter").
- **Leveling System**: XP gained from consistent app usage and hitting financial milestones.
- **Leaderboards (Optional/Privacy-First)**: Compare progress with friends (opt-in only).

## 🛠️ Implementation Plan

### Backend Changes
1. **User Schema Update**: Add fields for `totalXP`, `currentStreak`, `highestStreak`, and `unlockedBadges` (Array of IDs).
2. **Gamification Engine**: Create a service `backend/utils/gamification.js` that triggers on every transaction/budget update to calculate XP and Streaks.
3. **Badge Definitions**: A JSON-based catalog of all possible badges and their unlock conditions.
4. **Cron Job**: Daily task to check if streaks should be reset or incremented.

### Frontend Changes
1. **Profile Header**: Display User Level and XP progress bar on the dashboard/profile.
2. **Badge Gallery**: A dedicated view to see earned and locked badges.
3. **Celebration Animations**: Use `canvas-confetti` to celebrate when a user unlocks a new badge or hits a major streak.
4. **Notification Integration**: Push notifications like "You're one day away from a 7-day streak! Log your dinner now."

### Psychology Consideration
- Focus on positive reinforcement rather than punishing users for missing a day.

## 🧪 Acceptance Criteria
- [ ] Streak increments correctly when a transaction is added daily.
- [ ] Badge "Budget Beginner" unlocks after the first budget is set.
- [ ] Level bar updates in real-time on the frontend after XP is earned.
- [ ] User can view a "Locked" badge to see the requirements for unlocking it.
