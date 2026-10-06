'use strict';

const { XP_AWARDS, LEVELS, BADGES } = require('../utils/gamificationConstants');

describe('XP_AWARDS', () => {
  it('TRANSACTION award is a positive integer', () => {
    expect(typeof XP_AWARDS.TRANSACTION).toBe('number');
    expect(XP_AWARDS.TRANSACTION).toBeGreaterThan(0);
    expect(Number.isInteger(XP_AWARDS.TRANSACTION)).toBe(true);
  });

  it('BUDGET_MET award is greater than TRANSACTION award', () => {
    expect(XP_AWARDS.BUDGET_MET).toBeGreaterThan(XP_AWARDS.TRANSACTION);
  });

  it('STREAK_BONUS_MULTIPLIER is a positive integer', () => {
    expect(XP_AWARDS.STREAK_BONUS_MULTIPLIER).toBeGreaterThan(0);
    expect(Number.isInteger(XP_AWARDS.STREAK_BONUS_MULTIPLIER)).toBe(true);
  });

  it('all XP award values are positive integers', () => {
    Object.entries(XP_AWARDS).forEach(([key, value]) => {
      expect(typeof value, `${key} should be a number`).toBe('number');
      expect(value, `${key} should be > 0`).toBeGreaterThan(0);
      expect(Number.isInteger(value), `${key} should be integer`).toBe(true);
    });
  });
});

describe('LEVELS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(LEVELS)).toBe(true);
    expect(LEVELS.length).toBeGreaterThan(0);
  });

  it('each level has level, requiredXP, and title fields', () => {
    LEVELS.forEach((lvl) => {
      expect(typeof lvl.level).toBe('number');
      expect(typeof lvl.requiredXP).toBe('number');
      expect(typeof lvl.title).toBe('string');
      expect(lvl.title.length).toBeGreaterThan(0);
    });
  });

  it('level numbers are sequential starting from 1', () => {
    LEVELS.forEach((lvl, i) => {
      expect(lvl.level).toBe(i + 1);
    });
  });

  it('requiredXP values are non-decreasing', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].requiredXP).toBeGreaterThanOrEqual(LEVELS[i - 1].requiredXP);
    }
  });

  it('first level starts at 0 XP', () => {
    expect(LEVELS[0].requiredXP).toBe(0);
  });

  it('all level titles are unique', () => {
    const titles = LEVELS.map((l) => l.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe('BADGES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(BADGES)).toBe(true);
    expect(BADGES.length).toBeGreaterThan(0);
  });

  it('each badge has id, name, description, icon, and condition', () => {
    BADGES.forEach((badge) => {
      expect(typeof badge.id, `${badge.id} id`).toBe('string');
      expect(typeof badge.name, `${badge.id} name`).toBe('string');
      expect(typeof badge.description, `${badge.id} description`).toBe('string');
      expect(typeof badge.icon, `${badge.id} icon`).toBe('string');
      expect(badge.condition).toBeDefined();
      expect(typeof badge.condition.type, `${badge.id} condition.type`).toBe('string');
    });
  });

  it('all badge ids are unique', () => {
    const ids = BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('condition types are known values', () => {
    const knownTypes = ['FIRST_TRANSACTION', 'STREAK', 'XP_MILESTONE', 'SAVINGS_GOAL_STARTED', 'FIRST_BUDGET'];
    BADGES.forEach((badge) => {
      expect(knownTypes, `${badge.id} has unknown condition.type: ${badge.condition.type}`)
        .toContain(badge.condition.type);
    });
  });

  it('STREAK badges have a numeric value', () => {
    BADGES.filter((b) => b.condition.type === 'STREAK').forEach((badge) => {
      expect(typeof badge.condition.value, `${badge.id} streak value`).toBe('number');
      expect(badge.condition.value).toBeGreaterThan(0);
    });
  });
});
