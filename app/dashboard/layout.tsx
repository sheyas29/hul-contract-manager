import MobileHeader from '@/components/MobileHeader'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <MobileHeader />
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all">
        {children}
      </main>
    </div>
  )
}
