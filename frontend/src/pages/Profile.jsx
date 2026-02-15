import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';
import { departments } from '../assets/inputdata';
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
    <div className="min-h-screen bg-slate-50">
        <AppNavbar />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-10">
            <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition"
            >
            <FaArrowLeft />
            Back to Dashboard
            </Link>

            <div className="mt-4">
            <h1 className="text-3xl font-bold text-slate-800">
                Personal Information
            </h1>
            <p className="text-slate-500 mt-1">
                Manage your personal information and preferences.
            </p>
            </div>
        </div>

        {/* Status Message */}
        {status.message && (
            <div
            className={`mb-6 flex items-center justify-between p-4 rounded-xl border ${
                status.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
            >
            <div className="flex items-center gap-3">
                {status.type === "success" ? (
                <FaCheck />
                ) : (
                <FaExclamationTriangle />
                )}
                <p>{status.message}</p>
            </div>
            <button
                onClick={() => setStatus({ type: "", message: "" })}
                className="text-slate-400 hover:text-slate-600"
            >
                <FaTimes />
            </button>
            </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">

            {/* Avatar Section */}
            <div className="flex flex-col  items-center gap-6 mb-10">

            <div className="w-24 h-24 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xl font-semibold overflow-hidden">
                {formData.avatar ? (
                <img
                    src={formData.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
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
                className="hidden"
                />
                <button
                type="button"
                onClick={handleAvatarClick}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                <FaCamera />
                Change Avatar
                </button>
                <p className="text-xs text-slate-500 mt-2">
                JPG, GIF or PNG. 1MB max.
                </p>
            </div>
            </div>

            {/* Form Grid */}
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                Name
                </label>
                <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
                </label>
                <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2.5 border border-slate-200 bg-slate-100 rounded-xl cursor-not-allowed"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone
                </label>
                <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
            </div>

            {/* Department */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                Department
                </label>
                <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                <option value="">Select Department</option>
                {departments.map((dept, index) => (
                    <option key={index} value={dept}>
                    {dept}
                    </option>
                ))}
                </select>
            </div>

            {/* Year */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                Year
                </label>
                <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
                <option value="4th">4th</option>
                <option value="5th">5th</option>
                </select>
            </div>

            {/* Currency */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                Currency
                </label>
                <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                </select>
            </div>

            {/* Date Format */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                Date Format
                </label>
                <select
                name="dateFormat"
                value={formData.dateFormat}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
            </div>

            {/* Language */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                Language
                </label>
                <select
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                <option>English</option>
                <option>Hindi</option>
                <option>Spanish</option>
                <option>French</option>
                </select>
            </div>

            </form>
        </div>

        {/* Footer Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            {hasChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-2">
                <FaExclamationTriangle />
                You have unsaved changes
            </span>
            )}

            <div className="flex gap-4">
            <button
                type="button"
                onClick={handleReset}
                disabled={!hasChanges}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
            >
                Cancel
            </button>

            <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
            >
                {isSaving ? "Updating..." : "Update Profile"}
            </button>
            </div>
        </div>

        </div>
    </div>
    );
};

export default Profile;
