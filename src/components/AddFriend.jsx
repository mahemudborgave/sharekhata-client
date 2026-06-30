import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, User, Check, X, Copy, MessageSquare } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const INVITE_TEXT = (mobile) =>
  `Hey! I'm using ShareKhata to track shared expenses. Join me so we can manage money together easily! 🤝\n\nRegister here: https://sharekhata.in/register`;

const AddFriend = () => {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [friendData, setFriendData] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [unregisteredMobile, setUnregisteredMobile] = useState('');
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();

  const normalizeMobile = (value) => {
    let cleaned = value.replace(/\s+/g, '');
    if (cleaned.startsWith('+91')) cleaned = cleaned.slice(3);
    else if (cleaned.startsWith('91') && cleaned.length > 10) cleaned = cleaned.slice(2);
    cleaned = cleaned.replace(/\D/g, '');
    return cleaned.slice(0, 10);
  };

  const handleMobileChange = (e) => {
    setMobile(normalizeMobile(e.target.value));
  };

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
      setTimeout(() => navigate(`/ledger/${response.data.ledgerId}`), 2000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add friend';
      // Server returns 404 when user not found
      if (err.response?.status === 404 || msg.toLowerCase().includes('not found')) {
        setUnregisteredMobile(mobile);
        setShowInviteModal(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(INVITE_TEXT(unregisteredMobile));
    } catch {
      const ta = document.createElement('textarea');
      ta.value = INVITE_TEXT(unregisteredMobile);
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSMS = () => {
    const encoded = encodeURIComponent(INVITE_TEXT(unregisteredMobile));
    window.open(`sms:${unregisteredMobile}?body=${encoded}`, '_self');
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(INVITE_TEXT(unregisteredMobile));
    const num = unregisteredMobile.startsWith('91') ? unregisteredMobile : `91${unregisteredMobile}`;
    window.open(`https://wa.me/${num}?text=${encoded}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="px-4 py-4 flex items-center space-x-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Add Friend</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
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
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center space-x-2">
              <Check className="h-5 w-5" />
              <span>Friend added! Redirecting to ledger...</span>
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
                  onChange={handleMobileChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="e.g. 9876543210 or +91 98765 43210"
                  disabled={loading || success}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">+91 and spaces are stripped automatically</p>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding Friend...' : success ? 'Friend Added!' : 'Add Friend'}
            </button>
          </form>

          {friendData && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {friendData.avatar || friendData.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{friendData.name}</h3>
                <p className="text-sm text-gray-500">{friendData.mobile}</p>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-700 transition-colors">
              Back to Dashboard
            </button>
          </div>
        </div>

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

      {/* ── Not Registered Invite Modal ── */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            {/* Close */}
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <User className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Friend Not Registered</h3>
                <p className="text-sm text-gray-500 mt-0.5">+91 {unregisteredMobile}</p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 ml-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-5">
              This number isn't on ShareKhata yet. Invite your friend to register so you can start managing money together!
            </p>

            {/* Invite preview */}
            <div className="bg-gray-50 rounded-lg p-3 mb-5 text-xs text-gray-500 whitespace-pre-line border border-gray-200">
              {INVITE_TEXT(unregisteredMobile)}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleCopy}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors space-y-1"
              >
                {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-gray-600" />}
                <span className="text-xs font-medium text-gray-700">{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                onClick={handleSMS}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors space-y-1"
              >
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-medium text-gray-700">SMS</span>
              </button>

              <button
                onClick={handleWhatsApp}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-green-200 hover:bg-green-50 transition-colors space-y-1"
              >
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.106" />
                </svg>
                <span className="text-xs font-medium text-gray-700">WhatsApp</span>
              </button>
            </div>

            <button
              onClick={() => setShowInviteModal(false)}
              className="w-full mt-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Try a different number
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddFriend;
