# [Security/Architecture] Implement API Versioning (/api/v1)

## 🛑 Problem Statement
All current backend endpoints in [server.js](file:///c:/Users/visha/Downloads/WalletWise/backend/server.js) are mounted directly under `/api/` (e.g., `/api/auth`, `/api/transactions`). 

**Architecture Flaw**:
As the application evolves, we may need to introduce breaking changes to the data structure or logic. Without versioning in the URL path, we cannot support older versions of the frontend (or mobile apps) while deploying a new backend, forcing entire system downtimes or breakage.

## ✅ Proposed Solution
Encapsulate all v1 routes under a centralized `/api/v1` router. This follows RESTful API best practices and provides a path for `/api/v2` in the future.

## 🛠️ Implementation Checklist
1. **Create Versioned Router**: Create `backend/routes/v1/index.js` to collect all existing feature routers.
2. **Re-mount in Server**: Update [server.js](file:///c:/Users/visha/Downloads/WalletWise/backend/server.js) to mount the v1 router:
   ```javascript
   const v1Routes = require('./routes/v1');
   app.use('/api/v1', v1Routes);
   ```
3. **Update Frontend Client**: Update the `baseURL` in [frontend/src/api/client.js](file:///c:/Users/visha/Downloads/WalletWise/frontend/src/api/client.js) from `/api` to `/api/v1`.
4. **Backward Compatibility**: Optionally keep `/api` as a redirect or alias to `/api/v1` for a transition period.

## 🧪 Acceptance Criteria
- [ ] All network requests from the frontend now target URLs starting with `/api/v1/...`.
- [ ] The app functionality (login, dashboard, transactions) remains 100% identical.
- [ ] Future endpoints can be added to the same structure without manual server-level mounting.
