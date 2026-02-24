import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import './EmptyState.css';

const EmptyState = ({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className = ""
}) => {
    const navigate = useNavigate();

    const handleDefaultAction = () => {
        navigate('/add-expense');
    };

    return (
        <div className={`empty-state-container ${className}`}>
            <div className="empty-state-content">
                <div className="empty-state-icon-wrapper">
                    {Icon ? <Icon size={48} className="empty-state-icon" /> : <PlusCircle size={48} className="empty-state-icon" />}
                </div>
                <h3 className="empty-state-title">{title || 'No results found'}</h3>
                <p className="empty-state-description">
                    {description || 'We couldn\'t find what you\'re looking for. Try adjusting your filters or adding a new entry.'}
                </p>

                {actionLabel && (
                    <button
                        className="empty-state-action-btn"
                        onClick={onAction || handleDefaultAction}
                    >
                        <PlusCircle size={18} />
                        <span>{actionLabel}</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default EmptyState;
