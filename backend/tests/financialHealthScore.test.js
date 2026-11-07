const {
    calculateFinancialHealthScore,
    getScoreCategory
} = require('../utils/financialHealthScore');

describe('Financial Health Score', () => {
    test('should calculate an excellent score for healthy finances', () => {
        const result = calculateFinancialHealthScore({
            monthlyIncome: 50000,
            monthlyExpenses: 20000,
            monthlyBudget: 30000,
            savingsProgress: 90,
            spendingConsistency: 90
        });

        expect(result.score).toBeGreaterThanOrEqual(80);
        expect(result.category).toBe('Excellent');
    });

    test('should calculate a poor score for unhealthy finances', () => {
        const result = calculateFinancialHealthScore({
            monthlyIncome: 20000,
            monthlyExpenses: 25000,
            monthlyBudget: 15000,
            savingsProgress: 0,
            spendingConsistency: 20
        });

        expect(result.score).toBeLessThan(40);
        expect(result.category).toBe('Poor');
    });

    test('should handle users without a budget', () => {
        const result = calculateFinancialHealthScore({
            monthlyIncome: 50000,
            monthlyExpenses: 20000,
            monthlyBudget: 0,
            savingsProgress: 50,
            spendingConsistency: 80
        });

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(result.category).toBeDefined();
    });

    test('should handle limited savings progress', () => {
        const result = calculateFinancialHealthScore({
            monthlyIncome: 50000,
            monthlyExpenses: 25000,
            monthlyBudget: 30000,
            savingsProgress: 10,
            spendingConsistency: 70
        });

        expect(result.factors.savingsProgress).toBe(3);
    });

    test('should keep the score between 0 and 100', () => {
        const result = calculateFinancialHealthScore({
            monthlyIncome: 100000,
            monthlyExpenses: 1000,
            monthlyBudget: 100000,
            savingsProgress: 150,
            spendingConsistency: 150
        });

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
    });

    test('should return correct score categories', () => {
        expect(getScoreCategory(90)).toBe('Excellent');
        expect(getScoreCategory(70)).toBe('Good');
        expect(getScoreCategory(50)).toBe('Fair');
        expect(getScoreCategory(20)).toBe('Poor');
    });
});