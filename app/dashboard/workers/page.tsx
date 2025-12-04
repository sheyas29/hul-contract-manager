'use client'

import type { Worker } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    account_number: '',
    role: 'worker' as 'worker' | 'supervisor',
    base_salary: 20000
  })

  useEffect(() => {
    fetchWorkers()
  }, [])

  const fetchWorkers = async () => {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setWorkers(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { error } = await supabase
      .from('workers')
      .insert([{
        ...formData,
        status: 'active'
      }])

    if (!error) {
      alert('Worker added successfully!')
      setShowAddForm(false)
      setFormData({ name: '', phone: '', account_number: '', role: 'worker', base_salary: 20000 })
      fetchWorkers()
    } else {
      alert('Error adding worker: ' + error.message)
    }
  }

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'

    const { error } = await supabase
      .from('workers')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      fetchWorkers()
    }
  }

  const deleteWorker = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return

    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id)

    if (!error) {
      alert('Worker deleted successfully')
      fetchWorkers()
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Worker Management</h1>
            <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-700">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Worker Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            {showAddForm ? '✕ Cancel' : '+ Add New Worker'}
          </button>
        </div>

        {/* Add Worker Form */}
        {showAddForm && (
          <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
            <h2 className="text-xl font-semibold mb-4">Add New Worker</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({
                    ...formData,
                    role: e.target.value as 'worker' | 'supervisor',
                    base_salary: e.target.value === 'supervisor' ? 40000 : 20000
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="worker">Worker (₹20,000)</option>
                  <option value="supervisor">Supervisor (₹40,000)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  Add Worker
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Workers List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">All Workers ({workers.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Account</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Salary</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((worker) => (
                  <tr key={worker.id} className="border-t hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium">{worker.name}</td>
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
                    <td className="py-3 px-4 text-sm">{worker.account_number || '-'}</td>
                    <td className="py-3 px-4 text-sm">₹{worker.base_salary.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        worker.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {worker.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <button
                        onClick={() => toggleStatus(worker.id, worker.status)}
                        className="text-blue-600 hover:text-blue-700 mr-3"
                      >
                        {worker.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteWorker(worker.id, worker.name)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
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
