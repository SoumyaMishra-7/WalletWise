const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const { getAnalyticsSummary, getForecast } = require("../controllers/analyticsController");

router.get("/summary", protect, getAnalyticsSummary);
router.get("/forecast", protect, getForecast);

module.exports = router;
