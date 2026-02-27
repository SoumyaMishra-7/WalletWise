/**
 * @interface ILogger
 * 
 * Logging abstraction. Default implementation wraps console,
 * but can be replaced with a silent/capturing logger for tests.
 */

/**
 * @typedef {Object} ILogger
 * @property {function(string, ...any): void} info
 * @property {function(string, ...any): void} warn
 * @property {function(string, ...any): void} error
 * @property {function(string, ...any): void} debug
 */

/**
 * Default console-based logger implementing ILogger.
 */
class ConsoleLogger {
    info(message, ...args) {
        console.log(message, ...args);
    }

    warn(message, ...args) {
        console.warn(message, ...args);
    }

    error(message, ...args) {
        console.error(message, ...args);
    }

    debug(message, ...args) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(message, ...args);
        }
    }
}

module.exports = { ConsoleLogger };
