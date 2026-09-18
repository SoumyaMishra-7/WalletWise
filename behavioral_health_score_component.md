import React, { useState, useMemo } from 'react';
import { 
  Heart, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Zap, 
  ShieldAlert, 
  ArrowRight, 
  RefreshCw 
} from 'lucide-react';

const BehavioralHealthHub = () => {
  // Mock data representing state coming from the WalletWise API
  const [financialData, setFinancialData] = useState({
    monthlyIncome: 65000,
    monthlyExpenses: 42000,
    monthlySavings: 23000,
    emergencyFund: 120000,
    impulseSpendCount: 7,
    creditCardUtilization: 42, // percentage
  });

  const [activeTab, setActiveTab] = useState('overview');

  // Algorithm calculating behavioral health metrics
  const healthMetrics = useMemo(() => {
    const savingsRate = (financialData.monthlySavings / financialData.monthlyIncome) * 100;
    const emergencyMonths = (financialData.emergencyFund / financialData.monthlyExpenses).toFixed(1);
    const utilization = financialData.creditCardUtilization;

    // Weighting algorithm
    let score = 0;
    if (savingsRate >= 20) score += 30;
    else if (savingsRate >= 10) score += 18;
    else score += 8;

    if (emergencyMonths >= 6) score += 30;
    else if (emergencyMonths >= 3) score += 20;
    else score += 10;

    if (utilization <= 30) score += 25;
    else if (utilization <= 50) score += 15;
    else score += 5;

    if (financialData.impulseSpendCount <= 3) score += 15;
    else if (financialData.impulseSpendCount <= 8) score += 8;
    else score += 2;

    return {
      overallScore: score,
      savingsRate: savingsRate.toFixed(1),
      emergencyMonths,
      utilization,
    };
  }, [financialData]);

  // Real-time behavioral nudges generator based on score
  const behavioralNudges = useMemo(() => {
    const nudges = [];

    if (healthMetrics.utilization > 30) {
      nudges.push({
        id: 'credit-alert',
        type: 'warning',
        title: 'High Credit Utilization Spike',
        message: `Your credit utilization is at ${healthMetrics.utilization}%. Keeping it under 30% boosts your credit score significantly.`,
        actionText: 'Set Auto-Pay Threshold',
      });
    }

    if (parseFloat(healthMetrics.emergencyMonths) < 6) {
      nudges.push({
        id: 'emergency-cushion',
        type: 'insight',
        title: 'Build Emergency Safety Net',
        message: `You currently have ${healthMetrics.emergencyMonths} months of expense runway. Aim for 6 months to shield against sudden unexpected costs.`,
        actionText: 'Automate $50/week Savings',
      });
    }

    if (financialData.impulseSpendCount > 5) {
      nudges.push({
        id: 'impulse-control',
        type: 'behavioral',
        title: 'Frequent Micro-Transactions Detected',
        message: `You made ${financialData.impulseSpendCount} small non-essential purchases this week totaling $140. Implementing a 24-hour cooling rule could save you ~$500/month.`,
        actionText: 'Enable 24hr Spend Buffer',
      });
    }

    return nudges;
  }, [healthMetrics, financialData]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-500 stroke-emerald-500 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-500 stroke-amber-500 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-500 stroke-rose-500 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Heart className="w-8 h-8 text-emerald-400 fill-emerald-400/20" />
              Behavioral Financial Health Hub
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Real-time psychology-driven financial guidance and predictive habit analysis.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <button 
              onClick={() => setFinancialData(prev => ({ ...prev, impulseSpendCount: Math.max(0, prev.impulseSpendCount - 1) }))}
              className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Analytics
            </button>
          </div>
        </div>

        {/* Primary Health Score Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Score Card */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Zap className="w-32 h-32 text-slate-100" />
            </div>
            
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Financial Wellness Index
            </h2>

            <div className={`relative w-40 h-40 rounded-full flex items-center justify-center border-8 ${getScoreColor(healthMetrics.overallScore)} mb-4`}>
              <div>
                <span className="text-5xl font-black text-white">{healthMetrics.overallScore}</span>
                <span className="text-slate-400 text-xs block font-medium">out of 100</span>
              </div>
            </div>

            <p className="text-sm text-slate-300 font-medium">
              {healthMetrics.overallScore >= 80 ? 'Optimal Habits & Resilience' : healthMetrics.overallScore >= 60 ? 'Stable with Room for Growth' : 'High Financial Friction Detected'}
            </p>
          </div>

          {/* Core Metrics Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400 uppercase">Savings Rate</span>
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white mt-2">{healthMetrics.savingsRate}%</p>
                <p className="text-xs text-slate-400 mt-1">Target: &gt; 20% of net income</p>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, (healthMetrics.savingsRate / 20) * 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400 uppercase">Emergency Runway</span>
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white mt-2">{healthMetrics.emergencyMonths} Mo</p>
                <p className="text-xs text-slate-400 mt-1">Target: 6.0 months buffer</p>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(100, (healthMetrics.emergencyMonths / 6) * 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400 uppercase">Credit Utilization</span>
                <AlertCircle className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white mt-2">{healthMetrics.utilization}%</p>
                <p className="text-xs text-slate-400 mt-1">Optimal threshold: &lt; 30%</p>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${Math.min(100, healthMetrics.utilization)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400 uppercase">Impulse Buying Index</span>
                <Zap className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white mt-2">{financialData.impulseSpendCount} Triggers</p>
                <p className="text-xs text-slate-400 mt-1">Detected in last 7 days</p>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-rose-400 h-full rounded-full" style={{ width: `${Math.min(100, (financialData.impulseSpendCount / 10) * 100)}%` }}></div>
              </div>
            </div>

          </div>
        </div>

        {/* Real-time Behavioral Nudges Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Active Behavioral Nudges ({behavioralNudges.length})
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Automated actionable insights to correct financial habits</p>
            </div>
          </div>

          <div className="space-y-4">
            {behavioralNudges.map((nudge) => (
              <div 
                key={nudge.id}
                className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition"
              >
                <div className="flex items-start gap-3">
                  {nudge.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />}
                  {nudge.type === 'insight' && <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />}
                  {nudge.type === 'behavioral' && <Zap className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />}
                  <div>
                    <h3 className="text-sm font-semibold text-white">{nudge.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{nudge.message}</p>
                  </div>
                </div>

                <button className="self-start sm:self-center px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg transition flex items-center gap-1.5 shrink-0">
                  {nudge.actionText}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {behavioralNudges.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">
                🎉 No behavioral alerts! Your spending and savings habits are aligned with optimal targets.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BehavioralHealthHub;