import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { BADGES } from '../../utils/gamificationConstants';
import { FaTrophy } from 'react-icons/fa';
import './BadgeGallery.css';

const BadgeGallery = () => {
    const { user } = useAuth();
    const unlockedBadges = user?.unlockedBadges || [];

    return (
        <section className="badge-gallery">
            <div className="badge-gallery-header">
                <h2><FaTrophy color="#eab308" /> Your Achievements</h2>
                <p>Track your financial habits and earn rewards.</p>
            </div>

            <div className="badges-grid">
                {BADGES.map(badge => {
                    const isUnlocked = unlockedBadges.includes(badge.id);
                    return (
                        <div key={badge.id} className={`badge-card ${isUnlocked ? 'unlocked' : 'locked'}`} title={isUnlocked ? 'Unlocked!' : 'Locked'}>
                            <div className="badge-icon">{badge.icon}</div>
                            <h3 className="badge-name">{badge.name}</h3>
                            <p className="badge-description">{badge.description}</p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default BadgeGallery;
