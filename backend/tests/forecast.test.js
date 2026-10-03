const { computeTrendForecast } = require('../controllers/analyticsController');

describe('computeTrendForecast', () => {
  it('predicts above the average on a steady climb', () => {
    const res = computeTrendForecast([5000, 6000, 7000], 6000);
    expect(res.trend).toBe('increasing');
    expect(res.predictedNextMonth).toBe(8000);
  });

  it('predicts below the average on a steady decline', () => {
    const res = computeTrendForecast([7000, 6000, 5000], 6000);
    expect(res.trend).toBe('decreasing');
    expect(res.predictedNextMonth).toBe(4000);
  });

  it('stays near the average when flat', () => {
    const res = computeTrendForecast([6000, 6000, 6000], 6000);
    expect(res.trend).toBe('stable');
    expect(res.predictedNextMonth).toBe(6000);
  });

  it('falls back safely with a single point', () => {
    const res = computeTrendForecast([4500], 4500);
    expect(res.predictedNextMonth).toBeGreaterThan(0);
  });
});
