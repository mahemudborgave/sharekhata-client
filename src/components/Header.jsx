import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, LogOut, NotebookPen, ClipboardList, Accessibility } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setShowProfileMenu(false);
  };

  if (!user) return null;

  return (
    <header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-[#111D6D]">
        <div className="flex justify-between items-center h-20">
          {/* Left side - App name only */}
          <Link to="/dashboard" className="flex items-center space-x-2 cursor-pointer">
            <ClipboardList className="h-7 w-7 text-white" />
            <h1 className="text-xl font-bold text-white uppercase">Share.Khata</h1>
          </Link>

          {/* Right side - Profile section */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100/30 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="sm:block text-sm font-medium text-blue-300/70">
                {user.name.split(" ")[0]}
              </span>
              <div className="w-8 h-8 bg-blue-800/50 rounded-lg flex items-center justify-center">
                <Accessibility className="h-5 w-5 text-white" />
              </div>
            </button>

            {/* Profile dropdown menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <button
                  onClick={handleProfileClick}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showProfileMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </header>
  );
};

export default Header;