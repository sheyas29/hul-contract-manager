'use client'

import { useAuth } from '@/components/AuthProvider'
import { supabase, Worker } from '@/lib/supabase'
import { AlertCircle, Download, Save, Search, Trash2, TrendingUp, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'

interface PayrollRow {
  worker_id: string
  worker_name: string
  total_tons: number
  work_days: number
  base_salary_rate: number

  // Financials
  gross_earnings: number
  advance_deduction: number
  other_deductions: number
  hul_direct_payment: number
  net_payable: number

  // Meta
  status: 'pending' | 'calculated' | 'paid'
  advance_balance_remaining: number
  notes: string
}

export default function SalaryPage() {
  const { role } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Date Selection
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // REVENUE CALCULATION STATE
  const [contractRate, setContractRate] = useState<number>(180) // Default HUL Rate (Editable)

  const [payrollData, setPayrollData] = useState<PayrollRow[]>([])
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    fetchPayrollData()
  }, [selectedMonth, selectedYear])

  const fetchPayrollData = async () => {
    setLoading(true)
    console.log(`Fetching for Month: ${selectedMonth + 1}, Year: ${selectedYear}`)

    try {
      const { data: workers, error: workerError } = await supabase
        .from('workers')
        .select('*')
        .eq('status', 'active')
        .order('name')

      if (workerError) return

      const { data: savedSalaries } = await supabase
        .from('salary_payments')
        .select('*')
        .eq('month', selectedMonth + 1)
        .eq('year', selectedYear)

      if (savedSalaries && savedSalaries.length > 0) {
        setIsLocked(true)

        // Fetch Tons for Context
        const yearStr = selectedYear.toString()
        const monthStr = String(selectedMonth + 1).padStart(2, '0')
        const startDate = `${yearStr}-${monthStr}-01`
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate()
        const endDate = `${yearStr}-${monthStr}-${lastDay}`

        const { data: historicalTons } = await supabase
          .from('daily_tons')
          .select('worker_id, tons_lifted')
          .gte('date', startDate)
          .lte('date', endDate)

        const formattedData: PayrollRow[] = savedSalaries.map(s => {
          const w = workers?.find(w => String(w.id) === String(s.worker_id))

          const workerTons = historicalTons?.filter(t =>
            String(t.worker_id).toLowerCase() === String(s.worker_id).toLowerCase()
          ) || []
          const totalTons = workerTons.reduce((sum, t) => sum + (Number(t.tons_lifted) || 0), 0)

          return {
            worker_id: s.worker_id,
            worker_name: w?.name || 'Unknown',
            total_tons: totalTons,
            work_days: workerTons.length,
            base_salary_rate: Number(s.base_salary),
            gross_earnings: Number(s.base_salary),
            advance_deduction: Number(s.advance_deductions),
            other_deductions: Number(s.other_deductions),
            hul_direct_payment: Number(s.hul_direct_payment),
            net_payable: Number(s.net_salary),
            status: s.payment_status,
            advance_balance_remaining: 0,
            notes: s.notes || ''
          }
        })
        setPayrollData(formattedData)
      } else {
        setIsLocked(false)
        if (workers) await calculateFreshPayroll(workers)
      }
    } catch (error) {
      console.error('CRITICAL ERROR:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateFreshPayroll = async (workers: Worker[]) => {
    const yearStr = selectedYear.toString()
    const monthStr = String(selectedMonth + 1).padStart(2, '0')
    const startDate = `${yearStr}-${monthStr}-01`
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate()
    const endDate = `${yearStr}-${monthStr}-${lastDay}`

    const { data: rawTons, error: tonsError } = await supabase
      .from('daily_tons')
      .select('worker_id, tons_lifted, date')
      .gte('date', startDate)
      .lte('date', endDate)

    if (tonsError) {
      alert('Error fetching data: ' + tonsError.message)
      return
    }

    const { data: advances } = await supabase
      .from('advances')
      .select('*')
      .eq('status', 'repaying')
      .gt('balance', 0)

    const rows: PayrollRow[] = workers.map(worker => {
      const workerTons = rawTons?.filter(t =>
        String(t.worker_id).toLowerCase() === String(worker.id).toLowerCase()
      ) || []

      const totalTons = workerTons.reduce((sum, t) => sum + (Number(t.tons_lifted) || 0), 0)

      const activeAdvance = advances?.find(a =>
        String(a.worker_id).toLowerCase() === String(worker.id).toLowerCase()
      )

      let deduction = 0
      let remaining = 0

      if (activeAdvance) {
        remaining = activeAdvance.balance
        deduction = Math.min(remaining * 0.2, 2000)
        deduction = Math.ceil(deduction / 100) * 100
      }

      const baseSalary = Number(worker.base_salary) || 0

      return {
        worker_id: worker.id,
        worker_name: worker.name,
        total_tons: totalTons,
        work_days: workerTons.length,
        base_salary_rate: baseSalary,
        gross_earnings: baseSalary,
        advance_deduction: deduction,
        other_deductions: 0,
        hul_direct_payment: 0,
        net_payable: baseSalary - deduction,
        status: 'calculated',
        advance_balance_remaining: remaining,
        notes: ''
      }
    })

    setPayrollData(rows)
  }

  const handleUpdateRow = (index: number, field: keyof PayrollRow, value: number | string) => {
    if (isLocked) return
    const newData = [...payrollData]
    const row = newData[index]
    // @ts-ignore
    row[field] = value
    if (field === 'gross_earnings' || field === 'advance_deduction' || field === 'other_deductions' || field === 'hul_direct_payment') {
        const gross = Number(row.gross_earnings) || 0
        const adv = Number(row.advance_deduction) || 0
        const other = Number(row.other_deductions) || 0
        const hul = Number(row.hul_direct_payment) || 0
        row.net_payable = gross - adv - other - hul
    }
    setPayrollData(newData)
  }

  const handleSavePayroll = async () => {
    const confirmMsg = `Confirm SAVE for ${selectedMonth + 1}/${selectedYear}?\n\nThis will:\n1. Lock these records\n2. DEDUCT advances from worker balances`
    if (!confirm(confirmMsg)) return

    setSaving(true)
    try {
      const dbPayload = payrollData.map(row => ({
        worker_id: row.worker_id,
        month: selectedMonth + 1,
        year: selectedYear,
        base_salary: row.base_salary_rate,
        hul_direct_payment: row.hul_direct_payment,
        advance_deductions: row.advance_deduction,
        other_deductions: row.other_deductions,
        net_salary: row.net_payable,
        payment_status: 'pending',
        notes: row.notes
      }))

      const { error } = await supabase.from('salary_payments').insert(dbPayload)
      if (error) throw error

      const deductionPromises = payrollData
        .filter(row => Number(row.advance_deduction) > 0)
        .map(async (row) => {
           const { data: adv } = await supabase
             .from('advances')
             .select('id, balance')
             .eq('worker_id', row.worker_id)
             .eq('status', 'repaying')
             .gt('balance', 0)
             .maybeSingle()

           if (adv) {
             const newBalance = adv.balance - Number(row.advance_deduction)
             const newStatus = newBalance <= 0 ? 'completed' : 'repaying'
             await supabase
               .from('advances')
               .update({ balance: newBalance, status: newStatus })
               .eq('id', adv.id)
           }
        })

      await Promise.all(deductionPromises)

      alert('Payroll saved successfully! Loan balances updated.')
      setIsLocked(true)
      fetchPayrollData()
    } catch (error: any) {
      alert('Error saving: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('This will DELETE the saved payroll report and RECALCULATE from live data.\n\nNote: This does NOT reverse advance deductions automatically.')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('salary_payments').delete().eq('month', selectedMonth + 1).eq('year', selectedYear);
      if (error) throw error;
      alert('Report reset! Recalculating...');
      setIsLocked(false);
      setPayrollData([]);
      window.location.reload();
    } catch (error: any) {
      alert('Error resetting: ' + error.message);
      setLoading(false);
    }
  }

  const handleExport = () => {
    const headers = ['Worker Name', 'Revenue Generated', 'Gross Pay', 'Net Payable'];
    const csvRows = payrollData.map(row => [
      `"${row.worker_name}"`,
      (row.total_tons * contractRate).toFixed(0),
      row.gross_earnings,
      row.net_payable
    ].join(','));

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Payroll_Revenue_${selectedMonth + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculated Totals
  const totalRevenue = payrollData.reduce((sum, row) => sum + (row.total_tons * contractRate), 0);
  const totalPayout = payrollData.reduce((sum, row) => sum + Number(row.net_payable), 0);
  const totalProfit = totalRevenue - totalPayout;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-8 h-8 text-indigo-600" />
            Payroll & Revenue
          </h1>
          <p className="text-gray-500 text-sm mt-1">Calculate salaries and track worker revenue generation</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           {/* Revenue Input */}
           <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-200">
              <label className="text-xs text-green-800 font-semibold uppercase tracking-wider block mb-1">
                Contract Rate (₹/Ton)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-green-700 font-bold">₹</span>
                <input
                  type="number"
                  value={contractRate}
                  onChange={(e) => setContractRate(Number(e.target.value))}
                  className="w-20 bg-transparent font-bold text-green-900 outline-none border-b border-green-300 focus:border-green-600"
                />
              </div>
           </div>

          <div className="h-10 w-px bg-gray-200 hidden md:block"></div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="border rounded-lg px-4 py-2 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="border rounded-lg px-4 py-2 bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
          </select>

          <button onClick={fetchPayrollData} className="p-2 text-gray-500 hover:text-indigo-600 transition-colors">
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading payroll data...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">Worker</th>
                    <th className="px-6 py-4 text-center">Performance</th>
                    {/* NEW COLUMN */}
                    <th className="px-6 py-4 text-right bg-green-50 text-green-800">Revenue (₹)</th>

                    <th className="px-6 py-4 text-right">Gross Pay</th>
                    <th className="px-6 py-4 text-right text-red-600">Adv. Ded.</th>
                    <th className="px-6 py-4 text-right text-red-600">Other</th>
                    <th className="px-6 py-4 text-right text-blue-600">HUL Direct</th>
                    <th className="px-6 py-4 text-right font-bold bg-indigo-50">Net Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payrollData.length === 0 ? (
                     <tr><td colSpan={8} className="p-8 text-center text-gray-400">No active workers found</td></tr>
                  ) : payrollData.map((row, index) => (
                    <tr key={row.worker_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {row.worker_name}
                        {row.advance_balance_remaining > 0 && !isLocked && (
                          <div className="text-xs text-orange-600 font-normal mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Bal: ₹{row.advance_balance_remaining}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="font-medium">{row.total_tons.toFixed(2)} T</div>
                        <div className="text-xs text-gray-400">{row.work_days} Days</div>
                      </td>

                      {/* REVENUE CELL */}
                      <td className="px-6 py-4 text-right font-mono font-medium text-green-700 bg-green-50/30">
                        ₹{(row.total_tons * contractRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          disabled={isLocked}
                          value={row.gross_earnings}
                          onChange={(e) => handleUpdateRow(index, 'gross_earnings', e.target.value)}
                          className="w-20 text-right border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none bg-transparent"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                         <input
                          type="number"
                          disabled={isLocked}
                          value={row.advance_deduction}
                          onChange={(e) => handleUpdateRow(index, 'advance_deduction', e.target.value)}
                          className="w-16 text-right text-red-600 border-b border-transparent hover:border-gray-300 focus:border-red-500 outline-none bg-transparent"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                         <input
                          type="number"
                          disabled={isLocked}
                          value={row.other_deductions}
                          onChange={(e) => handleUpdateRow(index, 'other_deductions', e.target.value)}
                          className="w-16 text-right text-red-600 border-b border-transparent hover:border-gray-300 focus:border-red-500 outline-none bg-transparent"
                        />
                      </td>
                       <td className="px-4 py-3 text-right">
                         <input
                          type="number"
                          disabled={isLocked}
                          value={row.hul_direct_payment}
                          onChange={(e) => handleUpdateRow(index, 'hul_direct_payment', e.target.value)}
                          className="w-20 text-right text-blue-600 border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent"
                        />
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-900 bg-indigo-50/50">
                        ₹{row.net_payable.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* FOOTER SUMMARY */}
                <tfoot className="bg-gray-50 font-bold text-gray-900 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-6 py-4" colSpan={2}>Monthly Totals</td>
                    <td className="px-6 py-4 text-right text-green-700">
                      ₹{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      ₹{payrollData.reduce((s, r) => s + Number(r.gross_earnings), 0).toLocaleString()}
                    </td>
                    <td colSpan={3}></td>
                    <td className="px-6 py-4 text-right text-indigo-700 text-lg">
                       ₹{totalPayout.toLocaleString()}
                    </td>
                  </tr>

                  {/* PROFIT ROW */}
                  <tr className="bg-indigo-900 text-white">
                    <td className="px-6 py-3" colSpan={4}>
                       <div className="flex items-center gap-2">
                         <TrendingUp className="w-5 h-5 text-green-400" />
                         NET PROFIT ESTIMATE (Revenue - Payout)
                       </div>
                    </td>
                    <td colSpan={4} className="px-6 py-3 text-right text-xl text-green-300">
                       ₹{totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-between gap-3 bg-gray-50">
               {isLocked && (
                 <button onClick={handleReset} className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm font-medium px-4 py-2 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" /> Reset Report
                 </button>
               )}
               <div className="flex gap-3 ml-auto">
                 {!isLocked ? (
                   <button onClick={handleSavePayroll} disabled={saving || payrollData.length === 0} className="flex items-center gap-2 bg-indigo-900 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-800 transition-colors disabled:opacity-50">
                      {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save & Lock Payroll</>}
                    </button>
                 ) : (
                    <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors">
                      <Download className="w-4 h-4" /> Export CSV
                    </button>
                 )}
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
