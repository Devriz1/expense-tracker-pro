import { Wallet, Trash2, Database, Settings } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store/useStore';
import Modal from './Modal';
import SettingsContent from './SettingsContent';

export default function Header() {
  const { clearAllTransactions, seedData } = useStore();
  const [showClearModal, setShowClearModal] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleClearAll = () => {
    clearAllTransactions();
    setShowClearModal(false);
  };

  const handleSeed = () => {
    seedData();
    setShowSeedModal(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Expense Tracker</h1>
              <p className="text-xs text-gray-500">Manage your finances</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={() => setShowSeedModal(true)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              title="Load sample data"
            >
              <Database className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={() => setShowClearModal(true)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              title="Clear all data"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear All Data"
      >
        <p className="text-gray-600 mb-6">Are you sure you want to delete all transactions? This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setShowClearModal(false)} className="btn btn-ghost flex-1">
            Cancel
          </button>
          <button onClick={handleClearAll} className="btn btn-danger flex-1">
            Clear All
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showSeedModal}
        onClose={() => setShowSeedModal(false)}
        title="Load Sample Data"
      >
        <p className="text-gray-600 mb-6">This will add sample transactions to your account for testing purposes.</p>
        <div className="flex gap-3">
          <button onClick={() => setShowSeedModal(false)} className="btn btn-ghost flex-1">
            Cancel
          </button>
          <button onClick={handleSeed} className="btn btn-success flex-1">
            Load Data
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Settings"
      >
        <SettingsContent onClose={() => setShowSettingsModal(false)} />
      </Modal>
    </header>
  );
}
