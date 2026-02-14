const httpMocks = require('node-mocks-http');
const { updateBudget } = require('../controllers/budgetController');

// Mock a Mongoose Budget document
class MockBudget {
    constructor(data) {
        Object.assign(this, data);
    }
    async save() {
        return this;
    }
}

async function testMassAssignment() {
    console.log('🧪 Testing Mass Assignment Protection...\n');

    const originalData = {
        _id: 'budget123',
        userId: 'user123',
        month: '2024-02',
        totalBudget: 5000,
        categories: [],
        isActive: true,
        maliciousField: 'safe'
    };

    const budget = new MockBudget(originalData);

    // Mock Budget.findOne to return our mock budget
    const Budget = require('../models/Budget');
    const originalFindOne = Budget.findOne;
    Budget.findOne = async () => budget;

    const req = httpMocks.createRequest({
        method: 'PUT',
        params: { id: 'budget123' },
        body: {
            totalBudget: 7000,
            userId: 'attacker456', // Should be ignored
            month: '2025-01',      // Should be ignored
            maliciousField: 'EXPLOITED', // Should be ignored
            isActive: false        // Should be allowed
        },
        userId: 'user123'
    });

    const res = httpMocks.createResponse();

    try {
        await updateBudget(req, res);

        const result = JSON.parse(res._getData());
        console.log('Response:', result.message);

        // Assertions
        const passed =
            budget.totalBudget === 7000 &&
            budget.userId === 'user123' &&
            budget.month === '2024-02' &&
            budget.isActive === false &&
            budget.maliciousField === 'safe';

        if (passed) {
            console.log('\n✅ Mass assignment verification PASSED.');
            console.log('- totalBudget: Updated correctly (7000)');
            console.log('- isActive: Updated correctly (false)');
            console.log('- userId: REMAINED SECURE (user123)');
            console.log('- month: REMAINED SECURE (2024-02)');
            console.log('- maliciousField: REMAINED SECURE (safe)');
        } else {
            console.error('\n❌ Mass assignment verification FAILED!');
            console.log('Current state of budget:', budget);
            process.exit(1);
        }
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    } finally {
        Budget.findOne = originalFindOne;
    }
}

testMassAssignment();
