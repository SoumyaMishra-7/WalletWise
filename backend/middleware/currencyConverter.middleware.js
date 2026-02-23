const { getRate, BASE_CURRENCY } = require('../utils/currencyConverter');
const User = require('../models/User');

const currencyMiddleware = async (req, res, next) => {
    // Skip if userId is not populated (i.e. before auth)
    if (!req.userId) return next();

    try {
        const user = await User.findById(req.userId).select('currency');
        const userCurrency = user?.currency || BASE_CURRENCY;

        let rateToUser = 1;
        let rateToBase = 1;

        if (userCurrency !== BASE_CURRENCY) {
            rateToUser = await getRate(userCurrency);
            rateToBase = 1 / rateToUser;
        }

        // Keys that represent monetary values to be converted
        const convertKeys = new Set([
            'amount', 'totalBalance', 'monthlyExpenses', 'monthlyIncome',
            'budgetLeft', 'totalSavings', 'monthlyBudget', 'targetAmount',
            'currentAmount', 'monthlyContribution', 'totalBudget', 'spent',
            'remaining', 'monthTotal', 'yearTotal', 'savings', 'allocated',
            'walletBalance'
        ]);

        // Convert incoming data to BASE_CURRENCY (for writes)
        if (req.body && typeof req.body === 'object' && rateToBase !== 1) {
            const convertIncoming = (obj) => {
                if (Array.isArray(obj)) {
                    obj.forEach(convertIncoming);
                } else if (obj !== null && typeof obj === 'object') {
                    for (let key in obj) {
                        if (convertKeys.has(key) && typeof obj[key] === 'number') {
                            obj[key] = Number((obj[key] * rateToBase).toFixed(2));
                        } else if (typeof obj[key] === 'object') {
                            convertIncoming(obj[key]);
                        }
                    }
                }
            };
            convertIncoming(req.body);
        }

        // Intercept outgoing JSON to convert to User's Currency
        const originalJson = res.json;
        res.json = function (body) {
            if (body && typeof body === 'object' && rateToUser !== 1) {
                // To avoid mutating referenced objects or mongoose documents, deep clone if needed
                let safeBody;
                try {
                    safeBody = JSON.parse(JSON.stringify(body));
                } catch (e) {
                    safeBody = body; // fallback
                }

                const convertOutgoing = (obj) => {
                    if (Array.isArray(obj)) {
                        obj.forEach(convertOutgoing);
                    } else if (obj !== null && typeof obj === 'object') {
                        for (let key in obj) {
                            if (convertKeys.has(key) && typeof obj[key] === 'number') {
                                obj[key] = Number((obj[key] * rateToUser).toFixed(2));
                            } else if (typeof obj[key] === 'object') {
                                convertOutgoing(obj[key]);
                            }
                        }
                    }
                };

                convertOutgoing(safeBody);
                return originalJson.call(this, safeBody);
            }
            return originalJson.call(this, body);
        };

        next();
    } catch (err) {
        console.error('Currency middleware error:', err);
        next(); // Don't crash if something goes wrong
    }
};

module.exports = currencyMiddleware;
