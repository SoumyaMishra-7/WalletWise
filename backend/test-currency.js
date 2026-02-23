require('dotenv').config();
const mongoose = require('mongoose');
const { getDashboardSummary } = require('./controllers/dashboardController');
const currencyMiddleware = require('./middleware/currencyConverter.middleware');

const testCurrency = async () => {
    const obj = {
        amount: 1000,
        transactions: [
            { amount: 50 },
            { amount: 150 }
        ]
    };

    const req = {
        userId: 'some-id',
        method: 'GET',
        body: {}
    };

    // We will mock User.findById
    const User = require('./models/User');
    User.findById = async () => ({ currency: 'INR' });

    const res = {
        json: function (data) {
            console.log("FINAL JSON:", JSON.stringify(data, null, 2));
        }
    };

    console.log("Starting middleware test...");

    await currencyMiddleware(req, res, () => {
        console.log("Middleware next() called. Simulating dashboard controller response...");
        res.json(obj);
    });
};

testCurrency().catch(console.error);
