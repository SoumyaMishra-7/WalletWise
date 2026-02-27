import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { FaGraduationCap, FaTrendingUp, FaArrowLeft, FaDollarSign, FaSearch, FaInfoCircle } from 'react-icons/fa';
import './InvestmentSimulator.css';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { toast } from 'react-hot-toast';

const InvestmentSimulator = () => {
    const [marketData, setMarketData] = useState([]);
    const [portfolio, setPortfolio] = useState([]);
    const [totalValue, setTotalValue] = useState(0);
    const [availableToInvest, setAvailableToInvest] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTooltip, setActiveTooltip] = useState(null);

    const fetchSimulationData = async () => {
        try {
            setLoading(true);
            const [marketRes, portfolioRes] = await Promise.all([
                api.get('/investments/market'),
                api.get('/investments/portfolio')
            ]);

            if (marketRes.data?.success) {
                setMarketData(marketRes.data.data);
            }
            if (portfolioRes.data?.success) {
                setPortfolio(portfolioRes.data.data.portfolio);
                setTotalValue(portfolioRes.data.data.totalPortfolioValue);
                setAvailableToInvest(portfolioRes.data.data.availableToInvest);
            }
        } catch (error) {
            console.error('Simulation error:', error);
            toast.error('Failed to load simulation data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSimulationData();
    }, []);

    const handleBuy = async (symbol) => {
        try {
            const response = await api.post('/investments/buy', { symbol, quantity: 1 });
            if (response.data?.success) {
                toast.success(`Bought 1 share of ${symbol}`);
                fetchSimulationData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to buy share');
        }
    };

    const handleSell = async (symbol) => {
        try {
            const response = await api.post('/investments/sell', { symbol, quantity: 1 });
            if (response.data?.success) {
                toast.success(`Sold 1 share of ${symbol}`);
                fetchSimulationData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to sell share');
        }
    };

    const educationalTerms = {
        'ETF': 'Exchange Traded Fund. A basket of securities that trades like a stock.',
        'Market Cap': 'Total market value of a company\'s outstanding shares.',
        'Dividend': 'A distribution of a portion of a company\'s earnings to its shareholders.',
        'Bull Market': 'A financial market where prices are rising or expected to rise.',
        'Bear Market': 'A financial market where prices are falling or expected to fall.'
    };

    if (loading) return <DashboardSkeleton />;

    const filteredMarket = marketData.filter(stock =>
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="simulator-page">
            <header className="simulator-topbar">
                <Link to="/dashboard" className="back-link">
                    <FaArrowLeft /> Back to Dashboard
                </Link>
                <span className="eyebrow">Virtual Trading</span>
                <h1>Micro-Investment Simulator 📈</h1>
                <p>Learn to invest your budget surplus safely. Zero financial risk.</p>
            </header>

            <div className="simulator-grid">
                <div className="left-column">
                    {/* Portfolio Summary */}
                    <section className="portfolio-summary card">
                        <h2><FaDollarSign /> Your Virtual Portfolio</h2>
                        <div className="balances">
                            <div className="balance-item">
                                <span className="label">Invested Value</span>
                                <span className="value">${totalValue.toFixed(2)}</span>
                            </div>
                            <div className="balance-item">
                                <span className="label">Virtual Cash (From Savings)</span>
                                <span className="value">${availableToInvest.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="holdings">
                            <h3>Current Holdings</h3>
                            {portfolio.length === 0 ? (
                                <p className="empty-state">No investments yet. Start by buying shares below!</p>
                            ) : (
                                <table className="holdings-table">
                                    <thead>
                                        <tr>
                                            <th>Symbol</th>
                                            <th>Qty</th>
                                            <th>Avg Price</th>
                                            <th>Total Return</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {portfolio.map(inv => (
                                            <tr key={inv._id}>
                                                <td>{inv.symbol}</td>
                                                <td>{inv.quantity}</td>
                                                <td>${inv.averageBuyPrice.toFixed(2)}</td>
                                                <td className={inv.totalReturn >= 0 ? 'positive' : 'negative'}>
                                                    ${inv.totalReturn.toFixed(2)} ({inv.returnPercentage.toFixed(2)}%)
                                                </td>
                                                <td>
                                                    <button onClick={() => handleSell(inv.symbol)} className="btn-sm btn-sell">Sell 1</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </section>

                    {/* Educational Area */}
                    <section className="education-area card">
                        <h2><FaGraduationCap /> Learning Hub</h2>
                        <p>Hover over terms to learn their definitions:</p>
                        <div className="terms-grid">
                            {Object.entries(educationalTerms).map(([term, def]) => (
                                <div
                                    key={term}
                                    className="term-chip"
                                    onMouseEnter={() => setActiveTooltip(term)}
                                    onMouseLeave={() => setActiveTooltip(null)}
                                >
                                    {term} <FaInfoCircle />
                                    {activeTooltip === term && (
                                        <div className="tooltip">{def}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="right-column">
                    {/* Market Search */}
                    <section className="market-area card">
                        <h2><FaTrendingUp /> Market</h2>
                        <div className="search-bar">
                            <FaSearch />
                            <input
                                type="text"
                                placeholder="Search stocks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="stock-list">
                            {filteredMarket.length > 0 ? (
                                filteredMarket.map(stock => (
                                    <div key={stock.symbol} className="stock-card">
                                        <div className="stock-info">
                                            <h3>{stock.symbol}</h3>
                                            <span>{stock.name}</span>
                                        </div>
                                        <div className="stock-price">
                                            <strong className="price">${stock.price.toFixed(2)}</strong>
                                            <span className={`change ${stock.dayChange >= 0 ? 'positive' : 'negative'}`}>
                                                {stock.dayChange >= 0 ? '+' : ''}{stock.dayChange}%
                                            </span>
                                        </div>
                                        <button onClick={() => handleBuy(stock.symbol)} className="btn-buy">Buy</button>
                                    </div>
                                ))
                            ) : (
                                <p className="no-results">No stocks found.</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default InvestmentSimulator;
