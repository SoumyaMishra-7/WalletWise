const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const gamification = require('../utils/gamification');

// @route   GET /api/v1/gamification/status
// @desc    Get user's XP, level, badges, and streaks
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const status = await gamification.getStatus(req.user.id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'User gamification data not found' });
    }
    res.json({ success: true, data: status });
  } catch (err) {
    console.error('Gamification Status Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
