'use client'

import AdminGuard from '@/components/AdminGuard'
import { logActivity } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, CheckCircle, History, Plus, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type Advance = {
  id: string
  worker_id: string
  worker_name?: string
  advance_amount: number
  advance_date: string
  balance: number
  status: 'pending' | 'repaying' | 'completed'
  reason: string
}

type Worker = {
  id: string
  name: string
}

export default function AdvancesPage() {
  const [advances, setAdvances] = useState<Advance[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [showRepayModal, setShowRepayModal] = useState(false)
  const [selectedAdvance, setSelectedAdvance] = useState<Advance | null>(null)

  // Forms
  const [newAdvance, setNewAdvance] = useState({
    worker_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    reason: ''
  })
  const [repayment, setRepayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch Advances with Worker details
      // Note: 'workers(name)' join syntax depends on your foreign key setup.
      // If simple join fails, we fetch separately.
      const { data: adv, error } = await supabase
        .from('advances')
        .select(`
          *,
          workers ( name )
        `)
        .order('advance_date', { ascending: false })

      if (error) throw error

      // Flatten the structure
      const formatted = adv.map((a: any) => ({
        ...a,
        worker_name: a.workers?.name || 'Unknown Worker'
      }))
      setAdvances(formatted)

      // Fetch Active Workers for dropdown
      const { data: w } = await supabase
        .from('workers')
        .select('id, name')
        .eq('status', 'active')
        .order('name')

      if (w) setWorkers(w)

    } catch (error) {
      console.error('Error fetching advances:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGiveAdvance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdvance.worker_id || !newAdvance.amount) return alert('Please select worker and amount')

    const amount = parseFloat(newAdvance.amount)

    // 1. Create Advance Record
    const { data: advData, error: advError } = await supabase
      .from('advances')
      .insert({
        worker_id: newAdvance.worker_id,
        advance_amount: amount,
        advance_date: newAdvance.date,
        reason: newAdvance.reason,
        status: 'repaying',
        balance: amount, // Start with full balance
        total_repaid: 0
      })
      .select()
      .single()

    if (advError) {
      alert('Error creating advance: ' + advError.message)
      return
    }

    // 2. AUTO-LOG to Petty Cash (Expense)
    // We assume this money comes from the Petty Cash wallet
    const workerName = workers.find(w => w.id === newAdvance.worker_id)?.name || 'Worker'
    await supabase.from('petty_cash_transactions').insert({
        type: 'expense',
        category: 'Advance',
        amount: amount,
        description: `Advance given to ${workerName}`,
        date: newAdvance.date,
        status: 'approved' // Auto-approved since Admin is doing it
    })

    await logActivity('GIVE_ADVANCE', `Given ₹${amount} advance to ${workerName}`)

    alert('Advance recorded & deducted from Petty Cash!')
    setShowAdvanceModal(false)
    setNewAdvance({ worker_id: '', amount: '', date: new Date().toISOString().split('T')[0], reason: '' })
    fetchData()
  }

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAdvance || !repayment.amount) return

    const repayAmt = parseFloat(repayment.amount)
    if (repayAmt > selectedAdvance.balance) {
        if(!confirm('Repayment amount is greater than balance. Continue?')) return;
    }

    const newBalance = selectedAdvance.balance - repayAmt
    const newStatus = newBalance <= 0 ? 'completed' : 'repaying'

    // 1. Update Advance Balance
    const { error } = await supabase
      .from('advances')
      .update({
        balance: newBalance,
        status: newStatus,
        // We ideally shouldn't rely on 'total_repaid' column if we want strict accounting,
        // but for this simple view it's fine.
      })
      .eq('id', selectedAdvance.id)

    if (error) {
        alert('Error updating balance: ' + error.message)
        return
    }

    // 2. AUTO-LOG to Petty Cash (Deposit)
    // Money comes BACK into the wallet
    await supabase.from('petty_cash_transactions').insert({
        type: 'deposit',
        category: 'Repayment',
        amount: repayAmt,
        description: `Advance repayment from ${selectedAdvance.worker_name}`,
        date: repayment.date,
        status: 'approved'
    })

    await logActivity('REPAY_ADVANCE', `Repaid ₹${repayAmt} for ${selectedAdvance.worker_name}`)

    alert('Repayment recorded & added to Petty Cash!')
    setShowRepayModal(false)
    setRepayment({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' })
    fetchData()
  }

  // Calculate Totals
  const totalOutstanding = advances.reduce((sum, a) => sum + (a.status !== 'completed' ? a.balance : 0), 0)

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">Worker Advances</h1>
                    </div>
                    <p className="text-sm text-gray-500 ml-8">Track loans, recoveries, and outstanding balances</p>
                </div>

                <button
                    onClick={() => setShowAdvanceModal(true)}
                    className="bg-orange-600 text-white px-6 py-2.5 rounded-xl hover:bg-orange-700 shadow-sm font-bold flex items-center gap-2 transition-transform active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Give New Advance
                </button>
            </div>

            {/* Stats Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100 flex items-center gap-4">
                    <div className="p-3 bg-orange-50 rounded-full text-orange-600">
                        <Wallet className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase">Total Outstanding</p>
                        <h3 className="text-3xl font-bold text-gray-900">₹{totalOutstanding.toLocaleString()}</h3>
                    </div>
                </div>
                 {/* You could add "Collected this Month" or "Given this Month" here later */}
            </div>

            {/* Advances Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Worker / Date</th>
                                <th className="px-6 py-4">Reason</th>
                                <th className="px-6 py-4 text-right">Original Amt</th>
                                <th className="px-6 py-4 text-right text-orange-600">Balance Due</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading advances...</td></tr>
                            ) : advances.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No advance records found.</td></tr>
                            ) : advances.map((adv) => (
                                <tr key={adv.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{adv.worker_name}</div>
                                        <div className="text-xs text-gray-400">{new Date(adv.advance_date).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={adv.reason}>
                                        {adv.reason || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-500">
                                        ₹{adv.advance_amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-orange-600 text-lg">
                                        ₹{adv.balance.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                            adv.status === 'completed' ? 'bg-green-100 text-green-700' :
                                            adv.balance < adv.advance_amount ? 'bg-blue-100 text-blue-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {adv.status === 'completed' ? 'Paid' : adv.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {adv.balance > 0 ? (
                                            <button
                                                onClick={() => { setSelectedAdvance(adv); setShowRepayModal(true) }}
                                                className="text-indigo-600 hover:text-indigo-900 font-medium text-sm border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                                            >
                                                Collect
                                            </button>
                                        ) : (
                                            <div className="flex items-center justify-end gap-1 text-green-600 font-bold text-sm">
                                                <CheckCircle className="w-4 h-4" /> Done
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* GIVE ADVANCE MODAL */}
            {showAdvanceModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h2 className="font-bold text-xl mb-4 text-orange-600 flex items-center gap-2">
                            <Wallet className="w-5 h-5" /> Give New Advance
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Worker</label>
                                <select
                                    className="w-full p-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                                    value={newAdvance.worker_id}
                                    onChange={e => setNewAdvance({...newAdvance, worker_id: e.target.value})}
                                >
                                    <option value="">Select a Worker...</option>
                                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Amount (₹)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-bold text-lg"
                                    value={newAdvance.amount}
                                    onChange={e => setNewAdvance({...newAdvance, amount: e.target.value})}
                                />
                                <p className="text-xs text-orange-600 mt-1">⚠️ This will be deducted from Petty Cash.</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Reason / Notes</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Medical Emergency"
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    value={newAdvance.reason}
                                    onChange={e => setNewAdvance({...newAdvance, reason: e.target.value})}
                                />
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setShowAdvanceModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200">Cancel</button>
                                <button onClick={handleGiveAdvance} className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-200">Confirm & Pay</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* REPAY MODAL */}
            {showRepayModal && selectedAdvance && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h2 className="font-bold text-xl mb-1 text-green-700 flex items-center gap-2">
                            <History className="w-5 h-5" /> Collect Repayment
                        </h2>
                        <p className="text-sm text-gray-500 mb-6">From <strong>{selectedAdvance.worker_name}</strong> • Balance: ₹{selectedAdvance.balance}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Amount Received (₹)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-bold text-lg"
                                    value={repayment.amount}
                                    onChange={e => setRepayment({...repayment, amount: e.target.value})}
                                    autoFocus
                                />
                                <p className="text-xs text-green-600 mt-1">✅ This will be added to Petty Cash.</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                                <input
                                    type="date"
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    value={repayment.date}
                                    onChange={e => setRepayment({...repayment, date: e.target.value})}
                                />
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setShowRepayModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200">Cancel</button>
                                <button onClick={handleRepay} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200">Confirm Receipt</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>
    </AdminGuard>
  )
}
