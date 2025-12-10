'use client';

import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AuditLogsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && isAdmin) fetchLogs();
  }, [isAdmin, authLoading]);

  async function fetchLogs() {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) setLogs(data);
    setLoading(false);
  }

  if (authLoading || loading) return <div className="p-8">Loading logs...</div>;

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
        <p>Only Admins can view audit logs.</p>
        <Link href="/dashboard" className="text-blue-600 underline mt-4 block">Go Back</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🕵️ Activity Audit Log</h1>
          <Link href="/dashboard" className="text-blue-600 hover:underline">← Back</Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Time</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Action</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {log.user_email?.split('@')[0]}
                  </td>
                  <td className="py-3 px-4 text-xs font-bold text-blue-600">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <div className="p-8 text-center text-gray-400">No logs found yet.</div>}
        </div>
      </div>
    </div>
  );
}
