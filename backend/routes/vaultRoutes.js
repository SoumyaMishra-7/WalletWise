const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// @route   GET /api/v1/vault/status
// @desc    Check if vault is enabled, and get the user's salt
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      vaultEnabled: user.vaultEnabled === true,
      vaultSalt: user.vaultSalt || null
    });
  } catch (err) {
    console.error('Vault Status Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/v1/vault/setup
// @desc    Enable vault and save the securely (client) generated salt
// @access  Private
router.post('/setup', protect, async (req, res) => {
  try {
    const { salt } = req.body;
    
    if (!salt || typeof salt !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid salt provided' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (user.vaultEnabled) {
      return res.status(400).json({ success: false, message: 'Vault is already set up.' });
    }

    user.vaultEnabled = true;
    user.vaultSalt = salt;
    await user.save();

    res.json({
      success: true,
      message: 'Vault securely enabled.',
      vaultEnabled: true,
      vaultSalt: salt
    });
  } catch (err) {
    console.error('Vault Setup Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
