export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string;
  date: string;
  paymentMethod: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Filters {
  search: string;
  type: 'all' | 'income' | 'expense';
  dateRange: { start: string | null; end: string | null };
  category: string;
}

export interface BudgetStatus {
  category: string;
  limit: number;
  spent: number;
  percentage: number;
}

export interface Summary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  monthlySavingsRate: string;
}

export interface CategoryBreakdown {
  name: string;
  value: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
}
