'use client';

import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Checking permissions...</div>;

  if (role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center max-w-md">
          <div className="text-4xl mb-4">🚫</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You do not have permission to view this page. This area is restricted to Administrators only.</p>
          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
