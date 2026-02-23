# [Bug] Regex Injection Vulnerability in Transaction Search

## 🛑 Problem Statement
In [transactionController.js](file:///c:/Users/visha/Downloads/WalletWise/backend/controllers/transactionController.js), the search functionality is implemented as follows:

```javascript
// c:/Users/visha/Downloads/WalletWise/backend/controllers/transactionController.js:201
if (search) {
    const searchRegex = new RegExp(search, 'i');
    query.$or = [
        { description: searchRegex },
        { category: searchRegex }
    ];
}
```

The `search` variable is taken directly from `req.query` without any sanitization. This leads to several issues:
1. **Invalid Regex Crash**: If a user types characters like `*`, `(`, or `[`, the `new RegExp` constructor throws a syntax error, causing the entire API request to fail with a 500 status.
2. **ReDoS (Regular Expression Denial of Service)**: Malicious users can input patterns like [(a+)+$](file:///c:/Users/visha/Downloads/WalletWise/backend/controllers/authController.js#355-368) along with long strings to cause exponential processing time on the server, effectively freezing the API for all users.

## ✅ Proposed Solution
We need to sanitize all user-provided strings before they are used to create a regular expression. The most reliable way is to escape all special characters that have functional meaning in Regex.

## 🛠️ Implementation Checklist
1. **Create Utility**: Add an `escapeRegex` function in a shared utility file (e.g., `backend/utils/helpers.js`).
   ```javascript
   const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
   ```
2. **Apply Sanitization**: Modify [getAllTransactions](file:///c:/Users/visha/Downloads/WalletWise/backend/controllers/transactionController.js#152-273) in [transactionController.js](file:///c:/Users/visha/Downloads/WalletWise/backend/controllers/transactionController.js) to escape the `search` variable:
   ```javascript
   const safeSearch = escapeRegex(search);
   const searchRegex = new RegExp(safeSearch, 'i');
   ```
3. **Validation**: Ensure that searching for a literal `*` or `(` correctly tries to find those characters in descriptions without crashing.

## 🧪 Acceptance Criteria
- [ ] Typing `[` in the search bar does NOT return a 500 error.
- [ ] Special regex characters are treated as literal text.
- [ ] Server remains responsive under heavy search loads with complex strings.
