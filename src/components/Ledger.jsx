import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Plus, Minus, IndianRupee, Calendar, Clock, Download } from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';
import jsPDF from 'jspdf';

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
    console.log('🔌 SETTING UP SOCKET - START');
    console.log('🌐 Socket URL:', API_BASE_URL);
    console.log('📋 Ledger ID:', ledgerId);

    socketRef.current = io(API_BASE_URL);

    socketRef.current.emit('join-ledger', ledgerId);
    console.log('📡 Emitted join-ledger:', ledgerId);

    socketRef.current.on('ledger-updated', (updatedLedger) => {
      console.log('🔄 SOCKET LEDGER UPDATE:', updatedLedger);
      setLedger(updatedLedger);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ SOCKET CONNECTION ERROR:', error);
    });

    socketRef.current.on('connect', () => {
      console.log('✅ SOCKET CONNECTED');
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔌 SOCKET DISCONNECTED');
    });

    console.log('✅ SETTING UP SOCKET - COMPLETE');
  };

  const fetchLedger = async () => {
    try {
      console.log('🔄 FETCHING LEDGER - START');
      console.log('📡 API URL:', `${API_BASE_URL}/ledger/${ledgerId}`);
      console.log('👤 Current user:', user);
      console.log('🆔 User ID:', user?.id, 'User _id:', user?._id);
      console.log('👤 User name:', user?.name);
      console.log('🔍 User object keys:', user ? Object.keys(user) : 'No user');

      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/ledger/${ledgerId}`);

      console.log('📦 FULL SERVER RESPONSE:', response.data);
      console.log('📊 LEDGER DATA:', response.data.ledger);
      console.log('👥 FRIEND DATA:', response.data.ledger.friend);
      console.log('📝 TRANSACTIONS COUNT:', response.data.ledger.transactions.length);
      console.log('💰 SERVER BALANCE:', response.data.ledger.balance);
      console.log('🔍 DEBUG DATA:', response.data.ledger.debug);

      // Log first few transactions for debugging
      if (response.data.ledger.transactions.length > 0) {
        console.log('🔍 FIRST TRANSACTION:', response.data.ledger.transactions[0]);
        console.log('🔍 FIRST TRANSACTION addedBy:', response.data.ledger.transactions[0].addedBy);
      }

      setLedger(response.data.ledger);
      console.log('✅ FETCHING LEDGER - COMPLETE');
    } catch (error) {
      console.error('❌ FETCHING LEDGER - ERROR:', error);
      console.error('❌ Error response:', error.response?.data);
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

    console.log('🔄 SUBMITTING TRANSACTION - START');
    console.log('📝 Transaction type:', transactionType);
    console.log('💰 Amount:', amount);
    console.log('📄 Description:', description);

    if (!amount || amount <= 0) {
      console.log('❌ Invalid amount:', amount);
      return;
    }

    setSubmitting(true);

    try {
      const endpoint = transactionType === 'added' ? 'add' : 'receive';
      const requestData = {
        amount: parseFloat(amount),
        description: description.trim()
      };

      console.log('📡 API URL:', `${API_BASE_URL}/ledger/${ledgerId}/${endpoint}`);
      console.log('📦 Request data:', requestData);

      const response = await axios.post(`${API_BASE_URL}/ledger/${ledgerId}/${endpoint}`, requestData);

      console.log('✅ TRANSACTION RESPONSE:', response.data);
      console.log('💰 NEW BALANCE:', response.data.balance);

      closeTransactionModal();
      console.log('✅ SUBMITTING TRANSACTION - COMPLETE');
    } catch (error) {
      console.error('❌ SUBMITTING TRANSACTION - ERROR:', error);
      console.error('❌ Error response:', error.response?.data);
      setError('Failed to add transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const formatBalance = (balance) => {
    console.log('Formatting balance:', balance);
    if (balance === 0) return 'All settled';
    if (balance > 0) return `You will get Rs ${balance}`;
    return `You need to give Rs ${Math.abs(balance)}`;
  };

  const getBalanceColor = (balance) => {
    if (balance === 0) return 'text-gray-600';
    if (balance > 0) return 'text-green-600';
    return 'text-red-600';
  };

  // Calculate balance based on frontend transaction data
  const calculateFrontendBalance = (transactions) => {
    let userPaid = 0;
    let userReceived = 0;

    console.log('=== BALANCE CALCULATION START ===');
    console.log('Total transactions:', transactions.length);
    console.log('🔍 Current user data:', user);
    console.log('🔍 User mobile:', user?.mobile);
    console.log('🔍 User name:', user?.name);

    transactions.forEach((transaction, index) => {
      // NEW LOGIC: Check transaction structure with sentBy/receivedBy
      console.log(`Transaction ${index + 1}:`, {
        type: transaction.type,
        amount: transaction.amount,
        sentBy: transaction.sentBy,
        receivedBy: transaction.receivedBy,
        addedBy: transaction.addedBy, // Keep for backward compatibility
        currentUserMobile: user?.mobile,
        currentUserName: user?.name
      });

      // Check if this transaction involves the current user using mobile numbers
      const currentUserMobile = user?.mobile;
      const isCurrentUserSent = transaction.sentBy === currentUserMobile;
      const isCurrentUserReceived = transaction.receivedBy === currentUserMobile;

      console.log(`🔍 Transaction ${index + 1} analysis:`);
      console.log(`🔍 Current user mobile: ${currentUserMobile}`);
      console.log(`🔍 Transaction sentBy: ${transaction.sentBy}`);
      console.log(`🔍 Transaction receivedBy: ${transaction.receivedBy}`);
      console.log(`🔍 Is current user sender: ${isCurrentUserSent}`);
      console.log(`🔍 Is current user receiver: ${isCurrentUserReceived}`);

      if (isCurrentUserSent) {
        // You sent money to someone
        userPaid += transaction.amount;
        console.log(`✅ You sent: +${transaction.amount}, Total sent: ${userPaid}`);
      } else if (isCurrentUserReceived) {
        // You received money from someone
        userReceived += transaction.amount;
        console.log(`✅ You received: +${transaction.amount}, Total received: ${userReceived}`);
      }
    });

    // Calculate balance: positive means you get money, negative means you owe money
    const balance = userPaid - userReceived;

    console.log('=== CALCULATION SUMMARY ===');
    console.log(`You paid: Rs ${userPaid}`);
    console.log(`You received: Rs ${userReceived}`);
    console.log(`Final balance: Rs ${userPaid} - Rs ${userReceived} = Rs ${balance}`);

    if (balance > 0) {
      console.log(`🎯 RESULT: You get Rs ${balance} from friend`);
    } else if (balance < 0) {
      console.log(`🎯 RESULT: You need to give Rs ${Math.abs(balance)} to friend`);
    } else {
      console.log(`🎯 RESULT: All settled!`);
    }
    console.log('=== BALANCE CALCULATION END ===');

    return balance;
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

  // Generate PDF export of transactions
  const generatePDF = (transactions) => {
    if (!transactions || transactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    try {
      // Create new jsPDF instance with proper configuration
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Add header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('ShareKhata - Transaction Report', 105, 15, { align: 'center' });
      
      // Add ledger details - more compact spacing
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Friend: ${ledger.friend.name}`, 20, 25);
      doc.text(`Mobile: ${ledger.friend.mobile}`, 20, 31);
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 20, 37);
      
      // Clean balance text without special characters - use direct text
      const balance = calculateFrontendBalance(transactions);
      let balanceText = '';
      if (balance === 0) {
        balanceText = 'All settled';
      } else if (balance > 0) {
        balanceText = `You will get Rs ${balance}`;
      } else {
        balanceText = `You need to give Rs ${Math.abs(balance)}`;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Current Balance: ${balanceText}`, 20, 43);
      
      // Add summary section - more compact
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 20, 52);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const youPaid = transactions
        .filter(t => t.sentBy === user?.mobile)
        .reduce((sum, t) => sum + t.amount, 0);
      const youReceived = transactions
        .filter(t => t.receivedBy === user?.mobile)
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Clean amount text without special characters - use simple formatting
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`You Paid: Rs ${youPaid.toFixed(2)}`, 20, 59);
      doc.text(`You Received: Rs ${youReceived.toFixed(2)}`, 20, 65);
      doc.text(`Net Balance: Rs ${(youPaid - youReceived).toFixed(2)}`, 20, 71);
      
      // Add transactions section - more compact
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Transaction Details', 20, 80);
      
      // Manually create table structure - more compact
      let yPosition = 88;
      const lineHeight = 6; // Reduced from 8 to 6
      const colWidths = [12, 35, 22, 32, 22, 18, 30];
      const colPositions = [20, 32, 67, 89, 121, 143, 161];
      
      // Table header - more compact
      doc.setFillColor(59, 130, 246);
      doc.rect(20, yPosition - 4, 170, 6, 'F'); // Reduced height from 8 to 6
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      
      const headers = ['#', 'Type', 'Amount', 'Description', 'Date', 'Time', 'Category'];
      headers.forEach((header, index) => {
        doc.text(header, colPositions[index], yPosition);
      });
      
      yPosition += 10; // Reduced from 15 to 10
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      // Table rows - more compact
      transactions.forEach((transaction, index) => {
        // Check if we need a new page - adjusted threshold
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 15;
        }
        
        const isCurrentUserSent = transaction.sentBy === user?.mobile;
        const isCurrentUserReceived = transaction.receivedBy === user?.mobile;
        const isCurrentUserInvolved = isCurrentUserSent || isCurrentUserReceived;
        
        const rowData = [
          (index + 1).toString(),
          isCurrentUserInvolved 
            ? (isCurrentUserSent ? 'You Paid' : 'You Received')
            : (transaction.addedBy?.name || 'Unknown'),
          `Rs ${transaction.amount.toFixed(2)}`,
          transaction.description || '-',
          new Date(transaction.timestamp).toLocaleDateString('en-IN'),
          new Date(transaction.timestamp).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          isCurrentUserInvolved ? 'Your Transaction' : 'Friend\'s Transaction'
        ];
        
        // Add row data
        rowData.forEach((cellData, cellIndex) => {
          // Truncate long text to fit column width - more aggressive truncation
          let displayText = cellData;
          if (cellData.length > 12 && cellIndex !== 0) {
            displayText = cellData.substring(0, 10) + '...';
          }
          
          doc.text(displayText, colPositions[cellIndex], yPosition);
        });
        
        yPosition += lineHeight;
        
        // Add separator line every few rows - less frequent
        if ((index + 1) % 8 === 0) {
          doc.setDrawColor(200, 200, 200);
          doc.line(20, yPosition - 1, 190, yPosition - 1);
          yPosition += 2; // Reduced spacing
        }
      });
      
      // Add footer - more compact
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text('Generated by ShareKhata - Split expenses with friends easily', 105, pageHeight - 8, { align: 'center' });
      
      // Save the PDF
      const fileName = `ShareKhata_${ledger.friend.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      console.log('✅ PDF generated successfully:', fileName);
    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
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
      {/* Friend Info Header */}
      <div className="bg-blue-100 shadow-sm">
        <div className="px-4 py-4">
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
            <div className={`text-3xl font-bold ${getBalanceColor(calculateFrontendBalance(ledger.transactions))} mb-2`}>
              {formatBalance(calculateFrontendBalance(ledger.transactions))}
            </div>
            <div className="text-sm text-gray-500 mb-3">
              Last updated: {formatDate(ledger.lastUpdated)}
            </div>
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2">
              💡 <strong>How it works:</strong> Green means you get money, red means you need to give money
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-600">
                Rs {(() => {
                  // Debug: Log all transaction data first
                  console.log('🔍 SUMMARY DEBUG - All transactions:', ledger.transactions);
                  console.log('🔍 SUMMARY DEBUG - Current user mobile:', user?.mobile);
                  console.log('🔍 SUMMARY DEBUG - User object:', user);

                  // FIXED LOGIC: You paid = you are the sender (sentBy matches your mobile)
                  const youPaid = ledger.transactions
                    .filter(t => {
                      const isMatch = t.sentBy === user?.mobile;
                      console.log(`🔍 Transaction filter check - You Paid:`, {
                        transactionId: t.id,
                        type: t.type,
                        sentBy: t.sentBy,
                        receivedBy: t.receivedBy,
                        userMobile: user?.mobile,
                        isMatch: isMatch,
                        amount: t.amount
                      });
                      return isMatch;
                    })
                    .reduce((sum, t) => sum + t.amount, 0);

                  console.log('🔍 Summary - You Paid calculation:', {
                    userMobile: user?.mobile,
                    totalTransactions: ledger.transactions.length,
                    matchingTransactions: ledger.transactions.filter(t => t.sentBy === user?.mobile),
                    total: youPaid
                  });
                  return youPaid.toFixed(2);
                })()}
              </div>
              <div className="text-sm text-gray-600">You Paid</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                Rs {(() => {
                  // FIXED LOGIC: You received = you are the receiver (receivedBy matches your mobile)
                  const youReceived = ledger.transactions
                    .filter(t => {
                      const isMatch = t.receivedBy === user?.mobile;
                      console.log(`🔍 Transaction filter check - You Received:`, {
                        transactionId: t.id,
                        type: t.type,
                        sentBy: t.sentBy,
                        receivedBy: t.receivedBy,
                        userMobile: user?.mobile,
                        isMatch: isMatch,
                        amount: t.amount
                      });
                      return isMatch;
                    })
                    .reduce((sum, t) => sum + t.amount, 0);

                  console.log('🔍 Summary - You Received calculation:', {
                    userMobile: user?.mobile,
                    totalTransactions: ledger.transactions.length,
                    matchingTransactions: ledger.transactions.filter(t => t.receivedBy === user?.mobile),
                    total: youReceived
                  });
                  return youReceived.toFixed(2);
                })()}
              </div>
              <div className="text-sm text-gray-600">You Received</div>
            </div>
          </div>
        </div>

        {/* Transaction Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => openTransactionModal('added')}
            className="bg-red-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>I Paid</span>
          </button>

          <button
            onClick={() => openTransactionModal('received')}
            className="bg-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
          >
            <Minus className="h-5 w-5" />
            <span>I Received</span>
          </button>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>
            <button
              onClick={() => generatePDF(ledger.transactions)}
              className="flex items-center space-x-2 text-blue-600 px-4 py-2 rounded-lg transition-colors"
              title="Export transactions as PDF"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm font-medium">Export PDF</span>
            </button>
          </div>

          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-200"></div>
              <span>Your transactions</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-200"></div>
              <span>Friend's transactions</span>
            </div>
          </div>

          {/* Symbol Legend */}
          <div className="flex items-center justify-center space-x-6 mb-4 text-xs text-gray-500 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <Plus className="h-3 w-3" />
              </div>
              <span>Money received</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <Minus className="h-3 w-3" />
              </div>
              <span>Money sent</span>
            </div>
          </div>

          {/* Debug Section - Temporary
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <h4 className="text-sm font-semibold text-red-800 mb-2">🔍 Debug - Transaction Colors</h4>
            <div className="text-xs text-red-700 space-y-1">
              <div><strong>Current User Mobile:</strong> {user?.mobile}</div>
              <div><strong>User Mobile Type:</strong> {typeof user?.mobile}</div>
              <div><strong>Total Transactions:</strong> {ledger.transactions.length}</div>
              <div><strong>Test Comparison:</strong> "9356072952" === "9356072952" = {"9356072952" === "9356072952" ? "true" : "false"}</div>
              {ledger.transactions.map((t, index) => {
                const isPerformedByUser = t.addedBy.id === user?.id;
                const isPerformedByFriend = t.addedBy.id !== user?.id;
                return (
                  <div key={t.id} className="ml-2">
                    <strong>Transaction {index + 1}:</strong>
                    <div className="ml-2">
                      <div>addedBy.id: {t.addedBy.id}</div>
                      <div>user.id: {user?.id}</div>
                      <div>Performed by user: {isPerformedByUser ? "true" : "false"}</div>
                      <div>Performed by friend: {isPerformedByFriend ? "true" : "false"}</div>
                      <div>Will be: {isPerformedByUser ? "BLUE (User performed)" : "YELLOW (Friend performed)"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div> */}

          {ledger.transactions.length === 0 ? (
            <div className="text-center py-8">
              <IndianRupee className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No transactions yet</p>
              <p className="text-sm text-gray-400">Start by adding your first expense</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ledger.transactions.map((transaction) => {
                // Determine transaction ownership and flow
                const isCurrentUserSent = transaction.sentBy === user.mobile;
                const isCurrentUserReceived = transaction.receivedBy === user.mobile;
                const isCurrentUserInvolved = isCurrentUserSent || isCurrentUserReceived;

                // Determine if this is money received (green) or sent (red)
                const isMoneyReceived = isCurrentUserReceived;
                const isMoneySent = isCurrentUserSent;

                // Debug logging
                console.log('🔍 Transaction color debug:', {
                  transactionId: transaction.id,
                  userMobile: user.mobile,
                  transactionSentBy: transaction.sentBy,
                  transactionReceivedBy: transaction.receivedBy,
                  isCurrentUserSent,
                  isCurrentUserReceived,
                  isCurrentUserInvolved,
                  willBeBlue: isCurrentUserInvolved,
                  willBeYellow: !isCurrentUserInvolved
                });

                return (
                  <div
                    key={transaction.id}
                    className={`p-4 rounded-lg border ${transaction.addedBy.id === user?.id
                        ? 'bg-blue-50 border-blue-200' // Blue for transactions performed by logged user
                        : 'bg-yellow-50 border-yellow-200' // Yellow for transactions performed by friend
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMoneyReceived
                            ? 'bg-green-100 text-green-600' // Green for received money
                            : 'bg-red-100 text-red-600'     // Red for sent money
                          }`}>
                          {isMoneyReceived ? (
                            <Plus className="h-4 w-4" />  // + for received
                          ) : (
                            <Minus className="h-4 w-4" /> // - for sent
                          )}
                        </div>
                        <span className="font-medium text-gray-900">
                          {isCurrentUserInvolved
                            ? (isCurrentUserSent ? 'You paid' : 'You received')
                            : (isCurrentUserReceived ? `${transaction.addedBy.name} paid` : `${transaction.addedBy.name} received`)
                          }
                        </span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        Rs {transaction.amount}
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Modal */}
      {showAmountModal && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {transactionType === 'added' ? 'I Paid' : 'I Received'}
            </h3>

            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (Rs )
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