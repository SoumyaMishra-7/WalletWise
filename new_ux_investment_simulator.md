# Feature Request: Student Micro-Investment Simulator

## 🛑 Level: Medium

## 📝 Description
Many students are curious about investing but are afraid to lose money. This feature adds a "Simulator" tab to WalletWise. It allows users to "invest" their spare change (the difference between their budget and actual spending) into top stocks or ETFs using real-time data, but with virtual currency.

This educates students on the power of compounding and long-term savings without any financial risk.

**Key Requirements**:
- **Virtual Portfolio**: A dedicated sub-tab to track "Virtual Assets."
- **Real-Time Data**: Integrate with a free stock API (like Alpha Vantage or Yahoo Finance) to get daily price updates.
- **Round-Up Logic**: Automatically suggest "investing" the leftover budget at the end of each week.
- **Educational Tooltips**: Explain terms like "Dividend," "Market Cap," and "Expense Ratio" within the UI.

## 🛠️ Implementation Plan

### Backend Changes
1. **Investment Model**: Create `Investment.js` to track virtual holdings (symbol, quantity, buy price).
2. **API Wrapper**: Implement a service to fetch and cache stock prices for the last 24 hours to avoid API rate limits.
3. **Weekly Recap Logic**: A function that calculates the "Investable Surplus" (Budget - Actual Spending) for the previous week.

### Frontend Changes
1. **Simulator Dashboard**: A clean, simplified trading interface (Buy/Sell/Hold).
2. **Growth Visuals**: A line chart showing the virtual portfolio's performance over time compared to a savings account.
3. **Market Search**: A simple search bar for ticker symbols.

### Performance Consideration
- Use heavy caching for stock data.
- Update virtual portfolio values once a day to minimize server load.

## 🧪 Acceptance Criteria
- [ ] User can "buy" a virtual share of a stock at its current price.
- [ ] Portfolio total updates based on the latest market close.
- [ ] The system correctly identifies leftover budget as "Available to Invest."
- [ ] Educational tooltips are visible for at least 5 key investment terms.
