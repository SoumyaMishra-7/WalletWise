'use strict';

const GamificationService = require('../services/GamificationService');

// Instantiate with minimal mock repos — we only test the pure methods
const service = new GamificationService({
  userRepository: {},
  logger: { info: jest.fn(), error: jest.fn() },
});

describe('GamificationService — calculateLevel', () => {
  it('returns level 1 for 0 XP', () => {
    expect(service.calculateLevel(0)).toBe(1);
  });

  it('returns level 1 for null/undefined (treated as 0)', () => {
    expect(service.calculateLevel(null)).toBe(1);
    expect(service.calculateLevel(undefined)).toBe(1);
  });

  it('returns level 1 for XP below 100', () => {
    expect(service.calculateLevel(99)).toBe(1);
  });

  it('returns level 2 at exactly 100 XP', () => {
    // sqrt(100/100) + 1 = sqrt(1) + 1 = 2
    expect(service.calculateLevel(100)).toBe(2);
  });

  it('returns level 3 at exactly 400 XP', () => {
    // sqrt(400/100) + 1 = sqrt(4) + 1 = 3
    expect(service.calculateLevel(400)).toBe(3);
  });

  it('returns level 11 at exactly 10000 XP', () => {
    // sqrt(10000/100) + 1 = sqrt(100) + 1 = 11
    expect(service.calculateLevel(10000)).toBe(11);
  });

  it('increases monotonically as XP increases', () => {
    let lastLevel = service.calculateLevel(0);
    for (let xp = 100; xp <= 10000; xp += 100) {
      const level = service.calculateLevel(xp);
      expect(level).toBeGreaterThanOrEqual(lastLevel);
      lastLevel = level;
    }
  });
});

describe('GamificationService — getNextLevelXP', () => {
  it('returns 100 XP required for level 1 → 2', () => {
    // level 1 → next = 1^2 * 100 = 100
    expect(service.getNextLevelXP(1)).toBe(100);
  });

  it('returns 400 XP required for level 2 → 3', () => {
    // level 2 → next = 2^2 * 100 = 400
    expect(service.getNextLevelXP(2)).toBe(400);
  });

  it('returns 900 XP required for level 3 → 4', () => {
    // level 3 → next = 3^2 * 100 = 900
    expect(service.getNextLevelXP(3)).toBe(900);
  });

  it('scales as level^2 * 100', () => {
    for (let level = 1; level <= 10; level++) {
      expect(service.getNextLevelXP(level)).toBe(level * level * 100);
    }
  });

  it('XP required increases for each successive level', () => {
    let prev = service.getNextLevelXP(1);
    for (let level = 2; level <= 10; level++) {
      const current = service.getNextLevelXP(level);
      expect(current).toBeGreaterThan(prev);
      prev = current;
    }
  });
});
