'use client'

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

export default function MobileHeader() {
  const router = useRouter()
  const { role } = useAuth()

    const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  }


  return (
    <div className="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
      <Link href="/dashboard" className="font-bold text-lg">Unified App</Link>

      <div className="flex items-center gap-4">
        <span className="text-xs uppercase bg-gray-800 px-2 py-1 rounded text-gray-300">
          {role}
        </span>
        <button
          onClick={handleLogout}
          className="text-sm bg-red-600 px-3 py-1 rounded hover:bg-red-700 font-bold"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
