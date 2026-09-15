const { addMonthsClamped } = require('../utils/helpers');

describe('addMonthsClamped', () => {
  it('keeps normal dates unchanged (Jan 31 -> Feb 28)', () => {
    const result = addMonthsClamped(new Date(2026, 0, 31));
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(28);
  });

  it('clamps month-end overflow instead of rolling into the next month', () => {
    const result = addMonthsClamped(new Date(2026, 2, 31)); // Mar 31
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDate()).toBe(30);
  });

  it('handles leap years correctly (Jan 31, 2028 -> Feb 29)', () => {
    const result = addMonthsClamped(new Date(2028, 0, 31));
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(29);
  });

  it('leaves mid-month dates untouched (Apr 15 -> May 15)', () => {
    const result = addMonthsClamped(new Date(2026, 3, 15));
    expect(result.getMonth()).toBe(4);
    expect(result.getDate()).toBe(15);
  });

  it('does not mutate the original date', () => {
    const original = new Date(2026, 0, 31);
    addMonthsClamped(original);
    expect(original.getDate()).toBe(31);
  });

  it('supports adding more than one month', () => {
    const result = addMonthsClamped(new Date(2026, 0, 31), 2);
    expect(result.getMonth()).toBe(2); // March
    expect(result.getDate()).toBe(31);
  });
});
