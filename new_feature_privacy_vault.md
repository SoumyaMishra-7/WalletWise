# Feature Request: Privacy Vault with Client-Side Encryption

## 🛑 Level: Hard

## 📝 Description
Some financial transactions are highly sensitive (e.g., medical expenses, private subscriptions). While WalletWise is secure, a "Privacy Vault" adds an extra layer of protection by encrypting specific transaction notes or entire sensitive categories using a user-provided passphrase that is NEVER stored on the server.

This ensures that even if the database is compromised, the sensitive notes remain unreadable.

**Key Requirements**:
- **Zero-Knowledge Architecture**: The encryption key is derived from a secondary password known ONLY to the user.
- **Selective Encryption**: Users can toggle "Encrypt this note" for individual transactions.
- **Secure Key Derivation**: Use PBKDF2 or Argon2 for key stretching on the client side.
- **Biometric Unlock (Mobile/Web support)**: Integrated with the Web Authn API for easier access after the initial password entry.

## 🛠️ Implementation Plan

### Backend Changes
1. **Schema Update**: Add a field `isEncrypted` (Boolean) and `encryptedData` (String - Ciphertext).
2. **API Logic**: Ensure that the backend does not attempt to parse `encryptedData`; it simply stores and retrieves the blob.
3. **Vault Metadata**: Store non-sensitive metadata (like hashing salt) required for the client to derive the key.

### Frontend Changes
1. **Encryption Service**: Implement `frontend/src/services/encryption.js` using the Web Crypto API.
2. **Vault Setup UI**: A setup wizard to explain the importance of the secondary password (and that it cannot be recovered).
3. **Decryption UI**: A "blur" or "lock icon" over encrypted data that reveals content only after the vault is unlocked in the current session.

### Security Consideration
- Use AES-256-GCM for authenticated encryption.
- Ensure the master key never touches the local storage in plain text; keep it in memory only.

## 🧪 Acceptance Criteria
- [ ] User can enable a "Secure Vault" with a secondary password.
- [ ] Encrypted notes are stored as unreadable strings in the MongoDB database.
- [ ] Vault remains unlocked only for the duration of the browser session.
- [ ] A lost vault password correctly results in unrecoverable encrypted data (confirming Zero-Knowledge).
