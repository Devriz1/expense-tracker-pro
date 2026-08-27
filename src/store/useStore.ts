import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Transaction, Filters, BudgetStatus, Summary, CategoryBreakdown, MonthlyTrend } from './types';

const CATEGORIES = {
  expense: ['Food', 'Rent', 'Utilities', 'Transportation', 'Entertainment', 'Shopping', 'Healthcare', 'Education', 'Other'],
  income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'],
};

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Bank Transfer', 'Other'];

export const BUDGET_LIMITS = {
  Food: 15000,
  Rent: 30000,
  Utilities: 5000,
  Transportation: 8000,
  Entertainment: 5000,
  Shopping: 10000,
  Healthcare: 5000,
  Education: 10000,
  Other: 5000,
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

interface StoreState {
  transactions: Transaction[];
  filters: Filters;
  budgetLimits: Record<string, number>;
  
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  clearAllTransactions: () => void;
  seedData: () => void;
  setBudgetLimit: (category: string, limit: number) => void;
  resetBudgetLimits: () => void;
  getFilteredTransactions: () => Transaction[];
  getSummary: () => Summary;
  getCategoryBreakdown: () => CategoryBreakdown[];
  getMonthlyTrends: () => MonthlyTrend[];
  getBudgetStatus: () => BudgetStatus[];
  exportToCSV: () => void;
  exportToJSON: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      transactions: [],
      filters: {
        search: '',
        type: 'all',
        dateRange: { start: null, end: null },
        category: 'all',
      },
      budgetLimits: { ...BUDGET_LIMITS },

      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      resetFilters: () =>
        set({
          filters: {
            search: '',
            type: 'all',
            dateRange: { start: null, end: null },
            category: 'all',
          },
        }),

      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [
            {
              ...transaction,
              id: generateId(),
              createdAt: Date.now(),
            },
            ...state.transactions,
          ],
        })),

      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
          ),
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),

      clearAllTransactions: () =>
        set({ transactions: [] }),

      setBudgetLimit: (category, limit) =>
        set((state) => ({
          budgetLimits: { ...state.budgetLimits, [category]: limit },
        })),

      resetBudgetLimits: () =>
        set({ budgetLimits: { ...BUDGET_LIMITS } }),

      seedData: () => {
        const now = Date.now();
        const sampleTransactions: Omit<Transaction, 'id' | 'createdAt'>[] = [
          { type: 'expense', amount: 3500, category: 'Food', note: 'Grocery shopping', date: new Date(now - 86400000 * 2).toISOString(), paymentMethod: 'UPI' },
          { type: 'expense', amount: 12000, category: 'Rent', note: 'Monthly rent', date: new Date(now - 86400000 * 5).toISOString(), paymentMethod: 'Bank Transfer' },
          { type: 'expense', amount: 2500, category: 'Utilities', note: 'Electricity bill', date: new Date(now - 86400000 * 7).toISOString(), paymentMethod: 'UPI' },
          { type: 'income', amount: 75000, category: 'Salary', note: 'Monthly salary', date: new Date(now - 86400000 * 3).toISOString(), paymentMethod: 'Bank Transfer' },
          { type: 'expense', amount: 1800, category: 'Transportation', note: 'Fuel', date: new Date(now - 86400000 * 1).toISOString(), paymentMethod: 'Credit Card' },
          { type: 'expense', amount: 1200, category: 'Entertainment', note: 'Movie tickets', date: new Date(now - 86400000 * 4).toISOString(), paymentMethod: 'UPI' },
          { type: 'income', amount: 5000, category: 'Freelance', note: 'Project payment', date: new Date(now - 86400000 * 6).toISOString(), paymentMethod: 'Bank Transfer' },
          { type: 'expense', amount: 3000, category: 'Shopping', note: 'Clothes', date: new Date(now - 86400000 * 8).toISOString(), paymentMethod: 'Credit Card' },
          { type: 'expense', amount: 2000, category: 'Healthcare', note: 'Doctor visit', date: new Date(now - 86400000 * 10).toISOString(), paymentMethod: 'Cash' },
          { type: 'expense', amount: 1500, category: 'Food', note: 'Restaurant', date: new Date(now - 86400000 * 12).toISOString(), paymentMethod: 'UPI' },
        ];

        set({
          transactions: sampleTransactions.map((t, i) => ({
            ...t,
            id: generateId(),
            createdAt: now - i * 86400000,
          })),
        });
      },

      getFilteredTransactions: () => {
        const { transactions, filters } = get();
        return transactions.filter((t) => {
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            return (
              t.note?.toLowerCase().includes(searchLower) ||
              t.category.toLowerCase().includes(searchLower)
            );
          }
          if (filters.type !== 'all' && t.type !== filters.type) return false;
          if (filters.category !== 'all' && t.category !== filters.category) return false;
          if (filters.dateRange.start) {
            const start = new Date(filters.dateRange.start);
            const txDate = new Date(t.date);
            if (txDate < start) return false;
          }
          if (filters.dateRange.end) {
            const end = new Date(filters.dateRange.end);
            const txDate = new Date(t.date);
            if (txDate > end) return false;
          }
          return true;
        });
      },

      getSummary: (): Summary => {
        const { transactions } = get();
        const totalIncome = transactions
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = transactions
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        const balance = totalIncome - totalExpenses;
        const monthlySavingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : '0';

        return { totalIncome, totalExpenses, balance, monthlySavingsRate };
      },

      getCategoryBreakdown: (): CategoryBreakdown[] => {
        const { transactions } = get();
        const breakdown: Record<string, number> = {};
        transactions
          .filter((t) => t.type === 'expense')
          .forEach((t) => {
            breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
          });
        return Object.entries(breakdown).map(([name, value]) => ({ name, value }));
      },

      getMonthlyTrends: (): MonthlyTrend[] => {
        const { transactions } = get();
        const trends: Record<string, { month: string; income: number; expenses: number }> = {};
        
        transactions.forEach((t) => {
          const date = new Date(t.date);
          const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
          if (!trends[key]) {
            trends[key] = { month: key, income: 0, expenses: 0 };
          }
          if (t.type === 'income') {
            trends[key].income += t.amount;
          } else {
            trends[key].expenses += t.amount;
          }
        });
        
        return Object.values(trends).sort((a, b) => {
          const dateA = new Date(a.month);
          const dateB = new Date(b.month);
          return dateA.getTime() - dateB.getTime();
        });
      },

      getBudgetStatus: (): BudgetStatus[] => {
        const { transactions, budgetLimits } = get();
        
        const monthlySpending: Record<string, number> = {};
        transactions
          .filter((t) => t.type === 'expense')
          .forEach((t) => {
            monthlySpending[t.category] = (monthlySpending[t.category] || 0) + t.amount;
          });

        return Object.entries(budgetLimits).map(([category, limit]) => ({
          category,
          limit,
          spent: monthlySpending[category] || 0,
          percentage: limit > 0 ? ((monthlySpending[category] || 0) / limit) * 100 : 0,
        }));
      },

      exportToCSV: () => {
        const { transactions } = get();
        const headers = ['Date', 'Type', 'Category', 'Amount', 'Payment Method', 'Note'];
        const rows = transactions.map((t) => [
          new Date(t.date).toLocaleDateString(),
          t.type,
          t.category,
          t.amount,
          t.paymentMethod || '',
          t.note || '',
        ]);
        const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },

      exportToJSON: () => {
        const { transactions } = get();
        const json = JSON.stringify(transactions, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
    }),
    {
      name: 'expense-tracker-storage',
      partialize: (state) => ({
        transactions: state.transactions,
        budgetLimits: state.budgetLimits,
      }),
    }
  )
);

export { CATEGORIES, PAYMENT_METHODS };
