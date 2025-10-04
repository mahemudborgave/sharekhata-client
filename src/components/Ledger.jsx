import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Plus, Minus, IndianRupee, Calendar, Clock, Download, Copy, MessageSquare, Share2, Check, Edit2, Trash2 } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
  const [showShareSection, setShowShareSection] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

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
    // console.log('🔌 SETTING UP SOCKET - START');
    // console.log('🌐 Socket URL:', API_BASE_URL);
    // console.log('📋 Ledger ID:', ledgerId);

    socketRef.current = io(API_BASE_URL);

    socketRef.current.emit('join-ledger', ledgerId);
    // console.log('📡 Emitted join-ledger:', ledgerId);

    socketRef.current.on('ledger-updated', (updatedLedger) => {
      // console.log('🔄 SOCKET LEDGER UPDATE:', updatedLedger);
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
      // console.log('🔄 FETCHING LEDGER - START');
      // console.log('📡 API URL:', `${API_BASE_URL}/ledger/${ledgerId}`);
      // console.log('👤 Current user:', user);
      // console.log('🆔 User ID:', user?.id, 'User _id:', user?._id);
      // console.log('👤 User name:', user?.name);
      // console.log('🔍 User object keys:', user ? Object.keys(user) : 'No user');

      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/ledger/${ledgerId}`);

      // console.log('📦 FULL SERVER RESPONSE:', response.data);
      // console.log('📊 LEDGER DATA:', response.data.ledger);
      // console.log('👥 FRIEND DATA:', response.data.ledger.friend);
      // console.log('📝 TRANSACTIONS COUNT:', response.data.ledger.transactions.length);
      // console.log('💰 SERVER BALANCE:', response.data.ledger.balance);
      // console.log('🔍 DEBUG DATA:', response.data.ledger.debug);

      // Log first few transactions for debugging
      if (response.data.ledger.transactions.length > 0) {
        // console.log('🔍 FIRST TRANSACTION:', response.data.ledger.transactions[0]);
        // console.log('🔍 FIRST TRANSACTION addedBy:', response.data.ledger.transactions[0].addedBy);
      }

      setLedger(response.data.ledger);
      // console.log('✅ FETCHING LEDGER - COMPLETE');
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

  const openTransactionModal = (type, transaction = null) => {
    if (transaction) {
      // Edit mode
      setIsEditMode(true);
      setEditingTransaction(transaction);
      setTransactionType(transaction.type);
      setAmount(transaction.amount.toString());
      setDescription(transaction.description || '');
    } else {
      // Add mode
      setIsEditMode(false);
      setEditingTransaction(null);
      setTransactionType(type);
      setAmount('');
      setDescription('');
    }
    setShowAmountModal(true);
  };

  const closeTransactionModal = () => {
    setShowAmountModal(false);
    setTransactionType('');
    setAmount('');
    setDescription('');
    setIsEditMode(false);
    setEditingTransaction(null);
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();

    if (!amount || amount <= 0) {
      return;
    }

    setSubmitting(true);

    try {
      if (isEditMode && editingTransaction) {
        // Update existing transaction
        const requestData = {
          amount: parseFloat(amount),
          description: description.trim()
        };

        await axios.put(
          `${API_BASE_URL}/ledger/${ledgerId}/transaction/${editingTransaction.id}`,
          requestData
        );
      } else {
        // Add new transaction
        const endpoint = transactionType === 'added' ? 'add' : 'receive';
        const requestData = {
          amount: parseFloat(amount),
          description: description.trim()
        };

        await axios.post(`${API_BASE_URL}/ledger/${ledgerId}/${endpoint}`, requestData);
      }

      closeTransactionModal();
    } catch (error) {
      console.error('Transaction error:', error);
      setError(isEditMode ? 'Failed to update transaction' : 'Failed to add transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/ledger/${ledgerId}/transaction/${transactionId}`);
    } catch (error) {
      console.error('Delete transaction error:', error);
      setError('Failed to delete transaction');
    }
  };

  const formatBalance = (balance) => {
    // console.log('Formatting balance:', balance);
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

    // console.log('=== BALANCE CALCULATION START ===');
    // console.log('Total transactions:', transactions.length);
    // console.log('🔍 Current user data:', user);
    // console.log('🔍 User mobile:', user?.mobile);
    // console.log('🔍 User name:', user?.name);

    transactions.forEach((transaction, index) => {
      // NEW LOGIC: Check transaction structure with sentBy/receivedBy
      // console.log(`Transaction ${index + 1}:`, {
      //   type: transaction.type,
      //   amount: transaction.amount,
      //   sentBy: transaction.sentBy,
      //   receivedBy: transaction.receivedBy,
      //   addedBy: transaction.addedBy, // Keep for backward compatibility
      //   currentUserMobile: user?.mobile,
      //   currentUserName: user?.name
      // });

      // Check if this transaction involves the current user using mobile numbers
      const currentUserMobile = user?.mobile;
      const isCurrentUserSent = transaction.sentBy === currentUserMobile;
      const isCurrentUserReceived = transaction.receivedBy === currentUserMobile;

      // console.log(`🔍 Transaction ${index + 1} analysis:`);
      // console.log(`🔍 Current user mobile: ${currentUserMobile}`);
      // console.log(`🔍 Transaction sentBy: ${transaction.sentBy}`);
      // console.log(`🔍 Transaction receivedBy: ${transaction.receivedBy}`);
      // console.log(`🔍 Is current user sender: ${isCurrentUserSent}`);
      // console.log(`🔍 Is current user receiver: ${isCurrentUserReceived}`);

      if (isCurrentUserSent) {
        // You sent money to someone
        userPaid += transaction.amount;
        // console.log(`✅ You sent: +${transaction.amount}, Total sent: ${userPaid}`);
      } else if (isCurrentUserReceived) {
        // You received money from someone
        userReceived += transaction.amount;
        // console.log(`✅ You received: +${transaction.amount}, Total received: ${userReceived}`);
      }
    });

    // Calculate balance: positive means you get money, negative means you owe money
    const balance = userPaid - userReceived;

    // console.log('=== CALCULATION SUMMARY ===');
    // console.log(`You paid: Rs ${userPaid}`);
    // console.log(`You received: Rs ${userReceived}`);
    // console.log(`Final balance: Rs ${userPaid} - Rs ${userReceived} = Rs ${balance}`);

    if (balance > 0) {
      // console.log(`🎯 RESULT: You get Rs ${balance} from friend`);
    } else if (balance < 0) {
      // console.log(`🎯 RESULT: You need to give Rs ${Math.abs(balance)} to friend`);
    } else {
      // console.log(`🎯 RESULT: All settled!`);
    }
    // console.log('=== BALANCE CALCULATION END ===');

    return balance;
  };

  // Generate formatted text for sharing
  const generateShareText = () => {
    if (!ledger) return '';

    const balance = calculateFrontendBalance(ledger.transactions);
    const youPaid = ledger.transactions
      .filter(t => t.sentBy === user?.mobile)
      .reduce((sum, t) => sum + t.amount, 0);
    const youReceived = ledger.transactions
      .filter(t => t.receivedBy === user?.mobile)
      .reduce((sum, t) => sum + t.amount, 0);

    let balanceText = '';
    if (balance === 0) {
      balanceText = 'All settled ✅';
    } else if (balance > 0) {
      balanceText = `You need to give me Rs ${balance}`;
    } else {
      balanceText = `I need to give you Rs ${Math.abs(balance)}`;
    }

    let shareText = `SHAREKHATA REPORT\n`;
    shareText += `══════════════\n`;
    // shareText += `${user.name}(I) & ${ledger.friend.name}(You)\n`;
    // shareText += `Generated on ${new Date().toLocaleDateString('en-IN')}\n\n`;

    // shareText += `CURRENT BALANCE\n`;
    // shareText += `────────────\n`;
    shareText += `${balanceText}\n\n`;

    // shareText += `SUMMARY\n`;
    // shareText += `────────────\n`;
    // shareText += `I Paid: Rs ${youPaid.toFixed(2)}\n`;
    // shareText += `I Received: Rs ${youReceived.toFixed(2)}\n`;
    // shareText += `Net: Rs ${(youPaid - youReceived).toFixed(2)}\n\n`;

    if (ledger.transactions.length > 0) {
      shareText += `TRANSACTIONS (${ledger.transactions.length})\n`;
      shareText += `────────────\n`;

      const totalTransactions = ledger.transactions.length;
      const start = Math.max(totalTransactions - 5, 0); // Ensure we don't go below 0

      for (let i = totalTransactions; i > start; i--) {
        const transaction = ledger.transactions[totalTransactions - i];
        const isCurrentUserSent = transaction.sentBy === user.mobile;
        const isCurrentUserReceived = transaction.receivedBy === user.mobile;
        const transactionNumber = i;

        const typeText = isCurrentUserSent ? `Paid` : `Received`;

        const date = new Date(transaction.timestamp).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short'
        });

        shareText += `${transactionNumber}. ${typeText} ₹${transaction.amount}`;
        shareText += ` - ${date}\n`;
        if (transaction.description) {
          shareText += `  ${transaction.description}\n`;
        }
      }

    }

    shareText += `\n💡 Track complete history\n`;
    shareText += `Visit: https://sharekhata.live/ledger/${ledgerId}`;

    return shareText;
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      const shareText = generateShareText();
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = generateShareText();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle SMS sharing
  const handleSMS = () => {
    const shareText = generateShareText();
    const encodedText = encodeURIComponent(shareText);
    // Option 1: Open SMS app without specific recipient (current behavior)
    // window.open(`sms:?body=${encodedText}`, '_self');

    // Option 2: Send to friend's mobile number directly (uncomment to use)
    const friendMobile = ledger.friend.mobile;
    window.open(`sms:${friendMobile}?body=${encodedText}`, '_self');
  };

  // Handle WhatsApp sharing
  const handleWhatsApp = () => {
    const shareText = generateShareText();
    const encodedText = encodeURIComponent(shareText);
    // Option 1: Open WhatsApp without specific recipient (current behavior)
    // window.open(`https://wa.me/?text=${encodedText}`, '_blank');

    // Option 2: Send to friend's mobile number directly (uncomment to use)
    const friendMobile = ledger.friend.mobile;
    // // Remove any non-digit characters and ensure it starts with country code
    const cleanMobile = friendMobile.replace(/\D/g, '');
    const whatsappNumber = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodedText}`, '_blank');
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

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
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

      // console.log('✅ PDF generated successfully:', fileName);
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

      {/* Share Section */}
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Share Button/Dropdown Trigger */}
          <button
            onClick={() => setShowShareSection(!showShareSection)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-xl"
          >
            <div className="flex items-center space-x-2">
              <Share2 className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-900">Notify Your Friend</span>
            </div>
            <svg
              className={`h-4 w-4 text-gray-500 transform transition-transform ${showShareSection ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Collapsible Share Options */}
          {showShareSection && (
            <div className="px-4 pb-4">
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors space-y-1"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <Copy className="h-5 w-5 text-gray-600" />
                    )}
                    <span className="text-xs font-medium text-gray-700">
                      {copied ? 'Copied!' : 'Copy'}
                    </span>
                  </button>
                  <button
                    onClick={handleSMS}
                    className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors space-y-1"
                  >
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    <span className="text-xs font-medium text-gray-700">SMS</span>
                  </button>
                  <button
                    onClick={handleWhatsApp}
                    className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:bg-green-50 transition-colors space-y-1"
                  >
                    <svg
                      className="h-5 w-5 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.106" />
                    </svg>
                    <span className="text-xs font-medium text-gray-700">WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4">
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
              <div className="text-2xl font-bold text-red-600 flex items-center justify-center">
                <IndianRupee size={20} /> {(() => {
                  // Debug: Log all transaction data first
                  // console.log('🔍 SUMMARY DEBUG - All transactions:', ledger.transactions);
                  // console.log('🔍 SUMMARY DEBUG - Current user mobile:', user?.mobile);
                  // console.log('🔍 SUMMARY DEBUG - User object:', user);

                  // FIXED LOGIC: You paid = you are the sender (sentBy matches your mobile)
                  const youPaid = ledger.transactions
                    .filter(t => {
                      const isMatch = t.sentBy === user?.mobile;
                      // console.log(`🔍 Transaction filter check - You Paid:`, {
                      //   transactionId: t.id,
                      //   type: t.type,
                      //   sentBy: t.sentBy,
                      //   receivedBy: t.receivedBy,
                      //   userMobile: user?.mobile,
                      //   isMatch: isMatch,
                      //   amount: t.amount
                      // });
                      return isMatch;
                    })
                    .reduce((sum, t) => sum + t.amount, 0);

                  // console.log('🔍 Summary - You Paid calculation:', {
                  //   userMobile: user?.mobile,
                  //   totalTransactions: ledger.transactions.length,
                  //   matchingTransactions: ledger.transactions.filter(t => t.sentBy === user?.mobile),
                  //   total: youPaid
                  // });
                  return youPaid.toFixed(2);
                })()}
              </div>
              <div className="text-sm text-gray-600">You Paid</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 flex items-center justify-center">
                <IndianRupee size={20} /> {(() => {
                  // FIXED LOGIC: You received = you are the receiver (receivedBy matches your mobile)
                  const youReceived = ledger.transactions
                    .filter(t => {
                      const isMatch = t.receivedBy === user?.mobile;
                      // console.log(`🔍 Transaction filter check - You Received:`, {
                      //   transactionId: t.id,
                      //   type: t.type,
                      //   sentBy: t.sentBy,
                      //   receivedBy: t.receivedBy,
                      //   userMobile: user?.mobile,
                      //   isMatch: isMatch,
                      //   amount: t.amount
                      // });
                      return isMatch;
                    })
                    .reduce((sum, t) => sum + t.amount, 0);

                  // console.log('🔍 Summary - You Received calculation:', {
                  //   userMobile: user?.mobile,
                  //   totalTransactions: ledger.transactions.length,
                  //   matchingTransactions: ledger.transactions.filter(t => t.receivedBy === user?.mobile),
                  //   total: youReceived
                  // });
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
            <Minus className="h-5 w-5" />
            <span>I Paid</span>
          </button>

          <button
            onClick={() => openTransactionModal('received')}
            className="bg-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>I Received</span>
          </button>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transactions <span className='text-gray-400'>({ledger.transactions.length})</span></h3>
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

          {ledger.transactions.length === 0 ? (
            <div className="text-center py-8">
              <IndianRupee className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No transactions yet</p>
              <p className="text-sm text-gray-400">Start by adding your first expense</p>
            </div>
          ) : (
            <div className="space-y-3">

              {ledger.transactions.map((transaction, index) => {
                const transactionNumber = ledger.transactions.length - index;
                const isCurrentUserSent = transaction.sentBy === user.mobile;
                const isCurrentUserReceived = transaction.receivedBy === user.mobile;
                const isCurrentUserInvolved = isCurrentUserSent || isCurrentUserReceived;
                const isMoneyReceived = isCurrentUserReceived;
                const isMoneySent = isCurrentUserSent;

                // Check if current user can edit/delete (only if they added the transaction)
                const canEditDelete = transaction.addedBy.id === user?.id;

                return (
                  <div
                    key={transaction.id}
                    className={`p-4 rounded-lg border ${transaction.addedBy.id === user?.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-yellow-50 border-yellow-200'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs font-semibold">
                          {transactionNumber}
                        </div>

                        <span className="font-medium text-gray-900">
                          {isCurrentUserInvolved
                            ? (isCurrentUserSent ? 'You paid' : 'You received')
                            : (isCurrentUserReceived ? `${transaction.addedBy.name} paid` : `${transaction.addedBy.name} received`)
                          }
                        </span>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMoneyReceived
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                          }`}>
                          {isMoneyReceived ? (
                            <Plus className="h-4 w-4" />
                          ) : (
                            <Minus className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold flex items-center justify-between ${isMoneyReceived
                          ? ' text-green-600'
                          : ' text-red-600'
                          }`}>
                          <IndianRupee size={15} className='text-gray-500' /> {transaction.amount}
                        </span>
                      </div>
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
                      {/* Edit and Delete buttons - only show if user added this transaction */}
                        {canEditDelete && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => openTransactionModal(transaction.type, transaction)}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                              title="Edit transaction"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                              title="Delete transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
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
              {isEditMode
                ? `Edit Transaction`
                : (transactionType === 'added' ? 'I Paid' : 'I Received')
              }
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
                  {submitting
                    ? (isEditMode ? 'Updating...' : 'Adding...')
                    : (isEditMode ? 'Update Transaction' : 'Add Transaction')
                  }
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