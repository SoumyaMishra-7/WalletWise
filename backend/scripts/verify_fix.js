const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transactions');
const { addTransaction, deleteTransaction } = require('../controllers/transactionController');
require('dotenv').config();

// Try to load mongodb-memory-server
let MongoMemoryServer;
try {
    const mem = require('mongodb-memory-server');
    MongoMemoryServer = mem.MongoMemoryServer;
} catch (e) {
    console.log('mongodb-memory-server not found, skipping in-memory test.');
}

// Mock Express Request and Response
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function verify() {
    let mongoServer;
    try {
        let uri = process.env.MONGODB_URI;

        if (MongoMemoryServer) {
            console.log('Attempting to start in-memory MongoDB...');
            try {
                mongoServer = await MongoMemoryServer.create();
                uri = mongoServer.getUri();
                console.log('Using In-Memory MongoDB');
            } catch (err) {
                console.warn('Failed to start in-memory MongoDB, falling back to local URI:', err.message);
            }
        }

        if (!uri) {
            console.error('No MongoDB URI found. Please install MongoDB or set MONGODB_URI in .env');
            process.exit(1);
        }

        console.log(`Connecting to MongoDB: ${uri}`);
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Create a test user
        const testUser = new User({
            studentId: 'TEST_' + Date.now(),
            fullName: 'Test User',
            email: `test_${Date.now()}@example.com`,
            passwordHash: 'hash',
        });
        await testUser.save();
        console.log('Test user created:', testUser._id);

        // 1. Test Adding Transaction (Income)
        console.log('--- Testing Add Transaction (Income) ---');
        const reqAdd = {
            userId: testUser._id,
            body: {
                type: 'income',
                amount: 5000,
                category: 'Salary',
                description: 'Test Income',
                date: new Date()
            }
        };
        const resAdd = mockRes();

        await addTransaction(reqAdd, resAdd);

        if (resAdd.statusCode === 201) {
            console.log('Transaction added via controller.');
        } else {
            console.error('Failed to add transaction:', resAdd.data);
        }

        // Check Balance
        const userAfterAdd = await User.findById(testUser._id);
        console.log('User Balance after Income:', userAfterAdd.walletBalance);

        if (userAfterAdd.walletBalance === 5000) {
            console.log('SUCCESS: Balance updated correctly after adding income.');
        } else {
            console.error('FAILURE: Balance incorrect after adding income. Expected 5000, got ' + userAfterAdd.walletBalance);
        }

        // 2. Test Deleting Transaction
        console.log('--- Testing Delete Transaction ---');
        const transactionId = resAdd.data.transaction.id;
        const reqDelete = {
            userId: testUser._id,
            params: { id: transactionId }
        };
        const resDelete = mockRes();

        await deleteTransaction(reqDelete, resDelete);

        if (resDelete.statusCode === 200 || resDelete.data.success) {
            console.log('Transaction deleted via controller.');
        } else {
            console.error('Failed to delete transaction:', resDelete.data);
        }

        // Check Balance
        const userAfterDelete = await User.findById(testUser._id);
        console.log('User Balance after Delete:', userAfterDelete.walletBalance);

        if (userAfterDelete.walletBalance === 0) {
            console.log('SUCCESS: Balance updated correctly after deleting income.');
        } else {
            console.error('FAILURE: Balance incorrect after deleting income.');
        }

        // Clean up
        await Transaction.deleteMany({ userId: testUser._id });
        await User.deleteOne({ _id: testUser._id });
        console.log('Cleaned up test data');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        if (mongoServer) await mongoServer.stop();
    }
}

verify();
