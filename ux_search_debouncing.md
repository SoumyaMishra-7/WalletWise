# [UX] Debounce Transaction Search Field

## 🛑 Problem Statement
The search box on the [Transactions page](file:///c:/Users/visha/Downloads/WalletWise/frontend/src/pages/Transactions.jsx) (and filters on Dashboard) currently executes an API request on every single keyup event.

**Bottlenecks**:
- **Server Load**: A user typing "Entertainment" causes 13 database queries in 2 seconds.
- **Race Conditions**: If a shorter query returns later than a longer one, the results list might jitter or show incorrect filtered data.
- **Unnecessary Data Transfers**: Mobile users on limited data waste bandwidth on intermediate search states.

## ✅ Proposed Solution
Implement a **debounce mechanism** with a 300ms–500ms delay. The API should only be called once the user stops typing.

## 🛠️ Implementation Checklist
1. **Choose Strategy**:
   - Use `lodash.debounce` for simplicity.
   - OR create a custom `useDebounce` hook to manage the timer.
2. **Update Component State**:
   - Keep a `searchTerm` state for the input display.
   - Use a separate `debouncedSearch` state to trigger the `useEffect` that calls the API.
3. **Cleanup**: Ensure the timer is cleared if the component unmounts to prevent memory leaks.

## 🧪 Acceptance Criteria
- [ ] High-speed typing only triggers ONE API call at the end of the phrase.
- [ ] The search remains accurate and includes all characters typed.
- [ ] Clearing the search bar instantly resets the list (no debounce on clear is usually better UX).
