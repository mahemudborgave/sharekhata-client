import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from './Header';
import { Plus, X, Edit2, Trash2, TrendingDown, Calendar, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const categories = [
  { value: 'food', label: '🍔 Food', color: 'bg-orange-100 text-orange-800' },
  { value: 'transport', label: '🚗 Transport', color: 'bg-blue-100 text-blue-800' },
  { value: 'shopping', label: '🛍️ Shopping', color: 'bg-pink-100 text-pink-800' },
  { value: 'bills', label: '💡 Bills', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'entertainment', label: '🎬 Fun', color: 'bg-purple-100 text-purple-800' },
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateTransactions, setSelectedDateTransactions] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});

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

  useEffect(() => {
    if (showCalendarModal) {
      fetchCalendarData();
    }
  }, [showCalendarModal, currentMonth]);

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
      toast.error('Failed to load expenses');
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    try {
      const token = localStorage.getItem('token');
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const response = await axios.get(`${API_URL}/personal-expense/transactions?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Group transactions by date
      const grouped = {};
      response.data.transactions.forEach(transaction => {
        const date = new Date(transaction.date).toDateString();
        if (!grouped[date]) {
          grouped[date] = {
            total: 0,
            count: 0,
            transactions: []
          };
        }
        grouped[date].total += transaction.amount;
        grouped[date].count += 1;
        grouped[date].transactions.push(transaction);
      });

      setCalendarData(grouped);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar data');
    }
  };

  const handleDateClick = (date) => {
    const dateString = date.toDateString();
    const dayData = calendarData[dateString];

    if (dayData) {
      setSelectedDate(date);
      setSelectedDateTransactions(dayData.transactions);
      setShowDayDetailsModal(true);
    } else {
      toast.info('No transactions on this day');
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const changeMonth = (offset) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/personal-expense/add`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Expense added successfully');
      setShowAddModal(false);
      setFormData({
        amount: '',
        description: '',
        category: 'other',
        transactionType: 'expense',
        date: new Date().toISOString().split('T')[0]
      });
      fetchData();
      if (showCalendarModal) fetchCalendarData();
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add expense');
    }
  };

  const handleEditClick = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: transaction.amount.toString(),
      description: transaction.description,
      category: transaction.category,
      transactionType: transaction.transactionType || 'expense',
      date: new Date(transaction.date).toISOString().split('T')[0]
    });
    setShowEditModal(true);
  };

  const handleUpdateTransaction = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/personal-expense/${editingTransaction._id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Expense updated successfully');
      setShowEditModal(false);
      setEditingTransaction(null);
      setFormData({
        amount: '',
        description: '',
        category: 'other',
        transactionType: 'expense',
        date: new Date().toISOString().split('T')[0]
      });
      fetchData();
      if (showCalendarModal) fetchCalendarData();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update expense');
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/personal-expense/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Expense deleted successfully');
      fetchData();
      if (showCalendarModal) fetchCalendarData();

      // Update day details if open
      if (showDayDetailsModal) {
        setSelectedDateTransactions(prev => prev.filter(t => t._id !== id));
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete expense');
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

  const closeModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingTransaction(null);
    setFormData({
      amount: '',
      description: '',
      category: 'other',
      transactionType: 'expense',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Group transactions by date
  const groupTransactionsByDate = (transactions) => {
    const grouped = {};
    transactions.forEach(transaction => {
      const date = new Date(transaction.date).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(transaction);
    });
    return grouped;
  };

  const groupedTransactions = groupTransactionsByDate(transactions);
  const dateColors = [
    'bg-blue-50 border-blue-200',
    'bg-green-50 border-green-200',
    'bg-purple-50 border-purple-200',
    'bg-pink-50 border-pink-200',
    'bg-yellow-50 border-yellow-200',
    'bg-indigo-50 border-indigo-200',
    'bg-red-50 border-red-200',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20 w-full">
      <Header />

      {/* Header */}
      <div className="bg-blue-900 text-white p-6 pt-3 rounded-b-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Personal Expenses</h1>
            <p className="text-blue-100 text-sm">Track your spending habits</p>
          </div>
          <button
            onClick={() => setShowCalendarModal(true)}
            className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-colors flex flex-col items-center"
            title="View Calendar"
          >
            <CalendarDays className="w-6 h-6" />
          </button>
        </div>
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

      {/* Transactions List with Date Segregation */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          <span className="text-sm text-gray-500">{transactions.length} total</span>
        </div>

        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No transactions yet</p>
              <p className="text-sm text-gray-400 mt-1">Start tracking your expenses</p>
            </div>
          ) : (
            Object.entries(groupedTransactions).map(([date, dayTransactions], dateIndex) => {
              const colorClass = dateColors[dateIndex % dateColors.length];
              const dayTotal = dayTransactions.reduce((sum, t) => sum + t.amount, 0);

              return (
                <div key={date} className={`rounded-xl p-3`}>
                  {/* Date Header */}
                  <div className="flex items-center justify-between mb-1 pb-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span className="font-semibold text-gray-900">
                        {formatDate(date)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({dayTransactions.length} transaction{dayTransactions.length > 1 ? 's' : ''})
                      </span>
                    </div>
                    <span className="font-bold text-red-600">
                      {formatCurrency(dayTotal)}
                    </span>
                  </div>

                  {/* Transactions for this day */}
                  <div className="space-y-2">
                    {dayTransactions.map((transaction) => {
                      const categoryInfo = getCategoryInfo(transaction.category);
                      return (
                        <div key={transaction._id} className="bg-white rounded-lg shadow-sm p-3 flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className={`${categoryInfo.color} rounded-lg p-2 text-lg`}>
                              {categoryInfo.label.split(' ')[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className='flex justify-between items-center'>
                                <p className="font-medium text-gray-900 leading-tight">{transaction.description}</p>
                                <div className="text-right">
                                  <p className="font-bold text-gray-500">
                                    {formatCurrency(transaction.amount)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-end mt-2">
                                {/* <span className={`text-xs px-2 py-0.5 rounded-full ${categoryInfo.color}`}>
                                  {categoryInfo.label.split(' ')[1]}
                                </span> */}
                                <div className='flex items-center'>
                                  <button
                                    onClick={() => handleEditClick(transaction)}
                                    className="text-gray-400 hover:text-blue-600 px-2"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTransaction(transaction._id)}
                                    className="text-gray-400 hover:text-red-600 pl-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
        <Plus className="w-12 h-6" />
      </button>

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Expense Calendar</h2>
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-2 bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-semibold text-lg">
                  {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => changeMonth(1)}
                  className="p-2 bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth().map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const dateString = date.toDateString();
                  const dayData = calendarData[dateString];
                  const isToday = date.toDateString() === new Date().toDateString();
                  const hasTransactions = !!dayData;

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => handleDateClick(date)}
                      className={`aspect-square p-1 rounded-lg border-2 transition-all ${isToday
                          ? 'border-blue-500 bg-blue-50'
                          : hasTransactions
                            ? 'border-green-300 bg-green-50 hover:bg-green-100'
                            : 'border-gray-200 hover:bg-gray-50'
                        } ${hasTransactions ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {date.getDate()}
                      </div>
                      {hasTransactions && (
                        <div className="text-xs font-bold text-red-600 truncate">
                          ₹{dayData.total.toFixed(0)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-600">
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-50"></div>
                  <span>Today</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 rounded border-2 border-green-300 bg-green-50"></div>
                  <span>Has expenses</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Day Details Modal */}
      {showDayDetailsModal && selectedDate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedDate.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedDateTransactions.length} transaction{selectedDateTransactions.length > 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setShowDayDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Total for the day */}
              <div className="mt-3 bg-red-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(selectedDateTransactions.reduce((sum, t) => sum + t.amount, 0))}
                </p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {selectedDateTransactions.map((transaction) => {
                const categoryInfo = getCategoryInfo(transaction.category);
                return (
                  <div key={transaction._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`${categoryInfo.color} rounded-lg p-2 text-lg`}>
                        {categoryInfo.label.split(' ')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className='flex justify-between items-center'>
                          <p className="font-medium text-gray-900 leading-tight">{transaction.description}</p>
                          <div className="text-right">
                            <p className="font-bold text-gray-500">
                              {formatCurrency(transaction.amount)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end mt-2">
                          {/* <span className={`text-xs px-2 py-0.5 rounded-full ${categoryInfo.color}`}>
                                  {categoryInfo.label.split(' ')[1]}
                                </span> */}
                          <div className='flex items-center'>
                            <button
                              onClick={() => handleEditClick(transaction)}
                              className="text-gray-400 hover:text-blue-600 px-2"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(transaction._id)}
                              className="text-gray-400 hover:text-red-600 pl-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-end sm:items-center justify-center z-50 w-full">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-sm sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Expense</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
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
                <div className="grid grid-cols-4 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${formData.category === cat.value
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
                onClick={handleAddTransaction}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-end sm:items-center justify-center z-50 w-full">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-sm sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Expense</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
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
                <div className="grid grid-cols-4 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${formData.category === cat.value
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
                onClick={handleUpdateTransaction}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Update Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalExpense;