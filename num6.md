# Shared Wallets and Collaborative Budgeting (Issue #270)

## Description
This Pull Request introduces the Shared Wallets feature, enabling users to create group wallets, invite members (friends, family, roommates), and collaboratively track shared expenses. Shared wallets operate independently of personal dashboards, ensuring clean delineation of personal vs. group finances.

## Changes Included
- **Backend Infrastructure:** 
  - Created a robust `Wallet` schema tracking the wallet `balance`, `currency`, `owner`, and a `members` array with role-based access control (admin vs. member).
  - Modified the existing `Transaction` schema to include `walletId` and `paidBy` references.
  - Built out complete REST APIs in `walletController.js` and `walletRoutes.js` for managing wallets and their members (add/remove).
  - Re-engineered `transactionController.js` to intelligently route balance updates—credit/debit goes to the `Wallet` document if `walletId` exists; otherwise, it affects the `User`'s personal `walletBalance`. Querying transactions was also updated to isolate shared transactions from personal ones.
  
- **Frontend Development:**
  - Designed the **Shared Wallets Hub** (`SharedWallets.jsx`) which lists all accessible group wallets as rich cards displaying balances and member counts. It also includes a modal to easily create new wallets.
  - Developed the **Wallet Details View** (`WalletDetails.jsx`), a comprehensive page showing the live group balance, a chronological list of group expenses/incomes, and a member management sidebar.
  - Integrated the existing `AddExpense` modal component to support injecting transactions directly into shared wallets.
  - Authored dedicated styling (`SharedWallets.css`) to match the clean WalletWise design language.
  - Wired up Protected Routes in `App.jsx` and injected a "Shared Wallets" navigation link into the Dashboard's sidebar menu.

## Testing Performed
- Unit testing of API routes and JSON schema parsing variations.
- Validated that assigning an expense to a Shared Wallet strictly bypasses the user's personal `Total Balance` calculation.
- Tested edge cases such as preventing removal of the wallet owner and ensuring only admins can add new members.

## Related Issues
Closes #270
