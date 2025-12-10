'use client'

import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const role = searchParams.get('role') || 'user'
  const isSupervisor = role === 'supervisor'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">{isSupervisor ? '👷' : '👑'}</div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSupervisor ? 'Supervisor Login' : 'Admin Login'}
          </h1>
          <p className="text-sm text-gray-500 mt-2">Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white font-semibold transition-colors ${
              isSupervisor
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-indigo-900 hover:bg-indigo-800'
            }`}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  useEffect(() => {
    const clearAllSessions = async () => {
      try {
        // 1. Supabase sign out
        await supabase.auth.signOut({ scope: 'global' })

        // 2. Clear browser storage
        localStorage.clear()
        sessionStorage.clear()

        // 3. Delete ALL cookies
        document.cookie.split(';').forEach((c) => {
          const eqPos = c.indexOf('=')
          const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim()
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`
        })

        // 4. Delete service worker cache if exists
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map(name => caches.delete(name)))
        }

      } catch (error) {
        console.error('Session clear error:', error)
      }
    }

    clearAllSessions()
  }, [])

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
