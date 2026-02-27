# [Refactor] Standardize Global API Error Interceptors

## 🛑 Problem Statement
The application currently handles errors (like 401 Unauthorized or 500 Server Error) locally within each API call in various components.

**Maintenance Debt**:
- `authController.js` and others have repetitive `toast.error(error.response.data.message)` logic.
- Logout logic is manually checked and handled in individual `try-catch` blocks.
- If a global alert style changes, it must be updated in 10+ files.

## ✅ Proposed Solution
Refactor [client.js](file:///c:/Users/visha/Downloads/WalletWise/frontend/src/api/client.js) to use Axios Interceptors for global request and response handling.

## 🛠️ Implementation Checklist
1. **Response Interceptor**:
   Check for specific status codes:
   - **401**: Automatically call `clearAuth()` and redirect to `/login`.
   - **400/500**: Extract the error message from `error.response.data.message` and call `toast.error()`.
2. **Success Interceptor**:
   (Optional) Automatically log successful events for performance monitoring.
3. **Refactor Components**: Remove the redundant alert/toast logic from components and let the interceptors handle the heavy lifting.

## 🧪 Acceptance Criteria
- [ ] Dropping the database/killing the backend shows a uniform "Server Error" toast on any page.
- [ ] Manually deleting the access cookie triggers an immediate redirection to login upon the next action.
- [ ] Individual components now only focus on the logic they need for `success` paths.
