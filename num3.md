# Pull Request: [Feature] Predictive Budget Forecasting & Trend Analysis

## Problem Addressed
Fixes #273

Currently, users set budgets manually, which may not align with their actual historical spending patterns. Without seeing a "pace" projection, users often realize they've overspent at the end of the month when it's too late to correct behavior.

## Solution Implemented
This PR introduces a data-driven approach to budgeting using historical transaction data (3-month rolling average) to predict future spending and provide smart suggestions.

### Backend Changes:
- **`analyticsController.js`**: Enhanced the `getForecast` logic to aggregate past 3 months of expenses by category. Calculates the mathematical average, trend trajectory ("increasing vs decreasing"), and real-time velocity (projected end-of-month totals based on current day's progress).
- **`analyticsRoutes.js`**: `GET /api/v1/analytics/forecast` route is enabled.

### Frontend Changes:
- **`SetBudget.jsx` (Smart Suggest)**: Implemented the ✨ Smart Suggest button. When clicked, it pulls the user's categorical forecasting averages and automatically pre-fills "Total Budget" and percentage allocations for an AI-powered suggested budget.
- **`Dashboard.jsx` (Monthly Pacing & Projection Chart)**: Added a new `Line` chart to the main dashboard. It maps actual spending day-by-day and draws a dotted "Projected Trend" line forward to the end of the month based on the current daily burn rate. It also overlays a red dotted "Budget Limit" line for early warning comparisons.
- **`Budget.jsx` (Forecast Alerts)**: Realtime alerts show when the spending velocity for a specific bucket (e.g., Food) is dangerously ahead of schedule.

## Testing Steps
1. Navigate to the `Budget` page and click "Set Monthly Budget".
2. Open "Advanced Tools" or simply click the ✨ Smart Suggest button to see your historical data populate into categories.
3. Save the budget. 
4. Check the `Dashboard` charts to see the new "Monthly Pacing & Projection" chart mapping out where your total expenses will likely end up by month's end.
