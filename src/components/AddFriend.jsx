import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, User, Check } from 'lucide-react';
import axios from 'axios';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const AddFriend = () => {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [friendData, setFriendData] = useState(null);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setFriendData(null);

    if (!mobile) {
      setError('Please enter a mobile number');
      return;
    }

    if (mobile.length !== 10 || !/^[6-9]\d{9}$/.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/add-friend`, { mobile });
      setFriendData(response.data.friend);
      setSuccess(true);
      
      // Auto-navigate after 2 seconds
      setTimeout(() => {
        navigate(`/ledger/${response.data.ledgerId}`);
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add friend');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

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
            <h1 className="text-lg font-semibold text-gray-900">Add Friend</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Add a Friend</h2>
            <p className="text-gray-600">Enter your friend's mobile number to start sharing expenses</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {success && friendData && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              <div className="flex items-center space-x-2">
                <Check className="h-5 w-5" />
                <span>Friend added successfully! Redirecting to ledger...</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-2">
                Friend's Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Smartphone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter 10-digit mobile number"
                  maxLength="10"
                  disabled={loading || success}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Only registered users can be added as friends
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding Friend...' : success ? 'Friend Added!' : 'Add Friend'}
            </button>
          </form>

          {friendData && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {friendData.avatar || friendData.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{friendData.name}</h3>
                  <p className="text-sm text-gray-500">{friendData.mobile}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={handleBack}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">How it works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Enter your friend's mobile number</li>
            <li>• If they're registered, they'll be added as a friend</li>
            <li>• A shared ledger will be created automatically</li>
            <li>• Start tracking expenses together!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AddFriend; 