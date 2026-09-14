import { useState, useMemo } from 'react';
import { Building2, PiggyBank, CreditCard, Wallet as WalletIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useSettingsStore } from '../store/useSettingsStore';
import type { Wallet } from '../store/types';

const walletIconComponents: Record<Wallet['type'], React.ElementType> = {
  bank: Building2,
  cash: PiggyBank,
  card: CreditCard,
  upi: WalletIcon,
  other: WalletIcon,
};

const walletColors: Record<Wallet['type'], { bg: string; icon: string; text: string }> = {
  bank: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-700' },
  cash: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-700' },
  card: { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-700' },
  upi: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-700' },
  other: { bg: 'bg-gray-50', icon: 'text-gray-600', text: 'text-gray-700' },
};

interface WalletCardProps {
  wallet: Wallet;
}

function WalletCard({ wallet }: WalletCardProps) {
  const Icon = walletIconComponents[wallet.type];
  const colors = walletColors[wallet.type];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {wallet.icon && <span className="text-xl">{wallet.icon}</span>}
          <div>
            <p className="font-medium text-gray-900">{wallet.name}</p>
            {wallet.bankName && (
              <p className="text-xs text-gray-500">{wallet.bankName}</p>
            )}
          </div>
        </div>
        <div className={`p-2 rounded-xl ${wallet.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          <span className="text-xs font-medium">{wallet.isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">
        ₹{wallet.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </p>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${wallet.isActive ? colors.bg : 'bg-gray-100'}`}>
          <Icon className={`w-5 h-5 ${wallet.isActive ? colors.icon : 'text-gray-400'}`} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500">Balance</p>
          <p className={`text-sm font-medium ${wallet.isActive ? colors.text : 'text-gray-400'}`}>
            ₹{wallet.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function WalletBalanceCards() {
  // Select the state slice directly to avoid unnecessary re-renders
  const wallets = useStore((state) => state.wallets);
  const getTotalBalance = useStore((state) => state.getTotalBalance);
  const addWallet = useStore((state) => state.addWallet);
  const walletFeatureEnabled = useSettingsStore((state) => state.walletFeatureEnabled);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWallet, setNewWallet] = useState<{
    name: string;
    type: Wallet['type'];
    balance: number;
    bankName: string;
    icon: string;
    isActive: boolean;
    createdAt: number;
  }>({
    name: '',
    type: 'bank',
    balance: 0,
    bankName: '',
    icon: '',
    isActive: true,
    createdAt: Date.now()
  });

  const handleAddWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWallet.name.trim() || newWallet.balance < 0) return;
    addWallet({ ...newWallet });
    setShowAddWallet(false);
    setNewWallet({ name: '', type: 'bank', balance: 0, bankName: '', icon: '', isActive: true, createdAt: Date.now() });
  };

  // Memoize activeWallets so it retains the same array reference between renders
  const activeWallets = useMemo(
    () => wallets.filter((w) => w.isActive),
    [wallets]
  );

  const { cash, bank, total } = getTotalBalance();

  if (activeWallets.length === 0 && !showAddWallet) {
    return (
      <div className="card p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <Building2 className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No Wallets Added</h3>
        <p className="text-sm text-gray-500 mb-4">Add your first wallet to track balances</p>
        <button 
          onClick={() => setShowAddWallet(true)} 
          disabled={!walletFeatureEnabled}
          className={`px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors ${!walletFeatureEnabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
        >
          Add Wallet
        </button>
      </div>
    );
  }

  if (showAddWallet) {
    return (
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Wallet</h3>
        <form onSubmit={handleAddWallet} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input
                type="text"
                value={newWallet.name}
                onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
                placeholder="e.g., Main Bank, Cash in Hand"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <select
                value={newWallet.type}
                onChange={(e) => setNewWallet({ ...newWallet, type: e.target.value as Wallet['type'] })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700"
              >
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Initial Balance</label>
              <input
                type="number"
                value={newWallet.balance}
                onChange={(e) => setNewWallet({ ...newWallet, balance: Number(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bank Name (optional)</label>
              <input
                type="text"
                value={newWallet.bankName}
                onChange={(e) => setNewWallet({ ...newWallet, bankName: e.target.value })}
                placeholder="e.g., HDFC, SBI, ICICI"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddWallet(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!walletFeatureEnabled}
              className={`px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg transition-colors flex-1 ${!walletFeatureEnabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
            >
              Add Wallet
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Wallet Balances</h2>
          <p className="text-xs text-gray-500">{activeWallets.length} active wallet{activeWallets.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {activeWallets.map((wallet) => (
          <WalletCard key={wallet.id} wallet={wallet} />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 bg-blue-50 border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-blue-100">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Total Bank</p>
              <p className="text-sm font-medium text-blue-700">₹{bank.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 bg-amber-50 border-amber-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-amber-100">
              <PiggyBank className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Cash in Hand</p>
              <p className="text-sm font-medium text-amber-700">₹{cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 bg-indigo-50 border-indigo-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-indigo-100">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Total Balance</p>
              <p className="text-sm font-bold text-indigo-700">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}