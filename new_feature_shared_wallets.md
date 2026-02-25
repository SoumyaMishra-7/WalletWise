# Feature Request: Shared Wallets and Collaborative Budgeting

## 🛑 Level: Difficult

## 📝 Description
Students often share expenses (rent, groceries, utilities) with roommates or project partners. Currently, WalletWise is a single-user experience. This feature aims to introduce "Shared Wallets" where multiple users can contribute to and track a collective pool of funds. 

This requires a significant architecture shift from a strict one-to-one user-transaction relationship to a many-to-many or group-based permission system.

**Key Requirements**:
- **Group Creation**: Users can create a "Wallet Group" and invite others via email or a unique code.
- **Role-Based Access**: Owner vs. Contributor permissions.
- **Real-time Synchronization**: When one user logs a shared expense, it reflects instantly for all members.
- **Settlement Logic**: Automatically calculate who owes whom at the end of the month based on shared transactions.

## 🛠️ Implementation Plan

### Backend Changes
1. **New Group Model**: Create `Group.js` to store group metadata, members, and roles.
2. **Modify Transaction Model**: Add optional `groupId` field and update indexes.
3. **Invitation System**: Implement logic to send invites and handle acceptance (JWT-based invite tokens).
4. **Aggregation Logic**: Create new controllers to sum up shared expenses and calculate "Who owes What."
5. **Real-time Notifications**: Integrate WebSockets (Socket.io) to notify members of new shared activity.

### Frontend Changes
1. **Shared Dashboard**: A dedicated view for shared wallets.
2. **Member Management UI**: List of members with the ability to invite/remove.
3. **Settlement UI**: A "Settle Up" screen showing balances between roommates.

### Security Consideration
- Ensure that users can ONLY see transactions in groups they are members of.
- Strict validation to prevent unauthorized users from joining a group via forged invite codes.

## 🧪 Acceptance Criteria
- [ ] Users can create a group and invite at least one other member.
- [ ] A transaction added by User A in the Shared Wallet is visible to User B.
- [ ] The app correctly calculates individual vs. shared totals.
- [ ] Members receive a notification when a shared expense is added.
