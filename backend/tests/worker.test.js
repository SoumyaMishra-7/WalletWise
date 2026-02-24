const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { processBillReminders, processRecurringTransactions } = require('../worker');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transactions');
const User = require('../models/User');
const mockdate = require('mockdate');

jest.mock('../utils/mailer', () => ({
    sendEmail: jest.fn()
}));
const mailerContext = require('../utils/mailer');

let mongoServer;
jest.setTimeout(60000);

beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    await User.createCollection();
    await Subscription.createCollection();
    await Transaction.createCollection();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    mockdate.reset();
});

beforeEach(async () => {
    await User.deleteMany({});
    await Subscription.deleteMany({});
    await Transaction.deleteMany({});
    mailerContext.sendEmail.mockClear();
    mockdate.reset();
});

describe('Worker Utility - processBillReminders', () => {
    it('should correctly detect and email users within appropriate reminder targets', async () => {
        // Today is Jan 1
        mockdate.set('2024-01-01T10:00:00.000Z');

        const user1 = new User({ email: 'user1@example.com', studentId: 'S1', notificationPrefs: { billRemindersEnabled: true, reminderDaysBefore: 3 } });
        const user2 = new User({ email: 'user2@example.com', studentId: 'S2', notificationPrefs: { billRemindersEnabled: true, reminderDaysBefore: 7 } });
        const user3 = new User({ email: 'user3@example.com', studentId: 'S3', notificationPrefs: { billRemindersEnabled: false } });

        await user1.save();
        await user2.save();
        await user3.save();

        // Sub 1: Due in 3 days (Jan 4) -> should trigger for user 1
        await new Subscription({
            name: 'Netflix',
            amount: 15,
            category: 'entertainment',
            nextDueDate: new Date('2024-01-04T12:00:00.000Z'),
            isActive: true,
            userId: user1._id
        }).save();

        // Sub 2: Due in 7 days (Jan 8) -> should trigger for user 2
        await new Subscription({
            name: 'Gym',
            amount: 50,
            category: 'health',
            nextDueDate: new Date('2024-01-08T08:00:00.000Z'),
            isActive: true,
            userId: user2._id
        }).save();

        // Sub 3: Due in 3 days but user3 has it disabled
        await new Subscription({
            name: 'Spotify',
            amount: 10,
            category: 'entertainment',
            nextDueDate: new Date('2024-01-04T14:00:00.000Z'),
            isActive: true,
            userId: user3._id
        }).save();

        // Sub 4: Due in 4 days -> out of scope for user 1
        await new Subscription({
            name: 'Hulu',
            amount: 8,
            category: 'entertainment',
            nextDueDate: new Date('2024-01-05T10:00:00.000Z'),
            isActive: true,
            userId: user1._id
        }).save();

        await processBillReminders();

        expect(mailerContext.sendEmail).toHaveBeenCalledTimes(2);

        const emailCalls = mailerContext.sendEmail.mock.calls;
        const recipients = emailCalls.map(call => call[0].to);

        expect(recipients).toContain('user1@example.com'); // Netflix trigger
        expect(recipients).toContain('user2@example.com'); // Gym trigger
        expect(recipients).not.toContain('user3@example.com'); // Disabled
    });

    it('should ignore subscriptions outside the 7-day future window regardless of configuration', async () => {
        mockdate.set('2024-01-01T10:00:00.000Z');

        const user = new User({ email: 'futureuser@example.com', studentId: 'S4', notificationPrefs: { billRemindersEnabled: true, reminderDaysBefore: 7 } });
        await user.save();

        await new Subscription({
            name: 'Future Sub',
            amount: 20,
            category: 'bills',
            nextDueDate: new Date('2024-01-15T12:00:00.000Z'), // 14 days later
            isActive: true,
            userId: user._id
        }).save();

        await processBillReminders();

        expect(mailerContext.sendEmail).toHaveBeenCalledTimes(0);
    });
});

describe('Worker Utility - processRecurringTransactions', () => {
    let user;
    beforeEach(async () => {
        user = new User({
            studentId: 'TEST002',
            email: 'testrec@example.com',
            walletBalance: 1000
        });
        await user.save();
    });

    it('should trigger recurring transactions and update dates', async () => {
        mockdate.set('2024-01-01T10:00:00.000Z');

        // Create a recurring transaction due purely in the past
        const tx = new Transaction({
            userId: user._id,
            type: 'expense',
            amount: 30,
            category: 'education',
            isRecurring: true,
            recurringInterval: 'daily',
            nextExecutionDate: new Date('2023-12-31T10:00:00.000Z') // Past date
        });
        await tx.save();

        await processRecurringTransactions();

        // It should have created a new transaction with date=now
        const transactions = await Transaction.find({ category: 'education' });
        expect(transactions.length).toBe(2);

        // Origin transaction should have nextExecutionDate advanced by 1 day from old execution date
        const originTx = transactions.find(t => t.isRecurring);
        expect(originTx.nextExecutionDate.toISOString()).toBe(new Date('2024-01-01T10:00:00.000Z').toISOString());

        // Check wallet balance updated
        const updatedUser = await User.findById(user._id);
        expect(updatedUser.walletBalance).toBe(970); // 1000 - 30
    });
});
