'use client'

import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { role, isAdmin } = useAuth()

    const handleLogout = async () => {
    try {
      // 1. Sign out from Supabase
      await supabase.auth.signOut();

      // 2. Clear ALL browser storage
      localStorage.clear();
      sessionStorage.clear();

      // 3. Clear cookies (Supabase uses these)
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });

      // 4. Hard redirect to home
      setTimeout(() => {
        window.location.href = '/';
      }, 100);

    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  }



  const isActive = (path: string) => pathname === path

  return (
    // CHANGED: Added 'hidden md:flex' to hide on mobile
    <div className="hidden md:flex w-64 bg-gray-900 text-white min-h-screen flex-col fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-xl font-bold tracking-tight">Unified Excellance</h2>
        <div className="mt-2 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-green-500' : 'bg-orange-500'}`} />
          <span className="text-xs font-mono uppercase text-gray-400">
            {role || 'Loading...'}
          </span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">
          Operations
        </p>

        <NavLink href="/dashboard" icon="🏠" label="Dashboard" active={isActive('/dashboard')} />
        <NavLink href="/dashboard/workers" icon="👷" label="Workers" active={isActive('/dashboard/workers')} />
        <NavLink href="/dashboard/tons" icon="📦" label="Daily Tons" active={isActive('/dashboard/tons')} />

        <NavLink href="/dashboard/expenses" icon="🛡️" label="Petty Cash" active={isActive('/dashboard/expenses')} />
        <NavLink href="/dashboard/advances" icon="💰" label="Advances" active={isActive('/dashboard/advances')} />

        {isAdmin && (
          <>
            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6">
              Admin Only
            </p>
            <NavLink href="/dashboard/billing" icon="📊" label="Billing" active={isActive('/dashboard/billing')} />
            <NavLink href="/dashboard/salary" icon="💵" label="Payroll" active={isActive('/dashboard/salary')} />
            <NavLink href="/dashboard/reports" icon="📈" label="Reports" active={isActive('/dashboard/reports')} />
            <NavLink href="/dashboard/logs" icon="🕵️" label="Audit Logs" active={isActive('/dashboard/logs')} />
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  )
}

function NavLink({ href, icon, label, active }: { href: string, icon: string, label: string, active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white shadow-lg'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </Link>
  )
}
