const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';

let mongoServer;

const isSelfManaged = () => {
    const testPath = (typeof expect !== 'undefined' && expect.getState) ? (expect.getState().testPath || '') : '';
    return /transactionController\.test\.js|worker\.test\.js/.test(testPath);
};

beforeAll(async () => {
    if (isSelfManaged()) {
        return;
    }
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    if (mongoServer) {
        await mongoose.disconnect();
        await mongoServer.stop();
    }
});

beforeEach(async () => {
    if (isSelfManaged()) {
        return;
    }
    if (mongoose.connection.readyState === 1) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany();
        }
    }
});
