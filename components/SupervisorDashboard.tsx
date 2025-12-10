'use client'

import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function SupervisorDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ tons: 0, workers: 0, cash: 0 })

  useEffect(() => {
    async function load() {
      // Simple fetch, no auth checks here
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: tons } = await supabase.from('daily_tons').select('tons_lifted').eq('date', today)
      const { count } = await supabase.from('workers').select('*', { count: 'exact', head: true }).eq('status', 'active')
      const { data: wallet } = await supabase.from('supervisor_wallet').select('balance').maybeSingle()

      setStats({
        tons: tons?.reduce((a, b) => a + b.tons_lifted, 0) || 0,
        workers: count || 0,
        cash: wallet?.balance || 0
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-8 text-center">Loading Field App...</div>

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-xl font-bold mb-4">👋 Field Dashboard</h1>

      {/* Stats Cards */}
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 flex justify-between">
        <div className="text-center">
            <span className="block text-3xl font-bold text-indigo-600">{stats.tons.toFixed(1)}</span>
            <span className="text-xs text-gray-500">Tons Today</span>
        </div>
        <div className="text-center">
            <span className="block text-3xl font-bold text-gray-800">{stats.workers}</span>
            <span className="text-xs text-gray-500">Workers</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/dashboard/tons" className="bg-blue-600 text-white p-4 rounded-xl text-center font-bold">📦 Add Tons</Link>
        <Link href="/dashboard/expenses" className="bg-white p-4 rounded-xl text-center font-bold text-gray-700">💸 Log Cash</Link>
        <Link href="/dashboard/workers" className="bg-white p-4 rounded-xl text-center font-bold text-gray-700">👷 Workers</Link>
        <Link href="/dashboard/advances" className="bg-white p-4 rounded-xl text-center font-bold text-gray-700">💰 Advances</Link>
      </div>

      {/* Cash Card */}
      <div className="mt-6 bg-gray-900 text-white p-6 rounded-2xl">
        <p className="text-xs text-gray-400 uppercase">Cash In Hand</p>
        <p className="text-3xl font-bold">₹{stats.cash.toLocaleString()}</p>
      </div>
    </div>
  )
}
