'use client'

import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import {
    Activity,
    AlertTriangle,
    FileText,
    Plus,
    TrendingUp, Users, Wallet
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

// --- BarChart Component ---
const BarChart = ({ data }: { data: { date: string, tons: number }[] }) => {
  const maxVal = Math.max(...data.map(d => d.tons), 5);
  return (
    <div className="h-32 w-full flex items-end justify-between gap-2 mt-4">
      {data.map((d) => {
        const heightPct = Math.max((d.tons / maxVal) * 100, 2);
        return (
          <div key={d.date} className="flex flex-col items-center justify-end gap-1 flex-1 h-full group cursor-pointer">
             <div className="relative w-full h-full flex items-end justify-center">
               <span className="absolute -top-8 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                 {d.tons.toFixed(1)} T
                 <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></span>
               </span>
               <div
                 className={`w-full rounded-t-sm transition-all duration-300 ${
                    d.tons > 0 ? 'bg-indigo-200 group-hover:bg-indigo-600' : 'bg-gray-100 group-hover:bg-gray-300'
                 }`}
                 style={{ height: `${heightPct}%` }}
               ></div>
             </div>
             <span className="text-[10px] text-gray-400 font-medium group-hover:text-indigo-600">
               {new Date(d.date).getDate()}
             </span>
          </div>
        );
      })}
    </div>
  )
}

// --- Main Dashboard Component ---
export default function DashboardHome() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({
    todayTons: 0,
    yesterdayTons: 0,
    activeWorkers: 0,
    cashBalance: 0,
    pendingExpenses: 0
  })

  const [weeklyData, setWeeklyData] = useState<{ date: string, tons: number }[]>([])

  useEffect(() => {
    // Only start fetching once we know the role (auth is loaded)
    // If role is undefined/null initially, this effect waits until it's populated.
    if (role !== undefined) {
        fetchDashboardData()
    }
  }, [role])

  const fetchDashboardData = async () => {
    try {
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

        // 1. Fetch Tons (Visible to ALL)
        const { data: tonsData } = await supabase
            .from('daily_tons')
            .select('tons_lifted, date')
            .gte('date', weekAgo)

        const todaySum = tonsData?.filter(d => d.date === today).reduce((s, r) => s + Number(r.tons_lifted), 0) || 0
        const yestSum = tonsData?.filter(d => d.date === yesterday).reduce((s, r) => s + Number(r.tons_lifted), 0) || 0

        // Chart Data
        const last7Days = []
        for(let i=6; i>=0; i--) {
            const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
            const daySum = tonsData?.filter(r => r.date === d).reduce((s, r) => s + Number(r.tons_lifted), 0) || 0
            last7Days.push({ date: d, tons: daySum })
        }
        setWeeklyData(last7Days)

        // 2. Fetch Active Workers
        const { count: workerCount } = await supabase
            .from('workers')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')

        // 3. Financials (ADMIN ONLY) - ROBUST CALCULATION FIX
        let calculatedBalance = 0
        let pendingCount = 0

        // Explicitly check role inside the async function to prevent "0 balance" glitch on refresh
        if (role === 'admin') {
             const { data: txs, error } = await supabase
                .from('petty_cash_transactions')
                .select('*')

             if (txs && !error) {
                calculatedBalance = txs.reduce((acc, tx) => {
                    const amt = Number(tx.amount) || 0

                    if (tx.type === 'deposit') {
                        // Only approved deposits count
                        return tx.status === 'approved' ? acc + amt : acc
                    } else {
                        // Expenses: Pending OR Approved deduct from cash-in-hand
                        if (tx.status === 'pending') pendingCount++
                        // Rejected expenses are ignored (cash stays)
                        return tx.status === 'rejected' ? acc : acc - amt
                    }
                }, 0)
             }
        }

        setStats({
            todayTons: todaySum,
            yesterdayTons: yestSum,
            activeWorkers: workerCount || 0,
            cashBalance: calculatedBalance,
            pendingExpenses: pendingCount
        })

    } catch (e) {
        console.error("Dashboard Error:", e)
    } finally {
        setLoading(false)
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  if (loading) return <div className="p-10 text-center text-gray-400">Loading Dashboard...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">

            {/* Header */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{greeting}, {isAdmin ? 'Admin' : 'Supervisor'}</h1>
                    <p className="text-gray-500">
                        {isAdmin ? "Here is the complete site overview." : "Ready to log today's work?"}
                    </p>
                </div>
                <div className="text-right hidden md:block">
                     <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Today</div>
                     <div className="text-lg font-bold text-gray-900">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

                {/* 1. Daily Tons (VISIBLE TO ALL) */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-indigo-50 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Today's Lifting</p>
                            <h3 className="text-3xl font-bold text-indigo-600 mt-1">{stats.todayTons.toFixed(1)} <span className="text-sm text-gray-400">T</span></h3>
                        </div>
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Activity className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4 text-xs font-medium text-gray-500">
                        {stats.todayTons >= stats.yesterdayTons ? (
                             <span className="text-green-600 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> +{(stats.todayTons - stats.yesterdayTons).toFixed(1)} vs Yesterday
                             </span>
                        ) : (
                             <span className="text-red-500">
                                {stats.todayTons - stats.yesterdayTons} vs Yesterday
                             </span>
                        )}
                    </div>
                </div>

                {/* 2. Workforce (VISIBLE TO ALL) */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Active Workers</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.activeWorkers}</h3>
                        </div>
                        <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">Status: Active</span>
                    </div>
                </div>

                {/* 3. Cash Flow (ADMIN ONLY) - Hidden for Supervisor */}
                {isAdmin && (
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Petty Cash</p>
                                <h3 className={`text-3xl font-bold mt-1 ${stats.cashBalance < 2000 ? 'text-red-600' : 'text-green-600'}`}>
                                    ₹{stats.cashBalance.toLocaleString()}
                                </h3>
                            </div>
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                <Wallet className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs">
                            {stats.pendingExpenses > 0 ? (
                                <span className="text-orange-600 font-bold flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> {stats.pendingExpenses} Expenses Pending
                                </span>
                            ) : (
                                <span className="text-gray-400">All expenses approved</span>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. Mini Chart (VISIBLE TO ALL) */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Weekly Trend</p>
                     <BarChart data={weeklyData} />
                </div>
            </div>

            {/* QUICK ACTIONS */}
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                {/* 1. Daily Entry (PRIMARY ACTION) */}
                <Link href="/dashboard/tons" className="group bg-indigo-600 hover:bg-indigo-700 text-white p-6 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex flex-col items-start justify-between h-32 col-span-2 md:col-span-1">
                    <div className="p-3 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                        <Plus className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="block font-bold text-lg">Daily Entry</span>
                        <span className="text-indigo-200 text-xs">Log tons & attendance</span>
                    </div>
                </Link>

                {/* 2. Expenses (Visible to All) */}
                <Link href="/dashboard/expenses" className="group bg-white hover:border-indigo-300 border border-gray-200 p-6 rounded-2xl shadow-sm transition-all active:scale-95 flex flex-col items-start justify-between h-32">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl group-hover:scale-110 transition-transform">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="block font-bold text-gray-900">Expenses</span>
                        <span className="text-gray-400 text-xs">Log cash & petty expenses</span>
                    </div>
                </Link>

                {/* 3. Payroll (ADMIN ONLY) */}
                {isAdmin && (
                    <Link href="/dashboard/salary" className="group bg-white hover:border-indigo-300 border border-gray-200 p-6 rounded-2xl shadow-sm transition-all active:scale-95 flex flex-col items-start justify-between h-32">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl group-hover:scale-110 transition-transform">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="block font-bold text-gray-900">Payroll</span>
                            <span className="text-gray-400 text-xs">Calculate monthly salaries</span>
                        </div>
                    </Link>
                )}

                {/* 4. Reports (ADMIN ONLY) */}
                {isAdmin && (
                    <Link href="/dashboard/reports" className="group bg-white hover:border-indigo-300 border border-gray-200 p-6 rounded-2xl shadow-sm transition-all active:scale-95 flex flex-col items-start justify-between h-32">
                        <div className="p-3 bg-gray-100 text-gray-600 rounded-xl group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="block font-bold text-gray-900">Reports</span>
                            <span className="text-gray-400 text-xs">View P&L and Revenue</span>
                        </div>
                    </Link>
                )}

                 {/* 5. Advances (ADMIN ONLY) */}
                 {isAdmin && (
                    <Link href="/dashboard/advances" className="group bg-white hover:border-indigo-300 border border-gray-200 p-6 rounded-2xl shadow-sm transition-all active:scale-95 flex flex-col items-start justify-between h-32">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl group-hover:scale-110 transition-transform">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="block font-bold text-gray-900">Advances</span>
                            <span className="text-gray-400 text-xs">Manage Loans</span>
                        </div>
                    </Link>
                )}

            </div>
        </div>
    </div>
  )
}
