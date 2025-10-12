
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
// import Header from './components/Header';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Ledger from './components/Ledger';
import AddFriend from './components/AddFriend';
import Profile from './components/Profile';
import './App.css';
import PersonalExpense from './components/PersonalExpense';
import { Toaster } from 'react-hot-toast';
import { LedgerProvider } from './contexts/LedgerContext';

// Route Tracker Component
const RouteTracker = () => {
  const location = useLocation();
  const { saveRoute } = useAuth();

  useEffect(() => {
    saveRoute(location.pathname);
  }, [location.pathname, saveRoute]);

  return null;
};

// Protected Route Component with Header
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;

  return (
    <>
      {children}
    </>
  );
};

// Main App Component
const AppContent = () => {
  const { user, lastRoute, loading } = useAuth();

  // Show loading while checking authentication
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
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 2000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 3000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <RouteTracker />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to={lastRoute || "/dashboard"} /> : <Login />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to={lastRoute || "/dashboard"} /> : <Register />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ledger/:id"
          element={
            <ProtectedRoute>
              <Ledger />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-friend"
          element={
            <ProtectedRoute>
              <AddFriend />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/personal-expense"
          element={
            <ProtectedRoute>
              <PersonalExpense />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={<Navigate to={user ? (lastRoute || "/dashboard") : "/login"} />}
        />
      </Routes>
    </div>
  );
};

// App Component with Providers
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <LedgerProvider>
          <AppContent />
        </LedgerProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
