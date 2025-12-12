'use client'

import { logActivity } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

type Worker = {
  id: string
  name: string
  role: string
  phone: string
  base_salary: number
  status: string
  bank_account?: string
  ifsc?: string
  joined_date?: string
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [showModal, setShowModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form State
  const initialFormState = {
    name: '', role: 'worker', phone: '', base_salary: '',
    status: 'active', bank_account: '', ifsc: '', joined_date: ''
  }
  const [formData, setFormData] = useState(initialFormState)

  useEffect(() => {
    fetchWorkers()
  }, [])

  const fetchWorkers = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('name')
      
      if (error) throw error
      if (data) setWorkers(data)
    } catch (err: any) {
      console.error('Error fetching workers:', err)
      setError('Failed to load workers. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker)
    setFormData({
      name: worker.name,
      role: worker.role,
      phone: worker.phone || '',
      base_salary: worker.base_salary.toString(),
      status: worker.status,
      bank_account: worker.bank_account || '',
      ifsc: worker.ifsc || '',
      joined_date: worker.joined_date || ''
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingWorker(null)
    setFormData(initialFormState) // Reset form on close
    setError(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    // Basic Validation
    const salary = parseFloat(formData.base_salary)
    if (isNaN(salary) || salary < 0) {
      alert('Please enter a valid base salary')
      setIsSaving(false)
      return
    }

    try {
      const payload = {
        name: formData.name,
        role: formData.role,
        phone: formData.phone,
        base_salary: salary,
        status: formData.status,
        bank_account: formData.bank_account,
        ifsc: formData.ifsc,
        joined_date: formData.joined_date
      }

      let data: Worker | null = null;

      if (editingWorker) {
        // UPDATE Existing
        const { data: updated, error } = await supabase
          .from('workers')
          .update(payload)
          .eq('id', editingWorker.id)
          .select()
          .single()

        if (error) throw error
        data = updated
        
        // Optimistic Update: Update local state immediately
        setWorkers(prev => prev.map(w => w.id === editingWorker.id ? updated : w))
        
        // Log in background (don't await if you want faster UI, but awaiting ensures audit trail)
        await logActivity('UPDATE_WORKER', `Updated worker: ${formData.name}`)

      } else {
        // INSERT New
        const { data: inserted, error } = await supabase
          .from('workers')
          .insert([{ ...payload, status: 'active' }])
          .select()
          .single()

        if (error) throw error
        data = inserted

        // Optimistic Update: Add to local state immediately
        setWorkers(prev => [...prev, inserted].sort((a, b) => a.name.localeCompare(b.name)))
        
        await logActivity('ADD_WORKER', `Added new worker: ${formData.name}`)
      }

      closeModal()

    } catch (err: any) {
      console.error('Error saving worker:', err)
      alert('Error saving worker: ' + (err.message || 'Unknown error'))
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading workers...</div>

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Workers</h1>
        <button 
          onClick={() => { setEditingWorker(null); setFormData(initialFormState); setShowModal(true) }} 
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
        >
          + Add Worker
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact & Bank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {workers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No workers found. Add one to get started.
                </td>
              </tr>
            ) : (
              workers.map((worker) => (
                <tr key={worker.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{worker.name}</div>
                    <div className="text-sm text-gray-500">{worker.role} • Salary: ₹{worker.base_salary.toLocaleString('en-IN')}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>📞 {worker.phone || 'N/A'}</div>
                    <div className="text-xs text-gray-400 mt-1">Bank: {worker.bank_account || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${worker.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {worker.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(worker)} className="text-indigo-600 hover:text-indigo-900 font-medium text-sm">
                      Edit / View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4">{editingWorker ? 'Edit Worker' : 'Add New Worker'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name *</label>
                  <input required placeholder="Full Name" className="border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone *</label>
                  <input required type="tel" placeholder="Phone Number" className="border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Role</label>
                  <select className="border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="worker">Worker</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Base Salary (₹) *</label>
                  <input required type="number" placeholder="0.00" min="0" step="100" className="border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.base_salary} onChange={e => setFormData({...formData, base_salary: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Bank Account</label>
                  <input placeholder="Account Number" className="border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.bank_account} onChange={e => setFormData({...formData, bank_account: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">IFSC Code</label>
                  <input placeholder="IFSC Code" className="border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.ifsc} onChange={e => setFormData({...formData, ifsc: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Joined Date</label>
                <input type="date" className="border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.joined_date} onChange={e => setFormData({...formData, joined_date: e.target.value})} />
              </div>
              {editingWorker && (
                <div>
                   <label className="block text-xs text-gray-500 mb-1">Status</label>
                   <select className="border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                     <option value="active">Active</option>
                     <option value="inactive">Inactive (Fired/Left)</option>
                   </select>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={isSaving} className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors">
                  {isSaving ? 'Saving...' : 'Save Worker'}
                </button>
                <button type="button" onClick={closeModal} className="flex-1 bg-gray-100 text-gray-800 py-2 rounded hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
