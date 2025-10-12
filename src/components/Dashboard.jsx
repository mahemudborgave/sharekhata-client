import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLedger } from '../contexts/LedgerContext'; // Import the context
import { Plus, User, ArrowRight, IndianRupee, Download, EllipsisVertical, X } from 'lucide-react';
import Header from './Header';
import jsPDF from 'jspdf';
import { Wallet } from 'lucide-react';

const Dashboard = () => {
  // Use context instead of local state
  const { ledgers, personalExpenseSummary, loading, error, fetchLedgers } = useLedger();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Fetch ledgers, but it will use cache if available
    fetchLedgers();
  }, [fetchLedgers]);

  // Add refresh indicator for background updates
  const isRefreshing = loading && ledgers.length > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Calculate balance based on frontend transaction data
  const calculateFrontendBalance = (transactions) => {
    if (!transactions || !Array.isArray(transactions)) {
      return 0;
    }

    let userPaid = 0;
    let userReceived = 0;

    transactions.forEach((transaction) => {
      const currentUserMobile = user?.mobile;
      const isCurrentUserSent = transaction.sentBy === currentUserMobile;
      const isCurrentUserReceived = transaction.receivedBy === currentUserMobile;

      if (isCurrentUserSent) {
        userPaid += transaction.amount;
      } else if (isCurrentUserReceived) {
        userReceived += transaction.amount;
      }
    });

    return userPaid - userReceived;
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

  const generateAllFriendsPDF = (ledgers) => {
    if (!ledgers || ledgers.length === 0) {
      alert('No friends data to export');
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('ShareKhata - Friends Summary Report', 105, 15, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Your Name: ${user.name}`, 20, 25);
      doc.text(`Your Mobile: ${user.mobile}`, 20, 31);
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 20, 37);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Friends Summary', 20, 50);

      let yPosition = 60;
      const lineHeight = 8;

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

      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text('Generated by ShareKhata - Split expenses with friends easily', 105, pageHeight - 8, { align: 'center' });

      const fileName = `ShareKhata_Friends_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      console.log('PDF generated successfully:', fileName);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (loading && ledgers.length === 0) {
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
    <div className="min-h-screen bg-blue-100">
      {/* Show subtle loading indicator when refreshing in background */}
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-center py-1 text-sm z-50">
          Updating...
        </div>
      )}
      
      <div className='bg-[#111D6D] pb-8 rounded-b-3xl'>
        <Header />
        <div
          onClick={() => navigate('/personal-expense')}
          className="bg-gradient-to-br from-blue-300 to-blue-600 text-white p-5 m-5 my-0 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-lg p-2">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Personal Expenses</h3>
                <p className="text-purple-100 text-xs">Track your spending</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-lg p-2.5">
              <p className="text-purple-100 text-xs mb-1">Today</p>
              <p className="text-base font-bold">₹{personalExpenseSummary.today}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2.5">
              <p className="text-purple-100 text-xs mb-1">Yesterday</p>
              <p className="text-base font-bold">₹{personalExpenseSummary.yesterday}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2.5">
              <p className="text-purple-100 text-xs mb-1">Week</p>
              <p className="text-base font-bold">₹{personalExpenseSummary.lastWeek}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-gray-900">Your Friends</h2>

            <div className='flex items-center'>
              <button
                onClick={() => navigate('/add-friend')}
                className="text-blue-600 mr-2 py-1 px-5 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Add Friend</span>
              </button>

              <div>
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className="rounded-sm w-7 h-7 p-1 flex items-center justify-center"
                  >
                    {dropdownOpen ? (
                      <X className="w-5 h-5 text-blue-500" />
                    ) : (
                      <EllipsisVertical className="w-5 h-5 text-blue-500" />
                    )}
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <button
                        onClick={() => generateAllFriendsPDF(ledgers)}
                        disabled={ledgers.length === 0}
                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Export PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-400 to-blue-200 text-white p-6 rounded-2xl flex items-center justify-between w-full mb-4">
            <div>
              <p className="text-gray-100/60 text-sm">Net Balance</p>
              <h1 className="text-4xl font-bold flex items-center justify-center">
                <IndianRupee /> {(ledgers.reduce((acc, ledger) => {
                  const balance = ledger.transactions && ledger.transactions.length > 0
                    ? calculateFrontendBalance(ledger.transactions)
                    : ledger.balance;
                  return acc + balance;
                }, 0))}
              </h1>
            </div>

            <div className="flex flex-col space-y-1">
              <button className="bg-white/40 text-green-600 font-bold px-8 py-2 rounded-lg text-sm">
                You Get Rs{" "}
                {ledgers.reduce((sum, ledger) => {
                  const balance = ledger.transactions && ledger.transactions.length > 0
                    ? calculateFrontendBalance(ledger.transactions)
                    : ledger.balance;
                  return balance > 0 ? sum + balance : sum;
                }, 0)}
              </button>
              <button className="bg-white/40 text-red-500 font-bold px-8 py-2 rounded-lg text-sm">
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
              const calculatedBalance = ledger.transactions && ledger.transactions.length > 0
                ? calculateFrontendBalance(ledger.transactions)
                : ledger.balance;

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

        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm">
            ShareKhata - Split expenses with friends easily
          </p>
          <div className='text-center mb-2'>
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