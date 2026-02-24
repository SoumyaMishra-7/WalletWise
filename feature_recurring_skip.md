# [Feature] Recurring Transaction "Skip Next" Action

## 🛑 Problem Statement
Users who have setup **Recurring Transactions** (Daily/Weekly/Monthly) sometimes need to skip a specific payment without deleting the entire rule. 

**Current Limitation**:
The system automatically generates a transaction on the `nextExecutionDate`. If a user cancels one month of a subscription but wants to keep the service for next month, they currently have to delete the recurring item and recreate it later.

## ✅ Proposed Solution
Introduce a "Skip" mechanism that increments the `nextExecutionDate` without creating a transaction entry for the skipped period.

## 🛠️ Implementation Checklist
1. **Backend Route**:
   Create `PATCH /api/transactions/recurring/:id/skip` in [transactionRoutes.js](file:///c:/Users/visha/Downloads/WalletWise/backend/routes/transactionRoutes.js).
2. **Controller Logic**:
   In [transactionController.js](file:///c:/Users/visha/Downloads/WalletWise/backend/controllers/transactionController.js):
   - Find the transaction by `:id`.
   - Update `nextExecutionDate` using the existing `recurringInterval` logic (Daily +1, Weekly +7, Monthly +1 month).
   - Save the recurring rule WITHOUT adding a new entry to the [Transaction](file:///c:/Users/visha/Downloads/WalletWise/frontend/src/pages/Transactions.jsx#53-370) table.
3. **Frontend UI**:
   Add a "Skip" icon/button in the Recurring Transactions view.

## 🧪 Acceptance Criteria
- [ ] Clicking "Skip" on a Weekly transaction due "Today" moves the date to "Next Week".
- [ ] No new transaction record is added to the user's history for the skipped interval.
- [ ] The "Skip" action is confirmed by a success message.
