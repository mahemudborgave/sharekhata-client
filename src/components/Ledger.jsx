import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Plus, Minus, IndianRupee, Calendar, Clock } from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Ledger = () => {
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [transactionType, setTransactionType] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { user } = useAuth();
  const { id: ledgerId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);

  useEffect(() => {
    fetchLedger();
    setupSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [ledgerId]);

  const setupSocket = () => {
    socketRef.current = io(API_BASE_URL);
    
    socketRef.current.emit('join-ledger', ledgerId);
    
    socketRef.current.on('ledger-updated', (updatedLedger) => {
      setLedger(updatedLedger);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  };

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/ledger/${ledgerId}`);
      setLedger(response.data.ledger);
    } catch (error) {
      console.error('Error fetching ledger:', error);
      setError('Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const openTransactionModal = (type) => {
    setTransactionType(type);
    setAmount('');
    setDescription('');
    setShowAmountModal(true);
  };

  const closeTransactionModal = () => {
    setShowAmountModal(false);
    setTransactionType('');
    setAmount('');
    setDescription('');
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || amount <= 0) {
      return;
    }

    setSubmitting(true);

    try {
      const endpoint = transactionType === 'added' ? 'add' : 'receive';
      await axios.post(`${API_BASE_URL}/ledger/${ledgerId}/${endpoint}`, {
        amount: parseFloat(amount),
        description: description.trim()
      });

      closeTransactionModal();
    } catch (error) {
      console.error('Transaction error:', error);
      setError('Failed to add transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const formatBalance = (balance) => {
    if (balance === 0) return 'All settled';
    if (balance > 0) return `Friend owes you ₹${balance}`;
    return `You owe friend ₹${Math.abs(balance)}`;
  };

  const getBalanceColor = (balance) => {
    if (balance === 0) return 'text-gray-600';
    if (balance > 0) return 'text-green-600';
    return 'text-red-600';
  };

  const getAvatar = (user) => {
    if (user.avatar && user.avatar.startsWith('http')) {
      return (
        <img 
          src={user.avatar} 
          alt={user.name}
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }
    
    return (
      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
        {user.avatar || user.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ledger...</p>
        </div>
      </div>
    );
  }

  if (error || !ledger) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Ledger not found'}</p>
          <button
            onClick={handleBack}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBack}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-3">
              {getAvatar(ledger.friend)}
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{ledger.friend.name}</h1>
                <p className="text-sm text-gray-500">{ledger.friend.mobile}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Balance Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="text-center">
            <h2 className="text-lg font-medium text-gray-600 mb-2">Current Balance</h2>
            <div className={`text-3xl font-bold ${getBalanceColor(ledger.balance)} mb-2`}>
              {formatBalance(ledger.balance)}
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {formatDate(ledger.lastUpdated)}
            </div>
          </div>
        </div>

        {/* Transaction Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => openTransactionModal('added')}
            className="bg-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>I Added</span>
          </button>
          
          <button
            onClick={() => openTransactionModal('received')}
            className="bg-red-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
          >
            <Minus className="h-5 w-5" />
            <span>I Received</span>
          </button>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Transactions</h3>
          
          {ledger.transactions.length === 0 ? (
            <div className="text-center py-8">
              <IndianRupee className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No transactions yet</p>
              <p className="text-sm text-gray-400">Start by adding your first expense</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ledger.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`p-4 rounded-lg border ${
                    transaction.isOwnTransaction 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.type === 'added' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {transaction.type === 'added' ? (
                          <Plus className="h-4 w-4" />
                        ) : (
                          <Minus className="h-4 w-4" />
                        )}
                      </div>
                      <span className="font-medium text-gray-900">
                        {transaction.isOwnTransaction 
                          ? `You ${transaction.type}` 
                          : `${transaction.addedBy.name} ${transaction.type}`
                        }
                      </span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      ₹{transaction.amount}
                    </span>
                  </div>
                  
                  {transaction.description && (
                    <p className="text-gray-600 text-sm mb-2">{transaction.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(transaction.timestamp)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(transaction.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Modal */}
      {showAmountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {transactionType === 'added' ? 'I Added' : 'I Received'}
            </h3>
            
            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹)
                </label>
                <input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full py-3 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full py-3 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="e.g., Lunch, Movie tickets"
                  maxLength="100"
                />
              </div>
              
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={closeTransactionModal}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !amount || amount <= 0}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Adding...' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ledger; 