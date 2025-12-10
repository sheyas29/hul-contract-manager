'use client'

import { logActivity } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Calendar, CheckCircle, Save, Search, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type WorkerEntry = {
  worker_id: string
  name: string
  tons: string // Keep as string for input handling
  is_present: boolean
  is_saved: boolean
}

export default function DailyEntryPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [entries, setEntries] = useState<WorkerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchWorkersAndEntries()
  }, [date])

  const fetchWorkersAndEntries = async () => {
    setLoading(true)
    try {
      // 1. Get All Active Workers
      const { data: workers } = await supabase
        .from('workers')
        .select('id, name')
        .eq('status', 'active')
        .order('name')

      if (!workers) return

      // 2. Get Existing Entries for this Date
      const { data: existingData } = await supabase
        .from('daily_tons')
        .select('worker_id, tons_lifted, is_present')
        .eq('date', date)

      // 3. Merge Data
      const merged: WorkerEntry[] = workers.map(w => {
        const entry = existingData?.find(e => e.worker_id === w.id)
        return {
          worker_id: w.id,
          name: w.name,
          tons: entry ? String(entry.tons_lifted) : '', // Default empty if no entry
          is_present: entry ? entry.is_present : true, // Default PRESENT if new
          is_saved: !!entry // Mark as saved if entry exists
        }
      })

      setEntries(merged)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAttendance = (index: number) => {
    const newEntries = [...entries]
    const current = newEntries[index].is_present

    // Toggle logic
    newEntries[index].is_present = !current

    // If marking Absent, clear tons automatically (logic: Absent = 0 tons)
    if (current === true) { // Was Present, now becoming Absent
        newEntries[index].tons = '0'
    } else {
        // Was Absent, becoming Present -> leave tons empty/0
        if (newEntries[index].tons === '0') newEntries[index].tons = ''
    }

    newEntries[index].is_saved = false // Mark as dirty
    setEntries(newEntries)
  }

  const handleTonsChange = (index: number, val: string) => {
    const newEntries = [...entries]
    newEntries[index].tons = val

    // If typing tons > 0, auto-mark Present
    if (Number(val) > 0) {
        newEntries[index].is_present = true
    }

    newEntries[index].is_saved = false
    setEntries(newEntries)
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
        // Filter out entries that haven't changed?
        // For simplicity, we upsert ALL to ensure consistency

        const upsertData = entries.map(e => ({
            worker_id: e.worker_id,
            date: date,
            tons_lifted: Number(e.tons) || 0,
            is_present: e.is_present
        }))

        const { error } = await supabase
            .from('daily_tons')
            .upsert(upsertData, { onConflict: 'worker_id, date' })

        if (error) throw error

        // Update UI to show "Saved" state
        setEntries(prev => prev.map(e => ({ ...e, is_saved: true })))

        await logActivity('DAILY_ENTRY', `Updated attendance/tons for ${entries.length} workers on ${date}`)
        alert('✅ Attendance & Tons Saved Successfully!')

    } catch (error: any) {
        alert('Error saving: ' + error.message)
    } finally {
        setSaving(false)
    }
  }

  // Filter for Search
  const visibleEntries = entries.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Stats
  const presentCount = entries.filter(e => e.is_present).length
  const totalTons = entries.reduce((sum, e) => sum + (Number(e.tons) || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 pb-20"> {/* pb-20 for bottom bar */}

        {/* Top Header (Sticky) */}
        <div className="bg-white shadow-sm sticky top-0 z-10">
            <div className="max-w-3xl mx-auto px-4 py-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard" className="text-gray-400">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <h1 className="text-xl font-bold text-gray-900">Daily Entry</h1>
                    </div>
                    <div className="text-right">
                         <div className="text-xs text-gray-500 uppercase font-bold">Total Tons</div>
                         <div className="text-xl font-bold text-indigo-600">{totalTons.toFixed(2)}</div>
                    </div>
                </div>

                {/* Date Picker & Search */}
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                        />
                    </div>
                    <div className="relative flex-1">
                         <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                         <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                         />
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="mt-3 flex justify-between text-xs font-medium text-gray-500">
                     <span>Workers: {entries.length}</span>
                     <span className="text-green-600">Present: {presentCount}</span>
                     <span className="text-red-500">Absent: {entries.length - presentCount}</span>
                </div>
            </div>
        </div>

        {/* List of Workers */}
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
            {loading ? (
                <div className="text-center py-10 text-gray-400">Loading workers...</div>
            ) : visibleEntries.map((entry, index) => {
                // Find original index in full list to update state correctly
                const realIndex = entries.findIndex(e => e.worker_id === entry.worker_id)

                return (
                    <div
                        key={entry.worker_id}
                        className={`bg-white p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
                            !entry.is_present ? 'opacity-70 bg-gray-50' : 'border-gray-100'
                        }`}
                    >
                        {/* Left: Name & Status */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => handleToggleAttendance(realIndex)}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                                    entry.is_present
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                    : 'bg-red-100 text-red-500 hover:bg-red-200'
                                }`}
                            >
                                {entry.is_present ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                            </button>

                            <div>
                                <h3 className={`font-bold text-gray-900 ${!entry.is_present && 'line-through text-gray-400'}`}>
                                    {entry.name}
                                </h3>
                                <p className="text-xs font-medium text-gray-500">
                                    {entry.is_present ? 'Present' : 'Absent'}
                                </p>
                            </div>
                        </div>

                        {/* Right: Tons Input */}
                        <div className="relative">
                            <input
                                type="number"
                                placeholder="0"
                                value={entry.tons}
                                onChange={(e) => handleTonsChange(realIndex, e.target.value)}
                                disabled={!entry.is_present} // Cannot enter tons if Absent
                                className={`w-24 py-2 px-3 text-right font-bold text-lg rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    !entry.is_present ? 'bg-gray-100 text-gray-400 border-transparent' : 'border-gray-300'
                                }`}
                            />
                            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none hidden">T</span>
                        </div>
                    </div>
                )
            })}
        </div>

        {/* Bottom Floating Save Button */}
        <div className="fixed bottom-6 left-0 right-0 px-4 z-20 flex justify-center">
            <button
                onClick={handleSaveAll}
                disabled={saving}
                className="max-w-md w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                {saving ? (
                    'Saving...'
                ) : (
                    <>
                        <Save className="w-5 h-5" />
                        Save {entries.filter(e => !e.is_saved).length > 0 ? 'Changes' : 'All'}
                    </>
                )}
            </button>
        </div>

    </div>
  )
}
