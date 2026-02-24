# [Feature] DB-Synced Theme Preference

## 🛑 Problem Statement
Currently, a user's choice between **Dark Mode** and **Light Mode** is stored in `localStorage` in the browser. 

**Limitation**:
If a user switches from their Laptop to a Tablet, or logs in after clearing browser data, their preference is lost, and the app defaults to Light mode (or whatever the system default is). This is a suboptimal experience for users who prefer a specific mode strictly.

## ✅ Proposed Solution
Sync the theme preference with the user's profile on the server. The theme should be saved in the database during changes and fetched during the authentication handshake (`/api/auth/me`).

## 🛠️ Implementation Checklist
1. **Database Update**:
   Update the [User](file:///c:/Users/visha/Downloads/WalletWise/backend/controllers/authController.js#83-104) schema to include a `theme` field with enums.
2. **Backend API**:
   - Update [updateProfile](file:///c:/Users/visha/Downloads/WalletWise/backend/controllers/authController.js#589-644) in [authController.js](file:///c:/Users/visha/Downloads/WalletWise/backend/controllers/authController.js) to accept `theme`.
   - Ensure the theme is returned in the [safeUser](file:///c:/Users/visha/Downloads/WalletWise/backend/controllers/authController.js#83-104) object.
3. **Frontend Sync**:
   In the theme toggle logic:
   - Update `localStorage` as usual for instant speed.
   - Fire a background `PUT /api/auth/profile` request to sync the choice.
4. **App Hydration**:
   On app load, prioritize the theme from the `user` object over `localStorage`.

## 🧪 Acceptance Criteria
- [ ] Set "Dark Mode" on Browser A. Log out.
- [ ] Log in on Browser B (or Incognito). The app should automatically switch to "Dark Mode" as soon as the user is authenticated.
- [ ] The sync happens silently in the background without blocking the UI.
