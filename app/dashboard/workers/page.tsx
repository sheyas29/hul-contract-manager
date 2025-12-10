'use client'

import { logActivity } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

type Worker = {
  id: string, name: string, role: string, phone: string,
  base_salary: number, status: string,
  bank_account?: string, ifsc?: string, joined_date?: string
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    name: '', role: 'worker', phone: '', base_salary: '',
    status: 'active', bank_account: '', ifsc: '', joined_date: ''
  })

  useEffect(() => { fetchWorkers() }, [])

  const fetchWorkers = async () => {
    const { data } = await supabase.from('workers').select('*').order('name')
    if (data) setWorkers(data)
  }

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker)
    setFormData({
      name: worker.name, role: worker.role, phone: worker.phone || '',
      base_salary: worker.base_salary.toString(), status: worker.status,
      bank_account: worker.bank_account || '', ifsc: worker.ifsc || '',
      joined_date: worker.joined_date || ''
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        name: formData.name, role: formData.role, phone: formData.phone,
        base_salary: parseFloat(formData.base_salary), status: formData.status,
        bank_account: formData.bank_account, ifsc: formData.ifsc, joined_date: formData.joined_date
      }

      if (editingWorker) {
        // UPDATE Existing
        await supabase.from('workers').update(payload).eq('id', editingWorker.id)
        await logActivity('UPDATE_WORKER', `Updated worker: ${formData.name}`)
      } else {
        // INSERT New
        await supabase.from('workers').insert({ ...payload, status: 'active' })
        await logActivity('ADD_WORKER', `Added new worker: ${formData.name}`)
      }

      setShowModal(false)
      setEditingWorker(null)
      setFormData({ name: '', role: 'worker', phone: '', base_salary: '', status: 'active', bank_account: '', ifsc: '', joined_date: '' })
      fetchWorkers()
    } catch (error) {
      alert('Error saving worker')
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Workers</h1>
        <button onClick={() => { setEditingWorker(null); setShowModal(true) }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm">
          + Add Worker
        </button>
      </div>

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
            {workers.map((worker) => (
              <tr key={worker.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{worker.name}</div>
                  <div className="text-sm text-gray-500">{worker.role} • Salary: ₹{worker.base_salary}</div>
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
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4">{editingWorker ? 'Edit Worker' : 'Add New Worker'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Name" className="border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input required type="tel" placeholder="Phone" className="border p-2 rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select className="border p-2 rounded" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="worker">Worker</option>
                  <option value="supervisor">Supervisor</option>
                </select>
                <input required type="number" placeholder="Base Salary" className="border p-2 rounded" value={formData.base_salary} onChange={e => setFormData({...formData, base_salary: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Bank Account Number" className="border p-2 rounded" value={formData.bank_account} onChange={e => setFormData({...formData, bank_account: e.target.value})} />
                <input placeholder="IFSC Code" className="border p-2 rounded" value={formData.ifsc} onChange={e => setFormData({...formData, ifsc: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Joined Date</label>
                <input type="date" className="border p-2 rounded w-full" value={formData.joined_date} onChange={e => setFormData({...formData, joined_date: e.target.value})} />
              </div>
              {editingWorker && (
                <div>
                   <label className="block text-xs text-gray-500 mb-1">Status</label>
                   <select className="border p-2 rounded w-full" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                     <option value="active">Active</option>
                     <option value="inactive">Inactive (Fired/Left)</option>
                   </select>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded">Save</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
