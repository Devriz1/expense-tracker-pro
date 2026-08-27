import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import type { Summary } from '../store/types';

interface SummaryCardsProps {
  summary: Summary;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      title: 'Total Balance',
      value: `₹${summary.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      textColor: summary.balance >= 0 ? 'text-emerald-600' : 'text-red-600',
    },
    {
      title: 'Total Income',
      value: `₹${summary.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      textColor: 'text-emerald-600',
    },
    {
      title: 'Total Expenses',
      value: `₹${summary.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: TrendingDown,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      textColor: 'text-red-600',
    },
    {
      title: 'Savings Rate',
      value: `${summary.monthlySavingsRate}%`,
      icon: PiggyBank,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      textColor: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.title} className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">{card.title}</span>
            <div className={`p-2 rounded-xl ${card.bgColor}`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
