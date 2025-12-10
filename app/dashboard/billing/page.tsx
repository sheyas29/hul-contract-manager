'use client'

import AdminGuard from '@/components/AdminGuard'
import { logActivity } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, CheckCircle, FileText, Printer } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function BillingPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [billData, setBillData] = useState<{ totalTons: number, totalAmount: number } | null>(null)

  // Editable Rate State (Default 167)
  const [ratePerTon, setRatePerTon] = useState(167)

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleGenerateBill = async () => {
    setLoading(true)
    try {
      // 1. Strict Date Logic (Matches Salary/Reports Page)
      const yearStr = year.toString()
      const monthStr = String(month).padStart(2, '0')
      const startDate = `${yearStr}-${monthStr}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${yearStr}-${monthStr}-${lastDay}`

      console.log(`Generating Bill: ${startDate} to ${endDate} @ ₹${ratePerTon}/ton`)

      // 2. Fetch Tons
      const { data, error } = await supabase
        .from('daily_tons')
        .select('tons_lifted, date')
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error

      // 3. Calculate
      const totalTons = data?.reduce((sum, item) => sum + Number(item.tons_lifted), 0) || 0
      const totalAmount = totalTons * ratePerTon

      setBillData({ totalTons, totalAmount })

      await logActivity('GENERATE_BILL', `Generated Bill for ${MONTHS[month-1]} ${year}. Total: ₹${totalAmount.toFixed(2)}`)

    } catch (error) {
      console.error(error)
      alert('Error generating bill.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 p-6 print:bg-white print:p-0">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-8 print:hidden">
             <div>
               <div className="flex items-center gap-2 mb-1">
                 <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                 </Link>
                 <h1 className="text-2xl font-bold text-gray-900">Monthly Billing</h1>
               </div>
               <p className="text-sm text-gray-500 ml-8">Generate invoice data for HUL Payment</p>
             </div>
          </div>

          {/* Controls Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 print:hidden">
             <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">

                {/* Month Select */}
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Month</label>
                   <select
                      value={month}
                      onChange={e => setMonth(parseInt(e.target.value))}
                      className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-medium text-gray-700"
                   >
                      {MONTHS.map((m, index) => (
                        <option key={index + 1} value={index + 1}>{m}</option>
                      ))}
                   </select>
                </div>

                {/* Year Select */}
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Year</label>
                   <select
                      value={year}
                      onChange={e => setYear(parseInt(e.target.value))}
                      className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-medium text-gray-700"
                   >
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                   </select>
                </div>

                {/* Rate Input (NEW) */}
                <div>
                   <label className="block text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Rate (₹/Ton)</label>
                   <div className="relative">
                     <span className="absolute left-3 top-2.5 text-green-600 font-bold">₹</span>
                     <input
                        type="number"
                        value={ratePerTon}
                        onChange={(e) => setRatePerTon(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2.5 border border-green-300 bg-green-50 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-bold text-green-800"
                     />
                   </div>
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleGenerateBill}
                    disabled={loading}
                    className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {loading ? 'Calculating...' : <><FileText className="w-4 h-4" /> Generate Bill</>}
                </button>
             </div>
          </div>

          {/* Results Section */}
          {billData ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border">

                {/* Bill Header */}
                <div className="bg-green-50/50 px-8 py-6 border-b border-green-100 flex justify-between items-center print:bg-white print:px-0">
                  <div>
                    <h3 className="font-bold text-2xl text-green-900">Billing Summary</h3>
                    <p className="text-gray-500 font-medium">{MONTHS[month-1]} {year}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide print:hidden">
                    <CheckCircle className="w-3 h-3" /> Ready to Invoice
                  </div>
                </div>

                <div className="p-8 print:px-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      {/* Left: Quantity */}
                      <div className="p-6 rounded-xl border border-dashed border-gray-300 bg-gray-50/50">
                          <p className="text-sm text-gray-500 font-bold uppercase tracking-wide mb-2">Total Quantity</p>
                          <div className="flex items-baseline gap-2">
                             <span className="text-4xl font-bold text-gray-900">{billData.totalTons.toFixed(3)}</span>
                             <span className="text-lg text-gray-400 font-medium">Metric Tons</span>
                          </div>
                      </div>

                      {/* Right: Amount */}
                      <div className="p-6 rounded-xl border border-green-200 bg-green-50">
                          <p className="text-sm text-green-800 font-bold uppercase tracking-wide mb-2">Billable Amount</p>
                          <div className="flex items-baseline gap-1">
                             <span className="text-4xl font-bold text-green-700">₹{billData.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                          </div>
                          <div className="text-xs text-green-600 mt-2 font-medium">
                            Based on Contract Rate: ₹{ratePerTon} / Ton
                          </div>
                      </div>
                  </div>

                  {/* Print Footer */}
                  <div className="border-t border-gray-100 pt-8 text-center print:hidden">
                    <button
                      onClick={() => window.print()}
                      className="text-gray-500 hover:text-indigo-600 font-medium flex items-center justify-center gap-2 mx-auto transition-colors"
                    >
                      <Printer className="w-4 h-4" /> Print Statement
                    </button>
                  </div>

                  {/* Printable Signature Area (Only shows when printing) */}
                  <div className="hidden print:block mt-20 pt-8 border-t border-gray-300">
                     <div className="flex justify-between text-sm text-gray-600">
                        <div className="text-center">
                           <p className="mb-12">Authorized Signatory</p>
                           <p className="font-bold">Unified Excellance</p>
                        </div>
                        <div className="text-center">
                           <p className="mb-12">Received By</p>
                           <p className="font-bold">HUL Representative</p>
                        </div>
                     </div>
                  </div>

                </div>
              </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                   <FileText className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-gray-900 font-medium text-lg">No Bill Generated</h3>
                <p className="text-gray-500 text-sm mt-1">Select a month and click "Generate Bill" to see details.</p>
            </div>
          )}

        </div>
      </div>
    </AdminGuard>
  )
}
