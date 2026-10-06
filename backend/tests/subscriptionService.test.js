'use strict';

const SubscriptionService = require('../services/SubscriptionService');

// Mock Subscription model
class MockSubscriptionModel {
  constructor(data) {
    Object.assign(this, data);
    this._id = `sub_${Date.now()}`;
  }
  async save() { return this; }
  static findOneAndUpdate = jest.fn()
  static find = jest.fn(() => Promise.resolve([]))
}

const service = new SubscriptionService({
  subscriptionModel: MockSubscriptionModel,
  txRepository: {},
  logger: { info: jest.fn(), error: jest.fn() },
});

describe('SubscriptionService — deleteSubscription validation', () => {
  it('returns 400 for invalid ObjectId format', async () => {
    const result = await service.deleteSubscription('user1', 'not-valid-id');
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/invalid/i);
  });

  it('returns 400 for empty string ObjectId', async () => {
    const result = await service.deleteSubscription('user1', '');
    expect(result.status).toBe(400);
  });

  it('returns 404 when subscription not found', async () => {
    MockSubscriptionModel.findOneAndUpdate.mockResolvedValueOnce(null);
    const result = await service.deleteSubscription('user1', '6501234567890abc12345678');
    expect(result.status).toBe(404);
  });

  it('returns success when subscription is found and deactivated', async () => {
    MockSubscriptionModel.findOneAndUpdate.mockResolvedValueOnce({
      _id: '6501234567890abc12345678',
      isActive: false,
    });
    const result = await service.deleteSubscription('user1', '6501234567890abc12345678');
    expect(result.success).toBe(true);
    expect(result.status).toBeUndefined();
  });
});
