'use client'

import type { DailyTon, Worker } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function TonsPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [dailyTons, setDailyTons] = useState<(DailyTon & { worker_name: string })[]>([])
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    worker_id: '',
    tons_lifted: '',
    notes: ''
  })

  useEffect(() => {
    fetchWorkers()
    fetchDailyTons()
  }, [selectedDate])

  const fetchWorkers = async () => {
    const { data } = await supabase
      .from('workers')
      .select('*')
      .eq('status', 'active')
      .eq('role', 'worker')
      .order('name')

    if (data) setWorkers(data)
    setLoading(false)
  }

  const fetchDailyTons = async () => {
    const { data } = await supabase
      .from('daily_tons')
      .select(`
        *,
        workers (name)
      `)
      .eq('date', selectedDate)

    if (data) {
      const formatted = data.map(item => ({
        ...item,
        worker_name: (item.workers as any)?.name || 'Unknown'
      }))
      setDailyTons(formatted)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { error } = await supabase
      .from('daily_tons')
      .insert([{
        worker_id: formData.worker_id,
        date: selectedDate,
        tons_lifted: parseFloat(formData.tons_lifted),
        notes: formData.notes || null
      }])

    if (!error) {
      alert('Tons entry added successfully!')
      setFormData({ worker_id: '', tons_lifted: '', notes: '' })
      fetchDailyTons()
    } else {
      if (error.code === '23505') {
        alert('Entry already exists for this worker today. Please edit or delete existing entry.')
      } else {
        alert('Error: ' + error.message)
      }
    }
  }

  const deleteEntry = async (id: string) => {
    if (!confirm('Delete this entry?')) return

    const { error } = await supabase
      .from('daily_tons')
      .delete()
      .eq('id', id)

    if (!error) {
      fetchDailyTons()
    }
  }

  const totalTons = dailyTons.reduce((sum, item) => sum + Number(item.tons_lifted), 0)
  const totalRevenue = totalTons * 167

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Daily Tons Entry</h1>
            <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-700">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Selector & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="bg-blue-50 p-6 rounded-xl">
            <p className="text-sm text-gray-900 font-medium mb-1">
Total Tons</p>
            <p className="text-3xl font-bold text-blue-600">{totalTons.toFixed(2)}</p>
          </div>

          <div className="bg-green-50 p-6 rounded-xl">
            <p className="text-sm text-gray-900 font-medium mb-1">
Revenue (@ ₹167/ton)</p>
            <p className="text-3xl font-bold text-green-600">₹{totalRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Add Entry Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">Add Tons Entry for {format(new Date(selectedDate), 'dd MMM yyyy')}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Tons Lifted *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.tons_lifted}
                onChange={(e) => setFormData({...formData, tons_lifted: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Optional"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
              >
                Add Entry
              </button>
            </div>
          </form>
        </div>

        {/* Entries List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold">Entries for {format(new Date(selectedDate), 'dd MMM yyyy')} ({dailyTons.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Worker</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tons Lifted</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Revenue</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Notes</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dailyTons.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No entries for this date. Add entries above.
                    </td>
                  </tr>
                ) : (
                  dailyTons.map((entry) => (
                    <tr key={entry.id} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium">{entry.worker_name}</td>
                      <td className="py-3 px-4 text-sm">{Number(entry.tons_lifted).toFixed(2)} tons</td>
                      <td className="py-3 px-4 text-sm">₹{(Number(entry.tons_lifted) * 167).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-sm">{entry.notes || '-'}</td>
                      <td className="py-3 px-4 text-sm">
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
