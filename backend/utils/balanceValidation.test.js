// Test wallet balance validation logic
describe('Wallet balance validation', () => {
  function canAffordExpense(balance, expenseAmount) {
    return typeof balance === 'number' && typeof expenseAmount === 'number' && balance >= expenseAmount;
  }

  function getBalanceAfterExpense(balance, expenseAmount) {
    return balance - expenseAmount;
  }

  it('user with $500 can afford $300 expense', () => {
    expect(canAffordExpense(500, 300)).toBe(true);
  });

  it('user with $200 cannot afford $300 expense', () => {
    expect(canAffordExpense(200, 300)).toBe(false);
  });

  it('user with exactly $300 can afford $300 expense', () => {
    expect(canAffordExpense(300, 300)).toBe(true);
  });

  it('user with $0 cannot afford any expense', () => {
    expect(canAffordExpense(0, 1)).toBe(false);
  });

  it('balance after expense is correctly calculated', () => {
    expect(getBalanceAfterExpense(500, 100)).toBe(400);
  });

  it('balance after expense can be negative (flexible mode)', () => {
    expect(getBalanceAfterExpense(50, 100)).toBe(-50);
  });

  it('null balance returns false for affordability check', () => {
    expect(canAffordExpense(null, 100)).toBe(false);
  });

  it('NaN amount returns false for affordability check', () => {
    expect(canAffordExpense(500, NaN)).toBe(false);
  });
});
