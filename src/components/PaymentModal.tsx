import { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import type { UpiPaymentData } from '../utils/upiParser';
import { useStore } from '../store/useStore';
import { buildUpiDeepLink, savePendingPayment } from '../services/paymentService';

interface PaymentModalProps {
  paymentData: UpiPaymentData;
  onLaunch: (deepLink: string) => void;
  onCancel: () => void;
}

export default function PaymentModal({ paymentData, onLaunch, onCancel }: PaymentModalProps) {
  const getCategories = useStore((state) => state.getCategories);
  const categories = getCategories('expense');

  const [amount, setAmount] = useState(paymentData.amount?.toString() || '');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState(paymentData.note || paymentData.merchantName || '');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const deepLink = buildUpiDeepLink(paymentData, parsedAmount);

    savePendingPayment({
      id: crypto.randomUUID(),
      payeeVpa: paymentData.payeeVpa,
      merchantName: paymentData.merchantName,
      amount: parsedAmount,
      note,
      category,
      status: 'pending',
      createdAt: Date.now(),
      upiDeepLink: deepLink,
    });

    onLaunch(deepLink);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Confirm Payment</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl">
            <CheckCircle className="w-6 h-6 text-indigo-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">
                {paymentData.merchantName || paymentData.payeeVpa}
              </p>
              <p className="text-sm text-gray-500">{paymentData.payeeVpa}</p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
              className="input"
              placeholder="0.00"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="select"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input"
              placeholder="Add a note..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onCancel} className="btn btn-ghost flex-1">
              Cancel
            </button>
            <button onClick={handleSubmit} className="btn btn-primary flex-1">
              Pay & Log Expense
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
