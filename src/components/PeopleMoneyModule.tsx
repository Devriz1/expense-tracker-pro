// Receipts & Payments Module
// Track money lent to friends, borrowed from friends, and shared expenses
// Single unified module for personal lending/borrowing

import { useState, useMemo } from 'react';
import { ArrowUpRight, ArrowDownLeft, Plus, X, Trash2, Users, FileText, CheckCircle2, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';

type EntryType = 'lent' | 'borrowed';
type EntryStatus = 'pending' | 'settled';

interface PersonEntry {
  id: string;
  personName: string;
  type: EntryType;
  amount: number;
  note: string;
  date: string;
  status: EntryStatus;
  settledDate?: string;
  createdAt: number;
}

const STORAGE_KEY = 'expense-tracker-people';

function loadEntries(): PersonEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveEntries(entries: PersonEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export default function PeopleMoneyModule() {
  const [entries, setEntries] = useState<PersonEntry[]>(loadEntries());
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | EntryType | EntryStatus>('all');
  const [search, setSearch] = useState('');

  const addTransaction = useStore((state) => state.addTransaction);

  const [form, setForm] = useState({
    personName: '',
    type: 'lent' as EntryType,
    amount: '',
    note: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.personName.trim() || !amount || amount <= 0) return;

    const newEntry: PersonEntry = {
      id: Date.now().toString(36),
      personName: form.personName.trim(),
      type: form.type,
      amount,
      note: form.note.trim(),
      date: new Date(form.date).toISOString(),
      status: 'pending',
      createdAt: Date.now(),
    };
    const updated = [newEntry, ...entries];
    setEntries(updated);
    saveEntries(updated);
    setForm({ personName: '', type: 'lent', amount: '', note: '', date: new Date().toISOString().split('T')[0] });
    setShowForm(false);
  };

  const toggleSettled = (id: string) => {
    const target = entries.find((e) => e.id === id);
    if (!target) return;

    if (target.status === 'pending') {
      const isSettlingBorrowed = target.type === 'borrowed';
      const confirmMessage = isSettlingBorrowed
        ? `Mark as settled? This will record ₹${target.amount} as expense (you paid back).`
        : `Mark as settled? This will record ₹${target.amount} as income (friend paid you back).`;
      if (!confirm(confirmMessage)) return;
    }

    const updated = entries.map((e) => {
      if (e.id !== id) return e;
      const newStatus: EntryStatus = e.status === 'pending' ? 'settled' : 'pending';
      return {
        ...e,
        status: newStatus,
        settledDate: newStatus === 'settled' ? new Date().toISOString() : undefined,
      };
    });
    setEntries(updated);
    saveEntries(updated);

    if (target.status === 'pending') {
      addTransaction({
        type: target.type === 'lent' ? 'income' : 'expense',
        amount: target.amount,
        category: 'Other',
        note: `Settled: ${target.type === 'lent' ? `${target.personName} paid back` : `Paid back to ${target.personName}`}${target.note ? ` — ${target.note}` : ''}`,
        date: new Date().toISOString(),
        paymentMethod: 'Other',
      });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this entry?')) return;
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
  };

  const handleAddAsTransaction = (entry: PersonEntry) => {
    addTransaction({
      type: entry.type === 'lent' ? 'expense' : 'income',
      amount: entry.amount,
      category: 'Other',
      note: `${entry.type === 'lent' ? 'Lent to' : 'Borrowed from'} ${entry.personName}${entry.note ? ` — ${entry.note}` : ''}`,
      date: new Date().toISOString(),
      paymentMethod: 'Other',
    });
    alert('Added to transactions!');
  };

  // Group by person to compute net balance per person
  const personBalances = useMemo(() => {
    const map: Record<string, { name: string; net: number; count: number; pending: number }> = {};
    entries.forEach((e) => {
      if (e.status === 'settled') return;
      if (!map[e.personName]) {
        map[e.personName] = { name: e.personName, net: 0, count: 0, pending: 0 };
      }
      // lent = friend owes me (positive to me)
      // borrowed = I owe friend (negative to me)
      map[e.personName].net += e.type === 'lent' ? e.amount : -e.amount;
      map[e.personName].count += 1;
      map[e.personName].pending += 1;
    });
    return Object.values(map).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [entries]);

  const totalLentPending = entries
    .filter((e) => e.type === 'lent' && e.status === 'pending')
    .reduce((s, e) => s + e.amount, 0);
  const totalBorrowedPending = entries
    .filter((e) => e.type === 'borrowed' && e.status === 'pending')
    .reduce((s, e) => s + e.amount, 0);
  const netBalance = totalLentPending - totalBorrowedPending;

  const filtered = entries
    .filter((e) => {
      if (filter === 'lent' || filter === 'borrowed') return e.type === filter;
      if (filter === 'pending' || filter === 'settled') return e.status === filter;
      return true;
    })
    .filter((e) => (search ? e.personName.toLowerCase().includes(search.toLowerCase()) : true));

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Receipts & Payments</h3>
            <p className="text-sm text-gray-500 mt-1">Money lent to / borrowed from friends</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-4 bg-emerald-50 rounded-xl">
            <p className="text-xs text-emerald-700 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> You will receive
            </p>
            <p className="text-xl font-bold text-emerald-600 mt-1">
              ₹{totalLentPending.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-4 bg-red-50 rounded-xl">
            <p className="text-xs text-red-700 flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3" /> You owe
            </p>
            <p className="text-xl font-bold text-red-600 mt-1">
              ₹{totalBorrowedPending.toLocaleString('en-IN')}
            </p>
          </div>
          <div className={`p-4 rounded-xl ${netBalance >= 0 ? 'bg-indigo-50' : 'bg-amber-50'}`}>
            <p className={`text-xs ${netBalance >= 0 ? 'text-indigo-700' : 'text-amber-700'}`}>
              Net balance
            </p>
            <p className={`text-xl font-bold mt-1 ${netBalance >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
              {netBalance >= 0 ? '+' : ''}₹{netBalance.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* People Balances */}
        {personBalances.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Users className="w-4 h-4" /> Per-person balances
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {personBalances.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.pending} pending</p>
                  </div>
                  <p
                    className={`font-bold text-sm ${
                      p.net > 0 ? 'text-emerald-600' : p.net < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}
                  >
                    {p.net > 0 ? '+' : ''}₹{p.net.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by person..."
            className="input text-sm flex-1"
          />
          <div className="flex gap-1 flex-wrap">
            {(['all', 'lent', 'borrowed', 'pending', 'settled'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium capitalize ${
                  filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Entries List */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No entries yet</p>
            <p className="text-sm text-gray-400">Track money you lent or borrowed from friends</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-3 border rounded-xl ${
                  entry.status === 'settled' ? 'border-gray-200 bg-gray-50 opacity-70' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      entry.type === 'lent' ? 'bg-emerald-100' : 'bg-red-100'
                    }`}
                  >
                    {entry.type === 'lent' ? (
                      <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ArrowDownLeft className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{entry.personName}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          entry.status === 'settled'
                            ? 'bg-gray-200 text-gray-600'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {entry.status === 'settled' ? 'Settled' : 'Pending'}
                      </span>
                    </div>
                    {entry.note && <p className="text-xs text-gray-500 truncate">{entry.note}</p>}
                    <p className="text-xs text-gray-400">
                      {new Date(entry.date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p
                    className={`font-bold ${
                      entry.type === 'lent' ? 'text-emerald-600' : 'text-red-600'
                    } ${entry.status === 'settled' ? 'line-through' : ''}`}
                  >
                    {entry.type === 'lent' ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
                  </p>
                  <div className="flex gap-1 mt-1 justify-end">
                    <button
                      onClick={() => toggleSettled(entry.id)}
                      title={entry.status === 'settled' ? 'Mark pending' : 'Mark settled'}
                      className={`text-xs p-1 rounded ${
                        entry.status === 'settled'
                          ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}
                    >
                      {entry.status === 'settled' ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => handleAddAsTransaction(entry)}
                      title="Add to transactions"
                      className="text-xs p-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      title="Delete"
                      className="text-xs p-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">New Entry</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                <div className="flex gap-2">
                  {(['lent', 'borrowed'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                        form.type === t
                          ? t === 'lent'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t === 'lent' ? 'I Lent Money' : 'I Borrowed Money'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Person's name</label>
                <input
                  type="text"
                  value={form.personName}
                  onChange={(e) => setForm({ ...form, personName: e.target.value })}
                  className="input"
                  placeholder="e.g. John"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="input !pl-8"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Note (optional)</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="input"
                  placeholder="e.g. Lunch, Movie tickets..."
                />
              </div>

              <button type="submit" className="btn btn-primary w-full">
                <Plus className="w-4 h-4" />
                Save Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
