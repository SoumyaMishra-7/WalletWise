module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['./tests/setup.js'],
    testTimeout: 60000,
    verbose: true,
    // Run tests serially so that test files using MongoMemoryReplSet can
    // safely disconnect/reconnect without racing against other test files.
    runInBand: true,
};
