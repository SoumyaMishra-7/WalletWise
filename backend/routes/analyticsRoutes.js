const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const { getAnalyticsSummary, getForecast, getFinancialHealth } = require("../controllers/analyticsController");

router.get("/summary", protect, getAnalyticsSummary);
router.get("/forecast", protect, getForecast);
router.get("/financial-health", protect, getFinancialHealth);

module.exports = router;
