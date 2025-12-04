'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Worker, DailyTon, Advance } from '@/lib/supabase'
import { format } from 'date-fns'
import Link from 'next/link'

export default function Dashboard() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [activeWorkers, setActiveWorkers] = useState(0)
  const [todayTons, setTodayTons] = useState(0)
  const [monthTons, setMonthTons] = useState(0)
  const [pendingAdvances, setPendingAdvances] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Get workers
      const { data: workersData } = await supabase
        .from('workers')
        .select('*')
        .eq('status', 'active')
      
      if (workersData) {
        setWorkers(workersData)
        setActiveWorkers(workersData.length)
      }

      // Get today's tons
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: todayTonsData } = await supabase
        .from('daily_tons')
        .select('tons_lifted')
        .eq('date', today)
      
      if (todayTonsData) {
        const total = todayTonsData.reduce((sum, item) => sum + Number(item.tons_lifted), 0)
        setTodayTons(total)
      }

      // Get current month tons
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()
      const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      
      const { data: monthTonsData } = await supabase
        .from('daily_tons')
        .select('tons_lifted')
        .gte('date', monthStart)
      
      if (monthTonsData) {
        const total = monthTonsData.reduce((sum, item) => sum + Number(item.tons_lifted), 0)
        setMonthTons(total)
      }

      // Get pending advances
      const { data: advancesData } = await supabase
        .from('advances')
        .select('balance')
        .in('status', ['pending', 'repaying'])
      
      if (advancesData) {
        const total = advancesData.reduce((sum, item) => sum + Number(item.balance), 0)
        setPendingAdvances(total)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setLoading(false)
    }
  }

  const monthRevenue = monthTons * 167

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">HUL Contract Manager</h1>
              <p className="text-sm text-gray-600">Loading & Unloading Operations</p>
            </div>
            <Link 
              href="/"
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              ← Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Active Workers</p>
            <p className="text-3xl font-bold text-gray-900">{activeWorkers}</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Today's Tons</p>
            <p className="text-3xl font-bold text-blue-600">{todayTons.toFixed(2)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Month Tons</p>
            <p className="text-3xl font-bold text-green-600">{monthTons.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Revenue: ₹{monthRevenue.toLocaleString('en-IN')}</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Pending Advances</p>
            <p className="text-3xl font-bold text-orange-600">₹{pendingAdvances.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link 
            href="/dashboard/workers"
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-indigo-500"
          >
            <h3 className="font-semibold text-lg mb-2">👷 Manage Workers</h3>
            <p className="text-sm text-gray-600">Add, edit, or view worker details</p>
          </Link>

          <Link 
            href="/dashboard/tons"
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-blue-500"
          >
            <h3 className="font-semibold text-lg mb-2">📦 Daily Tons Entry</h3>
            <p className="text-sm text-gray-600">Record tons lifted by each worker</p>
          </Link>

          <Link 
            href="/dashboard/advances"
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-orange-500"
          >
            <h3 className="font-semibold text-lg mb-2">💰 Advance Payments</h3>
            <p className="text-sm text-gray-600">Manage advances and repayments</p>
          </Link>

          <Link 
            href="/dashboard/billing"
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-green-500"
          >
            <h3 className="font-semibold text-lg mb-2">📊 Monthly Billing</h3>
            <p className="text-sm text-gray-600">Generate HUL billing statements</p>
          </Link>

          <Link 
            href="/dashboard/salary"
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-purple-500"
          >
            <h3 className="font-semibold text-lg mb-2">💵 Salary Processing</h3>
            <p className="text-sm text-gray-600">Calculate and process salaries</p>
          </Link>

          <Link 
            href="/dashboard/reports"
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-pink-500"
          >
            <h3 className="font-semibold text-lg mb-2">📈 Reports</h3>
            <p className="text-sm text-gray-600">View monthly summaries and profit</p>
          </Link>
        </div>

        {/* Recent Workers */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Active Workers</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Salary</th>
                </tr>
              </thead>
              <tbody>
                {workers.slice(0, 10).map((worker) => (
                  <tr key={worker.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">{worker.name}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        worker.role === 'supervisor' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {worker.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{worker.phone || '-'}</td>
                    <td className="py-3 px-4 text-sm">₹{worker.base_salary.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
