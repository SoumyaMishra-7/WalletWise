import React from 'react';
import './SkeletonLoader.css';

export const SkeletonPulse = ({ className = '' }) => (
    <div className={`skeleton-pulse ${className}`} />
);

export const SkeletonCard = ({ children, className = '' }) => (
    <div className={`skeleton-card ${className}`}>
        {children}
    </div>
);

export const StatSkeleton = () => (
    <SkeletonCard>
        <SkeletonPulse className="skeleton-title" style={{ width: '40%' }} />
        <SkeletonPulse className="skeleton-title" style={{ height: '2.5rem', width: '70%' }} />
        <SkeletonPulse className="skeleton-text" style={{ width: '50%' }} />
    </SkeletonCard>
);

export const ChartSkeleton = () => (
    <SkeletonCard className="skeleton-chart-box">
        <SkeletonPulse className="skeleton-title" style={{ width: '30%' }} />
        <SkeletonPulse style={{ height: '200px', marginTop: '1rem' }} />
    </SkeletonCard>
);

export const TransactionSkeleton = () => (
    <div className="skeleton-transaction-item">
        <SkeletonPulse className="skeleton-circle" />
        <div style={{ flex: 1 }}>
            <SkeletonPulse className="skeleton-text" style={{ width: '60%' }} />
            <SkeletonPulse className="skeleton-text short" />
        </div>
        <SkeletonPulse className="skeleton-text" style={{ width: '20%' }} />
    </div>
);

export const DashboardSkeleton = () => (
    <div className="dashboard-skeleton">
        {/* Greeting Skeleton */}
        <div>
            <SkeletonPulse className="skeleton-title" style={{ width: '200px', height: '2rem' }} />
            <SkeletonPulse className="skeleton-text" style={{ width: '300px' }} />
        </div>

        {/* Stats Grid */}
        <div className="skeleton-stats-grid">
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
        </div>

        {/* Charts Grid */}
        <div className="skeleton-charts-grid">
            <ChartSkeleton />
            <ChartSkeleton />
        </div>

        {/* Transactions */}
        <SkeletonCard>
            <SkeletonPulse className="skeleton-title" style={{ width: '150px' }} />
            <div className="skeleton-transaction-list">
                <TransactionSkeleton />
                <TransactionSkeleton />
                <TransactionSkeleton />
                <TransactionSkeleton />
            </div>
        </SkeletonCard>
    </div>
);

export default DashboardSkeleton;
