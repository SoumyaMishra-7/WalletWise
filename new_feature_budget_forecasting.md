# Feature Request: Predictive Budget Forecasting & Trend Analysis

## 🛑 Level: Medium

## 📝 Description
Currently, users set budgets manually based on intuition. This feature introduces a data-driven approach to budgeting. By analyzing at least 3 months of historical data, WalletWise will "predict" the likely spending for the next month and suggest custom budget limits for each category.

This helps students stay ahead of their spending peaks (e.g., beginning of semester expenses or holiday spending).

**Key Requirements**:
- **Trend Detection**: Identify categories with increasing or decreasing spending over time.
- **Predictive Suggestions**: Automatically suggest "Total Budget" for next month based on a 3-month rolling average.
- **Anomaly Warnings**: Alert the user if their current spending velocity suggests they will hit their budget 2 weeks early.
- **Visual Projection**: A "dotted line" on charts showing where the user's spending is projected to end the month at the current rate.

## 🛠️ Implementation Plan

### Backend Changes
1. **Analytics Engine**: Extend `backend/controllers/analyticsController.js` to include statistical methods (Mean, Median, Standard Deviation) for categorical spending.
2. **Forecasting Endpoint**: Create `GET /api/v1/analytics/forecast` that returns projected totals.
3. **Data Aggregation**: Implement efficient MongoDB aggregation pipelines to bucket data by month/category over long periods.

### Frontend Changes
1. **Interactive Charts**: Update Chart.js / Recharts implementation to include a "Projection" layer.
2. **"Smart Suggest" Button**: In the Budget Creation form, add a button that pre-fills values based on the forecast.
3. **Summary Insights**: A card that says "At your current rate, you will exceed your 'Food' budget by $45 this month."

### Mathematical Consideration
- Use simple linear regression or moving averages to keep the computation lightweight yet useful.

## 🧪 Acceptance Criteria
- [ ] Forecast is generated based on historical data when available.
- [ ] System provides a "Baseline" suggestion for 100% of existing categories.
- [ ] Projection charts update in real-time as new transactions are added.
- [ ] User can accept or override suggested budget values.
