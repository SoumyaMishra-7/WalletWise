const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transactions');
const { protect } = require('../middleware/auth');

// Add transaction (both income and expense)
router.post('/', protect, async (req, res) => {
  try {
    const { type, amount, category, description, paymentMethod, date, mood } = req.body;

    console.log('📥 Received transaction data:', { type, amount, category, description, paymentMethod, date, mood });

    // Validate required fields
    if (!type || !amount || !category) {
      return res.status(400).json({ message: 'Type, amount, and category are required' });
    }

    //Validate amount is a number and positive
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        message: 'Amount must be a valid positive number. Strings are not allowed.'
      });
    }

    // Validate type
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'Type must be either income or expense' });
    }

    const transaction = new Transaction({
      userId: req.userId, // Assuming you have user authentication
      type,
      amount: type === 'income' ? Math.abs(amount) : -Math.abs(amount), // Store negative for expenses
      category,
      description,
      paymentMethod,
      date: date || new Date(),
      mood: mood || 'neutral'
    });

    await transaction.save();

    // Update user's balance if needed
    // You might want to update the user's total balance here

    res.status(201).json({
      message: 'Transaction added successfully',
      transaction
    });
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});