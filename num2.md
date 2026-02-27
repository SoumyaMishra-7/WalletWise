# Pull Request: [Feature] Student Micro-Investment Simulator

## Problem Addressed
Fixes #275

Students need a risk-free environment to learn about investing their spare budget money. Many are intimidated by actual financial markets but want to understand concepts like compounding and terminology.

## Solution Implemented
Created a virtual Micro-Investment Simulator that calculates unused budget savings and allows users to "invest" those virtual dollars into real-world stocks using simulated prices.

### Backend Changes:
- **`Investment.js`**: Created a Mongoose schema to track users' virtual stock holdings (symbol, quantity, average buy price, current price).
- **`investmentController.js`**:
  - `getPortfolio`: Aggregates the virtual holdings and calculates the total value and `availableToInvest` balance.
  - `getMarketData`: Provides a list of popular student-friendly stocks (AAPL, MSFT, TSLA, SPY, etc.) with simulated pricing.
  - `buyStock` / `sellStock`: Endpoints to update virtual stock quantities in the user's portfolio.
- **`investmentRoutes.js`**: Exposed routes at `/api/v1/investments`.
  
### Frontend Changes:
- **`InvestmentSimulator.jsx` & CSS**: Built a dashboard to view the virtual portfolio, search/buy stocks from the mock market, and read educational tooltips on financial terms like "Market Cap" and "ETF".
- **`Dashboard.jsx` & `App.jsx`**: Wired the new simulator route `/simulator` and added a link to the main sidebar navigation.

## Testing Steps
1. Navigate to your dashboard. Make sure you have some budget vs expense data to derive a surplus.
2. Click on "Simulator" in the sidebar.
3. Review the "Learning Hub" tooltips for terms.
4. From the Market list, click "Buy" on a stock.
5. Verify the "Your Virtual Portfolio" updates and reflects your new holding immediately.
6. Try selling a stock from the Holdings table and watch the virtual cash balance restore.
