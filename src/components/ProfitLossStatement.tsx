import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';

type DatePreset = 'this-month' | 'last-month' | 'ytd' | 'custom' | 'fy';

interface DateRange {
  start: Date;
  end: Date;
}

const PRESET_LABELS: Record<DatePreset, string> = {
  'this-month': 'This Month',
  'last-month': 'Last Month',
  'ytd': 'Year to Date',
  'custom': 'Custom Range',
  'fy': 'Financial Year',
};

function getDateRange(preset: DatePreset, customRange?: DateRange): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'this-month':
      return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: today };
    case 'last-month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start, end };
    }
    case 'ytd':
      return { start: new Date(today.getFullYear(), 0, 1), end: today };
    case 'fy': {
      const currentYear = today.getFullYear();
      const fyStart = today.getMonth() >= 3 ? new Date(currentYear, 3, 1) : new Date(currentYear - 1, 3, 1);
      return { start: fyStart, end: today };
    }
    case 'custom':
      return customRange || { start: today, end: today };
  }
}

function formatCurrency(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return amount < 0 ? `- ${formatted}` : formatted;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface CategoryTotal {
  category: string;
  amount: number;
  count: number;
  percentage: string;
}

export default function ProfitLossStatement() {
  const transactions = useStore((state) => state.transactions);

  const [datePreset, setDatePreset] = useState<DatePreset>('this-month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const dateRange = useMemo(() => {
    if (datePreset === 'custom' && customStart && customEnd) {
      return {
        start: new Date(customStart),
        end: new Date(new Date(customEnd).setHours(23, 59, 59, 999)),
      };
    }
    return getDateRange(datePreset);
  }, [datePreset, customStart, customEnd]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const txDate = new Date(t.date);
      return txDate >= dateRange.start && txDate <= dateRange.end;
    });
  }, [transactions, dateRange]);

  const incomeTransactions = useMemo(() => filteredTransactions.filter(t => t.type === 'income'), [filteredTransactions]);
  const expenseTransactions = useMemo(() => filteredTransactions.filter(t => t.type === 'expense'), [filteredTransactions]);

  const totalIncome = useMemo(() => incomeTransactions.reduce((sum, t) => sum + t.amount, 0), [incomeTransactions]);
  const totalExpenses = useMemo(() => expenseTransactions.reduce((sum, t) => sum + t.amount, 0), [expenseTransactions]);
  const netProfit = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0';

  const incomeByCategory = useMemo<CategoryTotal[]>(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    incomeTransactions.forEach(t => {
      if (!map[t.category]) map[t.category] = { amount: 0, count: 0 };
      map[t.category].amount += t.amount;
      map[t.category].count += 1;
    });
    return Object.entries(map)
      .map(([category, data]): CategoryTotal => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalIncome > 0 ? ((data.amount / totalIncome) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [incomeTransactions, totalIncome]);

  const expensesByCategory = useMemo<CategoryTotal[]>(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    expenseTransactions.forEach(t => {
      if (!map[t.category]) map[t.category] = { amount: 0, count: 0 };
      map[t.category].amount += t.amount;
      map[t.category].count += 1;
    });
    return Object.entries(map)
      .map(([category, data]): CategoryTotal => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalExpenses > 0 ? ((data.amount / totalExpenses) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenseTransactions, totalExpenses]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const rows = [
      ['Income vs Expense Statement', '', ''],
      ['Period', `${formatDate(dateRange.start.toISOString())} to ${formatDate(dateRange.end.toISOString())}`, ''],
      ['', '', ''],
      ['INCOME', 'Amount (₹)', '%'],
      ...incomeByCategory.map(item => [item.category, formatCurrency(item.amount), `${item.percentage}%`]),
      ['Total Income', formatCurrency(totalIncome), '100%'],
      ['', '', ''],
      ['EXPENSES', 'Amount (₹)', '%'],
      ...expensesByCategory.map(item => [item.category, formatCurrency(item.amount), `${item.percentage}%`]),
      ['Total Expenses', formatCurrency(totalExpenses), '100%'],
      ['', '', ''],
      ['Net Profit / (Loss)', formatCurrency(netProfit), `${savingsRate}%`],
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-expense-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Filter */}
      <div className="card print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Income vs Expense Statement</h2>
            <p className="text-sm text-gray-500 mt-1">
              {formatDate(dateRange.start.toISOString())} - {formatDate(dateRange.end.toISOString())}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PRESET_LABELS) as DatePreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => setDatePreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  datePreset === preset
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {PRESET_LABELS[preset]}
              </button>
            ))}
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="flex gap-3 mt-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="input text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="input text-sm"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
          >
            Print Report
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 text-lg">No transactions found for this period</p>
          <p className="text-sm text-gray-400 mt-2">Add transactions to generate the report</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <p className="text-sm font-medium text-emerald-700 mb-1">Total Income</p>
              <p className="text-2xl font-bold text-emerald-900">{formatCurrency(totalIncome)}</p>
              <p className="text-xs text-emerald-600 mt-1">{incomeTransactions.length} transactions</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <p className="text-sm font-medium text-red-700 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs text-red-600 mt-1">{expenseTransactions.length} transactions</p>
            </div>

            <div className={`${netProfit >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200'} border rounded-2xl p-5`}>
              <p className={`text-sm font-medium ${netProfit >= 0 ? 'text-indigo-700' : 'text-amber-700'} mb-1`}>Net Profit / (Loss)</p>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-indigo-900' : 'text-amber-900'}`}>
                {formatCurrency(netProfit)}
              </p>
              <p className={`text-xs ${netProfit >= 0 ? 'text-indigo-600' : 'text-amber-600'} mt-1`}>
                Savings Rate: {savingsRate}%
              </p>
            </div>
          </div>

          {/* Two-Column Ledger */}
          <div className="card print:shadow-none print:border-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Income Side */}
              <div>
                <h3 className="text-lg font-bold text-emerald-700 mb-4 pb-2 border-b-2 border-emerald-200 uppercase tracking-wide">
                  Income (Receipts)
                </h3>
                {incomeByCategory.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No income transactions</p>
                ) : (
                  <div className="space-y-0">
                    {incomeByCategory.map((item, index) => (
                      <div key={item.category} className={`flex justify-between py-2.5 ${index !== incomeByCategory.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <div className="flex-1">
                          <span className="text-sm text-gray-900">{item.category}</span>
                          <span className="text-xs text-gray-400 ml-2">({item.count})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                          <span className="text-xs text-gray-400 ml-2">{item.percentage}%</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 mt-2 border-t-2 border-emerald-300 font-bold">
                      <span className="text-sm text-emerald-900">Total Income</span>
                      <span className="text-sm text-emerald-900">{formatCurrency(totalIncome)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Expense Side */}
              <div>
                <h3 className="text-lg font-bold text-red-700 mb-4 pb-2 border-b-2 border-red-200 uppercase tracking-wide">
                  Expenses (Payments)
                </h3>
                {expensesByCategory.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No expense transactions</p>
                ) : (
                  <div className="space-y-0">
                    {expensesByCategory.map((item, index) => (
                      <div key={item.category} className={`flex justify-between py-2.5 ${index !== expensesByCategory.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <div className="flex-1">
                          <span className="text-sm text-gray-900">{item.category}</span>
                          <span className="text-xs text-gray-400 ml-2">({item.count})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                          <span className="text-xs text-gray-400 ml-2">{item.percentage}%</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 mt-2 border-t-2 border-red-300 font-bold">
                      <span className="text-sm text-red-900">Total Expenses</span>
                      <span className="text-sm text-red-900">{formatCurrency(totalExpenses)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Net Profit / Loss */}
            <div className={`mt-6 p-4 rounded-lg text-center ${netProfit >= 0 ? 'bg-indigo-50 border border-indigo-200' : 'bg-amber-50 border border-amber-200'}`}>
              <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-indigo-700' : 'text-amber-700'}`}>
                Net {netProfit >= 0 ? 'Profit' : 'Loss'}: {formatCurrency(netProfit)}
              </p>
              <p className={`text-sm mt-1 ${netProfit >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
                Savings Rate: {savingsRate}%
              </p>
            </div>
          </div>

          {/* Transaction Details Table */}
          <div className="card print:shadow-none print:border-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 font-medium text-gray-600">Date</th>
                    <th className="pb-3 font-medium text-gray-600">Type</th>
                    <th className="pb-3 font-medium text-gray-600">Category</th>
                    <th className="pb-3 font-medium text-gray-600">Description</th>
                    <th className="pb-3 font-medium text-gray-600 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="py-3 text-gray-900">
                          {new Date(transaction.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3">
                          <span className={`badge ${transaction.type === 'income' ? 'badge-success' : 'badge-danger'}`}>
                            {transaction.type === 'income' ? 'Income' : 'Expense'}
                          </span>
                        </td>
                        <td className="py-3 text-gray-700">{transaction.category}</td>
                        <td className="py-3 text-gray-500">{transaction.note || '-'}</td>
                        <td className={`py-3 text-right font-medium ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
