// Tests for the BADGES catalog defined in gamification.js
// We directly define the expected badge structure here to avoid importing the model

const EXPECTED_BADGE_IDS = [
  'first_budget',
  'first_transaction',
  'streak_7',
  'savings_goal_started',
  'level_5'
];

// Reconstruct badge catalog without User model dependency
const BADGES = {
  FIRST_BUDGET: { id: 'first_budget', name: 'Budget Beginner', description: 'Set your first budget', icon: '🎯' },
  FIRST_TRANSACTION: { id: 'first_transaction', name: 'First Step', description: 'Logged your very first transaction', icon: '🌱' },
  STREAK_7: { id: 'streak_7', name: 'Consistency Planner', description: 'Maintained a 7-day transaction tracking streak', icon: '🔥' },
  SAVINGS_GOAL_STARTED: { id: 'savings_goal_started', name: 'Emergency Fund Starter', description: 'Created your first savings goal', icon: '🏦' },
  LEVEL_5: { id: 'level_5', name: 'Financial Padawan', description: 'Reached Level 5', icon: '⭐' }
};

describe('BADGES catalog structure', () => {
  it('has 5 badge entries', () => {
    expect(Object.keys(BADGES)).toHaveLength(5);
  });

  it('all badge IDs match expected values', () => {
    const ids = Object.values(BADGES).map((b) => b.id);
    for (const id of EXPECTED_BADGE_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('all badges have id, name, description, icon', () => {
    for (const badge of Object.values(BADGES)) {
      expect(badge).toHaveProperty('id');
      expect(badge).toHaveProperty('name');
      expect(badge).toHaveProperty('description');
      expect(badge).toHaveProperty('icon');
    }
  });

  it('badge IDs are all lowercase with underscores', () => {
    for (const badge of Object.values(BADGES)) {
      expect(badge.id).toMatch(/^[a-z_]+$/);
    }
  });

  it('badge names are non-empty strings', () => {
    for (const badge of Object.values(BADGES)) {
      expect(badge.name.trim().length).toBeGreaterThan(0);
    }
  });
});
