import { useState, useEffect, useRef } from 'react';
import { Cloud, CheckCircle, AlertCircle, FolderOpen, Download, HardDrive, Moon, Lock, Smartphone, Clock3, Plus, Building2, PiggyBank, CreditCard, Wallet as WalletIcon } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useStore } from '../store/useStore';
import type { Wallet } from '../store/types';
import { BackupFormat, BackupFrequency, isWebPlatform } from '../services/backupService';
import { startDropboxAuth, clearDropboxAuth, clearDropboxUserInfo, handleDropboxOAuthCallback, getStoredDropboxAuth, getStoredDropboxUserInfo } from '../services/dropboxService';

export default function SettingsPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [syncingProfile, setSyncingProfile] = useState(false);
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

  const backup = useSettingsStore((state) => state.backup);
  const scanReceiptEnabled = useSettingsStore((state) => state.scanReceiptEnabled);
  const payWithUpiEnabled = useSettingsStore((state) => state.payWithUpiEnabled);
  const darkModeEnabled = useSettingsStore((state) => state.darkModeEnabled);
  const appLockEnabled = useSettingsStore((state) => state.appLockEnabled);

  const wallets = useStore((state) => state.wallets);
  const addWallet = useStore((state) => state.addWallet);
  const deleteWallet = useStore((state) => state.deleteWallet);

  const setBackupFolder = useSettingsStore((state) => state.setBackupFolder);
  const setBackupFormat = useSettingsStore((state) => state.setBackupFormat);
  const setAutoBackupEnabled = useSettingsStore((state) => state.setAutoBackupEnabled);
  const setBackupFrequency = useSettingsStore((state) => state.setBackupFrequency);
  const setLastBackupAt = useSettingsStore((state) => state.setLastBackupAt);
  const backupNow = useSettingsStore((state) => state.backupNow);
  const pickBackupFolderAction = useSettingsStore((state) => state.pickBackupFolder);
  const clearBackup = useSettingsStore((state) => state.clearBackup);
  const setScanReceiptEnabled = useSettingsStore((state) => state.setScanReceiptEnabled);
  const setPayWithUpiEnabled = useSettingsStore((state) => state.setPayWithUpiEnabled);
  const setDarkModeEnabled = useSettingsStore((state) => state.setDarkModeEnabled);
  const setAppLockEnabled = useSettingsStore((state) => state.setAppLockEnabled);
  const setWalletFeatureEnabled = useSettingsStore((state) => state.setWalletFeatureEnabled);
  const walletFeatureEnabled = useSettingsStore((state) => state.walletFeatureEnabled);

  const handleExportCSV = () => {
    const transactions = JSON.parse(localStorage.getItem('expense-tracker-transactions') || '[]');
    if (!transactions.length) {
      setError('No transactions to export');
      return;
    }
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Payment Method', 'Note'];
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = transactions.map((t: any) => [
      escapeCsv(new Date(t.date).toLocaleDateString()),
      escapeCsv(t.type),
      escapeCsv(t.category),
      escapeCsv(t.amount),
      escapeCsv(t.paymentMethod || ''),
      escapeCsv(t.note || ''),
    ]);

    const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess('Exported to CSV');
  };

  const handleClearAll = () => {
    if (!confirm('Clear all data? This cannot be undone.')) return;
    localStorage.clear();
    setSuccess('All data cleared');
  };

  const isWeb = isWebPlatform();
  const [dropboxConnected, setDropboxConnected] = useState(false);
  const [dropboxLoading, setDropboxLoading] = useState(true);
  const [dropboxProfile, setDropboxProfile] = useState<{
    name: string;
    email: string;
    accountId: string;
    profilePic?: string;
  } | null>(() => {
    try {
      const stored = localStorage.getItem('dropbox_user_info');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Prevent duplicate OAuth processing (React 18 Strict Mode double-invoke)
  const processedCodeRef = useRef<string | null>(null);

  const FallbackAvatar = ({ name, email }: { name: string; email?: string }) => {
    const initial = (name || email || 'D').charAt(0).toUpperCase();
    const colors = [
      'bg-emerald-100 text-emerald-700',
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-indigo-100 text-indigo-700',
      'bg-teal-100 text-teal-700',
    ];
    const colorClass = colors[initial.charCodeAt(0) % colors.length];

    return (
      <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <span className="text-xl font-semibold">{initial}</span>
      </div>
    );
  };

  useEffect(() => {
    async function initDropbox() {
      setDropboxLoading(true);
      try {
        // Check for OAuth callback (authorization code in URL)
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');

        if (authCode) {
          // Prevent duplicate processing (React 18 Strict Mode double-invoke)
          if (processedCodeRef.current === authCode) {
            console.log('[SettingsPage] Code already processed, skipping');
            setDropboxLoading(false);
            return;
          }
          processedCodeRef.current = authCode;

          console.log('[SettingsPage] OAuth code detected, starting token exchange...');
          // Exchange authorization code for access token
          const authState = await handleDropboxOAuthCallback();
          if (authState) {
            console.log('[SettingsPage] Token exchange successful, setting connected state');
            setDropboxConnected(true);
            // Fetch user profile
            const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${authState.accessToken}`,
                'Content-Type': 'application/json',
              },
            });
            if (res.ok) {
              const data = await res.json();
              const profile = {
                email: data.email || '',
                name: data.name?.display_name || 'Dropbox User',
                accountId: data.account_id || '',
                profilePic: data.profile_photo_url || undefined,
              };
              setDropboxProfile(profile);
              localStorage.setItem('dropbox_user_info', JSON.stringify(profile));
              console.log('[SettingsPage] Dropbox profile fetched and saved');
            } else {
              console.error('[SettingsPage] Failed to fetch profile:', res.status);
            }
          } else {
            console.log('[SettingsPage] Token exchange returned null - code may have expired');
            setError('Dropbox sign-in failed. The authorization code may have expired. Please try again.');
          }
        } else {
          // No auth code - check if already connected
          console.log('[SettingsPage] No OAuth code in URL, checking stored auth...');
          const storedAuth = getStoredDropboxAuth();
          if (storedAuth) {
            console.log('[SettingsPage] Found stored auth, setting connected state');
            setDropboxConnected(true);
            const storedProfile = getStoredDropboxUserInfo();
            if (storedProfile) {
              setDropboxProfile(storedProfile);
            }
          } else {
            console.log('[SettingsPage] No stored auth found, user needs to connect');
          }
        }
      } catch (err: any) {
        console.error('[SettingsPage] Dropbox OAuth initialization error:', err);
        setError('Failed to complete Dropbox sign-in. Please try again.');
        clearDropboxAuth();
        clearDropboxUserInfo();
      } finally {
        setDropboxLoading(false);
      }
    }

    initDropbox();
  }, []);

  const handleDropboxConnect = async () => {
    try {
      await startDropboxAuth();
    } catch (err: any) {
      console.error('[SettingsPage] Failed to start Dropbox auth:', err);
      setError('Failed to start Dropbox sign-in. Please try again.');
    }
  };

  const handleDropboxDisconnect = () => {
    clearDropboxAuth();
    clearDropboxUserInfo();
    processedCodeRef.current = null;
    setDropboxConnected(false);
    setDropboxProfile(null);
    setSuccess('Dropbox disconnected');
  };

  const handleSyncProfile = async () => {
    setSyncingProfile(true);
    setError(null);
    try {
      const authState = getStoredDropboxAuth();
      if (!authState) {
        setError('Not connected to Dropbox');
        return;
      }
      const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const profile = {
          email: data.email || '',
          name: data.name?.display_name || 'Dropbox User',
          accountId: data.account_id || '',
          profilePic: data.profile_photo_url || undefined,
        };
        setDropboxProfile(profile);
        localStorage.setItem('dropbox_user_info', JSON.stringify(profile));
        setSuccess('Profile synced successfully');
      } else if (res.status === 401) {
        handleDropboxDisconnect();
        setError('Dropbox authentication expired.');
      } else if (res.status === 403) {
        setError('Missing "account_info.read" scope in Dropbox App Console.');
      } else {
        setError(`Failed with status ${res.status}`);
      }
    } catch (err: any) {
      setError(err?.message || 'Network error');
    } finally {
      setSyncingProfile(false);
    }
  };

  const handleAddWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWallet.name.trim() || newWallet.balance < 0) return;
    addWallet({ ...newWallet });
    setShowAddWallet(false);
    setNewWallet({ name: '', type: 'bank', balance: 0, bankName: '', icon: '', isActive: true, createdAt: Date.now() });
    setSuccess('Wallet added successfully');
  };

  const handleDeleteWallet = (id: string) => {
    if (!confirm('Delete this wallet? This cannot be undone.')) return;
    deleteWallet(id);
    setSuccess('Wallet deleted');
  };

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

  const handlePickFolder = async () => {
    if (!isWeb) return;
    setError(null);
    const result = await pickBackupFolderAction();
    if (result) {
      setBackupFolder(result.folderUri, result.folderName);
      setSuccess(`Backup folder set: ${result.folderName || 'Selected folder'}`);
    }
  };

  const handleBackupNow = async () => {
    setError(null);
    setBackupLoading(true);
    try {
      const result = await backupNow();
      setLastBackupAt(new Date().toISOString());
      const parts = [];
      if (result.json) parts.push('JSON');
      if (result.csv) parts.push('CSV');
      setSuccess(`Backup completed: ${parts.join(' + ')}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleClearBackup = () => {
    if (!confirm('Clear backup folder and settings?')) return;
    clearBackup();
    setSuccess('Backup settings cleared');
  };

  const formatLastBackup = (iso?: string) => {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleString();
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        checked ? 'bg-indigo-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  const SettingItem = ({ icon: Icon, title, description, children }: any) => (
    <div className="flex items-start gap-4 py-4">
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          </div>
          <div className="flex-shrink-0">{children}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Cloud className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
              <p className="text-xs text-gray-500">Manage your personal information</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-5">
          {dropboxLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Completing Dropbox sign-in...</p>
              </div>
            </div>
          ) : dropboxConnected ? (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                {dropboxProfile?.profilePic ? (
                  <img
                    src={dropboxProfile.profilePic}
                    alt={dropboxProfile.name || 'Dropbox profile photo'}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0 bg-gray-100"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <FallbackAvatar name={dropboxProfile?.name || ''} email={dropboxProfile?.email} />
                )}
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={dropboxProfile?.name || ''}
                      readOnly
                      disabled
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      value={dropboxProfile?.email || ''}
                      readOnly
                      disabled
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 mr-auto">
                  Connected
                </span>
                <button
                  onClick={handleDropboxDisconnect}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
                <button
                  onClick={handleSyncProfile}
                  disabled={syncingProfile}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {syncingProfile ? 'Syncing...' : 'Sync'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Cloud className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-4">Connect your Dropbox account to enable cloud backups</p>
              <button
                onClick={handleDropboxConnect}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Cloud className="w-4 h-4" />
                Connect Dropbox
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Wallet Management Section */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Wallet Management</h2>
              <p className="text-xs text-gray-500">Manage your wallets and balances</p>
            </div>
          </div>
          <button
            onClick={() => setWalletFeatureEnabled(!walletFeatureEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              walletFeatureEnabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform ${
                walletFeatureEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <div className="px-5 py-5">
          {walletFeatureEnabled && (
            <>
              {showAddWallet ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Wallet</h3>
                  <form onSubmit={handleAddWallet} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                        <input
                          type="text"
                          value={newWallet.name}
                          onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
                          placeholder="e.g., HDFC Bank, Cash in Hand"
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
                    <div className="flex items-center justify-end gap-2">
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
                        className={`px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg transition-colors ${!walletFeatureEnabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
                      >
                        Add Wallet
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  {wallets.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Building2 className="w-7 h-7 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 mb-4">No wallets added yet</p>
                      <button
                        onClick={() => setShowAddWallet(true)}
                        disabled={!walletFeatureEnabled}
                        className={`px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium transition-colors ${!walletFeatureEnabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
                      >
                        Add Wallet
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                        {wallets.filter(w => w.isActive).map((wallet) => {
                          const Icon = walletIconComponents[wallet.type];
                          return (
                            <div key={wallet.id} className="card p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className={`p-2 rounded-xl ${wallet.isActive ? walletColors[wallet.type].bg : 'bg-gray-100'}`}>
                                    <Icon className={`w-5 h-5 ${wallet.isActive ? walletColors[wallet.type].icon : 'text-gray-400'}`} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{wallet.name}</p>
                                    {wallet.bankName && (
                                      <p className="text-xs text-gray-500">{wallet.bankName}</p>
                                    )}
                                  </div>
                                </div>
                                <div className={`p-2 rounded-xl ${wallet.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                  <span className="text-xs font-medium">{wallet.isActive ? 'Active' : 'Inactive'}</span>
                                </div>
                              </div>
                              <p className="text-xl font-bold text-gray-900 mb-1">
                                ₹{wallet.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </p>
                              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                  <div className={`p-2 rounded-xl ${wallet.isActive ? walletColors[wallet.type].bg : 'bg-gray-100'}`}>
                                    <Icon className={`w-5 h-5 ${wallet.isActive ? walletColors[wallet.type].icon : 'text-gray-400'}`} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">Balance</p>
                                    <p className={`text-sm font-medium ${wallet.isActive ? walletColors[wallet.type].text : 'text-gray-400'}`}>
                                      ₹{wallet.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteWallet(wallet.id)}
                                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 mr-auto">
                          {wallets.filter(w => w.isActive).length} Active
                        </span>
                        <button
                          onClick={() => setShowAddWallet(true)}
                          disabled={!walletFeatureEnabled}
                          className={`px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg transition-colors ${!walletFeatureEnabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Wallet
                        </button>
                      </div>
                    </>
                  )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Preferences</h2>
          </div>
          <div className="px-5 divide-y divide-gray-100">
            <SettingItem
              icon={Smartphone}
              title="Scan Receipt"
              description="Enable receipt scanning in Add Transaction"
            >
              <Toggle checked={scanReceiptEnabled} onChange={() => setScanReceiptEnabled(!scanReceiptEnabled)} />
          </SettingItem>

          <SettingItem
            icon={Smartphone}
            title="Pay with UPI"
            description="Enable UPI QR payment in Add Transaction"
          >
            <Toggle checked={payWithUpiEnabled} onChange={() => setPayWithUpiEnabled(!payWithUpiEnabled)} />
          </SettingItem>

          <SettingItem
            icon={Moon}
            title="Dark Mode"
            description="Enable dark theme across the app"
          >
            <Toggle checked={darkModeEnabled} onChange={() => setDarkModeEnabled(!darkModeEnabled)} />
          </SettingItem>

          <SettingItem
            icon={Lock}
            title="App Lock"
            description="Lock app when minimized or backgrounded"
          >
            <Toggle checked={appLockEnabled} onChange={() => setAppLockEnabled(!appLockEnabled)} />
          </SettingItem>
        </div>
      </div>

      {/* Backup Section */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Backup & Sync</h2>
        </div>
        <div className="px-5 py-4 border-b border-amber-100 bg-amber-50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Cloud className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-amber-900">Google Sync Active</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                We recommend using <strong>Manual Backup</strong> to prevent data loss. Auto-backup may conflict with Google sync.
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 divide-y divide-gray-100">
          <SettingItem
            icon={Cloud}
            title="Auto Backup"
            description="Backup automatically after changes"
          >
            <Toggle checked={backup.autoBackupEnabled} onChange={() => setAutoBackupEnabled(!backup.autoBackupEnabled)} />
          </SettingItem>

          {backup.autoBackupEnabled && (
            <div className="py-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                    <Clock3 className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900">Backup Frequency</h3>
                  <p className="text-xs text-gray-500 mt-0.5">How often to create automatic backups</p>
                  <select
                    value={backup.backupFrequency}
                    onChange={(e) => setBackupFrequency(e.target.value as BackupFrequency)}
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="hourly7">Every 7 Hours</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="py-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900">Backup Format</h3>
                <p className="text-xs text-gray-500 mt-0.5">Choose export format for backups</p>
                <select
                  value={backup.format}
                  onChange={(e) => setBackupFormat(e.target.value as BackupFormat)}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="json">JSON only</option>
                  <option value="csv">CSV only</option>
                  <option value="both">JSON + CSV</option>
                </select>
              </div>
            </div>
          </div>

          <div className="py-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900">Backup Folder</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {backup.folderName || (isWeb ? 'No folder selected' : 'Documents/ExpenseTrackerBackups')}
                </p>
                {isWeb ? (
                  <button
                    onClick={handlePickFolder}
                    className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Choose Folder
                  </button>
                ) : (
                  <p className="mt-2 text-xs text-gray-400">Tap Backup Now to share via native menu</p>
                )}
              </div>
            </div>
          </div>

          <div className="py-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                  <Download className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900">Backup Now</h3>
                <p className="text-xs text-gray-500 mt-0.5">Create a manual backup immediately</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleBackupNow}
                    disabled={backupLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {backupLoading ? 'Backing up...' : 'Backup Now'}
                  </button>
                  <button
                    onClick={handleClearBackup}
                    className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Last backup: {formatLastBackup(backup.lastBackupAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Section */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Data</h2>
        </div>
        <div className="px-5 py-4">
          <button
            onClick={handleExportCSV}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Export to CSV
          </button>
          <button
            onClick={handleClearAll}
            className="w-full mt-3 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}