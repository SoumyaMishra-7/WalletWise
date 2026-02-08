import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';
import './Settings.css';

const Profile = () => {
    const { user, loading, updateProfile } = useAuth();
    const lastUserIdRef = useRef(null);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        department: '',
        year: '1st',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        language: 'English'
    });

    useEffect(() => {
        if (!user) {
            lastUserIdRef.current = null;
            return;
        }
        if (lastUserIdRef.current === user._id) return;
        setFormData((prev) => ({
            ...prev,
            fullName: user.fullName || '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            department: user.department || '',
            year: user.year || '1st'
        }));
        lastUserIdRef.current = user._id;
    }, [user]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleReset = () => {
        if (!user) return;
        setStatus({ type: '', message: '' });
        setFormData((prev) => ({
            ...prev,
            fullName: user.fullName || '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            department: user.department || '',
            year: user.year || '1st'
        }));
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (!user || isSaving) return;
        setIsSaving(true);
        setStatus({ type: '', message: '' });
        try {
            const payload = {
                fullName: formData.fullName,
                phoneNumber: formData.phoneNumber,
                department: formData.department,
                year: formData.year
            };
            const data = await updateProfile(payload);
            if (data?.success) {
                setFormData((prev) => ({
                    ...prev,
                    fullName: data.user?.fullName || '',
                    email: data.user?.email || '',
                    phoneNumber: data.user?.phoneNumber || '',
                    department: data.user?.department || '',
                    year: data.user?.year || '1st'
                }));
                setStatus({ type: 'success', message: 'Profile updated successfully.' });
            } else {
                setStatus({ type: 'error', message: data?.message || 'Unable to save changes.' });
            }
        } catch (error) {
            const message = error?.response?.data?.message || 'Unable to save changes.';
            setStatus({ type: 'error', message });
        } finally {
            setIsSaving(false);
        }
    };

    const userInitials = formData.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'U';

    return (
        <div className="settings-page">
            <header className="settings-header">
                <div>
                    <Link to="/dashboard" className="back-link">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </Link>
                    <span className="eyebrow">User Profile</span>
                    <h1>Personal Information</h1>
                    <p>Manage your personal information and preferences.</p>
                </div>
            </header>

            <section className="settings-section">
                <div className="section-heading">
                    <h2>User Profile</h2>
                    <p>Personal information and display preferences.</p>
                </div>
                <div className="profile-card">
                    <div className="avatar-block">
                        <div className="avatar-circle">{userInitials}</div>
                        <button className="btn-secondary">Change Avatar</button>
                    </div>
                    <div className="profile-form">
                        <label>
                            Name
                            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} />
                        </label>
                        <label>
                            Email
                            <input type="email" name="email" value={formData.email} disabled />
                        </label>
                        <label>
                            Phone
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                            />
                        </label>
                        <label>
                            Department
                            <input
                                type="text"
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                            />
                        </label>
                        <label>
                            Year
                            <select name="year" value={formData.year} onChange={handleChange}>
                                <option value="1st">1st</option>
                                <option value="2nd">2nd</option>
                                <option value="3rd">3rd</option>
                                <option value="4th">4th</option>
                                <option value="5th">5th</option>
                            </select>
                        </label>
                        <label>
                            Currency
                            <select name="currency" value={formData.currency} onChange={handleChange}>
                                <option value="INR">INR (Rs)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (EUR)</option>
                                <option value="GBP">GBP (GBP)</option>
                            </select>
                        </label>
                        <label>
                            Date Format
                            <select name="dateFormat" value={formData.dateFormat} onChange={handleChange}>
                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            </select>
                        </label>
                        <label>
                            Language
                            <select name="language" value={formData.language} onChange={handleChange}>
                                <option>English</option>
                                <option>Hindi</option>
                                <option>Spanish</option>
                                <option>French</option>
                            </select>
                        </label>
                    </div>
                </div>
            </section>

            <form className="settings-actions" onSubmit={handleSave}>
                {status.message && (
                    <div className={`settings-status ${status.type}`}>{status.message}</div>
                )}
                <div className="settings-actions-buttons">
                    <button
                        className="btn-secondary"
                        type="button"
                        onClick={handleReset}
                        disabled={loading || isSaving || !user}
                    >
                        Cancel
                    </button>
                    <button className="btn-primary" type="submit" disabled={loading || isSaving || !user}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Profile;
