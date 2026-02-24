# [UX] Replace Text Loaders with Skeleton Screens

## 🛑 Problem Statement
Currently, [Dashboard.jsx](file:///c:/Users/visha/Downloads/WalletWise/frontend/src/components/Dashboard.jsx) uses simple text messages like "Loading data..." or generic spinners while waiting for API responses.

**UX Issues**:
- **Layout Shift**: When the data finally arrives, the page components "jump" into place, causing visual jank.
- **Perceived Latency**: Simple spinners make the app feel slower than it actually is.
- **Unfinished Aesthetic**: Plain text loaders look like placeholders rather than a finished product.

## ✅ Proposed Solution
Implement **Skeleton Screens** (Pulse loaders) that mimic the content's layout. This stabilizes the page from the start and makes the transition to real data feel instantaneous.

## 🛠️ Implementation Checklist
1. **Create Base Skeleton Component**:
   Implement a reusable CSS class `.skeleton-pulse` with a linear-gradient animation.
2. **Build Specific Skeletons**:
   - `MetricSkeleton`: 4 Pulsing boxes for the top stats.
   - `TransactionTableSkeleton`: Pulsing rows for the transaction list.
   - `ChartSkeleton`: Pulsing circular/rectangular areas for the charts.
3. **Toggle Logic**:
   In [Dashboard.jsx](file:///c:/Users/visha/Downloads/WalletWise/frontend/src/components/Dashboard.jsx), update the rendering logic:
   ```jsx
   {loading ? <DashboardSkeleton /> : <ActualContent />}
   ```

## 🧪 Acceptance Criteria
- [ ] On a slow network (3G), the user sees the "outline" of the dashboard immediately.
- [ ] Zero layout shift occurs when the `loading` state turns `false`.
- [ ] The animation is subtle and provides a high-quality, state-of-the-art feel.
