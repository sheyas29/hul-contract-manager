'use client'

import AdminGuard from '@/components/AdminGuard'
import { logActivity } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Printer, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type FinancialSummary = {
  revenue: number
  total_expenses: number
  salary_cost: number
  living_allowance: number
  petty_cash_spent: number
  net_profit: number
  total_tons: number
  active_worker_count: number
  is_projected_salary: boolean
}

export default function ReportsPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<FinancialSummary | null>(null)

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // CONFIG: Editable Rates (Defaulting to 167 as requested)
  const [revenuePerTon, setRevenuePerTon] = useState(167);
  const [allowancePerDay, setAllowancePerDay] = useState(192);

  useEffect(() => {
    fetchReportData()
  }, [month, year, revenuePerTon, allowancePerDay])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const yearStr = year.toString()
      const monthStr = String(month).padStart(2, '0')

      // Strict ISO Dates (Robust Logic)
      const startDate = `${yearStr}-${monthStr}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${yearStr}-${monthStr}-${lastDay}`

      // 1. Calculate Revenue (From Daily Tons)
      const { data: rawTons } = await supabase
        .from('daily_tons')
        .select('tons_lifted, date')
        .gte('date', startDate)
        .lte('date', endDate)

      const totalTons = rawTons?.reduce((sum, item) => sum + Number(item.tons_lifted), 0) || 0
      const revenue = totalTons * revenuePerTon

      // 2. Calculate Petty Cash Expenses
      const { data: expensesData } = await supabase
        .from('petty_cash_transactions')
        .select('amount')
        .eq('type', 'expense')
        .eq('status', 'approved')
        .gte('date', startDate)
        .lte('date', endDate)

      const pettyCash = expensesData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0

      // 3. Calculate Salary Cost (Actual vs Projected)
      let salaryCost = 0
      let isProjected = false
      let activeWorkerCount = 0

      // Try fetching ACTUAL saved payroll first
      const { data: actualPayroll } = await supabase
        .from('salary_payments')
        .select('base_salary')
        .eq('month', month)
        .eq('year', year)

      if (actualPayroll && actualPayroll.length > 0) {
        // Use actual saved data (Gross Salary = Cost to Company)
        salaryCost = actualPayroll.reduce((sum, item) => sum + Number(item.base_salary), 0)
        activeWorkerCount = actualPayroll.length
      } else {
        // Fallback: Estimate from Active Workers
        isProjected = true
        const { data: workers } = await supabase
          .from('workers')
          .select('base_salary')
          .eq('status', 'active')

        activeWorkerCount = workers?.length || 0
        salaryCost = workers?.reduce((sum, item) => sum + Number(item.base_salary), 0) || 0
      }

      // 4. Calculate Living Allowance (Food/Stay)
      const daysInMonth = new Date(year, month, 0).getDate();
      const livingAllowance = activeWorkerCount * daysInMonth * allowancePerDay;

      // 5. Final Calculation
      const totalExpenses = salaryCost + livingAllowance + pettyCash
      const netProfit = revenue - totalExpenses

      setData({
        revenue,
        total_expenses: totalExpenses,
        salary_cost: salaryCost,
        living_allowance: livingAllowance,
        petty_cash_spent: pettyCash,
        net_profit: netProfit,
        total_tons: totalTons,
        active_worker_count: activeWorkerCount,
        is_projected_salary: isProjected
      })

    } catch (error) {
      console.error('Error fetching report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    logActivity('VIEW_REPORT', `Printed Financial Report for ${MONTHS[month-1]} ${year}`)
    window.print()
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 p-6 print:bg-white print:p-0">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 print:hidden">
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                 </Link>
                 <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
              </div>
              <p className="text-sm text-gray-500 ml-8">Real-time Profit & Loss Statement</p>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
               {/* Rates Config */}
               <div className="flex gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                  <div className="px-2">
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Revenue Rate</label>
                    <div className="flex items-center gap-1">
                        <span className="text-green-600 font-bold text-sm">₹</span>
                        <input
                            type="number"
                            value={revenuePerTon}
                            onChange={(e) => setRevenuePerTon(Number(e.target.value))}
                            className="w-12 text-sm font-bold text-gray-700 outline-none border-b border-gray-200 focus:border-green-500"
                        />
                        <span className="text-xs text-gray-400">/ton</span>
                    </div>
                  </div>
                  <div className="w-px bg-gray-100"></div>
                  <div className="px-2">
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Allowance</label>
                    <div className="flex items-center gap-1">
                        <span className="text-red-600 font-bold text-sm">₹</span>
                         <input
                            type="number"
                            value={allowancePerDay}
                            onChange={(e) => setAllowancePerDay(Number(e.target.value))}
                            className="w-12 text-sm font-bold text-gray-700 outline-none border-b border-gray-200 focus:border-red-500"
                        />
                        <span className="text-xs text-gray-400">/day</span>
                    </div>
                  </div>
               </div>

               {/* Date Picker */}
               <div className="flex gap-2 items-center bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                   <select
                      value={month}
                      onChange={(e) => setMonth(parseInt(e.target.value))}
                      className="bg-transparent font-semibold text-gray-700 outline-none cursor-pointer"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <select
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      className="bg-transparent font-semibold text-gray-700 outline-none cursor-pointer"
                    >
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                    </select>
               </div>
            </div>
          </div>

          {loading || !data ? (
            <div className="p-20 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Crunching the numbers...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:grid-cols-3 print:gap-4">
                {/* Revenue Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="flex items-center gap-2 text-green-600 mb-2">
                            <TrendingUp className="w-5 h-5" />
                            <span className="font-bold text-sm uppercase tracking-wider">Revenue</span>
                        </div>
                        <h3 className="text-3xl font-bold text-gray-900">
                            ₹{data.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </h3>
                        <p className="text-sm text-gray-500 mt-2">
                            <span className="font-medium text-gray-900">{data.total_tons.toFixed(1)}</span> Tons Lifted
                        </p>
                    </div>
                </div>

                {/* Expenses Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                     <div className="absolute right-0 top-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                     <div className="relative">
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                            <TrendingDown className="w-5 h-5" />
                            <span className="font-bold text-sm uppercase tracking-wider">Total Expenses</span>
                        </div>
                        <h3 className="text-3xl font-bold text-gray-900">
                            ₹{data.total_expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </h3>
                        <p className="text-sm text-gray-500 mt-2">
                           Fixed Cost + Variable
                        </p>
                     </div>
                </div>

                {/* Net Profit Card */}
                <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group ${data.net_profit >= 0 ? 'bg-gradient-to-br from-indigo-900 to-indigo-800 text-white' : 'bg-red-50'}`}>
                    <div className="relative">
                        <div className={`flex items-center gap-2 mb-2 ${data.net_profit >= 0 ? 'text-indigo-200' : 'text-red-600'}`}>
                            <Wallet className="w-5 h-5" />
                            <span className="font-bold text-sm uppercase tracking-wider">Net Profit</span>
                        </div>
                        <h3 className={`text-3xl font-bold ${data.net_profit >= 0 ? 'text-white' : 'text-red-700'}`}>
                            ₹{data.net_profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </h3>
                        <p className={`text-sm mt-2 ${data.net_profit >= 0 ? 'text-indigo-200' : 'text-red-500'}`}>
                            Margin: {data.revenue > 0 ? ((data.net_profit / data.revenue) * 100).toFixed(1) : 0}%
                        </p>
                    </div>
                </div>
            </div>
          )}

          {/* Detailed Breakdown Table */}
          {data && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border">
                <div className="bg-gray-50/50 px-8 py-6 border-b border-gray-200 flex justify-between items-center print:bg-white">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">Monthly Statement</h3>
                        <p className="text-sm text-gray-500">Period: {MONTHS[month-1]} {year}</p>
                    </div>
                    <button onClick={handlePrint} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium print:hidden">
                        <Printer className="w-4 h-4" /> Print Report
                    </button>
                </div>

                <div className="p-8">
                    {/* Revenue Section */}
                    <div className="mb-8">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Income</h4>
                        <div className="flex justify-between items-center py-3 border-b border-gray-100">
                            <div>
                                <span className="font-medium text-gray-900">Revenue from Operations</span>
                                <span className="text-sm text-gray-400 ml-2">({data.total_tons.toFixed(1)} tons × ₹{revenuePerTon})</span>
                            </div>
                            <span className="font-bold text-gray-900 text-lg">₹{data.revenue.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Expenses Section */}
                    <div className="mb-8">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Expenditure</h4>

                        <div className="space-y-1">
                            {/* Salary */}
                            <div className="flex justify-between items-center py-3 border-b border-dashed border-gray-200">
                                <div>
                                    <span className="text-gray-600">Staff Salaries</span>
                                    {data.is_projected_salary && (
                                        <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold uppercase rounded-full">Estimated</span>
                                    )}
                                </div>
                                <span className="font-medium text-gray-900">₹{data.salary_cost.toLocaleString()}</span>
                            </div>

                            {/* Allowance */}
                            <div className="flex justify-between items-center py-3 border-b border-dashed border-gray-200">
                                <div>
                                    <span className="text-gray-600">Living Allowance (Food/Stay)</span>
                                    <span className="text-sm text-gray-400 ml-2">({data.active_worker_count} workers × ₹{allowancePerDay}/day)</span>
                                </div>
                                <span className="font-medium text-gray-900">₹{data.living_allowance.toLocaleString()}</span>
                            </div>

                            {/* Petty Cash */}
                            <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                <span className="text-gray-600">Petty Cash / Misc Expenses</span>
                                <span className="font-medium text-gray-900">₹{data.petty_cash_spent.toLocaleString()}</span>
                            </div>
                        </div>

                         <div className="flex justify-between items-center py-4">
                            <span className="font-bold text-gray-500">Total Expenditure</span>
                            <span className="font-bold text-red-600">(-) ₹{data.total_expenses.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Final Total */}
                    <div className="bg-gray-50 -mx-8 -mb-8 p-8 border-t-2 border-gray-200 flex justify-between items-center print:bg-gray-100">
                        <div>
                            <span className="text-xl font-bold text-gray-900">Net Profit</span>
                            <p className="text-sm text-gray-500">Before Tax</p>
                        </div>
                        <span className={`text-3xl font-bold ${data.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{data.net_profit.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
          )}

        </div>
      </div>
    </AdminGuard>
  )
}
