'use client'

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function BillingPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalTons: 0,
    revenue: 0,
    workerCount: 0,
    foodStayExpense: 0,
    totalSalaryPaid: 0,
    netProfit: 0
  })

  useEffect(() => {
    calculateMonthlyStats()
  }, [selectedMonth, selectedYear])

  const calculateMonthlyStats = async () => {
    setLoading(true)

    try {
      // Get total tons for the month
      const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
      const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1
      const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear
      const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

      const { data: tonsData } = await supabase
        .from('daily_tons')
        .select('tons_lifted')
        .gte('date', monthStart)
        .lt('date', monthEnd)

      const totalTons = tonsData?.reduce((sum, item) => sum + Number(item.tons_lifted), 0) || 0
      const revenue = totalTons * 167

      // Get active worker count
      const { data: workersData } = await supabase
        .from('workers')
        .select('id, role')
        .eq('status', 'active')

      const workerCount = workersData?.filter(w => w.role === 'worker').length || 0
      const supervisorCount = workersData?.filter(w => w.role === 'supervisor').length || 0

      // Calculate food & stay expense (192 per head per day * 30 days)
      const foodStayExpense = (workerCount + supervisorCount) * 192 * 30

      // Get salary payments
      const { data: salaryData } = await supabase
        .from('salary_payments')
        .select('net_salary')
        .eq('month', selectedMonth)
        .eq('year', selectedYear)

      const totalSalaryPaid = salaryData?.reduce((sum, item) => sum + Number(item.net_salary), 0) || 0

      const netProfit = revenue - foodStayExpense - totalSalaryPaid

      setStats({
        totalTons,
        revenue,
        workerCount: workerCount + supervisorCount,
        foodStayExpense,
        totalSalaryPaid,
        netProfit
      })
    } catch (error) {
      console.error('Error calculating stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMonthName = (month: number) => {
    return new Date(2025, month - 1).toLocaleString('default', { month: 'long' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Monthly Billing & Reports</h1>
            <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-700">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month/Year Selector */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <>
            {/* Revenue Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">📊 Revenue from HUL</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Total Tons Lifted</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalTons.toFixed(2)}</p>
                </div>

                <div className="bg-green-50 p-6 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Rate per Ton</p>
                  <p className="text-3xl font-bold text-green-600">₹167</p>
                </div>

                <div className="bg-green-50 p-6 rounded-xl border-2 border-green-600">
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600">₹{stats.revenue.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">💸 Expenses</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-orange-50 p-6 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Food & Stay</p>
                  <p className="text-xl font-bold text-orange-600">₹{stats.foodStayExpense.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.workerCount} people × ₹192/day × 30 days
                  </p>
                </div>

                <div className="bg-red-50 p-6 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Salaries Paid</p>
                  <p className="text-xl font-bold text-red-600">₹{stats.totalSalaryPaid.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-500 mt-1">Net amount after advances</p>
                </div>

                <div className="bg-red-50 p-6 rounded-xl border-2 border-red-600">
                  <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
                  <p className="text-xl font-bold text-red-600">
                    ₹{(stats.foodStayExpense + stats.totalSalaryPaid).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Profit Section */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-8 text-white mb-6">
              <div className="text-center">
                <p className="text-lg mb-2 opacity-90">Net Profit for {getMonthName(selectedMonth)} {selectedYear}</p>
                <p className="text-5xl font-bold mb-4">₹{stats.netProfit.toLocaleString('en-IN')}</p>
                <p className="text-sm opacity-80">Revenue - Food/Stay - Salaries = Profit</p>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold">Detailed Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Item</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="py-3 px-4 text-sm font-medium text-green-700">Revenue from HUL ({stats.totalTons.toFixed(2)} tons × ₹167)</td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-green-700">
                        + {stats.revenue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr className="border-t bg-red-50">
                      <td className="py-3 px-4 text-sm text-red-700">Food & Stay Expense</td>
                      <td className="py-3 px-4 text-sm text-right text-red-700">
                        - {stats.foodStayExpense.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr className="border-t bg-red-50">
                      <td className="py-3 px-4 text-sm text-red-700">Salary Payments (Net)</td>
                      <td className="py-3 px-4 text-sm text-right text-red-700">
                        - {stats.totalSalaryPaid.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr className="border-t bg-indigo-50">
                      <td className="py-3 px-4 text-sm font-bold text-indigo-900">NET PROFIT</td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-indigo-900 text-lg">
                        = {stats.netProfit.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Important Notes */}
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">📝 Important Notes:</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• HUL pays you ₹167 per ton at month end</li>
                <li>• HUL also pays ₹3,000 directly to each worker (not included in your revenue)</li>
                <li>• You pay food & stay (₹192/day/person) at month beginning</li>
                <li>• You pay net salary (base - advances) to workers</li>
                <li>• Supervisor gets ₹40,000, regular workers get ₹20,000</li>
              </ul>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
