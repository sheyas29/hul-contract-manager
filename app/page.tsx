import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            HUL Contract Manager
          </h1>
          <p className="text-gray-600 text-lg">
            Loading & Unloading Contract Management System
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-xl">
            <h3 className="font-semibold text-lg mb-2 text-blue-900">Contract Details</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 70 Workers + 1 Supervisor</li>
              <li>• Rate: ₹167 per ton</li>
              <li>• Worker Salary: ₹20,000/month</li>
              <li>• Supervisor: ₹40,000/month</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-6 rounded-xl">
            <h3 className="font-semibold text-lg mb-2 text-green-900">Features</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Daily tons tracking</li>
              <li>• Advance management</li>
              <li>• Flexible repayment schedules</li>
              <li>• Monthly billing & payroll</li>
            </ul>
          </div>
        </div>

        <Link 
          href="/dashboard"
          className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center py-4 rounded-xl font-semibold text-lg transition-colors"
        >
          Open Dashboard →
        </Link>
      </div>
    </div>
  )
}
