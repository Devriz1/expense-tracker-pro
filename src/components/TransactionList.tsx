import { useState } from 'react';
import { Search, Filter, Download, FileText, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import TransactionItem from './TransactionItem';
import TransactionForm from './TransactionForm';
import type { Transaction } from '../store/types';

export default function TransactionList() {
  const { transactions, filters, setFilters, resetFilters, deleteTransaction, exportToCSV, exportToJSON, exportToPDF, getCategories } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const filteredTransactions = transactions.filter((t) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        t.note?.toLowerCase().includes(searchLower) ||
        t.category.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    if (filters.type !== 'all' && t.type !== filters.type) return false;
    if (filters.category !== 'all' && t.category !== filters.category) return false;
    if (filters.dateRange.start) {
      const start = new Date(filters.dateRange.start);
      const txDate = new Date(t.date);
      if (txDate < start) return false;
    }
    if (filters.dateRange.end) {
      const end = new Date(filters.dateRange.end);
      const txDate = new Date(t.date);
      if (txDate > end) return false;
    }
    return true;
  });

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTransaction(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            placeholder="Search transactions..."
            className="input !pl-10"
          />
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-ghost'} px-4`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          
          {/* Export Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="btn btn-ghost px-4"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            
            {showExport && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg z-20 py-1 min-w-[160px] border border-gray-100">
                  <button onClick={() => { exportToCSV(); setShowExport(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                    Export as CSV
                  </button>
                  <button onClick={() => { exportToJSON(); setShowExport(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                    Export as JSON
                  </button>
                  <button onClick={() => { exportToPDF(); setShowExport(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Export as PDF
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Add Button */}
          <button onClick={() => setShowForm(true)} className="btn btn-primary px-4">
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Expandable Filter Panel */}
      {showFilters && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            <button onClick={resetFilters} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Reset
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => {
                  const newType = e.target.value as 'all' | 'income' | 'expense';
                  setFilters({ type: newType, category: 'all' });
                }}
                className="select"
              >
                <option value="all">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            
            {/* Dynamic Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ category: e.target.value })}
                className="select"
              >
                <option value="all">All Categories</option>
                
                {/* Show Income categories if Type is 'income' */}
                {(filters.type === 'income' || filters.type === 'all') && (
                  filters.type === 'all' ? (
                    <optgroup label="Income">
                      {getCategories('income').map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
                  ) : (
                    getCategories('income').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))
                  )
                )}

                {/* Show Expense categories if Type is 'expense' */}
                {(filters.type === 'expense' || filters.type === 'all') && (
                  filters.type === 'all' ? (
                    <optgroup label="Expense">
                      {getCategories('expense').map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
                  ) : (
                    getCategories('expense').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))
                  )
                )}
              </select>
            </div>
            
            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.dateRange.start || ''}
                  onChange={(e) => setFilters({ dateRange: { ...filters.dateRange, start: e.target.value } })}
                  className="input text-sm"
                />
                <input
                  type="date"
                  value={filters.dateRange.end || ''}
                  onChange={(e) => setFilters({ dateRange: { ...filters.dateRange, end: e.target.value } })}
                  className="input text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No transactions found</p>
            <p className="text-sm">Try adjusting your filters or add a new transaction</p>
          </div>
        ) : (
          filteredTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              onEdit={handleEdit}
              onDelete={deleteTransaction}
            />
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <TransactionForm
          onClose={handleCloseForm}
          editTransaction={editingTransaction}
        />
      )}
    </div>
  );
}