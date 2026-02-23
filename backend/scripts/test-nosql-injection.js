const httpMocks = require('node-mocks-http');
const { deleteTransaction } = require('../controllers/transactionController');

// Mock Transaction model
const Transaction = require('../models/Transactions');
const originalFindOneAndDelete = Transaction.findOneAndDelete;

async function testNoSQLInjection() {
    console.log('🧪 Testing NoSQL Injection Protection...\n');

    // 1. Test with a valid ID (string) - Should proceed (but fail to find in this mock)
    const validId = '65c7a1b2c3d4e5f67890abcd';
    const reqValid = httpMocks.createRequest({
        method: 'DELETE',
        params: { id: validId },
        userId: 'user123'
    });
    const resValid = httpMocks.createResponse();

    Transaction.findOneAndDelete = async () => null; // Mock not found

    await deleteTransaction(reqValid, resValid);
    const dataValid = JSON.parse(resValid._getData());
    console.log('Valid ID Result:', dataValid.message);
    const validPassed = dataValid.message === 'Transaction not found';

    // 2. Test with a NoSQL Injection payload (object)
    const injectionPayload = { "$ne": null };
    const reqInjected = httpMocks.createRequest({
        method: 'DELETE',
        params: { id: injectionPayload },
        userId: 'user123'
    });
    const resInjected = httpMocks.createResponse();

    await deleteTransaction(reqInjected, resInjected);
    const dataInjected = JSON.parse(resInjected._getData());
    console.log('Injection Payload Result:', dataInjected.message);
    const injectionPassed = dataInjected.message === 'Invalid transaction ID format';

    if (validPassed && injectionPassed) {
        console.log('\n✅ NoSQL injection verification PASSED.');
        console.log('- Legitimate IDs: Handled correctly');
        console.log('- Injection payloads (Objects): BLOCKED SECURELY');
    } else {
        console.error('\n❌ NoSQL injection verification FAILED!');
        process.exit(1);
    }

    Transaction.findOneAndDelete = originalFindOneAndDelete;
}

testNoSQLInjection();
