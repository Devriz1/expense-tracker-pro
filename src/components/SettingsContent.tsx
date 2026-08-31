import { useSettingsStore } from '../store/useSettingsStore';

interface SettingsContentProps {
  onClose: () => void;
}

export default function SettingsContent({ onClose }: SettingsContentProps) {
  const scanReceiptEnabled = useSettingsStore((state) => state.scanReceiptEnabled);
  const payWithUpiEnabled = useSettingsStore((state) => state.payWithUpiEnabled);
  const setScanReceiptEnabled = useSettingsStore((state) => state.setScanReceiptEnabled);
  const setPayWithUpiEnabled = useSettingsStore((state) => state.setPayWithUpiEnabled);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">About</h3>
        <p className="text-sm text-gray-500">Expense Tracker Pro v1.0</p>
        <p className="text-sm text-gray-500">Data is stored locally on your device.</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Storage</h3>
        <p className="text-sm text-gray-500">All transactions are saved in your browser's localStorage.</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Privacy</h3>
        <p className="text-sm text-gray-500">No data is sent to any server. Everything stays on your device.</p>
      </div>

      <div className="border-t border-gray-200 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Scan Receipt</h3>
            <p className="text-xs text-gray-500">Enable receipt scanning in Add Transaction</p>
          </div>
          <button
            onClick={() => setScanReceiptEnabled(!scanReceiptEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              scanReceiptEnabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                scanReceiptEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Pay with UPI</h3>
            <p className="text-xs text-gray-500">Enable UPI QR payment in Add Transaction</p>
          </div>
          <button
            onClick={() => setPayWithUpiEnabled(!payWithUpiEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              payWithUpiEnabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                payWithUpiEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="btn btn-primary flex-1">
          Close
        </button>
      </div>
    </div>
  );
}
