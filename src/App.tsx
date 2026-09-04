import { useState, useEffect } from 'react';
import { LayoutDashboard, List, BarChart3, Wallet, Plus, Settings, BookOpen } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import Header from './components/Header';
import SummaryCards from './components/SummaryCards';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import AnalyticsCharts from './components/AnalyticsCharts';
import BudgetProgress from './components/BudgetProgress';
import ProfitLossStatement from './components/ProfitLossStatement';
import EmptyState from './components/EmptyState';
import InstallPrompt from './components/InstallPrompt';
import PaymentVerificationPrompt from './components/PaymentVerificationPrompt';
import AppLock from './components/AppLock';
import SettingsPage from './components/SettingsPage';
import { useStore } from './store/useStore';
import { useUpiPayment } from './hooks/useUpiPayment';
import { useSettingsStore } from './store/useSettingsStore';
import { useDailyReminder, TransactionReminderBanner } from './hooks/useDailyReminder';

type Tab = 'dashboard' | 'transactions' | 'analytics' | 'ledger' | 'budget' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const transactions = useStore((state) => state.transactions);
  const getSummary = useStore((state) => state.getSummary);
  const darkModeEnabled = useSettingsStore((state) => state.darkModeEnabled);
  const dailyReminderEnabled = useSettingsStore((state) => state.dailyReminderEnabled);
  const reminderTimes = useSettingsStore((state) => state.reminderTimes);

  const { showReminder, dismissReminder } = useDailyReminder(transactions, {
    enabled: dailyReminderEnabled,
    reminderTimes,
    testing: true,
  });

  const {
    verificationPrompt,
    markPaymentCompleted,
    markPaymentFailed,
    dismissVerification,
  } = useUpiPayment();

  const summary = getSummary();
  const hasTransactions = transactions.length > 0;

  useEffect(() => {
    const html = document.documentElement;
    if (darkModeEnabled) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [darkModeEnabled]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'settings' || tab === 'ledger') {
      setActiveTab(tab);
    }
  }, []);

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions' as Tab, label: 'Transactions', icon: List },
    { id: 'analytics' as Tab, label: 'Analytics', icon: BarChart3 },
    { id: 'ledger' as Tab, label: 'Ledger', icon: BookOpen },
    { id: 'budget' as Tab, label: 'Budget', icon: Wallet },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  return (
    <AppLock>
      <Analytics />
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === 'dashboard' && 'Executive Dashboard'}
                {activeTab === 'transactions' && 'Transactions'}
                {activeTab === 'analytics' && 'Analytics & Insights'}
              {activeTab === 'ledger' && 'Ledger'}
              {activeTab === 'budget' && 'Budget Management'}
              {activeTab === 'settings' && 'Settings'}
            </h2>
            <p className="text-gray-500 mt-1">
              {activeTab === 'dashboard' && 'Overview of your financial health'}
              {activeTab === 'transactions' && 'Manage your income and expenses'}
              {activeTab === 'analytics' && 'Visualize your spending patterns'}
              {activeTab === 'ledger' && 'Income vs Expense Statement'}
              {activeTab === 'budget' && 'Track your budget limits'}
              {activeTab === 'settings' && 'App preferences and backup'}
            </p>
            </div>
            
            {activeTab !== 'dashboard' && (
              <button onClick={() => setShowTransactionForm(true)} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Add Transaction
              </button>
            )}
          </div>

          <nav className="bg-white p-1.5 rounded-2xl mb-6 inline-flex w-full sm:w-auto border border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="space-y-6">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <SummaryCards summary={summary} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
                    {!hasTransactions ? (
                      <EmptyState
                        title="No transactions yet"
                        description="Start by adding your first transaction to see insights here."
                        actionLabel="Add Transaction"
                        onAction={() => setShowTransactionForm(true)}
                      />
                    ) : (
                      <div className="space-y-3">
                        {transactions.slice(0, 5).map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">
                                {transaction.category === 'Food' && '🍔'}
                                {transaction.category === 'Rent' && '🏠'}
                                {transaction.category === 'Utilities' && '⚡'}
                                {transaction.category === 'Transportation' && '🚗'}
                                {transaction.category === 'Entertainment' && '🎬'}
                                {transaction.category === 'Shopping' && '🛍️'}
                                {transaction.category === 'Healthcare' && '💊'}
                                {transaction.category === 'Education' && '📚'}
                                {transaction.category === 'Salary' && '💼'}
                                {transaction.category === 'Freelance' && '💻'}
                                {transaction.category === 'Investment' && '📈'}
                                {transaction.category === 'Other' && '📦'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{transaction.category}</p>
                                <p className="text-sm text-gray-500">{transaction.note || 'No note'}</p>
                              </div>
                            </div>
                            <p className={`font-bold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <span className="text-gray-500">Total Transactions</span>
                        <span className="text-xl font-bold text-gray-900">{transactions.length}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <span className="text-gray-500">Avg. Transaction</span>
                        <span className="text-xl font-bold text-gray-900">
                          ₹{transactions.length > 0 ? Math.round(transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length).toLocaleString('en-IN') : '0'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <span className="text-gray-500">Largest Expense</span>
                        <span className="text-xl font-bold text-red-600">
                          ₹{transactions.filter(t => t.type === 'expense').length > 0 ? Math.max(...transactions.filter(t => t.type === 'expense').map(t => t.amount)).toLocaleString('en-IN') : '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <BudgetProgress />
              </div>
            )}

            {activeTab === 'transactions' && (
              <TransactionList />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsCharts />
            )}

            {activeTab === 'ledger' && (
              <ProfitLossStatement />
            )}

            {activeTab === 'budget' && (
              <div className="space-y-6">
              <BudgetProgress />
            </div>
          )}

          {activeTab === 'settings' && (
            <SettingsPage />
          )}
        </div>
      </main>

        {showReminder && (
          <TransactionReminderBanner
            reminder={{
              ...showReminder,
              onAddTransaction: () => {
                dismissReminder();
                setShowTransactionForm(true);
              },
            }}
          />
        )}

        {showTransactionForm && (
          <TransactionForm onClose={() => setShowTransactionForm(false)} />
        )}

        {verificationPrompt && (
          <PaymentVerificationPrompt
            payment={verificationPrompt.payment}
            onConfirm={() => markPaymentCompleted(verificationPrompt.payment.id)}
            onReject={() => markPaymentFailed(verificationPrompt.payment.id)}
            onDismiss={dismissVerification}
          />
        )}

        <InstallPrompt />
      </div>
    </AppLock>
  );
}
