// Test transaction sort option handling
describe('Transaction sort options', () => {
  function getSortOptions(sort) {
    if (sort === 'oldest') return { date: 1 };
    if (sort === 'amount-high') return { amount: -1 };
    if (sort === 'amount-low') return { amount: 1 };
    return { date: -1 }; // default: newest
  }

  it('default sort is newest first (date: -1)', () => {
    expect(getSortOptions(undefined)).toEqual({ date: -1 });
  });

  it('"newest" sort is newest first (date: -1)', () => {
    expect(getSortOptions('newest')).toEqual({ date: -1 });
  });

  it('"oldest" sort is oldest first (date: 1)', () => {
    expect(getSortOptions('oldest')).toEqual({ date: 1 });
  });

  it('"amount-high" sort is descending amount', () => {
    expect(getSortOptions('amount-high')).toEqual({ amount: -1 });
  });

  it('"amount-low" sort is ascending amount', () => {
    expect(getSortOptions('amount-low')).toEqual({ amount: 1 });
  });

  it('invalid sort value falls back to newest', () => {
    expect(getSortOptions('random')).toEqual({ date: -1 });
  });
});
