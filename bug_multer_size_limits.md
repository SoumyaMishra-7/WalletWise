# [Bug] Missing File Size Limits for Avatar Uploads

## 🛑 Problem Statement
The current backend setup for user avatar uploads lacks strict file size enforcement. 

**Vulnerability**:
A malicious or unintentional user could upload a very large image (e.g., a 100MB RAW file). Because the backend likely uses `multer` to process these into data URIs for Cloudinary, this can cause:
1. **Memory exhausting** on the Node.js server.
2. **High latency** for the specific user and others sharing the event loop.
3. **Storage bloat** in the Cloudinary account.

## ✅ Proposed Solution
Configure `multer` to strictly limit the allowed file size for all multi-part form uploads, especially for profile pictures.

## 🛠️ Implementation Checklist
1. **Configure Limits**:
   In the file where `multer` is initialized (likely `backend/utils/multer.js` or directly in `authController.js`), add the `limits` property:
   ```javascript
   const upload = multer({
     storage: storage,
     limits: { fileSize: 2 * 1024 * 1024 } // Limit to 2MB
   });
   ```
2. **Error Handling**:
   Ensure that when a file exceeds this limit, the server doesn't crash but returns a clear JSON error:
   ```javascript
   // In the route handler or global error middleware
   if (err instanceof multer.MulterError) {
     if (err.code === 'LIMIT_FILE_SIZE') {
       return res.status(400).json({ success: false, message: 'File is too large. Max size is 2MB.' });
     }
   }
   ```

## 🧪 Acceptance Criteria
- [ ] Attempting to upload a 5MB image returns a `400 Bad Request` with a "File too large" message.
- [ ] Standard 200KB-800KB profile images are still accepted without issue.
- [ ] Frontend shows the specific "too large" error in a toast or alert.
