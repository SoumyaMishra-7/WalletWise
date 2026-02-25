import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import { FaLock, FaTimes, FaShieldAlt } from 'react-icons/fa';
import './VaultModal.css'; // Will create CSS for shared vault modal styles

const VaultSetup = ({ onClose, onSuccess }) => {
    const { setupVault } = useVault();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (!agreed) {
            setError('You must acknowledge that passwords cannot be recovered.');
            return;
        }

        setLoading(true);
        try {
            await setupVault(password);
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (err) {
            setError(err.message || 'Failed to setup vault. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="vault-modal-overlay">
            <div className="vault-modal">
                <button className="close-btn" onClick={onClose}><FaTimes /></button>

                <div className="vault-modal-header setup">
                    <div className="icon-wrapper">
                        <FaShieldAlt />
                    </div>
                    <h2>Setup Privacy Vault</h2>
                    <p>Protect your most sensitive transaction notes with zero-knowledge encryption.</p>
                </div>

                <form onSubmit={handleSubmit} className="vault-form">
                    {error && <div className="vault-error">{error}</div>}

                    <div className="form-group">
                        <label>Vault Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a strong password"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Type password again"
                            required
                        />
                    </div>

                    <div className="vault-warning-box">
                        <FaLock className="warning-icon" />
                        <div className="warning-text">
                            <strong>Zero-Knowledge Warning</strong>
                            <p>We do not store your vault password. If you lose it, your encrypted notes will be permanently inaccessible. There is no "Forgot Password" for the Vault.</p>
                        </div>
                    </div>

                    <div className="checkbox-group">
                        <input
                            type="checkbox"
                            id="vault-agree"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                        />
                        <label htmlFor="vault-agree">
                            I understand that my vault password cannot be recovered.
                        </label>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Securing Vault...' : 'Enable Vault'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default VaultSetup;
