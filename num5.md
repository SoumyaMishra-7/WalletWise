# Fixes Issue #274: Privacy Vault with Client-Side Encryption

## Description
This Pull Request introduces the **Privacy Vault**, a zero-knowledge, client-side encryption feature allowing users to securely lock sensitive transaction notes and descriptions before they are synced to the backend. This ensures even database administrators cannot read the contents of flagged transactions.

## Technical Implementation
### Backend (`models` & `routes`)
*   **User Schema:** Added `vaultEnabled` (Boolean) and `vaultSalt` (String) fields to store the cryptographically generated salt without storing the password.
*   **Transaction Schema:** Added `isEncrypted` (Boolean) and `encryptedData` (String) payload fields for ciphertexts.
*   **Vault Endpoints:** Implemented `/api/v1/vault/status` and `/api/v1/vault/setup` for managing setup properties.
*   **Controller Updates:** Modified `transactionController` validatiors to ingest the new `encryptedData` block.

### Frontend (`services` & `context`)
*   **WebCrypto API:** Created `encryption.js` to handle `AES-GCM` encryption and PBKDF2 key derivation using SHA-256 with 100,000 iterations.
*   **VaultContext Provider:** Added an in-memory session manager to hold the `cryptoKey`. Keys are instantly cleared upon logout or tab close to ensure high security.
*   **Modals:** Implemented `VaultSetup` and `VaultUnlock` modals styled to natively match the rest of the application.
*   **Integration:**
    *   **AddExpense / AddIncome:** Embedded the "Encrypt Note" lock toggle into the transaction forms.
    *   **Transactions / Dashboard:** Added inline unlocking logic inside the transaction tables/views if `isEncrypted` flag is detected.

## Important Note regarding Zero-Knowledge
The system does not save the decryption password. If users lose their Vault password, their previously encrypted transaction notes will be irrecoverable. The warnings for this are explicitly stated during Vault setup.

## Type of Change
- [x] New feature (non-breaking change which adds functionality)
- [x] Security enhancement

## Verification
- Client-side derivation and encryption flow completed successfully without payload degradation.
- Decryption maps directly to localized user sessions.
