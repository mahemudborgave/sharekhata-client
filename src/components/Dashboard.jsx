import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Plus, LogOut, User, ArrowRight, IndianRupee } from 'lucide-react';
import axios from 'axios';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Dashboard = () => {
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLedgers();
  }, []);

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/ledger`);
      setLedgers(response.data.ledgers);
    } catch (error) {
      console.error('Error fetching ledgers:', error);
      setError('Failed to load ledgers');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getAvatar(user)}
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Hello, {user.name}</h1>
                <p className="text-sm text-gray-500">{user.mobile}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Add Friend Button */}
        <button
          onClick={() => navigate('/add-friend')}
          className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors mb-6 flex items-center justify-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add Friend</span>
        </button>

        {/* Friends & Ledgers */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Friends</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {ledgers.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No friends yet</h3>
              <p className="text-gray-500 mb-4">Add a friend to start sharing expenses</p>
              <button
                onClick={() => navigate('/add-friend')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Add Your First Friend
              </button>
            </div>
          ) : (
            ledgers.map((ledger) => (
              <div
                key={ledger.id}
                onClick={() => navigate(`/ledger/${ledger.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getAvatar(ledger.friend)}
                    <div>
                      <h3 className="font-semibold text-gray-900">{ledger.friend.name}</h3>
                      <p className="text-sm text-gray-500">{ledger.friend.mobile}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Balance</span>
                    <span className={`font-semibold ${getBalanceColor(ledger.balance)}`}>
                      {formatBalance(ledger.balance)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-gray-600">Transactions</span>
                    <span className="text-sm text-gray-500">{ledger.transactionCount}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm">
            ShareKhata - Split expenses with friends easily
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 