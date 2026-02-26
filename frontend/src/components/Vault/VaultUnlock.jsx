import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import { FaUnlockAlt, FaTimes } from 'react-icons/fa';
import './VaultModal.css';

const VaultUnlock = ({ onClose, onSuccess }) => {
    const { unlockVault } = useVault();
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await unlockVault(password);
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (err) {
            setError(err.message || 'Incorrect vault password.');
            setPassword(''); // clear field
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="vault-modal-overlay">
            <div className="vault-modal">
                {onClose && <button className="close-btn" onClick={onClose}><FaTimes /></button>}

                <div className="vault-modal-header unlock">
                    <div className="icon-wrapper">
                        <FaUnlockAlt />
                    </div>
                    <h2>Unlock Vault</h2>
                    <p>Enter your vault password to view encrypted notes for this session.</p>
                </div>

                <form onSubmit={handleSubmit} className="vault-form">
                    {error && <div className="vault-error">{error}</div>}

                    <div className="form-group">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Vault Password"
                            required
                            autoFocus
                        />
                    </div>

                    <button type="submit" className="btn-primary unlock-btn" disabled={loading}>
                        {loading ? 'Decrypting...' : 'Unlock'}
                    </button>

                    {onClose && (
                        <button type="button" className="btn-secondary cancel-btn" onClick={onClose}>
                            Cancel
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default VaultUnlock;
