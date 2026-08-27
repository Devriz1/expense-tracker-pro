import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';

export default function BudgetProgress() {
  const transactions = useStore((state) => state.transactions);
  const budgetLimits = useStore((state) => state.budgetLimits);
  const setBudgetLimit = useStore((state) => state.setBudgetLimit);
  const resetBudgetLimits = useStore((state) => state.resetBudgetLimits);

  const [editing, setEditing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const budgetStatus = useMemo(() => {
    const spending: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        spending[t.category] = (spending[t.category] || 0) + t.amount;
      });

    return Object.entries(budgetLimits).map(([category, limit]) => ({
      category,
      limit,
      spent: spending[category] || 0,
      percentage: limit > 0 ? Math.min(((spending[category] || 0) / limit) * 100, 100) : 0,
      overBudget: (spending[category] || 0) > limit,
    }));
  }, [transactions, budgetLimits]);

  const totalBudget = Object.values(budgetLimits).reduce((s, l) => s + l, 0);
  const totalSpent = budgetStatus.reduce((s, item) => s + item.spent, 0);

  const startEdit = (category: string, currentLimit: number) => {
    setEditingCategory(category);
    setEditValue(currentLimit.toString());
  };

  const saveEdit = (category: string) => {
    const numValue = parseFloat(editValue);
    if (!isNaN(numValue) && numValue >= 0) {
      setBudgetLimit(category, numValue);
    }
    setEditingCategory(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setEditValue('');
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Budget Status</h3>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={resetBudgetLimits} className="text-sm text-gray-500 hover:text-gray-700">
                Reset
              </button>
              <button onClick={() => setEditing(false)} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                Done
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Edit Budget
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-xl">
        <span className="text-sm text-gray-600">Total Budget</span>
        <span className="text-sm font-medium text-gray-900">
          ₹{totalSpent.toLocaleString('en-IN')} / ₹{totalBudget.toLocaleString('en-IN')}
        </span>
      </div>

      {budgetStatus.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No budget data available</p>
      ) : (
        <div className="space-y-5">
          {budgetStatus.map((item) => (
            <div key={item.category}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{item.category}</span>
                <div className="flex items-center gap-2">
                  {editing && editingCategory === item.category ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">₹</span>
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(item.category)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(item.category);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                        className="w-24 px-2 py-1 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ) : editing ? (
                    <button
                      onClick={() => startEdit(item.category, item.limit)}
                      className="text-sm text-gray-500 hover:text-indigo-600"
                    >
                      ₹{item.limit.toLocaleString('en-IN')}
                    </button>
                  ) : (
                    <span className="text-sm text-gray-500">
                      ₹{item.limit.toLocaleString('en-IN')}
                    </span>
                  )}
                  {item.overBudget && (
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      Over
                    </span>
                  )}
                  {!item.overBudget && item.percentage > 80 && (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      {item.percentage.toFixed(0)}%
                    </span>
                  )}
                  {!item.overBudget && item.percentage <= 80 && item.percentage > 0 && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {item.percentage.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.overBudget
                      ? 'bg-red-500'
                      : item.percentage > 80
                      ? 'bg-amber-500'
                      : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-400">
                  {item.percentage.toFixed(1)}% used
                </p>
                <p className="text-xs text-gray-400">
                  ₹{item.spent.toLocaleString('en-IN')} spent
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
