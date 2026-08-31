import { CheckCircle, XCircle, Trash2 } from 'lucide-react';
import type { PendingPayment } from '../services/paymentService';

interface PaymentVerificationPromptProps {
  payment: PendingPayment;
  onConfirm: () => void;
  onReject: () => void;
  onDismiss: () => void;
}

export default function PaymentVerificationPrompt({
  payment,
  onConfirm,
  onReject,
  onDismiss,
}: PaymentVerificationPromptProps) {
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">Payment Verification</h3>
            <p className="text-sm text-gray-500 mt-1">
              Did your payment of <span className="font-medium text-gray-900">₹{payment.amount.toFixed(2)}</span> to{' '}
              <span className="font-medium text-gray-900">{payment.merchantName}</span> succeed?
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white rounded-xl font-medium text-sm hover:bg-emerald-600 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Yes, Paid
          </button>
          <button
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium text-sm hover:bg-red-100 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Failed
          </button>
          <button
            onClick={onDismiss}
            className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-colors"
            title="Dismiss"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
