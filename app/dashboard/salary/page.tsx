'use client'

import type { SalaryPayment, Worker } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function SalaryPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [salaries, setSalaries] = useState<(SalaryPayment & { worker_name: string })[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchWorkers()
    fetchSalaries()
  }, [selectedMonth, selectedYear])

  const fetchWorkers = async () => {
    const { data } = await supabase
      .from('workers')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (data) setWorkers(data)
    setLoading(false)
  }

  const fetchSalaries = async () => {
    const { data } = await supabase
      .from('salary_payments')
      .select(`
        *,
        workers (name)
      `)
      .eq('month', selectedMonth)
      .eq('year', selectedYear)

    if (data) {
      const formatted = data.map(item => ({
        ...item,
        worker_name: (item.workers as any)?.name || 'Unknown'
      }))
      setSalaries(formatted)
    }
  }

  const calculateAdvanceDeductions = async (workerId: string) => {
    const { data } = await supabase
      .from('advance_repayments')
      .select('*')
      .eq('month', selectedMonth)
      .eq('year', selectedYear)
      .eq('is_paid', false)
      .match({
        advance_id: await supabase
          .from('advances')
          .select('id')
          .eq('worker_id', workerId)
      })

    // Get advance repayments for this worker this month
    const { data: repayments } = await supabase
      .from('advance_repayments')
      .select(`
        *,
        advances!inner (worker_id)
      `)
      .eq('month', selectedMonth)
      .eq('year', selectedYear)
      .eq('is_paid', false)

    if (repayments) {
      const workerRepayments = repayments.filter(
        (r: any) => r.advances.worker_id === workerId
      )
      return workerRepayments.reduce((sum, r) => sum + Number(r.deduction_amount), 0)
    }
    return 0
  }

  const processAllSalaries = async () => {
    if (!confirm(`Process salaries for all ${workers.length} workers for ${getMonthName(selectedMonth)} ${selectedYear}?`)) {
      return
    }

    setProcessing(true)

    try {
      for (const worker of workers) {
        // Check if salary already processed
        const { data: existing } = await supabase
          .from('salary_payments')
          .select('id')
          .eq('worker_id', worker.id)
          .eq('month', selectedMonth)
          .eq('year', selectedYear)
          .single()

        if (existing) continue // Skip if already processed

        // Calculate advance deductions
        const advanceDeduction = await calculateAdvanceDeductions(worker.id)

        // Insert salary record
        const { error } = await supabase
          .from('salary_payments')
          .insert({
            worker_id: worker.id,
            month: selectedMonth,
            year: selectedYear,
            base_salary: worker.base_salary,
            hul_direct_payment: worker.role === 'worker' ? 3000 : 0,
            advance_deductions: advanceDeduction,
            other_deductions: 0,
            payment_status: 'pending'
          })

        if (error) {
          console.error('Error processing salary for', worker.name, error)
        }
      }

      alert('Salaries processed successfully!')
      fetchSalaries()
    } catch (error) {
      alert('Error processing salaries')
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  const markAsPaid = async (salaryId: string, workerId: string) => {
    const today = new Date().toISOString().split('T')[0]

    // Update salary payment
    const { error: salaryError } = await supabase
      .from('salary_payments')
      .update({
        payment_status: 'paid',
        payment_date: today
      })
      .eq('id', salaryId)

    if (salaryError) {
      alert('Error marking as paid')
      return
    }

    // Mark advance repayments as paid
    const { data: repayments } = await supabase
      .from('advance_repayments')
      .select(`
        id,
        advances!inner (worker_id)
      `)
      .eq('month', selectedMonth)
      .eq('year', selectedYear)
      .eq('is_paid', false)

    if (repayments) {
      const workerRepayments = repayments.filter(
        (r: any) => r.advances.worker_id === workerId
      )

      for (const repayment of workerRepayments) {
        await supabase
          .from('advance_repayments')
          .update({ is_paid: true, paid_date: today })
          .eq('id', repayment.id)
      }
    }

    alert('Marked as paid!')
    fetchSalaries()
  }

  const getMonthName = (month: number) => {
    return new Date(2025, month - 1).toLocaleString('default', { month: 'long' })
  }

  const totalBaseSalary = salaries.reduce((sum, s) => sum + Number(s.base_salary), 0)
  const totalDeductions = salaries.reduce((sum, s) => sum + Number(s.advance_deductions), 0)
  const totalNetSalary = salaries.reduce((sum, s) => sum + Number(s.net_salary), 0)
  const totalHulDirect = salaries.reduce((sum, s) => sum + Number(s.hul_direct_payment), 0)

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Salary Processing</h1>
            <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-700">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month/Year Selector */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{getMonthName(m)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={processAllSalaries}
                disabled={processing || salaries.length > 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold"
              >
                {processing ? 'Processing...' : salaries.length > 0 ? 'Already Processed' : 'Process All Salaries'}
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {salaries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-blue-50 p-6 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Total Base Salary</p>
              <p className="text-2xl font-bold text-blue-600">₹{totalBaseSalary.toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-orange-50 p-6 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Total Deductions</p>
              <p className="text-2xl font-bold text-orange-600">₹{totalDeductions.toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-green-50 p-6 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Net Payable</p>
              <p className="text-2xl font-bold text-green-600">₹{totalNetSalary.toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-purple-50 p-6 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">HUL Direct Payment</p>
              <p className="text-2xl font-bold text-purple-600">₹{totalHulDirect.toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-500 mt-1">Paid by HUL to workers</p>
            </div>
          </div>
        )}

        {/* Salary List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold">
              Salary for {getMonthName(selectedMonth)} {selectedYear} ({salaries.length} workers)
            </h2>
          </div>

          {salaries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-4">No salaries processed for this month yet.</p>
              <p className="text-sm">Click "Process All Salaries" button above to generate salary slips.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Worker</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Base Salary</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">HUL Direct</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Advance Deduction</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Net Salary</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salaries.map((salary) => (
                    <tr key={salary.id} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium">{salary.worker_name}</td>
                      <td className="py-3 px-4 text-sm">₹{Number(salary.base_salary).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-sm text-purple-600">₹{Number(salary.hul_direct_payment).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-sm text-orange-600">
                        -₹{Number(salary.advance_deductions).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-sm font-bold text-green-600">
                        ₹{Number(salary.net_salary).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          salary.payment_status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {salary.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {salary.payment_status === 'pending' && (
                          <button
                            onClick={() => markAsPaid(salary.id, salary.worker_id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold"
                          >
                            Mark Paid
                          </button>
                        )}
                        {salary.payment_status === 'paid' && salary.payment_date && (
                          <span className="text-xs text-gray-500">
                            Paid: {new Date(salary.payment_date).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 How It Works:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Base Salary:</strong> ₹20,000 for workers, ₹40,000 for supervisor</li>
            <li>• <strong>HUL Direct Payment:</strong> ₹3,000 paid directly to workers by HUL (not deducted from your payment)</li>
            <li>• <strong>Advance Deductions:</strong> Automatically calculated based on repayment schedule</li>
            <li>• <strong>Net Salary:</strong> Base Salary - Advance Deductions = Amount you pay the worker</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
