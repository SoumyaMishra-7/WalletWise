const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// A suite that needs its own server (a replica set, for example, because it
// exercises session transactions) opts out by setting this global before its
// tests run. The suite module is evaluated before any hook fires, so the flag
// is always visible here. Mongoose only allows one connection string per
// process, so two competing servers are what used to blow up `npm test`.
const suiteManagesItsOwnMongo = () => global.__MONGODB_MANAGED_BY_SUITE__ === true;

beforeAll(async () => {
    if (suiteManagesItsOwnMongo()) {
        return;
    }

    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    if (!mongoServer) {
        return;
    }

    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    if (!mongoServer) {
        return;
    }

    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany();
    }
});
