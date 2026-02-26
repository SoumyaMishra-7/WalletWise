# Pull Request: [Feature] Recurring Transaction "Skip Next" Action

## Problem Addressed
Fixes #208

Users who have setup **Recurring Transactions** needed a way to skip a specific payment without deleting the entire rule, preventing the system from automatically generating a transaction on the `nextExecutionDate`.

## Solution Implemented
Introduced a "Skip Next" mechanism that increments the `nextExecutionDate` without creating a transaction entry for the skipped period.

### Backend Changes:
- `transactionRoutes.js`: Exposes a new `POST /api/transactions/:id/skip` endpoint.
- `transactionController.js`: Verifies if a transaction is recurring before incrementing its `nextExecutionDate` by a day, week, or month, according to its interval. Saves the updated state.

### Frontend Changes:
- `Transactions.jsx`: The Transactions table now includes an "Actions" column. Recurring transactions display a "Skip Next" button that connects directly to the new API endpoint, skipping the next occurrence upon user confirmation.

## Testing Steps
1. Navigate to `/dashboard` and click 'View All Transactions'.
2. Identify or create a recurring transaction (ensure `isRecurring` is true and it has a `recurringInterval`).
3. View the "Skip Next" action button inside the newly added "Actions" column.
4. Click on "Skip Next", confirm the modal prompt, and ensure it correctly hits the DB and modifies its `nextExecutionDate`. No ghost transactions should be erroneously recorded.
