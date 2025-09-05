import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Plus, User, ArrowRight, IndianRupee, Download } from 'lucide-react';
import axios from 'axios';
import Header from './Header';
import jsPDF from 'jspdf';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Dashboard = () => {
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLedgers();
  }, []);

  const fetchLedgers = async () => {
    try {
      // console.log('🔄 FETCHING LEDGERS - START');
      // console.log('📡 API URL:', `${API_BASE_URL}/ledger`);
      // console.log('👤 Current user:', user);

      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/ledger`);

      // console.log('📦 LEDGERS RESPONSE:', response.data);
      // console.log('📊 LEDGERS COUNT:', response.data.ledgers.length);
      // console.log('📋 LEDGERS DATA:', response.data.ledgers);

      // Fetch full transaction data for each ledger to calculate accurate balances
      const ledgersWithTransactions = await Promise.all(
        response.data.ledgers.map(async (ledger) => {
          try {
            // console.log(`🔄 Fetching transactions for ledger ${ledger.id}`);
            const ledgerResponse = await axios.get(`${API_BASE_URL}/ledger/${ledger.id}`);
            // console.log(`✅ Ledger ${ledger.id} transactions:`, ledgerResponse.data.ledger.transactions);
            return {
              ...ledger,
              transactions: ledgerResponse.data.ledger.transactions
            };
          } catch (error) {
            console.error(`❌ Failed to fetch transactions for ledger ${ledger.id}:`, error);
            return ledger; // Return original ledger if transaction fetch fails
          }
        })
      );

      // console.log('📦 LEDGERS WITH TRANSACTIONS:', ledgersWithTransactions);
      setLedgers(ledgersWithTransactions);
      // console.log('✅ FETCHING LEDGERS - COMPLETE');
    } catch (error) {
      console.error('❌ FETCHING LEDGERS - ERROR:', error);
      console.error('❌ Error response:', error.response?.data);
      setError('Failed to load ledgers');
    } finally {
      setLoading(false);
    }
  };

  // Calculate balance based on frontend transaction data (same logic as Ledger.jsx)
  const calculateFrontendBalance = (transactions) => {
    // Safety check: if transactions is undefined or null, return 0
    if (!transactions || !Array.isArray(transactions)) {
      // console.log('⚠️ No transactions array found, returning 0 balance');
      // console.log('⚠️ Transactions value:', transactions);
      // console.log('⚠️ Transactions type:', typeof transactions);
      return 0;
    }

    let userPaid = 0;
    let userReceived = 0;

    // console.log('=== DASHBOARD BALANCE CALCULATION START ===');
    // console.log('Total transactions:', transactions.length);
    // console.log('🔍 Current user data:', user);
    // console.log('🔍 User mobile:', user?.mobile);
    // console.log('🔍 All transactions data:', transactions);

    transactions.forEach((transaction, index) => {
      // console.log(`🔍 Processing transaction ${index + 1}:`, transaction);

      // Check if this transaction involves the current user using mobile numbers
      const currentUserMobile = user?.mobile;
      const isCurrentUserSent = transaction.sentBy === currentUserMobile;
      const isCurrentUserReceived = transaction.receivedBy === currentUserMobile;

      // console.log(`🔍 Transaction ${index + 1} analysis:`, {
      //   transactionId: transaction.id,
      //   amount: transaction.amount,
      //   sentBy: transaction.sentBy,
      //   receivedBy: transaction.receivedBy,
      //   currentUserMobile,
      //   isCurrentUserSent,
      //   isCurrentUserReceived,
      //   sentByMatch: transaction.sentBy === currentUserMobile,
      //   receivedByMatch: transaction.receivedBy === currentUserMobile
      // });

      if (isCurrentUserSent) {
        // You sent money to someone
        userPaid += transaction.amount;
        // console.log(`✅ You sent: +${transaction.amount}, Total sent: ${userPaid}`);
      } else if (isCurrentUserReceived) {
        // You received money from someone
        userReceived += transaction.amount;
        // console.log(`✅ You received: +${transaction.amount}, Total received: ${userReceived}`);
      } else {
        // console.log(`⚠️ Transaction ${index + 1} doesn't involve current user directly`);
      }
    });

    // Calculate balance: positive means you get money, negative means you owe money
    const balance = userPaid - userReceived;

    // console.log('=== DASHBOARD CALCULATION SUMMARY ===');
    // console.log(`You paid: ₹${userPaid}`);
    // console.log(`You received: ₹${userReceived}`);
    // console.log(`Final balance: ₹${userPaid} - ₹${userReceived} = ₹${balance}`);
    if (balance > 0) {
      // console.log(`🎯 RESULT: You get ₹${balance} from friend`);
    } else if (balance < 0) {
      // console.log(`🎯 RESULT: You need to give ₹${Math.abs(balance)} to friend`);
    } else {
      // console.log(`🎯 RESULT: All settled!`);
    }
    // console.log('=== DASHBOARD BALANCE CALCULATION END ===');

    return balance;
  };



  const formatBalance = (balance) => {
    if (balance === 0) return 'All settled';
    if (balance > 0) return `You will get Rs ${balance}`;
    return `You need to give Rs ${Math.abs(balance)}`;
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

  // Generate PDF export of all friends summary
  const generateAllFriendsPDF = (ledgers) => {
    if (!ledgers || ledgers.length === 0) {
      alert('No friends data to export');
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');

      // Add header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('ShareKhata - Friends Summary Report', 105, 15, { align: 'center' });

      // Add user details
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Your Name: ${user.name}`, 20, 25);
      doc.text(`Your Mobile: ${user.mobile}`, 20, 31);
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 20, 37);

      // Add summary section
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Friends Summary', 20, 50);

      let yPosition = 60;
      const lineHeight = 8;

      // Table header
      doc.setFillColor(59, 130, 246);
      doc.rect(20, yPosition - 4, 170, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');

      doc.text('Friend Name', 25, yPosition);
      doc.text('Mobile', 70, yPosition);
      doc.text('Balance Status', 120, yPosition);
      doc.text('Amount', 160, yPosition);

      yPosition += 12;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      // Add each friend's data
      ledgers.forEach((ledger, index) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 15;
        }

        const calculatedBalance = ledger.transactions && ledger.transactions.length > 0
          ? calculateFrontendBalance(ledger.transactions)
          : ledger.balance;

        let balanceText = '';
        let amountText = '';
        if (calculatedBalance === 0) {
          balanceText = 'All settled';
          amountText = 'Rs 0';
        } else if (calculatedBalance > 0) {
          balanceText = 'You get';
          amountText = `Rs ${calculatedBalance}`;
        } else {
          balanceText = 'You give';
          amountText = `Rs ${Math.abs(calculatedBalance)}`;
        }

        doc.text(ledger.friend.name, 25, yPosition);
        doc.text(ledger.friend.mobile, 70, yPosition);
        doc.text(balanceText, 120, yPosition);
        doc.text(amountText, 160, yPosition);

        yPosition += lineHeight;

        if ((index + 1) % 5 === 0) {
          doc.setDrawColor(200, 200, 200);
          doc.line(20, yPosition - 2, 190, yPosition - 2);
          yPosition += 2;
        }
      });

      // Add totals
      yPosition += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Summary Totals:', 20, yPosition);
      yPosition += 8;

      const totalToGet = ledgers.reduce((sum, ledger) => {
        const balance = ledger.transactions && ledger.transactions.length > 0
          ? calculateFrontendBalance(ledger.transactions)
          : ledger.balance;
        return balance > 0 ? sum + balance : sum;
      }, 0);

      const totalToGive = ledgers.reduce((sum, ledger) => {
        const balance = ledger.transactions && ledger.transactions.length > 0
          ? calculateFrontendBalance(ledger.transactions)
          : ledger.balance;
        return balance < 0 ? sum + Math.abs(balance) : sum;
      }, 0);

      doc.setFont('helvetica', 'normal');
      doc.text(`Total you will get: Rs ${totalToGet.toFixed(2)}`, 25, yPosition);
      yPosition += 6;
      doc.text(`Total you need to give: Rs ${totalToGive.toFixed(2)}`, 25, yPosition);
      yPosition += 6;
      doc.text(`Net balance: Rs ${(totalToGet - totalToGive).toFixed(2)}`, 25, yPosition);

      // Add footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text('Generated by ShareKhata - Split expenses with friends easily', 105, pageHeight - 8, { align: 'center' });

      // Save the PDF
      const fileName = `ShareKhata_Friends_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      console.log('PDF generated successfully:', fileName);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
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
    <div className="min-h-screen bg-blue-50">
      <Header />
      {/* Header */}
      {/* <div className="bg-blue-400 shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getAvatar(user)}
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Hello, {user.name}</h1>
                <p className="text-sm text-white">{user.mobile}</p>
              </div>
            </div>

          </div>
        </div>
      </div> */}

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-yellow-900 text-white p-6 rounded-2xl flex items-center justify-between w-full mb-4">
          {/* Left Section */}
          <div>
            <p className="text-gray-100/50 text-sm">Net Balance</p>
            <h1 className="text-4xl font-bold flex items-center justify-center">
              <IndianRupee /> {(ledgers.reduce((acc, ledger) => {
                const balance = ledger.transactions && ledger.transactions.length > 0
                  ? calculateFrontendBalance(ledger.transactions)
                  : ledger.balance;
                return acc + balance;
              }, 0))}
            </h1>
          </div>

          {/* Right Section */}
          <div className="flex flex-col space-y-1">
            <button className="bg-yellow-950/90 text-green-400 font-bold px-8 py-2 rounded-lg text-sm">
              You Get Rs{" "}
              {ledgers.reduce((sum, ledger) => {
                const balance = ledger.transactions && ledger.transactions.length > 0
                  ? calculateFrontendBalance(ledger.transactions)
                  : ledger.balance;
                return balance > 0 ? sum + balance : sum;
              }, 0)}
            </button>
            <button className="bg-yellow-950/90 text-red-300   font-bold px-8 py-2 rounded-lg text-sm">
              You Give Rs{" "}
              {ledgers.reduce((sum, ledger) => {
                const balance = ledger.transactions && ledger.transactions.length > 0
                  ? calculateFrontendBalance(ledger.transactions)
                  : ledger.balance;
                return balance < 0 ? sum + Math.abs(balance) : sum;
              }, 0)}
            </button>
          </div>
        </div>

        <div className='text-center mb-4'>
          <span className='underline-0'>💡</span>
          <a
            href="https://drive.google.com/file/d/1k9SQoKd1uR6iWtdJlgjM7p0bYJgmbLL0/view?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-yellow-700 text-base underline"
          >
            See how to use Sharekhata
          </a> 
        </div>

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Your Friends</h2>
            <button
              onClick={() => generateAllFriendsPDF(ledgers)}
              disabled={ledgers.length === 0}
              className="flex items-center space-x-2 text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export all friends summary as PDF"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm font-medium">Export PDF</span>
            </button>
          </div>

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
            ledgers.map((ledger) => {
              // Debug logging to see what data we're working with
              // console.log('🔍 LEDGER DEBUG:', {
              //   ledgerId: ledger.id,
              //   friendName: ledger.friend.name,
              //   friendMobile: ledger.friend.mobile,
              //   serverBalance: ledger.balance,
              //   hasTransactions: !!ledger.transactions,
              //   transactionsType: typeof ledger.transactions,
              //   transactionsLength: ledger.transactions?.length,
              //   firstTransaction: ledger.transactions?.[0],
              //   allTransactions: ledger.transactions
              // });

              // Calculate the correct balance using the same logic as Ledger page
              // Now we should always have transactions data for accurate calculation
              const calculatedBalance = ledger.transactions && ledger.transactions.length > 0
                ? calculateFrontendBalance(ledger.transactions)
                : ledger.balance;

              // console.log('💰 BALANCE CALCULATION RESULT:', {
              //   ledgerId: ledger.id,
              //   calculatedBalance,
              //   serverBalance: ledger.balance,
              //   match: calculatedBalance === ledger.balance,
              //   usedServerBalance: !ledger.transactions || ledger.transactions.length === 0,
              //   transactionCount: ledger.transactions?.length || 0
              // });

              return (
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

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Balance</span>
                      <span className={`font-semibold ${getBalanceColor(calculatedBalance)}`}>
                        {formatBalance(calculatedBalance)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-gray-600">Transactions</span>
                      <span className="text-sm text-gray-500">{ledger.transactionCount || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm">
            ShareKhata - Split expenses with friends easily
          </p>
          <a
            href="https://forms.gle/mWg7EUnTzexXm8Kp6"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 text-sm underline"
          >
            Give Feedback
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 