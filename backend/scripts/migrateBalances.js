const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transactions');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrateBalances() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is missing in .env');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log(`Found ${users.length} users to migrate.`);

        for (const user of users) {
            const transactions = await Transaction.find({ userId: user._id });

            let calculatedBalance = 0;
            for (const t of transactions) {
                if (t.type === 'income') {
                    calculatedBalance += t.amount;
                } else if (t.type === 'expense') {
                    calculatedBalance -= t.amount;
                }
            }

            // Optional: Consider initial balance if the app supported it, but it seems it starts at 0.

            if (user.walletBalance !== calculatedBalance) {
                console.log(`Updating user ${user.email}: Old Balance=${user.walletBalance}, New Balance=${calculatedBalance}`);
                user.walletBalance = calculatedBalance;
                await user.save();
            } else {
                console.log(`User ${user.email} balance is already correct: ${calculatedBalance}`);
            }
        }

        console.log('Migration completed successfully.');

    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

migrateBalances();
