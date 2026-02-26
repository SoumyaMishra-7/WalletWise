import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { FaTrophy, FaFireAlt, FaMedal, FaStar, FaLock, FaArrowLeft } from 'react-icons/fa';
import confetti from 'canvas-confetti';
import './GamificationDashboard.css';

const GamificationDashboard = () => {
    const [gamification, setGamification] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchGamificationData = async () => {
            try {
                const response = await api.get('/api/gamification/status');
                if (response.data.success) {
                    setGamification(response.data.data);

                    // Trigger confetti if they just leveled up or got a new badge recently
                    // (Simple heuristics: high progress or specific flags if passed, here we just do a tiny pop on load for fun)
                    if (response.data.data.level > 1) {
                        confetti({
                            particleCount: 50,
                            spread: 60,
                            origin: { y: 0.8 },
                            colors: ['#FFD700', '#FFA500', '#FF4500']
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to fetch gamification stats:', err);
                setError('Could not load achievements.');
            } finally {
                setLoading(false);
            }
        };

        fetchGamificationData();
    }, []);

    if (loading) {
        return (
            <div className="gamification-container loading">
                <div className="spinner"></div>
                <p>Loading your achievements...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="gamification-container error">
                <h2>Oops!</h2>
                <p>{error}</p>
                <button className="btn-primary" onClick={() => navigate('/dashboard')}>Go Back</button>
            </div>
        );
    }

    const { level, totalXP, progress, nextLevelXP, currentStreak, highestStreak, unlockedBadges, allBadges } = gamification;

    return (
        <div className="gamification-container">
            <header className="gami-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <FaArrowLeft /> Back
                </button>
                <h1>Your Financial Journey</h1>
                <p>Turn good habits into great rewards.</p>
            </header>

            <div className="stats-hero">
                <div className="level-ring">
                    <div className="level-number">
                        <span>Lvl</span>
                        <h2>{level}</h2>
                    </div>
                    <svg viewBox="0 0 36 36" className="circular-chart orange">
                        <path className="circle-bg"
                            d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path className="circle"
                            strokeDasharray={`${progress}, 100`}
                            d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                    </svg>
                </div>

                <div className="xp-details">
                    <h3>{totalXP} XP <span>Total Experience</span></h3>
                    <p>{nextLevelXP - totalXP} XP to Level {level + 1}</p>
                    <div className="xp-bar-container">
                        <div className="xp-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                <div className="streak-box">
                    <FaFireAlt className={`streak-icon ${currentStreak > 0 ? 'active' : ''}`} />
                    <div className="streak-text">
                        <h3>{currentStreak} Day{currentStreak !== 1 ? 's' : ''}</h3>
                        <p>Current Streak</p>
                        <small>Best: {highestStreak} days</small>
                    </div>
                </div>
            </div>

            <section className="badges-section">
                <div className="section-title">
                    <h2><FaMedal /> Badges Gallery</h2>
                    <span>{unlockedBadges.length} / {allBadges.length} Unlocked</span>
                </div>

                <div className="badges-grid">
                    {allBadges.map(badge => {
                        const isUnlocked = unlockedBadges.includes(badge.id);
                        return (
                            <div key={badge.id} className={`badge-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
                                <div className="badge-icon-wrapper">
                                    {isUnlocked ? (
                                        <span className="badge-emoji">{badge.icon}</span>
                                    ) : (
                                        <FaLock className="lock-icon" />
                                    )}
                                </div>
                                <h4>{badge.name}</h4>
                                <p>{badge.description}</p>
                                {isUnlocked && <div className="unlocked-label">Achieved</div>}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default GamificationDashboard;
