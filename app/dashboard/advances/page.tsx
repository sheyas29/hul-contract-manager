'use client'

import type { Advance, Worker } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function AdvancesPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [advances, setAdvances] = useState<(Advance & { worker_name: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showRepaymentForm, setShowRepaymentForm] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    worker_id: '',
    advance_amount: '',
    advance_date: format(new Date(), 'yyyy-MM-dd'),
    reason: ''
  })
  const [repaymentSchedule, setRepaymentSchedule] = useState<{
    month: number
    year: number
    amount: string
  }[]>([])

  useEffect(() => {
    fetchWorkers()
    fetchAdvances()
  }, [])

  const fetchWorkers = async () => {
    const { data } = await supabase
      .from('workers')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (data) setWorkers(data)
    setLoading(false)
  }

  const fetchAdvances = async () => {
    const { data } = await supabase
      .from('advances')
      .select(`
        *,
        workers (name)
      `)
      .order('advance_date', { ascending: false })

    if (data) {
      const formatted = data.map(item => ({
        ...item,
        worker_name: (item.workers as any)?.name || 'Unknown'
      }))
      setAdvances(formatted)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { error } = await supabase
      .from('advances')
      .insert([{
        worker_id: formData.worker_id,
        advance_amount: parseFloat(formData.advance_amount),
        advance_date: formData.advance_date,
        reason: formData.reason || null,
        status: 'pending'
      }])

    if (!error) {
      alert('Advance added successfully! Now create repayment schedule.')
      setShowAddForm(false)
      setFormData({ worker_id: '', advance_amount: '', advance_date: format(new Date(), 'yyyy-MM-dd'), reason: '' })
      fetchAdvances()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const openRepaymentModal = (advanceId: string) => {
    const now = new Date()
    const nextMonth = now.getMonth() + 2 // Next month
    const year = now.getFullYear()

    // Initialize with one empty row
    setRepaymentSchedule([{
      month: nextMonth > 12 ? nextMonth - 12 : nextMonth,
      year: nextMonth > 12 ? year + 1 : year,
      amount: ''
    }])
    setShowRepaymentForm(advanceId)
  }

  const addRepaymentMonth = () => {
    const lastItem = repaymentSchedule[repaymentSchedule.length - 1]
    let nextMonth = lastItem.month + 1
    let nextYear = lastItem.year

    if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    }

    setRepaymentSchedule([
      ...repaymentSchedule,
      {
        month: nextMonth,
        year: nextYear,
        amount: ''
      }
    ])
  }

  const removeRepaymentMonth = (index: number) => {
    setRepaymentSchedule(repaymentSchedule.filter((_, i) => i !== index))
  }

  const updateRepaymentAmount = (index: number, amount: string) => {
    const updated = [...repaymentSchedule]
    updated[index].amount = amount
    setRepaymentSchedule(updated)
  }

  const saveRepaymentSchedule = async (advanceId: string) => {
    const totalScheduled = repaymentSchedule.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0)
    const advance = advances.find(a => a.id === advanceId)

    if (!advance) return

    if (Math.abs(totalScheduled - advance.advance_amount) > 0.01) {
      alert(`Total scheduled (₹${totalScheduled}) must equal advance amount (₹${advance.advance_amount})`)
      return
    }

    const repayments = repaymentSchedule.map(item => ({
      advance_id: advanceId,
      month: item.month,
      year: item.year,
      deduction_amount: parseFloat(item.amount)
    }))

    const { error } = await supabase
      .from('advance_repayments')
      .insert(repayments)

    if (!error) {
      // Update advance status to 'repaying'
      await supabase
        .from('advances')
        .update({ status: 'repaying' })
        .eq('id', advanceId)

      alert('Repayment schedule saved successfully!')
      setShowRepaymentForm(null)
      setRepaymentSchedule([])
      fetchAdvances()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const totalPending = advances
    .filter(a => a.status !== 'completed')
    .reduce((sum, a) => sum + Number(a.balance), 0)

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>
  }

  const currentAdvance = advances.find(a => a.id === showRepaymentForm)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Advance Payments</h1>
            <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-700">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-orange-50 p-6 rounded-xl">
            <p className="text-sm text-gray-900 font-medium mb-1">
Total Pending Balance</p>
            <p className="text-3xl font-bold text-orange-600">₹{totalPending.toLocaleString('en-IN')}</p>
          </div>

          <div className="bg-blue-50 p-6 rounded-xl">
            <p className="text-sm text-gray-900 font-medium mb-1">
Active Advances</p>
            <p className="text-3xl font-bold text-blue-600">
              {advances.filter(a => a.status !== 'completed').length}
            </p>
          </div>

          <div className="bg-green-50 p-6 rounded-xl">
            <p className="text-sm text-gray-900 font-medium mb-1">
Completed Advances</p>
            <p className="text-3xl font-bold text-green-600">
              {advances.filter(a => a.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Add Advance Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            {showAddForm ? '✕ Cancel' : '+ Give Advance'}
          </button>
        </div>

        {/* Add Advance Form */}
        {showAddForm && (
          <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
            <h2 className="text-xl font-semibold mb-4">Give Advance to Worker</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Worker *</label>
                <select
                  required
                  value={formData.worker_id}
                  onChange={(e) => setFormData({...formData, worker_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Worker</option>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>{worker.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  required
                  value={formData.advance_amount}
                  onChange={(e) => setFormData({...formData, advance_amount: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.advance_date}
                  onChange={(e) => setFormData({...formData, advance_date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  Give Advance
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Advances List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold">All Advances ({advances.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Worker</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Repaid</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Balance</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {advances.map((advance) => (
                  <tr key={advance.id} className="border-t hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium">{advance.worker_name}</td>
                    <td className="py-3 px-4 text-sm">{format(new Date(advance.advance_date), 'dd MMM yyyy')}</td>
                    <td className="py-3 px-4 text-sm">₹{Number(advance.advance_amount).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-sm">₹{Number(advance.total_repaid).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-orange-600">
                      ₹{Number(advance.balance).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        advance.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : advance.status === 'repaying'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {advance.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {advance.status === 'pending' && (
                        <button
                          onClick={() => openRepaymentModal(advance.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold"
                        >
                          Set Schedule
                        </button>
                      )}
                      {advance.reason && (
                        <p className="text-xs text-gray-500 mt-1">{advance.reason}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Repayment Schedule Modal */}
        {showRepaymentForm && currentAdvance && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-2">Create Repayment Schedule</h2>
              <p className="text-sm text-gray-600 mb-4">
                Worker: <strong>{currentAdvance.worker_name}</strong>
              </p>

              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Advance Amount</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ₹{currentAdvance.advance_amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Scheduled</p>
                    <p className={`text-2xl font-bold ${
                      Math.abs(repaymentSchedule.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0) - currentAdvance.advance_amount) < 0.01
                        ? 'text-green-600'
                        : 'text-orange-600'
                    }`}>
                      ₹{repaymentSchedule.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-3">Repayment Schedule</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Example: ₹3000 advance can be: ₹1000+₹1000+₹1000 (3 months) OR ₹1500+₹1500 (2 months)
                </p>

                {repaymentSchedule.map((item, index) => (
                  <div key={index} className="grid grid-cols-4 gap-3 mb-3 items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
                      <select
                        value={item.month}
                        onChange={(e) => {
                          const updated = [...repaymentSchedule]
                          updated[index].month = parseInt(e.target.value)
                          setRepaymentSchedule(updated)
                        }}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>
                            {new Date(2025, m - 1).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                      <input
                        type="number"
                        value={item.year}
                        onChange={(e) => {
                          const updated = [...repaymentSchedule]
                          updated[index].year = parseInt(e.target.value)
                          setRepaymentSchedule(updated)
                        }}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        min="2025"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Deduction Amount (₹)</label>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateRepaymentAmount(index, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <button
                        onClick={() => removeRepaymentMonth(index)}
                        className="w-full bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-semibold"
                        disabled={repaymentSchedule.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t">
                <button
                  onClick={addRepaymentMonth}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  + Add Another Month
                </button>
                <button
                  onClick={() => saveRepaymentSchedule(showRepaymentForm)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex-1"
                >
                  Save Schedule
                </button>
                <button
                  onClick={() => {
                    setShowRepaymentForm(null)
                    setRepaymentSchedule([])
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-3 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
