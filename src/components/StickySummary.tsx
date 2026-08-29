import type { Summary } from '../store/types';

interface StickySummaryProps {
  summary: Summary;
}

export default function StickySummary({ summary }: StickySummaryProps) {
  const items = [
    {
      label: 'Balance',
      value: `₹${summary.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      color: summary.balance >= 0 ? 'text-emerald-600' : 'text-red-600',
    },
    {
      label: 'Income',
      value: `₹${summary.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      color: 'text-emerald-600',
    },
    {
      label: 'Expenses',
      value: `₹${summary.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      color: 'text-red-600',
    },
    {
      label: 'Savings',
      value: `${summary.monthlySavingsRate}%`,
      color: 'text-indigo-600',
    },
  ];

  return (
    <div className="sticky top-16 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide py-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3 flex-shrink-0">
              <div>
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className={`text-base font-bold ${item.color}`}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
