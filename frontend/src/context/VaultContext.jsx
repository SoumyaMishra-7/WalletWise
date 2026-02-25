import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { deriveKey, generateSalt } from '../services/encryption';
import { useAuth } from './AuthContext';

const VaultContext = createContext(null);

export const VaultProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();

    // Status
    const [isVaultEnabled, setIsVaultEnabled] = useState(false);
    const [vaultSalt, setVaultSalt] = useState(null);
    const [loadingVault, setLoadingVault] = useState(true);

    // In-memory key only
    const [cryptoKey, setCryptoKey] = useState(null);

    const checkVaultStatus = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoadingVault(true);
        try {
            const res = await api.get('/api/vault/status');
            if (res.data.success) {
                setIsVaultEnabled(res.data.vaultEnabled);
                setVaultSalt(res.data.vaultSalt);
            }
        } catch (err) {
            console.error('Failed to check vault status:', err);
        } finally {
            setLoadingVault(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        checkVaultStatus();
        return () => {
            // Memory cleanup on unmount/logout
            setCryptoKey(null);
        };
    }, [checkVaultStatus]);

    /**
     * Initializes the Vault for the first time.
     */
    const setupVault = async (password) => {
        const newSalt = generateSalt();
        // Fire request to backend to save the salt
        try {
            const res = await api.post('/api/vault/setup', { salt: newSalt });
            if (res.data.success) {
                setIsVaultEnabled(true);
                setVaultSalt(newSalt);
                // Immediately unlock it for this session
                const key = await deriveKey(password, newSalt);
                setCryptoKey(key);
                return true;
            }
            return false;
        } catch (err) {
            console.error('Vault setup error:', err);
            throw err;
        }
    };

    /**
     * Unlocks the vault by deriving the key and storing it in memory.
     */
    const unlockVault = async (password) => {
        if (!vaultSalt) throw new Error("Vault not properly configured. Missing salt.");
        try {
            const key = await deriveKey(password, vaultSalt);
            setCryptoKey(key);
            return true;
        } catch (err) {
            console.error('Failed to unlock vault:', err);
            throw new Error("Invalid password or corrupted vault.");
        }
    };

    /**
     * Locks the vault by destroying the key reference.
     */
    const lockVault = () => {
        setCryptoKey(null);
    };

    return (
        <VaultContext.Provider value={{
            isVaultEnabled,
            isUnlocked: !!cryptoKey,
            loadingVault,
            cryptoKey,
            setupVault,
            unlockVault,
            lockVault,
            checkVaultStatus
        }}>
            {children}
        </VaultContext.Provider>
    );
};

export const useVault = () => useContext(VaultContext);
