const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./middleware/errorMiddleware");
const passport = require("passport");
const helmet = require("helmet");
const { configurePassport } = require("./config/passport");
const authRoutes = require("./routes/authRoutes");
const oauthRoutes = require("./routes/oauthRoutes");
const { protect } = require("./middleware/auth");
const analyticsRoutes = require("./routes/analyticsRoutes");
const asyncHandler = require("./middleware/asyncHandler");
dotenv.config();

// Initialize Express app
const app = express();

// Enable trust proxy for correct rate limiting behind load balancers (Vercel, Heroku, AWS ELB)
app.set('trust proxy', 1);

// ==================== SECURITY HEADERS ====================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://i.pravatar.cc"],
            connectSrc: ["'self'", "http://localhost:5000", "https://api.walletwise.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
}));

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
app.use(express.json({ limit: '1mb' }));
// Disable extended urlencoded to prevent naive form attacks, though the middleware below is the real fix
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ==================== SECURITY MIDDLEWARE ====================
const { enforceJsonContent } = require('./middleware/security');
// Apply strict content-type enforcement to ALL API routes
app.use('/api', enforceJsonContent);

// Cookie parser
app.use(cookieParser());

// Passport setup (Google OAuth)
configurePassport();
app.use(passport.initialize());
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`\n═══════════════════════════════════════════════════`);
    console.log(`📨 ${timestamp} - ${req.method} ${req.originalUrl}`);
    console.log(`🌍 Origin: ${req.headers.origin || 'No origin'}`);

    // Mask Auth Header in logs
    const authHeader = req.headers.authorization;
    if (authHeader) {
        console.log(`🔑 Auth Header: ${authHeader.substring(0, 15)}...[REDACTED]`);
    } else {
        console.log(`🔑 Auth Header: No auth header`);
    }

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        // Create a safe copy of the body for logging
        const safeBody = { ...req.body };
        const sensitiveKeys = ['password', 'token', 'refreshToken', 'accessToken', 'client_secret', 'code'];

        sensitiveKeys.forEach(key => {
            if (safeBody[key]) safeBody[key] = '***[REDACTED]***';
        });

        console.log(`📝 Request Body:`, JSON.stringify(safeBody, null, 2));
    }

    next();
});

// ==================== RATE LIMITING & DDoS PROTECTION ====================
const { totalTrafficLimiter, speedLimiter, globalLimiter, authLimiter } = require('./middleware/rateLimiter');

// 1. Apply total traffic limiter (fuse) to ALL requests
// This is the first line of defense against distributed attacks
app.use(totalTrafficLimiter);

// 2. Apply speed limiter to throttle high-frequency requesters
app.use(speedLimiter);

// 3. Apply standard IP-based global rate limiter
app.use(globalLimiter);

// 4. Apply stricter rate limiter to auth routes
app.use('/api/v1/auth', authLimiter);


// ==================== DATABASE CONNECTION ====================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/walletwise';

console.log(`🔗 Connecting to MongoDB: ${MONGODB_URI}`);

if (process.env.NODE_ENV !== 'test') {
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
}

// ==================== ROUTE IMPORTS ====================
const v1Routes = require('./routes/v1');
const errHandler = require('./middleware/errorHandler');

// ==================== ROUTE MOUNTING ====================
app.use('/api/v1', v1Routes);

// Optional: Keep legacy /api paths for transition or redirect them
// For now, let's keep the OAuth at /auth as it might be used by external providers
app.use('/auth', oauthRoutes);

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
            },
            insights: {
                anomalies: 'GET /api/insights/anomalies',
                subscriptions_alerts: 'GET /api/insights/subscriptions/alerts',
                seasonal: 'GET /api/insights/seasonal',
                weekend_weekday: 'GET /api/insights/weekend-weekday',
                summary: 'GET /api/insights/summary'
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
            insights: {
                anomalies: 'GET /api/insights/anomalies (requires token)',
                subscriptions_alerts: 'GET /api/insights/subscriptions/alerts (requires token)',
                seasonal: 'GET /api/insights/seasonal (requires token)',
                weekend_weekday: 'GET /api/insights/weekend-weekday (requires token)',
                summary: 'GET /api/insights/summary (requires token)'
            },
            utility: {
                health: 'GET /api/health'
            }
        }
    });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Middleware
app.use(globalErrorHandler);
app.use(errHandler);


// ==================== START SERVER ====================
// Initialize Scheduler
if (process.env.NODE_ENV !== 'test') {
    //const { initScheduler } = require('./utils/scheduler');
    //initScheduler();
}

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
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

        console.log(`\n🧠 INSIGHTS:`);
        console.log(`  GET  /api/insights/anomalies            - Unusual spending detection (requires token)`);
        console.log(`  GET  /api/insights/subscriptions/alerts - Renewal + unused subs (requires token)`);
        console.log(`  GET  /api/insights/seasonal             - Seasonal patterns (requires token)`);
        console.log(`  GET  /api/insights/weekend-weekday      - Weekend vs weekday (requires token)`);
        console.log(`  GET  /api/insights/summary              - All insights combined (requires token)`);

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
}

module.exports = app;
