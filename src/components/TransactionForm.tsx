import { useState, useEffect } from 'react';
import { X, Plus, Scan, Smartphone } from 'lucide-react';
import { useStore, CATEGORIES, PAYMENT_METHODS } from '../store/useStore';
import type { Transaction } from '../store/types';
import ReceiptScanner from './ReceiptScanner';
import type { ReceiptData } from '../utils/ocr';
import UPIQrScanner from './UPIQrScanner';
import type { UpiPaymentData } from '../utils/upiParser';
import PaymentModal from './PaymentModal';

interface TransactionFormProps {
  onClose: () => void;
  editTransaction?: Transaction | null;
}

export default function TransactionForm({ onClose, editTransaction }: TransactionFormProps) {
  const addTransaction = useStore((state) => state.addTransaction);
  const updateTransaction = useStore((state) => state.updateTransaction);

  const [formData, setFormData] = useState({
    type: 'expense' as 'expense' | 'income',
    amount: '',
    category: 'Food',
    note: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'UPI',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showScanner, setShowScanner] = useState(false);
  const [showUpiScanner, setShowUpiScanner] = useState(false);
  const [upiData, setUpiData] = useState<UpiPaymentData | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (editTransaction) {
      setFormData({
        type: editTransaction.type,
        amount: editTransaction.amount.toString(),
        category: editTransaction.category,
        note: editTransaction.note || '',
        date: editTransaction.date.split('T')[0],
        paymentMethod: editTransaction.paymentMethod || 'UPI',
      });
    }
  }, [editTransaction]);

  const handleReceiptScanned = (data: ReceiptData) => {
    if (data.amount) {
      setFormData((prev) => ({ ...prev, amount: data.amount!.toString() }));
    }
    if (data.vendor) {
      setFormData((prev) => ({ ...prev, note: data.vendor || prev.note }));
    }
    if (data.date) {
      setFormData((prev) => ({ ...prev, date: data.date || prev.date }));
    }
  };

  const handleUpiScanSuccess = (data: UpiPaymentData) => {
    setUpiData(data);
    setShowUpiScanner(false);
    setShowPaymentModal(true);
  };

  const handleUpiLaunch = (deepLink: string) => {
    setShowPaymentModal(false);
    window.location.href = deepLink;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    if (!formData.date) {
      newErrors.date = 'Please select a date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const transaction = {
      type: formData.type,
      amount: parseFloat(formData.amount),
      category: formData.category,
      note: formData.note,
      date: new Date(formData.date).toISOString(),
      paymentMethod: formData.paymentMethod,
    };

    if (editTransaction) {
      updateTransaction(editTransaction.id, transaction);
    } else {
      addTransaction(transaction);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            {editTransaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Type</label>
            <div className="flex gap-2">
              {['expense', 'income'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type as 'expense' | 'income' })}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    formData.type === type
                      ? type === 'expense'
                        ? 'bg-red-500 text-white'
                        : 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type === 'expense' ? 'Expense' : 'Income'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none text-sm">₹</span>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="input !pl-8 text-sm"
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.amount}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="select text-sm"
              >
                {(CATEGORIES[formData.type] || []).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input text-sm"
              />
              {errors.date && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.date}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="select text-sm"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Note (Optional)</label>
            <input
              type="text"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="input text-sm"
              placeholder="Add a note..."
            />
          </div>

          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="btn btn-ghost w-full border border-dashed border-gray-300 text-sm"
          >
            <Scan className="w-4 h-4" />
            Scan Receipt
          </button>

          <button
            type="button"
            onClick={() => setShowUpiScanner(true)}
            className="btn btn-ghost w-full border border-dashed border-gray-300 text-sm"
          >
            <Smartphone className="w-4 h-4" />
            Pay with UPI
          </button>

          <button type="submit" className="btn btn-primary w-full text-sm">
            <Plus className="w-4 h-4" />
            {editTransaction ? 'Update Transaction' : 'Add Transaction'}
          </button>
        </form>
      </div>

      {showScanner && (
        <ReceiptScanner onScanComplete={handleReceiptScanned} onClose={() => setShowScanner(false)} />
      )}

      {showUpiScanner && (
        <UPIQrScanner onScanSuccess={handleUpiScanSuccess} onClose={() => setShowUpiScanner(false)} />
      )}

      {showPaymentModal && upiData && (
        <PaymentModal
          paymentData={upiData}
          onLaunch={handleUpiLaunch}
          onCancel={() => {
            setShowPaymentModal(false);
            setUpiData(null);
          }}
        />
      )}
    </div>
  );
}
