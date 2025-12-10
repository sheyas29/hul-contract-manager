import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Simple Navbar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="font-bold text-xl text-indigo-900">Unified Excellance</div>
          <div className="text-sm text-gray-500">HUL Contract Management System</div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="max-w-5xl w-full grid md:grid-cols-2 gap-8">

          {/* Admin Card */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-100 transition-all hover:shadow-md group">
            <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
              👑
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Portal</h2>
            <p className="text-gray-600 mb-8">
              For business owners. Access financial reports, billing, and audit logs.
            </p>
            <Link
              href="/login?role=admin"
              className="block w-full text-center bg-indigo-900 text-white py-3 rounded-xl font-semibold hover:bg-indigo-800 transition-colors"
            >
              Login as Admin →
            </Link>
          </div>

          {/* Supervisor Card */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-orange-100 transition-all hover:shadow-md group">
            <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
              👷
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Supervisor App</h2>
            <p className="text-gray-600 mb-8">
              For field supervisors. Manage workers, tons, and petty cash.
            </p>
            <Link
              href="/login?role=supervisor"
              className="block w-full text-center bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors"
            >
              Login as Supervisor →
            </Link>
          </div>

        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        © 2025 Unified Excellance. Restricted Access Only.
      </footer>
    </div>
  )
}
