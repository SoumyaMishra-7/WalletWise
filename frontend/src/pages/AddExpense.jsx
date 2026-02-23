import React, { useState, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Scan, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AddExpense.css';

// 1. Added 'transactionToEdit' to props
const AddExpense = ({ isOpen, onClose, onAddExpense, transactionToEdit }) => {
  const [formData, setFormData] = useState({
    amount: '',
    category: 'food',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    description: '',
    mood: 'neutral'
  });

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const fileInputRef = useRef(null);

  const { user } = useAuth();
  const currencySymbol = user?.currency === 'INR' ? '₹' : (user?.currency === 'EUR' ? '€' : (user?.currency === 'GBP' ? '£' : '$'));

  // 2. Added useEffect to pre-fill the form when editiSmart Receipt Scanning (OCR)Smart Receipt Scanning (OCR)ng
  useEffect(() => {
    if (transactionToEdit) {
      setFormData({
        amount: transactionToEdit.amount,
        category: transactionToEdit.category || 'food',
        date: transactionToEdit.date ? new Date(transactionToEdit.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        paymentMethod: transactionToEdit.paymentMethod || 'cash',
        description: transactionToEdit.description || '',
        mood: transactionToEdit.mood || 'neutral'
      });
    } else {
      // Reset form if adding new
      setFormData({
        amount: '',
        category: 'food',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        description: '',
        mood: 'neutral'
      });
    }
  }, [transactionToEdit, isOpen]);

  const expenseCategories = [
    { value: 'food', label: 'Food & Dining' },
    { value: 'transport', label: 'Transportation' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'education', label: 'Education' },
    { value: 'healthcare', label: 'Health & Fitness' },
    { value: 'housing', label: 'Housing' },
    { value: 'other', label: 'Other' }
  ];

  const moodOptions = [
    { value: 'happy', label: 'Happy / Excited' },
    { value: 'stressed', label: 'Stressed / Tired' },
    { value: 'bored', label: 'Bored / Impulsive' },
    { value: 'sad', label: 'Sad / Low' },
    { value: 'calm', label: 'Calm / Productive' },
    { value: 'neutral', label: 'Neutral' }
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Debit/Credit Card' },
    { value: 'online', label: 'Online Banking' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const transactionData = {
      type: 'expense',
      amount: Number(formData.amount),
      category: formData.category,
      description: formData.description || '',
      paymentMethod: formData.paymentMethod,
      date: formData.date,
      mood: formData.mood
    };

    if (transactionToEdit) {
      const id = transactionToEdit._id || transactionToEdit.id;
      if (id) {
        transactionData._id = id;
      }
    }

    onAddExpense(transactionData);
    onClose();

    if (!transactionToEdit) {
      setFormData({
        amount: '',
        category: 'food',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        description: '',
        mood: 'neutral'
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScanReceipt = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setScanProgress(0);
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setScanProgress(Math.round(m.progress * 100));
          }
        }
      });

      console.log("Extracted Text:", text);
      parseReceiptText(text);
    } catch (error) {
      console.error("OCR Error:", error);
      alert("Failed to scan receipt. Please try again.");
    } finally {
      setIsScanning(false);
      setScanProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const parseReceiptText = (text) => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    // 1. Extract Store Name
    // Skip generic headers and lines with mostly non-alphanumeric characters
    let storeName = '';
    const genericHeaders = ['receipt', 'invoice', 'bill', 'order', 'transaction', 'welcome', 'customer', 'date', 'time', 'cashier', 'terminal', 'store', 'shop'];

    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();

      // Check if line is a generic header
      if (genericHeaders.some(h => lowerLine.includes(h))) continue;

      // Check if line has enough alphanumeric content (at least 3 letters/numbers)
      const alnumCount = (line.match(/[a-z0-9]/gi) || []).length;
      if (alnumCount < 3) continue;

      // Avoid picking up the date as store name
      if (line.match(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/)) continue;

      storeName = line;
      break;
    }

    // 2. Extract Amount
    let amount = '';
    // Look for patterns like "TOTAL 123.45", "AMOUNT $10.00", etc.
    const amountRegex = new RegExp(`(?:total|amount|sum|net|grand total|total amount|payable|due|paid)[:\\s]*[₹$€£\\s${currencySymbol}]*([\\d,]+\\.?\\d{0,2})`, 'i');
    const amountMatch = text.match(amountRegex);

    if (amountMatch && amountMatch[1]) {
      amount = amountMatch[1].replace(/,/g, '');
    } else {
      // Fallback: Find the largest number (at least 1.00)
      const numbers = text.match(/[\d,]+(\.\d{2})?/g);
      if (numbers) {
        const floatNumbers = numbers
          .map(n => parseFloat(n.replace(/,/g, '')))
          .filter(n => !isNaN(n) && n > 0);
        if (floatNumbers.length > 0) {
          amount = Math.max(...floatNumbers).toString();
        }
      }
    }

    // 3. Extract Date
    let date = new Date().toISOString().split('T')[0];
    const dateRegexes = [
      /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/, // DD/MM/YYYY or MM/DD/YYYY
      /(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/, // YYYY/MM/DD
      /(\d{1,2}) ([a-zA-Z]{3,}) (\d{4})/ // DD MMM YYYY
    ];

    for (const regex of dateRegexes) {
      const match = text.match(regex);
      if (match) {
        try {
          let y, m, d;
          if (regex.source.includes('([a-zA-Z]{3,})')) {
            // DD MMM YYYY
            const dateObj = new Date(match[0]);
            if (!isNaN(dateObj.getTime())) {
              date = dateObj.toISOString().split('T')[0];
              break;
            }
          } else if (match[1].length === 4) {
            // YYYY/MM/DD
            [y, m, d] = [match[1], match[2], match[3]];
          } else {
            // DD/MM/YYYY or MM/DD/YYYY
            let [v1, v2, v3] = [match[1], match[2], match[3]];
            if (parseInt(v1) > 12) {
              // Definitely DD/MM/YYYY
              [d, m, y] = [v1, v2, v3];
            } else if (parseInt(v2) > 12) {
              // Definitely MM/DD/YYYY
              [m, d, y] = [v1, v2, v3];
            } else {
              // Ambiguous, assume DD/MM/YYYY
              [d, m, y] = [v1, v2, v3];
            }
          }

          if (y && m && d) {
            if (y.length === 2) y = '20' + y;
            const formatted = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            if (!isNaN(new Date(formatted).getTime())) {
              date = formatted;
              break;
            }
          }
        } catch (e) {
          console.error("Date parsing error:", e);
        }
      }
    }

    // 4. Categorize based on store name or text
    let category = 'other';
    const categoryKeywords = {
      food: ['mcdonald', 'domino', 'kfc', 'starbucks', 'burger king', 'pizza', 'restaurant', 'cafe', 'food', 'bakery', 'subway', 'zomato', 'swiggy', 'dine', 'grocery', 'supermarket', 'walmart', 'whole foods', 'trader joe', 'taco bell', 'dunkin', 'baskin', 'cream', 'bakery', 'hotel'],
      transport: ['uber', 'ola', 'lyft', 'grab', 'metro', 'train', 'taxi', 'fuel', 'petrol', 'diesel', 'shell', 'bp', 'travel', 'irctc', 'airline', 'flight', 'indigo', 'air india', 'bus', 'parking', 'garage', 'auto'],
      shopping: ['amazon', 'flipkart', 'walmart', 'target', 'ebay', 'store', 'mall', 'mart', 'reliance', 'dmart', 'clothing', 'fashion', 'myntra', 'nike', 'adidas', 'zara', 'h&m', 'ikea', 'electronics', 'apple', 'samsung', 'mobile'],
      healthcare: ['pharmacy', 'hospital', 'clinic', 'medical', 'doctor', 'apollo', 'pharmeasy', 'health', 'dentist', 'eye', 'care', 'medicine'],
      entertainment: ['netflix', 'spotify', 'cinema', 'pvr', 'movie', 'game', 'google play', 'apple bill', 'disney', 'theatre', 'concert', 'ticket', 'pub', 'club', 'bar', 'lounge'],
      housing: ['rent', 'electricity', 'water', 'gas', 'maintenance', 'internet', 'wifi', 'jio', 'airtel', 'utility', 'repair', 'plumbing', 'furniture'],
      education: ['book', 'course', 'udemy', 'coursera', 'school', 'college', 'tuition', 'library', 'training', 'stationary']
    };

    const findCategory = (str) => {
      if (!str) return null;
      str = str.toLowerCase();
      for (const [cat, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(kw => new RegExp('\\b' + kw, 'i').test(str))) {
          return cat;
        }
      }
      return null;
    };

    const detectedCategory = findCategory(storeName) || findCategory(text);
    if (detectedCategory) category = detectedCategory;

    setFormData(prev => ({
      ...prev,
      amount: amount || prev.amount,
      category: category || prev.category,
      date: date || prev.date,
      description: storeName ? `Receipt from ${storeName}` : prev.description
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="expense-modal-overlay">
      <div className="expense-modal-content">
        <div className="expense-modal-header expense-header">
          {/* 4. Update Title dynamically */}
          <h2>{transactionToEdit ? 'Edit Expense' : 'Add Expense'}</h2>
          <div className="header-actions">
            {!transactionToEdit && (
              <>
                <button
                  type="button"
                  className="scan-receipt-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="animate-spin size-4 mr-2" />
                      <span>{scanProgress > 0 ? `Scanning ${scanProgress}%` : 'Starting...'}</span>
                    </>
                  ) : (
                    <>
                      <Scan size={18} className="mr-2" />
                      <span>Scan Receipt</span>
                    </>
                  )}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleScanReceipt}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </>
            )}
            <button className="close-expense-btn" onClick={onClose}>Close</button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Amount Field */}
          <div className="expense-form-group">
            <label htmlFor="amount">Amount (Required)</label>
            <div className="expense-amount-input">
              <span className="currency-label">{currencySymbol}</span>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Mood Tracking */}
          <div className="expense-form-group">
            <label>How were you feeling?</label>
            <div className="selection-grid">
              {moodOptions.map(m => (
                <button
                  key={m.value}
                  type="button"
                  className={`selection-btn ${formData.mood === m.value ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, mood: m.value }))}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selection */}
          <div className="expense-form-group">
            <label>Category</label>
            <div className="selection-grid">
              {expenseCategories.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  className={`selection-btn ${formData.category === cat.value ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row-flex">
            <div className="expense-form-group flex-1">
              <label htmlFor="date">Date</label>
              <input type="date" id="date" name="date" value={formData.date} onChange={handleChange} />
            </div>
            <div className="expense-form-group flex-1">
              <label htmlFor="paymentMethod">Payment Method</label>
              <select id="paymentMethod" name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
                {paymentMethods.map(pm => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
              </select>
            </div>
          </div>

          <div className="expense-form-group">
            <label htmlFor="description">Notes</label>
            <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows="2" />
          </div>

          <div className="expense-form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            {/* 5. Update Button Text dynamically */}
            <button type="submit" className="btn-primary">
              {transactionToEdit ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;