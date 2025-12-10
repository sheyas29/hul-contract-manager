'use client';

import { useAuth } from '@/components/AuthProvider';
import { logActivity } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { AlertCircle, ArrowLeft, Check, Minus, Plus, Wallet, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Types
type Transaction = {
  id: string;
  date: string;
  type: 'deposit' | 'expense';
  category: string;
  amount: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  proof_image_url: string | null;
  created_at: string;
};

export default function PettyCashPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();

  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);

    // 1. Fetch ALL transactions sorted by date
    const { data: txs, error } = await supabase
      .from('petty_cash_transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
        setLoading(false);
        return;
    }

    if (txs) {
        setTransactions(txs);

        // 2. Calculate Dynamic Balance
        // Logic:
        // + Approved Deposits (Money given by Admin)
        // - Approved Expenses (Money spent and verified)
        // - Pending Expenses (Money spent but not yet verified - cash is physically gone)
        // Rejected Expenses do NOT deduct (Cash is assumed returned or invalid)

        const calculatedBalance = txs.reduce((acc, tx) => {
            const amt = Number(tx.amount) || 0;

            if (tx.type === 'deposit') {
                // Only count deposits if they are approved (money actually received)
                // For simplicity, we assume all deposits created by Admin are 'approved'
                return tx.status === 'approved' ? acc + amt : acc;
            } else {
                // Expenses
                if (tx.status === 'rejected') {
                    return acc; // Cash restored to wallet
                } else {
                    return acc - amt; // Cash gone (Pending or Approved)
                }
            }
        }, 0);

        setBalance(calculatedBalance);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ADMIN ACTION: Add Funds
  const handleDeposit = async () => {
    if (!formData.amount || !formData.description) return alert('Please fill all fields');

    const { error } = await supabase.from('petty_cash_transactions').insert({
      type: 'deposit',
      category: 'Deposit',
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
      status: 'approved' // Deposits are auto-approved
    });

    if (error) alert('Error adding funds: ' + error.message);
    else {
      logActivity('ADD_FUNDS', `Added ₹${formData.amount} to wallet. Reason: ${formData.description}`);
      setShowDepositForm(false);
      resetForm();
      fetchData();
    }
  };

  // SUPERVISOR ACTION: Log Expense
  const handleExpense = async () => {
    if (!formData.amount || !formData.description) return alert('Please fill all fields');

    const { error } = await supabase.from('petty_cash_transactions').insert({
      type: 'expense',
      category: formData.category,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
      status: 'pending' // Expenses start as pending
    });

    if (error) alert('Error logging expense: ' + error.message);
    else {
      logActivity('EXPENSE_REQUEST', `Supervisor spent ₹${formData.amount} for ${formData.category}`);
      setShowExpenseForm(false);
      resetForm();
      fetchData();
    }
  };

  const resetForm = () => {
    setFormData({ amount: '', category: 'Food', description: '', date: new Date().toISOString().split('T')[0] });
  };

  // ADMIN ACTION: Approve/Reject
  const updateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from('petty_cash_transactions')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      logActivity(newStatus === 'approved' ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED', `Expense ID ${id} marked as ${newStatus}`);
      fetchData();
    }
  };

  if (loading) return (
     <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
     </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center gap-2">
                <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">
                    {isAdmin ? 'Cash Audit' : 'My Expenses'}
                </h1>
            </div>
            <p className="text-sm text-gray-500 ml-8">Manage petty cash and daily expenses</p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-500 mb-1 font-medium uppercase tracking-wide">Cash In-Hand</p>
            <div className="flex items-center gap-2 justify-center md:justify-start">
                <Wallet className={`w-8 h-8 ${balance < 1000 ? 'text-red-500' : 'text-green-600'}`} />
                <p className={`text-4xl font-bold ${balance < 1000 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{balance.toLocaleString()}
                </p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {/* ADMIN ONLY: Give Cash */}
            {isAdmin && (
              <button onClick={() => setShowDepositForm(true)} className="flex-1 md:flex-none bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 shadow-sm font-bold flex items-center justify-center gap-2 transition-transform active:scale-95">
                <Plus className="w-5 h-5" /> Give Cash
              </button>
            )}

            {/* EVERYONE: Log Expense */}
            <button onClick={() => setShowExpenseForm(true)} className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 shadow-sm font-bold flex items-center justify-center gap-2 transition-transform active:scale-95">
              <Minus className="w-5 h-5" /> Spend Cash
            </button>
          </div>
        </div>

        {/* MODALS */}
        {showDepositForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
              <h3 className="font-bold text-xl mb-4 text-green-700 flex items-center gap-2">
                <Plus className="w-6 h-6" /> Add Funds to Wallet
              </h3>
              <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Amount (₹)</label>
                    <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-bold text-lg" autoFocus />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Reference / Reason</label>
                    <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Weekly Cash Top-up" />
                </div>
                <div className="flex gap-3 mt-2">
                    <button onClick={() => setShowDepositForm(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200">Cancel</button>
                    <button onClick={handleDeposit} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200">Confirm Deposit</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showExpenseForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
               <h3 className="font-bold text-xl mb-4 text-indigo-700 flex items-center gap-2">
                <Minus className="w-6 h-6" /> Log New Expense
              </h3>
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Amount (₹)</label>
                        <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg" autoFocus />
                    </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                        <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                        <option value="Food">Food / Tea</option>
                        <option value="Transport">Transport / Fuel</option>
                        <option value="Medical">Medical / First Aid</option>
                        <option value="Repair">Equipment Repair</option>
                        <option value="Labor">Daily Labor Payout</option>
                        <option value="Other">Other</option>
                    </select>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                    <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Tea for 5 workers" />
                </div>

                <div className="flex gap-3 mt-2">
                    <button onClick={() => setShowExpenseForm(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200">Cancel</button>
                    <button onClick={handleExpense} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200">Save Expense</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50/50 font-bold text-gray-700 flex justify-between items-center">
            <span>Recent Activity</span>
            <span className="text-xs font-normal text-gray-500">Last 50 Transactions</span>
          </div>
          <div className="divide-y divide-gray-100">
            {transactions.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No transactions found.</div>
            ) : transactions.map((tx) => (
              <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                <div className="flex gap-3 items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      tx.type === 'deposit' ? 'bg-green-100 text-green-600' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                      {tx.type === 'deposit' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{tx.description}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {new Date(tx.date).toLocaleDateString()} • {tx.category}

                      {/* Status Badge */}
                      {tx.type === 'expense' && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide flex items-center gap-1 ${
                            tx.status === 'approved' ? 'bg-green-100 text-green-700' :
                            tx.status === 'rejected' ? 'bg-red-100 text-red-700 line-through' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {tx.status === 'pending' && <AlertCircle className="w-3 h-3" />}
                            {tx.status}
                          </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`font-bold text-lg ${
                      tx.type === 'deposit' ? 'text-green-600' :
                      tx.status === 'rejected' ? 'text-gray-400 line-through decoration-2' : 'text-gray-900'
                  }`}>
                    {tx.type === 'deposit' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                  </span>

                  {/* ADMIN ACTION BUTTONS */}
                  {isAdmin && tx.status === 'pending' && tx.type === 'expense' && (
                    <div className="flex gap-1">
                      <button onClick={() => updateStatus(tx.id, 'approved')} title="Approve" className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => updateStatus(tx.id, 'rejected')} title="Reject" className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
