export const dashboardData = {
  user: {
    name: "Soumya"
  },

  stats: {
    totalBalance: 12500,
    spentThisMonth: 4500,
    budgetLeft: 2500,
    savings: 5500
  },

  transactions: [
    { id: 1, category: "Food", amount: 250, type: "expense", date: "Today", icon: "🍕" },
    { id: 2, category: "Transport", amount: 80, type: "expense", date: "Yesterday", icon: "🚌" },
    { id: 3, category: "Freelance", amount: 3000, type: "income", date: "3 days ago", icon: "💼" }
  ],

  spendingData: [
    { category: "Food", amount: 1200 },
    { category: "Transport", amount: 800 },
    { category: "Entertainment", amount: 900 },
  ],

  dailyExpenses: [
    { day: "Mon", amount: 300 },
    { day: "Tue", amount: 450 },
    { day: "Wed", amount: 200 },
    { day: "Thu", amount: 600 },
    { day: "Fri", amount: 350 },
  ]
};
