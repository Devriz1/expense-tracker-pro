import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useStore } from '../store/useStore';

const COLORS = ['#4f46e5', '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function AnalyticsCharts() {
  const transactions = useStore((state) => state.transactions);

  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
    });
    return Object.entries(breakdown).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const monthlyTrends = useMemo(() => {
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
  }, [transactions]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm text-gray-600">{payload[0].name}</p>
          <p className="text-lg font-bold text-gray-900">₹{payload[0].value.toLocaleString('en-IN')}</p>
        </div>
      );
    }
    return null;
  };

  const BarChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-gray-600">{entry.name === 'income' ? 'Income' : 'Expenses'}:</span>
              <span className="font-bold" style={{ color: entry.color }}>₹{entry.value.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 [&_*]:focus:outline-none">
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
        {categoryBreakdown.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No expense data available</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart style={{ outline: 'none' }}>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  style={{ outline: 'none' }}
                >
                  {categoryBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ outline: 'none' }} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {categoryBreakdown.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
        {monthlyTrends.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No trend data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrends} style={{ outline: 'none' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip content={<BarChartTooltip />} />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} style={{ outline: 'none' }} />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} style={{ outline: 'none' }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}