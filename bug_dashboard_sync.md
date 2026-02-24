# [Bug] Transaction Stats Sync Delay on Dashboard

## 🛑 Problem Statement
When a user adds an income or expense through the "Quick Action" modals on the [Dashboard.jsx](file:///c:/Users/visha/Downloads/WalletWise/frontend/src/components/Dashboard.jsx), the action appears successful, but the "Total Balance", "Spent This Month", and "Recent Transactions" list do not update.

The user is forced to:
1. Manually click the sync/refresh button.
2. Manually reload the browser.

This creates a disconnected user experience where the app feels "stale" or unresponsive to user actions.

## ✅ Proposed Solution
The dashboard should automatically trigger a data re-fetch upon the successful completion of any transaction-altering action (Add Income, Add Expense, Delete Transaction).

## 🛠️ Implementation Checklist
1. **Identify Triggers**:
   - Success callback in `AddIncome` modal.
   - Success callback in `AddExpense` modal.
   - Success response from `deleteTransaction` action in `Dashboard.jsx`.
2. **Refactor `fetchDashboardData`**:
   - Ensure `fetchDashboardData` can be called independently of the initial `useEffect`.
   - Implement a "Loading" state for the specific cards being updated to inform the user that syncing is in progress.
3. **Emit Refresh Event**:
   - Option A: Pass a `onSuccess` prop to the modal components that triggers `fetchDashboardData`.
   - Option B: Use a global `refreshTrigger` state in a parent provider.

## 🧪 Acceptance Criteria
- [ ] After adding a 1000 INR Income, the "Total Balance" card updates immediately without a page reload.
- [ ] The new transaction appears at the top of the "Recent Transactions" table within 1 second of submission.
- [ ] A success toast notification is shown alongside the data update.
