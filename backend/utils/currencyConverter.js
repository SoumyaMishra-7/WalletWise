const axios = require('axios');
const AppError = require('./appError');

const BASE_CURRENCY = (process.env.BASE_CURRENCY || 'USD').toUpperCase();
const EXCHANGE_RATE_PROVIDER = process.env.EXCHANGE_RATE_PROVIDER || 'frankfurter';

// Cache expiration time for latest rates (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Legacy cache structure preserved for backward-compatibility with currencyConverter.middleware.js
const ratesCache = {
    timestamp: 0,
    rates: {}
};

// Historical rates cache: permanent in-memory cache keyed by "YYYY-MM-DD:FROM:TO"
// Historical market data does not change once published, so caching indefinitely avoids redundant API calls.
const historicalRatesCache = new Map();

// Latest rates cache: keyed by "FROM:TO", expires after CACHE_DURATION
const latestRatesCache = new Map();

// Deterministic mock overrides for testing or offline environments
const mockRates = new Map();

/**
 * Consistently rounds a monetary amount to 2 decimal places using Number.EPSILON
 * to prevent floating-point precision/rounding errors (e.g. 1.005 rounding incorrectly).
 *
 * @param {number} num
 * @returns {number}
 */
const roundCurrency = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 0;
    return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
};

/**
 * Normalizes any valid date value into a YYYY-MM-DD string.
 * Defaults to current date if missing or invalid.
 *
 * @param {Date|string|number} dateInput
 * @returns {string} YYYY-MM-DD
 */
const formatDateString = (dateInput) => {
    if (!dateInput) {
        return new Date().toISOString().split('T')[0];
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
        return new Date().toISOString().split('T')[0];
    }
    return d.toISOString().split('T')[0];
};

/**
 * Fetch latest exchange rates from open.er-api.com (preserved for backward compatibility).
 */
const fetchExchangeRates = async () => {
    try {
        const url = `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`;
        const response = await axios.get(url, { timeout: 8000 });

        if (response.data && response.data.rates) {
            ratesCache.rates = response.data.rates;
            ratesCache.timestamp = Date.now();
            return ratesCache.rates;
        }
    } catch (error) {
        console.error('[Currency] Error fetching exchange rates:', error.message);
    }
    return ratesCache.rates;
};

// Initialize background timer only in non-test environments to prevent open handles in Jest
if (process.env.NODE_ENV !== 'test') {
    fetchExchangeRates();
    const interval = setInterval(fetchExchangeRates, 12 * 60 * 60 * 1000);
    if (interval && interval.unref) {
        interval.unref();
    }
}

/**
 * Retrieve the exchange rate between two currencies for a specific date (historical snapshot)
 * or for the latest market day.
 *
 * @param {string} fromCurrency - Original currency (e.g. 'EUR')
 * @param {string} toCurrency - Target/Base currency (e.g. 'USD')
 * @param {Date|string} [date] - Transaction date (defaults to current date)
 * @returns {Promise<number>} Exchange rate (1 fromCurrency = X toCurrency)
 */
const getHistoricalRate = async (fromCurrency, toCurrency, date) => {
    const from = (fromCurrency || BASE_CURRENCY).toUpperCase();
    const to = (toCurrency || BASE_CURRENCY).toUpperCase();

    // 1. Same currency conversion is always exactly 1.0 without API call
    if (from === to) {
        return 1;
    }

    const dateStr = formatDateString(date);
    const todayStr = new Date().toISOString().split('T')[0];
    const isHistorical = dateStr < todayStr;
    const cacheKey = `${dateStr}:${from}:${to}`;

    // 2. Check mock rates (for tests and local mocks)
    if (mockRates.has(cacheKey)) {
        return mockRates.get(cacheKey);
    }
    if (mockRates.has(`ANY:${from}:${to}`)) {
        return mockRates.get(`ANY:${from}:${to}`);
    }

    // 3. Check in-memory caches
    if (isHistorical && historicalRatesCache.has(cacheKey)) {
        return historicalRatesCache.get(cacheKey);
    }

    if (!isHistorical) {
        const cached = latestRatesCache.get(`${from}:${to}`);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            return cached.rate;
        }
    }

    // 4. Fetch from configured provider
    try {
        let rate = null;

        if (EXCHANGE_RATE_PROVIDER === 'frankfurter') {
            // Frankfurter API supports both latest and historical rates back to 1999 for free without key
            const endpoint = isHistorical
                ? `https://api.frankfurter.dev/v1/${dateStr}?from=${from}&to=${to}`
                : `https://api.frankfurter.dev/v1/latest?from=${from}&to=${to}`;

            const response = await axios.get(endpoint, { timeout: 10000 });

            if (response.data && response.data.rates && response.data.rates[to] !== undefined) {
                rate = Number(response.data.rates[to]);
            } else {
                throw new AppError(`Rate for ${to} not found in provider response`, 400);
            }
        } else {
            // Fallback / alternate provider: Open ER-API (latest only)
            if (isHistorical) {
                throw new AppError(
                    `Historical exchange rates are not supported by provider ${EXCHANGE_RATE_PROVIDER}`,
                    503
                );
            }

            const url = `https://open.er-api.com/v6/latest/${from}`;
            const response = await axios.get(url, { timeout: 10000 });

            if (response.data && response.data.rates && response.data.rates[to] !== undefined) {
                rate = Number(response.data.rates[to]);
            } else {
                throw new AppError(`Rate for ${to} not found in provider response`, 400);
            }
        }

        if (rate === null || isNaN(rate) || rate <= 0) {
            throw new AppError(`Invalid exchange rate obtained for ${from} to ${to}`, 400);
        }

        // Cache the successful result
        if (isHistorical) {
            historicalRatesCache.set(cacheKey, rate);
        } else {
            latestRatesCache.set(`${from}:${to}`, { rate, timestamp: Date.now() });
        }

        return rate;

    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        const status = error.response?.status;
        const errMsg = error.response?.data?.message || error.message;

        if (status === 404) {
            throw new AppError(`Unsupported currency or exchange rate data unavailable for ${from} to ${to} on ${dateStr}`, 400);
        }

        if (status === 429) {
            throw new AppError('Exchange rate provider rate limit exceeded. Please try again later.', 429);
        }

        console.error(`[Currency] Provider error (${EXCHANGE_RATE_PROVIDER}):`, errMsg);
        throw new AppError(`Exchange rate provider unavailable (${errMsg}). Please try again later.`, 503);
    }
};

/**
 * Retrieve rate for a target currency against BASE_CURRENCY (or specified base).
 */
const getRate = async (targetCurrency, fromCurrency = BASE_CURRENCY, date = null) => {
    return getHistoricalRate(fromCurrency, targetCurrency, date);
};

/**
 * Convert an amount from one currency to another using historical rate for date.
 *
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Destination currency
 * @param {Date|string} [date] - Historical date (optional)
 * @returns {Promise<number>} Converted amount rounded to 2 decimal places
 */
const convertCurrency = async (amount, fromCurrency, toCurrency, date = null) => {
    if (!amount || isNaN(amount)) return 0;
    if (fromCurrency === toCurrency) return roundCurrency(amount);

    const rate = await getHistoricalRate(fromCurrency, toCurrency, date);
    return roundCurrency(amount * rate);
};

/**
 * Testing helper: manually inject a mock rate into the cache.
 */
const setMockRate = (from, to, date, rate) => {
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();
    if (!date || date === 'ANY') {
        mockRates.set(`ANY:${fromUpper}:${toUpper}`, Number(rate));
    } else {
        const dateStr = formatDateString(date);
        mockRates.set(`${dateStr}:${fromUpper}:${toUpper}`, Number(rate));
    }
};

/**
 * Testing helper: clear all caches and mocks.
 */
const clearRatesCache = () => {
    historicalRatesCache.clear();
    latestRatesCache.clear();
    mockRates.clear();
};

module.exports = {
    convertCurrency,
    fetchExchangeRates,
    getRate,
    getHistoricalRate,
    roundCurrency,
    formatDateString,
    setMockRate,
    clearRatesCache,
    ratesCache,
    BASE_CURRENCY,
    EXCHANGE_RATE_PROVIDER
};
