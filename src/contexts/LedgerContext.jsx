// Create a new file: contexts/LedgerContext.jsx

import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const LedgerContext = createContext();

export const useLedger = () => {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within LedgerProvider');
  }
  return context;
};

export const LedgerProvider = ({ children }) => {
  const [ledgers, setLedgers] = useState([]);
  const [personalExpenseSummary, setPersonalExpenseSummary] = useState({
    today: 0,
    lastWeek: 0,
    yesterday: 0
  });
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [error, setError] = useState('');

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  const fetchLedgers = useCallback(async (forceRefresh = false) => {
    // Check if we should use cached data
    const now = Date.now();
    if (!forceRefresh && lastFetchTime && (now - lastFetchTime) < CACHE_DURATION && ledgers.length > 0) {
      console.log('Using cached ledger data');
      return { ledgers, personalExpenseSummary };
    }

    try {
      setLoading(true);
      setError('');

      // Fetch both ledgers and personal expense summary
      const [ledgersResponse, expenseResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/ledger`),
        axios.get(`${API_BASE_URL}/personal-expense/summary`).catch(() => ({
          data: { summary: { today: 0, lastWeek: 0, yesterday: 0 } }
        }))
      ]);

      // Fetch full transaction data for each ledger
      const ledgersWithTransactions = await Promise.all(
        ledgersResponse.data.ledgers.map(async (ledger) => {
          try {
            const ledgerResponse = await axios.get(`${API_BASE_URL}/ledger/${ledger.id}`);
            return {
              ...ledger,
              transactions: ledgerResponse.data.ledger.transactions
            };
          } catch (error) {
            console.error(`Failed to fetch transactions for ledger ${ledger.id}:`, error);
            return ledger;
          }
        })
      );

      // Sort ledgers by updatedAt in descending order
      const sortedLedgers = ledgersWithTransactions.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.lastUpdated || 0);
        const dateB = new Date(b.updatedAt || b.lastUpdated || 0);
        return dateB - dateA;
      });

      setLedgers(sortedLedgers);
      setPersonalExpenseSummary(expenseResponse.data.summary);
      setLastFetchTime(now);

      return { ledgers: sortedLedgers, personalExpenseSummary: expenseResponse.data.summary };
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [lastFetchTime, ledgers, personalExpenseSummary]);

  const updateSingleLedger = useCallback((ledgerId, updatedData) => {
    setLedgers(prevLedgers => 
      prevLedgers.map(ledger => 
        ledger.id === ledgerId ? { ...ledger, ...updatedData } : ledger
      )
    );
  }, []);

  const invalidateCache = useCallback(() => {
    setLastFetchTime(null);
  }, []);

  // Add a method to refresh after transaction
  const refreshAfterTransaction = useCallback(async () => {
    console.log('Refreshing ledgers after transaction...');
    await fetchLedgers(true); // Force refresh
  }, [fetchLedgers]);

  const value = {
    ledgers,
    personalExpenseSummary,
    loading,
    error,
    fetchLedgers,
    updateSingleLedger,
    invalidateCache,
    refreshAfterTransaction
  };

  return (
    <LedgerContext.Provider value={value}>
      {children}
    </LedgerContext.Provider>
  );
};