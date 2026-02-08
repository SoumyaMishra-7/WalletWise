const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const passport = require('passport');
const { configurePassport } = require('./config/passport');
dotenv.config();

// Initialize Express app
const app = express();

// ==================== ENHANCED ERROR LOGGING ====================
process.on('uncaughtException', (error) => {
    console.error('❌ UNCAUGHT EXCEPTION:', error);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// ==================== MIDDLEWARE SETUP ====================

// CORS Configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Passport setup (Google OAuth)
configurePassport();
app.use(passport.initialize());

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`\n═══════════════════════════════════════════════════`);
    console.log(`📨 ${timestamp} - ${req.method} ${req.originalUrl}`);
    console.log(`🌍 Origin: ${req.headers.origin || 'No origin'}`);
    console.log(`🔑 Auth Header: ${req.headers.authorization || 'No auth header'}`);
    console.log(`🍪 Cookies:`, req.cookies);

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        console.log(`📝 Request Body:`, JSON.stringify(req.body, null, 2));
    }

    next();
});

// ==================== RATE LIMITING ====================
const { globalLimiter, authLimiter } = require('./middleware/rateLimiter');

// Apply global rate limiter to all requests
app.use(globalLimiter);

// Apply stricter rate limiter to auth routes
app.use('/api/auth', authLimiter);


// ==================== DATABASE CONNECTION ====================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/walletwise';

console.log(`🔗 Connecting to MongoDB: ${MONGODB_URI}`);

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
    .then(() => {
        console.log('✅ MongoDB Connected Successfully');
        console.log(`📊 Database: ${mongoose.connection.name}`);
        console.log(`📈 Collections:`, mongoose.connection.collections ? Object.keys(mongoose.connection.collections) : 'Not loaded yet');
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.log('\n💡 Troubleshooting Tips:');
        console.log('1. Check if MongoDB service is running');
        console.log('2. Start MongoDB: "mongod" in terminal or "net start MongoDB" in Admin PowerShell');
        console.log('3. Check .env file has: MONGODB_URI=mongodb://localhost:27017/walletwise');
        process.exit(1);
    });

// ==================== ROUTE IMPORTS ====================
const authRoutes = require('./routes/authRoutes');
const oauthRoutes = require('./routes/oauthRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const savingGoalRoutes = require('./routes/savingGoalRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// ==================== ROUTE MOUNTING ====================
app.use('/api/auth', authRoutes);
app.use('/auth', oauthRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/savings-goals', savingGoalRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                logout: 'POST /api/auth/logout',
                profile: 'GET /api/auth/me',
                verifyEmail: 'POST /api/auth/verify-email',
                resendOtp: 'POST /api/auth/resend-otp',
                updateProfile: 'PUT /api/auth/profile',
                refresh: 'POST /api/auth/refresh'
            },
            budget: {
                set: 'POST /api/budget',
                get: 'GET /api/budget',
                getCurrent: 'GET /api/budget/current',
                copyPrevious: 'POST /api/budget/copy-previous',
                summary: 'GET /api/budget/stats/summary'
            },
            savings_goals: {
                create: 'POST /api/savings-goals',
                list: 'GET /api/savings-goals'
            },
            transactions: {
                add: 'POST /api/transactions',
                list: 'GET /api/transactions'
            },
            dashboard: {
                summary: 'GET /api/dashboard/summary'
            }
        }
    });
});

// Test route
app.get('/', (req, res) => {
    res.json({
        message: 'WalletWise Backend API is running',
        version: '1.0.0',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                profile: 'GET /api/auth/me (requires token)'
            },
            budget: {
                set: 'POST /api/budget (requires token)',
                get: 'GET /api/budget (requires token)',
                getCurrent: 'GET /api/budget/current (requires token)',
                copyPrevious: 'POST /api/budget/copy-previous (requires token)',
                summary: 'GET /api/budget/stats/summary (requires token)'
            },
            savings_goals: {
                create: 'POST /api/savings-goals (requires token)',
                list: 'GET /api/savings-goals (requires token)'
            },
            transactions: {
                add: 'POST /api/transactions (requires token)',
                list: 'GET /api/transactions (requires token)'
            },
            dashboard: {
                summary: 'GET /api/dashboard/summary (requires token)'
            },
            utility: {
                health: 'GET /api/health'
            }
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        requestedUrl: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}`);
    console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);

    console.log(`\n📋 AVAILABLE ENDPOINTS:`);
    console.log(`\n🔐 AUTH:`);
    console.log(`  POST /api/auth/register       - Register user`);
    console.log(`  POST /api/auth/login          - Login user`);
    console.log(`  GET  /api/auth/me             - Get current user (requires token)`);

    console.log(`\n💰 BUDGET:`);
    console.log(`  POST /api/budget              - Set/update budget (requires token)`);
    console.log(`  GET  /api/budget              - Get all budgets (requires token)`);
    console.log(`  GET  /api/budget/current      - Get current month budget (requires token)`);
    console.log(`  POST /api/budget/copy-previous - Copy previous month budget (requires token)`);
    console.log(`  GET  /api/budget/stats/summary - Budget statistics (requires token)`);
    console.log(`  PUT  /api/budget/:id          - Update budget (requires token)`);
    console.log(`  DELETE /api/budget/:id        - Delete budget (requires token)`);

    console.log(`\n🎯 SAVINGS GOALS:`);
    console.log(`  POST /api/savings-goals       - Create savings goal (requires token)`);
    console.log(`  GET  /api/savings-goals       - List savings goals (requires token)`);

    console.log(`\n💳 TRANSACTIONS:`);
    console.log(`  POST /api/transactions        - Add transaction (requires token)`);
    console.log(`  GET  /api/transactions        - List transactions (requires token)`);

    console.log(`\n📊 DASHBOARD:`);
    console.log(`  GET  /api/dashboard/summary   - Dashboard data (requires token)`);

    console.log(`\n🔧 UTILITY:`);
    console.log(`  GET  /api/health              - Health check`);
    console.log(`  GET  /                        - API documentation`);

    console.log(`\n💡 IMPORTANT: Budget endpoints now include notifications!`);
    console.log('   Use this format for budget data:');
    console.log('   {');
    console.log('     "totalBudget": 15000,');
    console.log('     "categories": [');
    console.log('       {"name": "Food", "amount": 4500, "percentage": 30, "color": "#FF6B6B"}');
    console.log('     ]');
    console.log('   }');
    console.log('📊 Waiting for requests...');
});
