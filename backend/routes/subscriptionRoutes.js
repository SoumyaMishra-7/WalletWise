
const express = require('express');
const router = express.Router();
const {
    getSubscriptions,
    addSubscription,
    deleteSubscription,
    detectSubscriptions
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getSubscriptions);
router.post('/', addSubscription);
router.delete('/:id', deleteSubscription);
router.get('/detect', detectSubscriptions); // Changed to GET for easier testing, though POST is fine too

module.exports = router;
