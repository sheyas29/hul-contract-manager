'use client'

import { logActivity } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, X, User, Phone, Briefcase, IndianRupee, Building2, Calendar } from 'lucide-react'

// --- Types ---
type Worker = {
  id: string
  name: string
  role: string
  phone: string
  base_salary: number
  status: string
  // DB Column Names
  account_number?: string | null
  ifsc?: string | null
  join_date?: string | null
}

type ToastMessage = {
  message: string
  type: 'success' | 'error'
} | null

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // UI State
  const [showModal, setShowModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<ToastMessage>(null)

  // Form State
  const initialFormState = {
    name: '', role: 'worker', phone: '', base_salary: '',
    status: 'active', bank_account: '', ifsc: '', joined_date: ''
  }
  const [formData, setFormData] = useState(initialFormState)

  useEffect(() => {
    fetchWorkers()
  }, [])

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }

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
      setError('Failed to load workers. Please refresh.')
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
      bank_account: worker.account_number || '', 
      ifsc: worker.ifsc || '',
      joined_date: worker.join_date || ''
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingWorker(null)
    setFormData(initialFormState)
    setError(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    const salaryInput = formData.base_salary
    if (!salaryInput || isNaN(parseFloat(salaryInput))) {
      showToast('Please enter a valid base salary', 'error')
      setIsSaving(false)
      return
    }
    const salary = parseFloat(salaryInput)

    try {
      const payload = {
        name: formData.name,
        role: formData.role,
        phone: formData.phone || null,
        base_salary: salary,
        status: formData.status,
        account_number: formData.bank_account || null,
        ifsc: formData.ifsc || null,
        join_date: formData.joined_date || null
      }

      if (editingWorker) {
        // UPDATE
        const { data: updated, error } = await supabase
          .from('workers')
          .update(payload)
          .eq('id', editingWorker.id)
          .select()
          .single()

        if (error) throw error
        
        setWorkers(prev => prev.map(w => w.id === editingWorker.id ? updated : w))
        await logActivity('UPDATE_WORKER', `Updated worker: ${formData.name}`)
        showToast('Worker updated successfully!', 'success')

      } else {
        // INSERT
        const { data: inserted, error } = await supabase
          .from('workers')
          .insert([{ ...payload, status: 'active' }])
          .select()
          .single()

        if (error) throw error
        
        setWorkers(prev => [...prev, inserted].sort((a, b) => a.name.localeCompare(b.name)))
        await logActivity('ADD_WORKER', `Added new worker: ${formData.name}`)
        showToast('New worker added successfully!', 'success')
      }
      closeModal()

    } catch (err: any) {
      console.error('Error saving worker:', err)
      showToast(err.message || 'Error saving worker', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return (
    <div className="flex h-64 w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <p className="text-sm font-medium text-gray-500">Loading your team...</p>
      </div>
    </div>
  )

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto relative">
      
      {/* --- TOAST NOTIFICATION --- */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-top-2 duration-300 ${
          toast.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium text-sm">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Team Management</h1>
          <p className="text-gray-500 mt-1">Manage your workforce, salaries, and contact details.</p>
        </div>
        <button 
          onClick={() => { setEditingWorker(null); setFormData(initialFormState); setShowModal(true) }} 
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2 font-medium"
        >
          <span>+</span> Add New Worker
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-100 flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role & Salary</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Banking Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {workers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <User size={48} strokeWidth={1} className="mb-2" />
                      <p className="text-lg font-medium text-gray-900">No workers found</p>
                      <p className="text-sm">Get started by adding your first team member.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                workers.map((worker) => (
                  <tr key={worker.id} className="group hover:bg-gray-50/80 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                          {worker.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">{worker.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone size={12} /> {worker.phone || 'No Phone'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-900 font-medium capitalize">
                        <Briefcase size={14} className="text-gray-400" /> {worker.role}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-mono flex items-center gap-1">
                        <IndianRupee size={10} /> {worker.base_salary.toLocaleString('en-IN')} / mo
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {worker.account_number ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <Building2 size={14} className="text-gray-400" />
                              <span className="font-mono text-gray-700">{worker.account_number}</span>
                            </div>
                            {worker.ifsc && <span className="text-xs text-gray-400 font-mono ml-5">{worker.ifsc}</span>}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">No bank details</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border
                        ${worker.status === 'active' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {worker.status === 'active' ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleEdit(worker)} 
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transform transition-all scale-100">
            
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">
                {editingWorker ? 'Edit Employee Details' : 'Add New Employee'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-5">
              
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <User size={12} /> Full Name *
                  </label>
                  <input required placeholder="e.g. Rahul Sharma" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Phone size={12} /> Phone Number *
                  </label>
                  <input required type="tel" placeholder="e.g. 98765 43210" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Briefcase size={12} /> Role
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white" 
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="worker">Worker</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <IndianRupee size={12} /> Monthly Salary *
                  </label>
                  <input required type="number" placeholder="0.00" min="0" step="100" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                    value={formData.base_salary} onChange={e => setFormData({...formData, base_salary: e.target.value})} />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl space-y-4 border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Building2 size={12} /> Banking Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Account Number</label>
                    <input placeholder="XXX-XXX-XXX" 
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white" 
                      value={formData.bank_account} onChange={e => setFormData({...formData, bank_account: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">IFSC Code</label>
                    <input placeholder="SBIN000XXXX" className="uppercase w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white" 
                      value={formData.ifsc} onChange={e => setFormData({...formData, ifsc: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Calendar size={12} /> Date of Joining
                  </label>
                  <input type="date" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" 
                    value={formData.joined_date} onChange={e => setFormData({...formData, joined_date: e.target.value})} />
                </div>
                {editingWorker && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white" 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4">
                <button type="button" onClick={closeModal} 
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} 
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2">
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Employee'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  )
}
