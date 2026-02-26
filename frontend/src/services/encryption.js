// src/services/encryption.js

/**
 * Generates a random 16-byte cryptographically secure salt.
 * @returns {string} Base64 encoded salt
 */
export const generateSalt = () => {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array));
};

/**
 * Derives an AES-GCM 256-bit key from a password and salt using PBKDF2 with SHA-256.
 * @param {string} password 
 * @param {string} salt Base64 encoded salt
 * @returns {Promise<CryptoKey>}
 */
export const deriveKey = async (password, salt) => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );

    const saltBuffer = Uint8Array.from(atob(salt), c => c.charCodeAt(0));

    // Derive 256-bit AES-GCM key
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: saltBuffer,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false, // Prevent the key from being exported/extracted
        ["encrypt", "decrypt"]
    );
};

/**
 * Encrypts a plaintext string using the provided CryptoKey.
 * @param {string} text 
 * @param {CryptoKey} key 
 * @returns {Promise<string>} Base64 encoded JSON string of { iv, ciphertext }
 */
export const encryptNote = async (text, key) => {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV is standard for AES-GCM

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        enc.encode(text)
    );

    const ciphertextArray = Array.from(new Uint8Array(ciphertextBuffer));
    const ivArray = Array.from(iv);

    const payload = {
        iv: btoa(String.fromCharCode.apply(null, ivArray)),
        ciphertext: btoa(String.fromCharCode.apply(null, ciphertextArray))
    };

    return btoa(JSON.stringify(payload));
};

/**
 * Decrypts a secure payload back into plaintext.
 * @param {string} encryptedData Base64 encoded JSON string of { iv, ciphertext }
 * @param {CryptoKey} key 
 * @returns {Promise<string>} Plaintext
 */
export const decryptNote = async (encryptedData, key) => {
    try {
        const payloadStr = atob(encryptedData);
        const payload = JSON.parse(payloadStr);

        const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
        const ciphertext = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0));

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            ciphertext
        );

        const dec = new TextDecoder();
        return dec.decode(decryptedBuffer);
    } catch (err) {
        console.error("Decryption failed. Incorrect key or corrupted data.", err);
        throw new Error("Decryption failed. Invalid password.");
    }
};
