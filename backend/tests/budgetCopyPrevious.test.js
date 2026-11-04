const mockdate = require('mockdate');

jest.mock('../models/Budget', () => {
    const Budget = jest.fn(function (data) {
        Object.assign(this, data);
        this._id = 'new-budget';
        this.save = jest.fn().mockResolvedValue(this);
    });
    Budget.findOne = jest.fn();
    return Budget;
});

const Budget = require('../models/Budget');
const { copyPreviousBudget } = require('../controllers/budgetController');

const originalTz = process.env.TZ;

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('copyPreviousBudget', () => {
    afterEach(() => {
        mockdate.reset();
        process.env.TZ = originalTz;
        Budget.findOne.mockReset();
    });

    it('looks up last month even when the server runs east of UTC', async () => {
        // 22 Oct 2026 11:30 IST. Last month is 2026-09, not 2026-08.
        process.env.TZ = 'Asia/Kolkata';
        mockdate.set('2026-10-22T06:00:00Z');
        Budget.findOne.mockResolvedValueOnce(null);

        const res = mockResponse();
        await copyPreviousBudget({ userId: 'user-1' }, res);

        expect(Budget.findOne.mock.calls[0][0].month).toBe('2026-09');
    });

    it('wraps from January back to December of the previous year', async () => {
        process.env.TZ = 'UTC';
        mockdate.set('2026-01-15T12:00:00Z');
        Budget.findOne.mockResolvedValueOnce(null);

        const res = mockResponse();
        await copyPreviousBudget({ userId: 'user-1' }, res);

        expect(Budget.findOne.mock.calls[0][0].month).toBe('2025-12');
    });
});
