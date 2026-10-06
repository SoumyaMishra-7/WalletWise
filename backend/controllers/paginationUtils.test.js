// Test pagination utility calculations
describe('Pagination utility functions', () => {
  function sanitizePaginationParams(page, limit) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;
    return { pageNum, limitNum, skip };
  }

  function totalPages(total, limitNum) {
    return Math.ceil(total / limitNum);
  }

  it('default params: page=1, limit=10, skip=0', () => {
    const { pageNum, limitNum, skip } = sanitizePaginationParams(undefined, undefined);
    expect(pageNum).toBe(1);
    expect(limitNum).toBe(10);
    expect(skip).toBe(0);
  });

  it('page=2, limit=10 → skip=10', () => {
    const { skip } = sanitizePaginationParams('2', '10');
    expect(skip).toBe(10);
  });

  it('page=3, limit=20 → skip=40', () => {
    const { skip } = sanitizePaginationParams('3', '20');
    expect(skip).toBe(40);
  });

  it('non-numeric page defaults to 1', () => {
    expect(sanitizePaginationParams('abc', '10').pageNum).toBe(1);
  });

  it('non-numeric limit defaults to 10', () => {
    expect(sanitizePaginationParams('1', 'xyz').limitNum).toBe(10);
  });

  it('limit is capped at 100', () => {
    expect(sanitizePaginationParams('1', '1000').limitNum).toBe(100);
  });

  it('page 0 becomes 1', () => {
    expect(sanitizePaginationParams('0', '10').pageNum).toBe(1);
  });

  it('negative page becomes 1', () => {
    expect(sanitizePaginationParams('-5', '10').pageNum).toBe(1);
  });

  it('totalPages(100, 10) = 10', () => {
    expect(totalPages(100, 10)).toBe(10);
  });

  it('totalPages(101, 10) = 11', () => {
    expect(totalPages(101, 10)).toBe(11);
  });
});
