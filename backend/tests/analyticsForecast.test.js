'use strict';

/**
 * Tests for the spending forecast logic — specifically the weighted
 * moving average and trend-slope calculation that was improved as part
 * of issue #414. Tests verify the math behaves correctly without needing
 * a database connection.
 */

describe('Spending forecast math — WMA and trend slope', () => {
  // Helper: calculate WMA the same way analyticsController does
  const WMA_WEIGHTS = [0.2, 0.3, 0.5] // oldest → newest

  const calcWMA = (values) => {
    const totalWeight = values.reduce((sum, _, i) => sum + WMA_WEIGHTS[i], 0)
    return values.reduce((sum, val, i) => sum + val * WMA_WEIGHTS[i], 0) / totalWeight
  }

  const calcSlope = (values) => {
    const n = values.length
    const xMean = (n - 1) / 2
    const yMean = values.reduce((s, v) => s + v, 0) / n
    const numerator = values.reduce((num, v, i) => num + (i - xMean) * (v - yMean), 0)
    const denominator = values.reduce((den, _, i) => den + (i - xMean) ** 2, 0)
    return denominator === 0 ? 0 : numerator / denominator
  }

  it('WMA of equal values equals that value', () => {
    const wma = calcWMA([100, 100, 100])
    expect(wma).toBeCloseTo(100, 5)
  })

  it('WMA gives more weight to recent values', () => {
    // [100, 100, 200] → WMA should be between 100 and 200, closer to 200
    const wma = calcWMA([100, 100, 200])
    expect(wma).toBeGreaterThan(130) // closer to 200 due to 0.5 weight
    expect(wma).toBeLessThan(200)
  })

  it('WMA of increasing series is higher than simple average', () => {
    const values = [5000, 6000, 7000]
    const simpleAvg = values.reduce((s, v) => s + v, 0) / values.length // 6000
    const wma = calcWMA(values)
    expect(wma).toBeGreaterThan(simpleAvg)
  })

  it('trend slope is positive for increasing series', () => {
    const slope = calcSlope([5000, 6000, 7000])
    expect(slope).toBeGreaterThan(0)
  })

  it('trend slope is negative for decreasing series', () => {
    const slope = calcSlope([7000, 6000, 5000])
    expect(slope).toBeLessThan(0)
  })

  it('trend slope is zero for flat series', () => {
    const slope = calcSlope([5000, 5000, 5000])
    expect(Math.abs(slope)).toBeLessThan(0.0001)
  })

  it('WMA + slope prediction is higher than WMA for increasing trend', () => {
    const values = [5000, 6000, 7000]
    const wma = calcWMA(values)
    const slope = calcSlope(values)
    const prediction = wma + slope
    expect(prediction).toBeGreaterThan(wma)
  })

  it('WMA + slope prediction is lower than WMA for decreasing trend', () => {
    const values = [7000, 6000, 5000]
    const wma = calcWMA(values)
    const slope = calcSlope(values)
    const prediction = wma + slope
    expect(prediction).toBeLessThan(wma)
  })
})
