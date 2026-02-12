import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

import './Settings.css';
import { FaUserCircle, FaArrowLeft, FaCamera, FaCheck, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const Profile = () => {
    const { user, loading, updateProfile } = useAuth();
    const lastUserIdRef = useRef(null);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        avatar: '',
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
            avatar: user.avatar || '',
            department: user.department || '',
            year: user.year || '1st',
            currency: user.currency || 'USD',
            dateFormat: user.dateFormat || 'MM/DD/YYYY',
            language: user.language || 'English'
        }));
        lastUserIdRef.current = user._id;
        setHasChanges(false);
    }, [user]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setHasChanges(true);
        setStatus({ type: '', message: '' });
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, avatar: reader.result }));
                setHasChanges(true); // Avatar change is a change
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current.click();
    };

    /* Removed handleEdit */

    const handleReset = () => {
        if (!user) return;
        setStatus({ type: '', message: '' });
        setFile(null);
        setFormData((prev) => ({
            ...prev,
            fullName: user.fullName || '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            avatar: user.avatar || '',
            department: user.department || '',
            year: user.year || '1st',
            currency: user.currency || 'USD',
            dateFormat: user.dateFormat || 'MM/DD/YYYY',
            language: user.language || 'English'
        }));
        setHasChanges(false);
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (!user || isSaving) return;
        setIsSaving(true);
        setStatus({ type: '', message: '' });
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('fullName', formData.fullName);
            formDataToSend.append('phoneNumber', formData.phoneNumber);
            formDataToSend.append('department', formData.department);
            formDataToSend.append('year', formData.year);
            formDataToSend.append('currency', formData.currency);
            formDataToSend.append('dateFormat', formData.dateFormat);
            formDataToSend.append('language', formData.language);

            if (file) {
                formDataToSend.append('file', file);
            }

            const data = await updateProfile(formDataToSend);
            if (data?.success) {
                setFormData((prev) => ({
                    ...prev,
                    fullName: data.user?.fullName || '',
                    email: data.user?.email || '',
                    phoneNumber: data.user?.phoneNumber || '',
                    avatar: data.user?.avatar || '',
                    department: data.user?.department || '',
                    year: data.user?.year || '1st',
                    currency: data.user?.currency || 'USD',
                    dateFormat: data.user?.dateFormat || 'MM/DD/YYYY',
                    language: data.user?.language || 'English'
                }));
                setStatus({ type: 'success', message: 'Profile updated successfully.' });
                setFile(null);
                setHasChanges(false);
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

    const userInitials = (formData.fullName || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'U';

    return (
        <div className="settings-page">
            <AppNavbar />

            <div className="settings-container">
                <header className="settings-header">
                    <Link to="/dashboard" className="back-link">
                        <FaArrowLeft />
                        Back to Dashboard
                    </Link>
                    <div className="header-content">
                        <span className="eyebrow">User Profile</span>
                        <h1>Personal Information</h1>
                        <p>Manage your personal information and preferences.</p>
                    </div>
                </header>

                {status.message && (
                    <div className={`status-message ${status.type}`}>
                        <div className="status-icon">
                            {status.type === 'success' ? <FaCheck /> : <FaExclamationTriangle />}
                        </div>
                        <p>{status.message}</p>
                        <button onClick={() => setStatus({ type: '', message: '' })} className="close-status">
                            <FaTimes />
                        </button>
                    </div>
                )}

                <form onSubmit={handleSave} className="settings-form">
                    <section className="settings-card">
                        <div className="card-header">
                            <div className="card-icon blue">
                                <FaUserCircle />
                            </div>
                            <div>
                                <h2>Profile Details</h2>
                                <p>Update your photo and personal details here.</p>
                            </div>
                        </div>

                        <div className="form-grid" style={{ marginBottom: '2rem' }}>
                            {/* Avatar Section */}
                            <div className="form-group" style={{ gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', gap: '1.5rem' }}>
                                <div className="avatar-preview" style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    background: 'var(--brand-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '2rem',
                                    fontWeight: '700'
                                }}>
                                    {formData.avatar ? (
                                        <img
                                            src={formData.avatar}
                                            alt="Profile"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        userInitials
                                    )}
                                </div>
                                <div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        className="btn-secondary"
                                        onClick={handleAvatarClick}
                                        type="button"
                                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                                    >
                                        <FaCamera style={{ marginRight: '0.5rem' }} />
                                        Change Avatar
                                    </button>
                                    <p className="field-info" style={{ marginTop: '0.5rem' }}>
                                        JPG, GIF or PNG. 1MB max.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>Name</label>
                                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" name="email" value={formData.email} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Department</label>
                                <input
                                    type="text"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Year</label>
                                <div className="select-wrapper">
                                    <select name="year" value={formData.year} onChange={handleChange}>
                                        <option value="1st">1st</option>
                                        <option value="2nd">2nd</option>
                                        <option value="3rd">3rd</option>
                                        <option value="4th">4th</option>
                                        <option value="5th">5th</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Currency</label>
                                <div className="select-wrapper">
                                    <select name="currency" value={formData.currency} onChange={handleChange}>
                                        <option value="INR">INR (Rs)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (EUR)</option>
                                        <option value="GBP">GBP (GBP)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Date Format</label>
                                <div className="select-wrapper">
                                    <select name="dateFormat" value={formData.dateFormat} onChange={handleChange}>
                                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Language</label>
                                <div className="select-wrapper">
                                    <select name="language" value={formData.language} onChange={handleChange}>
                                        <option>English</option>
                                        <option>Hindi</option>
                                        <option>Spanish</option>
                                        <option>French</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>
                </form>

                <div className="settings-footer">
                    <div className="footer-content">
                        <div className="unsaved-changes">
                            {hasChanges && (
                                <>
                                    <FaExclamationTriangle />
                                    <span>You have unsaved changes</span>
                                </>
                            )}
                        </div>

                        <div className="footer-actions">
                            <button
                                type="button"
                                onClick={handleReset}
                                disabled={loading || isSaving || !user || !hasChanges}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                type="button" /* Changed to type button for safety, but wrapping form submit needs trigger */
                                onClick={handleSave} /* Direct handler */
                                disabled={loading || isSaving || !user || !hasChanges}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="spinner-small"></div>
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
