'use client'

import { logActivity } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export default function MonthEndChecklist() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checks, setChecks] = useState<any>(null)

  // State for manual cash count
  const [physicalCash, setPhysicalCash] = useState('')
  const [cashDifference, setCashDifference] = useState<number | null>(null)

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      const startString = `${year}-${String(month).padStart(2, '0')}-01`
      const endMonth = month === 12 ? 1 : month + 1
      const endYear = month === 12 ? year + 1 : year
      const endString = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

      // 1. Check for Missing Days (Days with 0 tons recorded)
      const { data: tonsData } = await supabase
        .from('daily_tons')
        .select('date')
        .gte('date', startString)
        .lt('date', endString)

      // Get all unique dates recorded
      const recordedDates = new Set(tonsData?.map(d => d.date))
      const daysInMonth = new Date(year, month, 0).getDate()
      const missingDates = []

      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        if (!recordedDates.has(dateStr)) {
          // Check if it's a Sunday (0 is Sunday)
          const isSunday = new Date(dateStr).getDay() === 0
          missingDates.push({ date: dateStr, isSunday })
        }
      }

      // 2. Check for Pending Expenses
      const { count: pendingExpenses } = await supabase
        .from('petty_cash_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // 3. Get System Wallet Balance
      const { data: wallet } = await supabase.from('supervisor_wallet').select('balance').single()

      setChecks({
        missingDates,
        pendingExpenses: pendingExpenses || 0,
        systemCash: wallet?.balance || 0
      })

    } catch (error) {
      console.error(error)
      alert('Error running diagnostics')
    } finally {
      setLoading(false)
    }
  }

  const handleCashReconcile = () => {
    if (!checks) return
    const actual = parseFloat(physicalCash) || 0
    setCashDifference(actual - checks.systemCash)
  }

  const handleFinalize = async () => {
    if (cashDifference !== 0) {
      const confirm = window.confirm(`There is a cash discrepancy of ₹${cashDifference}. Do you still want to finalize?`)
      if (!confirm) return
    }

    await logActivity('MONTH_CLOSE', `Month ${month}/${year} finalized. Cash Variance: ₹${cashDifference}`)
    alert('Month closed successfully! Timestamp recorded in Audit Logs.')
    setIsOpen(false)
  }

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); runDiagnostics(); }}
        className="bg-indigo-900 text-white px-4 py-2 rounded-lg hover:bg-indigo-800 shadow-sm flex items-center gap-2 text-sm font-medium"
      >
        <span>🛡️</span> Month-End Check
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">Month-End Reconciliation</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div className="p-6 space-y-8">

              {/* DATE SELECTOR */}
              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100 items-center">
                 <span className="text-blue-800 font-medium">Checking Period:</span>
                 <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="bg-white border rounded px-2 py-1">
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>Month {m}</option>)}
                 </select>
                 <button onClick={runDiagnostics} className="text-blue-600 hover:underline text-sm ml-auto">↻ Re-run Check</button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-gray-500">Running system diagnostics...</div>
              ) : checks ? (
                <>
                  {/* CHECK 1: MISSING DATA */}
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      1. Data Completeness
                      {checks.missingDates.length === 0
                        ? <span className="text-green-600 text-sm bg-green-100 px-2 rounded">✓ All Good</span>
                        : <span className="text-red-600 text-sm bg-red-100 px-2 rounded">⚠ Missing Data</span>
                      }
                    </h3>
                    {checks.missingDates.length > 0 ? (
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-800 max-h-32 overflow-y-auto">
                        <p className="font-medium mb-1">No tons recorded for {checks.missingDates.length} days:</p>
                        <ul className="grid grid-cols-3 gap-2">
                          {checks.missingDates.map((d: any) => (
                            <li key={d.date} className={d.isSunday ? 'text-gray-500' : 'font-bold'}>
                              {d.date} {d.isSunday ? '(Sun)' : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">All days in the month have entry records.</p>
                    )}
                  </div>

                  {/* CHECK 2: PENDING APPROVALS */}
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      2. Pending Approvals
                      {checks.pendingExpenses === 0
                        ? <span className="text-green-600 text-sm bg-green-100 px-2 rounded">✓ Cleared</span>
                        : <span className="text-red-600 text-sm bg-red-100 px-2 rounded">⚠ Action Needed</span>
                      }
                    </h3>
                    {checks.pendingExpenses > 0 ? (
                       <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-yellow-800">
                          There are <strong>{checks.pendingExpenses} pending expense requests</strong>. Please Approve or Reject them before closing the month.
                       </div>
                    ) : (
                        <p className="text-sm text-gray-500">No pending expense requests.</p>
                    )}
                  </div>

                  {/* CHECK 3: CASH RECONCILIATION */}
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">3. Cash Reconciliation</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-600">System Balance (Ledger):</span>
                            <span className="font-bold">₹{checks.systemCash.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-600">Actual Cash Count (Physical):</span>
                            <input
                                type="number"
                                placeholder="0"
                                className="border rounded px-2 py-1 w-32 text-right"
                                value={physicalCash}
                                onChange={e => setPhysicalCash(e.target.value)}
                                onBlur={handleCashReconcile}
                            />
                        </div>

                        {cashDifference !== null && (
                            <div className={`p-3 rounded text-center font-bold ${cashDifference === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {cashDifference === 0
                                    ? "✅ Balanced Perfectly"
                                    : `❌ Discrepancy: ${cashDifference > 0 ? '+' : ''}₹${cashDifference}`
                                }
                            </div>
                        )}
                    </div>
                  </div>
                </>
              ) : null}

            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                disabled={!checks || checks.pendingExpenses > 0}
                className="px-6 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium"
              >
                🔒 Finalize & Lock Month
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
