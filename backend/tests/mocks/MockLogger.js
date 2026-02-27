/**
 * MockLogger — captures log messages for assertion in tests.
 * Implements ILogger.
 */
class MockLogger {
    constructor() {
        this.logs = { info: [], warn: [], error: [], debug: [] };
    }

    info(message, ...args) {
        this.logs.info.push({ message, args });
    }

    warn(message, ...args) {
        this.logs.warn.push({ message, args });
    }

    error(message, ...args) {
        this.logs.error.push({ message, args });
    }

    debug(message, ...args) {
        this.logs.debug.push({ message, args });
    }

    /**
     * Clear all captured logs.
     */
    clear() {
        this.logs = { info: [], warn: [], error: [], debug: [] };
    }
}

module.exports = MockLogger;
