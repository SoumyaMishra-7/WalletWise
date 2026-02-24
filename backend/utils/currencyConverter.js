const axios = require('axios');

const BASE_CURRENCY = process.env.BASE_CURRENCY || 'USD';

const ratesCache = {
    timestamp: 0,
    rates: {}
};

// cache expiration time (default to 24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const fetchExchangeRates = async () => {
    try {
        const url = `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`;
        const response = await axios.get(url);

        if (response.data && response.data.rates) {
            ratesCache.rates = response.data.rates;
            ratesCache.timestamp = Date.now();
            console.log(`[Currency] Exchange rates updated successfully. Base: ${BASE_CURRENCY}`);
            return ratesCache.rates;
        }
    } catch (error) {
        console.error('[Currency] Error fetching exchange rates:', error.message);
    }
    return ratesCache.rates;
};

// Initialize rates (lazy loading is also implemented)
fetchExchangeRates();

// Set interval to update rates every 12 hours
setInterval(fetchExchangeRates, 12 * 60 * 60 * 1000);

const getRate = async (targetCurrency) => {
    // Check if rates need refresh
    if (!ratesCache.rates[targetCurrency] || (Date.now() - ratesCache.timestamp) > CACHE_DURATION) {
        await fetchExchangeRates();
    }
    return ratesCache.rates[targetCurrency] || 1; // Fallback to 1 if not found
}

const convertCurrency = async (amount, fromCurrency, toCurrency) => {
    if (!amount || isNaN(amount)) return 0;
    if (fromCurrency === toCurrency) return Number(amount.toFixed(2));

    // Convert current cached rates
    if (Object.keys(ratesCache.rates).length === 0 || (Date.now() - ratesCache.timestamp) > CACHE_DURATION) {
        await fetchExchangeRates();
    }

    const rates = ratesCache.rates;

    // We treat BASE_CURRENCY as the intermediary currency whose rate is 1.
    // So 1 BASE_CURRENCY = rates[Currency]

    let amountInBase = amount;

    // 1. Convert initial amount to base currency
    if (fromCurrency !== BASE_CURRENCY) {
        const rateFrom = rates[fromCurrency] || 1;
        amountInBase = amount / rateFrom;
    }

    // 2. Convert base currency amount to target currency
    if (toCurrency !== BASE_CURRENCY) {
        const rateTo = rates[toCurrency] || 1;
        return Number((amountInBase * rateTo).toFixed(2));
    }

    return Number(amountInBase.toFixed(2));
};

module.exports = {
    convertCurrency,
    fetchExchangeRates,
    getRate,
    BASE_CURRENCY
};
