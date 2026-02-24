# [Security] Implement Content Security Policy (CSP) via Helmet

## 🛑 Problem Statement
The [server.js](file:///c:/Users/visha/Downloads/WalletWise/backend/server.js) uses `helmet()` but it is currently using the default configuration, which might be too permissive or not explicitly tuned for our frontend requirements.

**Risks**:
- **Cross-Site Scripting (XSS)**: If an attacker manages to inject a `<script>` tag, the browser will execute it because there is no policy restricting script sources.
- **Data Exfiltration**: Scripts could send user data to unauthorized third-party domains.

## ✅ Proposed Solution
Override the default Helmet CSP to allow only specific, trusted domains that our app actually uses (e.g., Google Fonts, Cloudinary, Chart.js CDN if used).

## 🛠️ Implementation Checklist
1. **Audit Dependencies**: Identify all external URLs being called from the frontend (Images, Scripts, Styles).
2. **Configure Helmet**: Update `app.use(helmet())` in `server.js`:
   ```javascript
   app.use(helmet.contentSecurityPolicy({
     directives: {
       defaultSrc: ["'self'"],
       scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"], // Add trusted script origins
       styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
       imgSrc: ["'self'", "data:", "https://res.cloudinary.com"], // Allow Cloudinary images
       connectSrc: ["'self'", "https://api.walletwise.com"] // Our actual API
     }
   }));
   ```
3. **Refine Inline Scripts**: Aim to remove `'unsafe-inline'` by moving all scripts to external `.js` files or using nonces.

## 🧪 Acceptance Criteria
- [ ] Browsing the app with Chrome DevTools open shows NO "Content Security Policy" warnings/errors in the console.
- [ ] All charts, images, and fonts load correctly.
- [ ] Tools like `Mozilla Observatory` reflect an improved security score for the API.
- [ ] Standard JSON responses should include the `Content-Security-Policy` header.
