import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, X, Edit2, Trash2, TrendingDown, Calendar } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const categories = [
  { value: 'food', label: '🍔 Food', color: 'bg-orange-100 text-orange-800' },
  { value: 'transport', label: '🚗 Transport', color: 'bg-blue-100 text-blue-800' },
  { value: 'shopping', label: '🛍️ Shopping', color: 'bg-pink-100 text-pink-800' },
  { value: 'bills', label: '💡 Bills', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'entertainment', label: '🎬 Entertainment', color: 'bg-purple-100 text-purple-800' },
  { value: 'health', label: '🏥 Health', color: 'bg-red-100 text-red-800' },
  { value: 'education', label: '📚 Education', color: 'bg-green-100 text-green-800' },
  { value: 'other', label: '📦 Other', color: 'bg-gray-100 text-gray-800' }
];

const PersonalExpense = () => {
  const [summary, setSummary] = useState({
    today: 0,
    yesterday: 0,
    lastWeek: 0,
    lastMonth: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'other',
    transactionType: 'expense',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [summaryRes, transactionsRes] = await Promise.all([
        axios.get(`${API_URL}/personal-expense/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/personal-expense/transactions?limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setSummary(summaryRes.data.summary);
      setTransactions(transactionsRes.data.transactions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/personal-expense/add`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowAddModal(false);
      setFormData({
        amount: '',
        description: '',
        category: 'other',
        transactionType: 'expense',
        date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction');
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/personal-expense/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  const getCategoryInfo = (category) => {
    return categories.find(c => c.value === category) || categories[categories.length - 1];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-[#111D6D] text-white p-6 rounded-b-2xl">
        <h1 className="text-2xl font-bold mb-1">Personal Expenses</h1>
        <p className="text-blue-100 text-sm">Track your spending habits</p>
      </div>

      {/* Summary Cards */}
      <div className="px-4 -mt-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-gray-500 text-xs mb-1">Today</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.today)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-gray-500 text-xs mb-1">Yesterday</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.yesterday)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-gray-500 text-xs mb-1">Last 7 Days</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.lastWeek)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-gray-500 text-xs mb-1">Last 30 Days</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.lastMonth)}</p>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          <span className="text-sm text-gray-500">{transactions.length} total</span>
        </div>

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No transactions yet</p>
              <p className="text-sm text-gray-400 mt-1">Start tracking your expenses</p>
            </div>
          ) : (
            transactions.map((transaction) => {
              const categoryInfo = getCategoryInfo(transaction.category);
              return (
                <div key={transaction._id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`${categoryInfo.color} rounded-lg p-2 text-lg`}>
                      {categoryInfo.label.split(' ')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{transaction.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${categoryInfo.color}`}>
                          {categoryInfo.label.split(' ')[1]}
                        </span>
                        <span className="text-xs text-gray-500">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {formatDate(transaction.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="font-bold text-red-600">
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTransaction(transaction._id)}
                      className="text-gray-400 hover:text-red-600 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-20 right-[50%] translate-x-[50%] bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all"
      >
        <Plus className="w-15 h-6" />
      </button>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Expense</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What did you spend on?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.category === cat.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{cat.label.split(' ')[0]}</div>
                      <div className="text-xs font-medium">{cat.label.split(' ')[1]}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Add Expense
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalExpense;