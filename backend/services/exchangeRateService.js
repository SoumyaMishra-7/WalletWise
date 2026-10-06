/**
 * Exchange Rate Service
 *
 * Provides USD-based exchange rates for multi-currency transaction support.
 * Uses a built-in fallback table so the app works without any external API.
 * If EXCHANGE_RATE_API_KEY is set in env, it can optionally fetch live rates
 * from exchangerate-api.com (free tier: 1,500 requests/month).
 */

const https = require('https');

// Fallback rates relative to USD (updated periodically)
const FALLBACK_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  JPY: 149.0,
  CAD: 1.36,
  AUD: 1.52,
  SGD: 1.35,
  AED: 3.67,
  CNY: 7.24,
  BRL: 4.97,
  MXN: 17.2,
  KRW: 1325,
  CHF: 0.90,
  HKD: 7.82,
  NOK: 10.5,
  SEK: 10.4,
  DKK: 6.88,
  NZD: 1.63,
  ZAR: 18.6,
};

const SUPPORTED_CURRENCIES = Object.keys(FALLBACK_RATES);

function fetchLiveRates() {
  return new Promise((resolve) => {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) return resolve(null);

    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.result === 'success') resolve(json.conversion_rates);
          else resolve(null);
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

let cachedRates = null;
let cacheExpiry = 0;
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

async function getRates() {
  if (cachedRates && Date.now() < cacheExpiry) return cachedRates;
  const live = await fetchLiveRates();
  cachedRates = live || FALLBACK_RATES;
  cacheExpiry = Date.now() + CACHE_TTL;
  return cachedRates;
}

/**
 * Convert an amount from one currency to another.
 * Returns the converted amount rounded to 2 decimal places.
 *
 * @param {number} amount
 * @param {string} fromCurrency - ISO 4217 code, e.g. 'INR'
 * @param {string} toCurrency   - ISO 4217 code, e.g. 'USD'
 * @returns {Promise<{ convertedAmount: number, rate: number }>}
 */
async function convert(amount, fromCurrency, toCurrency) {
  const from = (fromCurrency || 'USD').toUpperCase();
  const to = (toCurrency || 'USD').toUpperCase();

  if (from === to) return { convertedAmount: amount, rate: 1 };

  const rates = await getRates();
  const fromRate = rates[from] ?? FALLBACK_RATES[from];
  const toRate = rates[to] ?? FALLBACK_RATES[to];

  if (!fromRate || !toRate) {
    throw new Error(`Unsupported currency: ${!fromRate ? from : to}`);
  }

  // Convert via USD as pivot currency
  const inUSD = amount / fromRate;
  const converted = inUSD * toRate;
  const rate = toRate / fromRate;

  return {
    convertedAmount: Math.round(converted * 100) / 100,
    rate: Math.round(rate * 1000000) / 1000000,
  };
}

module.exports = { convert, getSupportedCurrencies: () => SUPPORTED_CURRENCIES, FALLBACK_RATES };
