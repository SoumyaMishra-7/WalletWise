/**
 * Minimal RFC-4180-compatible CSV parser.
 * Returns { headers: string[], rows: string[][] }.
 * Handles quoted fields, escaped double-quotes (""), and LF/CRLF line endings.
 */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); if (row.length) rows.push(row); row = []; };

  for (let i = 0; i < normalizedText.length; i++) {
    const ch = normalizedText[i];
    const next = normalizedText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        pushField();
      } else if (ch === '\n') {
        pushRow();
      } else {
        field += ch;
      }
    }
  }
  pushRow();

  if (!rows.length) return { headers: [], rows: [] };
  return { headers: rows[0], rows: rows.slice(1) };
}

const CATEGORY_KEYWORDS = {
  food: ['swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'kitchen', 'grocery', 'bigbasket', 'blinkit', 'dunzo', 'dining', 'eat', 'pizza', 'burger', 'coffee', 'tea'],
  transport: ['uber', 'ola', 'rapido', 'metro', 'bus', 'train', 'petrol', 'fuel', 'auto', 'cab', 'taxi', 'irctc', 'flight', 'airline', 'travel'],
  shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'zepto', 'shopping', 'mart', 'store', 'mall', 'shop', 'meesho'],
  entertainment: ['netflix', 'hotstar', 'prime', 'spotify', 'youtube', 'disney', 'movie', 'cinema', 'theatre', 'game', 'bookmyshow'],
  healthcare: ['pharmacy', 'doctor', 'hospital', 'clinic', 'medical', 'medicine', 'apollo', '1mg', 'health'],
  education: ['college', 'school', 'tuition', 'course', 'udemy', 'coursera', 'book', 'library', 'study'],
  housing: ['rent', 'electricity', 'water bill', 'maintenance', 'pg', 'hostel', 'wifi', 'broadband'],
};

/**
 * Guess a category from a transaction description.
 * Returns the matched category name or 'other'.
 */
function guessCategory(description) {
  const lower = (description || '').toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return category;
  }
  return 'other';
}

/**
 * Find the index of a header column by trying multiple candidate names.
 */
function findColumnIndex(headers, candidates) {
  const normalized = headers.map(h => h.trim().toLowerCase());
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parse a CSV buffer into a list of transaction-like objects.
 * Attempts to auto-detect column names from the header row.
 *
 * @param {Buffer|string} buffer
 * @returns {{ parsed: object[], errors: string[], preview: object[] }}
 */
function parseTransactionCSV(buffer) {
  const text = buffer.toString('utf8');
  const { headers, rows } = parseCSV(text);

  if (!headers.length) return { parsed: [], errors: ['CSV file is empty or has no header row'], preview: [] };

  const dateIdx    = findColumnIndex(headers, ['date', 'transaction date', 'txn date', 'value date']);
  const amountIdx  = findColumnIndex(headers, ['amount', 'debit', 'credit', 'txn amount', 'transaction amount']);
  const descIdx    = findColumnIndex(headers, ['description', 'narration', 'particulars', 'remarks', 'details', 'memo', 'merchant']);
  const typeIdx    = findColumnIndex(headers, ['type', 'transaction type', 'dr/cr', 'debit/credit']);

  if (dateIdx === -1 || amountIdx === -1) {
    return {
      parsed: [],
      errors: ['Could not detect required columns. CSV must have "Date" and "Amount" columns (or equivalents).'],
      preview: []
    };
  }

  const parsed = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(cell => !cell.trim())) continue; // skip blank rows

    const rawDate   = dateIdx !== -1 ? (row[dateIdx] || '').trim() : '';
    const rawAmount = amountIdx !== -1 ? (row[amountIdx] || '').trim() : '';
    const rawDesc   = descIdx !== -1 ? (row[descIdx] || '').trim() : '';
    const rawType   = typeIdx !== -1 ? (row[typeIdx] || '').trim().toLowerCase() : '';

    const date = new Date(rawDate);
    if (isNaN(date.getTime())) {
      errors.push(`Row ${i + 2}: unrecognised date "${rawDate}"`);
      continue;
    }

    const amount = parseFloat(rawAmount.replace(/[^0-9.-]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Row ${i + 2}: invalid amount "${rawAmount}"`);
      continue;
    }

    let type = 'expense';
    if (rawType.includes('cr') || rawType.includes('credit') || rawType.includes('income')) {
      type = 'income';
    }

    parsed.push({
      date,
      amount,
      type,
      description: rawDesc || 'Imported transaction',
      category: guessCategory(rawDesc),
    });
  }

  return { parsed, errors, preview: parsed.slice(0, 5) };
}

module.exports = { parseCSV, parseTransactionCSV, guessCategory };
