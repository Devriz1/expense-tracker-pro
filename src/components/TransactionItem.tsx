import { Edit2, Trash2, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import type { Transaction } from '../store/types';

interface TransactionItemProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export default function TransactionItem({ transaction, onEdit, onDelete }: TransactionItemProps) {
  const [showActions, setShowActions] = useState(false);

  const categoryIcons: Record<string, string> = {
    Food: '🍔',
    Rent: '🏠',
    Utilities: '⚡',
    Transportation: '🚗',
    Entertainment: '🎬',
    Shopping: '🛍️',
    Healthcare: '💊',
    Education: '📚',
    Salary: '💼',
    Freelance: '💻',
    Investment: '📈',
    Other: '📦',
  };

  return (
    <div className="card p-4 flex items-center gap-4 group">
      <div className="text-3xl">{categoryIcons[transaction.category] || '📦'}</div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 truncate">{transaction.category}</h3>
          <span className={`badge ${transaction.type === 'income' ? 'badge-success' : 'badge-danger'}`}>
            {transaction.type}
          </span>
        </div>
        <p className="text-sm text-gray-500 truncate">{transaction.note || 'No note'}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span>{new Date(transaction.date).toLocaleDateString('en-IN')}</span>
          <span>•</span>
          <span>{transaction.paymentMethod}</span>
        </div>
      </div>

      <div className="text-right">
        <p className={`text-lg font-bold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
          {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
        </p>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowActions(!showActions)}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
        >
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>
        
        {showActions && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg z-20 py-1 min-w-[120px] border border-gray-100">
              <button
                onClick={() => { onEdit(transaction); setShowActions(false); }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => { onDelete(transaction.id); setShowActions(false); }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
