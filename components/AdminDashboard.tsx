'use client'
import MonthEndChecklist from '@/components/MonthEndChecklist'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type AdminStats = {
  activeWorkers: number; todayTons: number; monthTons: number; monthRevenue: number
  salaryBurn: number; livingAllowance: number; expensesBurn: number; supervisorCash: number
  pendingAdvances: number; pendingExpenses: number; overallProfit: number
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats>({
    activeWorkers: 0, todayTons: 0, monthTons: 0, monthRevenue: 0,
    salaryBurn: 0, livingAllowance: 0, expensesBurn: 0, supervisorCash: 0,
    pendingAdvances: 0, pendingExpenses: 0, overallProfit: 0
  })

  useEffect(() => { fetchAdminStats() }, [])

  const fetchAdminStats = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const currentMonth = new Date().getMonth() + 1
      const year = new Date().getFullYear()
      const monthStart = `${year}-${String(currentMonth).padStart(2, '0')}-01`
      const daysInMonth = new Date(year, currentMonth, 0).getDate()

      const [{ count: workerCount, data: workers }, { data: todayTonsData }, { data: monthTonsData },
        { data: advancesData }, { data: walletData }, { data: expensesData }, { count: pendingExpensesCount }
      ] = await Promise.all([
        supabase.from('workers').select('base_salary', { count: 'exact' }).eq('status', 'active'),
        supabase.from('daily_tons').select('tons_lifted').eq('date', today),
        supabase.from('daily_tons').select('tons_lifted').gte('date', monthStart),
        supabase.from('advances').select('balance').neq('status', 'completed'),
        supabase.from('supervisor_wallet').select('balance').maybeSingle(),
        supabase.from('petty_cash_transactions').select('amount').eq('type', 'expense').eq('status', 'approved').gte('date', monthStart),
        supabase.from('petty_cash_transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ])

      const todayTons = todayTonsData?.reduce((sum, item) => sum + Number(item.tons_lifted), 0) || 0
      const monthTons = monthTonsData?.reduce((sum, item) => sum + Number(item.tons_lifted), 0) || 0
      const monthRevenue = monthTons * 167
      const salaryBurn = workers?.reduce((sum, w) => sum + Number(w.base_salary), 0) || 0
      const livingAllowance = (workerCount || 0) * daysInMonth * 192
      const expensesBurn = expensesData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0
      const totalExpenses = salaryBurn + livingAllowance + expensesBurn
      const overallProfit = monthRevenue - totalExpenses
      const pendingAdvances = advancesData?.reduce((sum, item) => sum + Number(item.balance), 0) || 0

      setStats({ activeWorkers: workerCount || 0, todayTons, monthTons, monthRevenue, salaryBurn, livingAllowance,
        expensesBurn, supervisorCash: walletData?.balance || 0, pendingAdvances, pendingExpenses: pendingExpensesCount || 0, overallProfit })
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>

  const profitColor = stats.overallProfit >= 0 ? 'text-green-600' : 'text-red-600'
  const cashWarning = stats.supervisorCash < 5000

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MonthEndChecklist />
          <Link href="/dashboard/logs" className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium">🕵️ Logs</Link>
        </div>
      </div>

      {cashWarning && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-4"><p className="font-bold text-red-800">⚠️ Low Cash</p></div>}
      {stats.pendingExpenses > 0 && <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg mb-4"><p className="font-bold text-yellow-800">⏳ {stats.pendingExpenses} Pending</p></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card label="Active Workers" value={stats.activeWorkers} />
        <Card label="Today's Output" value={`${stats.todayTons.toFixed(2)} tons`} color="indigo" />
        <Card label="Month Revenue" value={`₹${stats.monthRevenue.toLocaleString('en-IN')}`} color="green" />
        <Card label="Net Profit" value={`₹${stats.overallProfit.toLocaleString('en-IN')}`} color={profitColor === 'text-green-600' ? 'green' : 'red'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">📊 Revenue</h3>
          <div className="space-y-2">
            <Line label="Tons (Month)" value={`${stats.monthTons.toFixed(2)} MT`} />
            <Line label="Rate/Ton" value="₹167" />
            <div className="flex justify-between bg-green-50 p-3 rounded border-l-4 border-green-500">
              <span className="font-bold text-green-900">Revenue</span>
              <span className="font-bold text-green-700">₹{stats.monthRevenue.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">💰 Expenses</h3>
          <div className="space-y-2">
            <Line label="Salaries" value={`-₹${stats.salaryBurn.toLocaleString('en-IN')}`} red />
            <Line label="Food & Stay" value={`-₹${stats.livingAllowance.toLocaleString('en-IN')}`} red />
            <Line label="Petty Cash" value={`-₹${stats.expensesBurn.toLocaleString('en-IN')}`} red />
            <div className="flex justify-between bg-red-50 p-3 rounded border-l-4 border-red-500">
              <span className="font-bold text-red-900">Total</span>
              <span className="font-bold text-red-700">-₹{(stats.salaryBurn + stats.livingAllowance + stats.expensesBurn).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <InfoCard title="💳 Cash-in-Hand" value={`₹${stats.supervisorCash.toLocaleString('en-IN')}`} link="/dashboard/expenses" linkText="Audit Cash" color="blue" />
        <InfoCard title="💸 Advances" value={`₹${stats.pendingAdvances.toLocaleString('en-IN')}`} link="/dashboard/advances" linkText="Collect" color="orange" />
        <InfoCard title="⏳ Pending" value={stats.pendingExpenses} link="/dashboard/expenses" linkText="Review" color="purple" />
      </div>

      <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ActionCard icon="📊" title="Bill" desc="HUL Billing" href="/dashboard/billing" />
        <ActionCard icon="💵" title="Payroll" desc="Salary" href="/dashboard/salary" />
        <ActionCard icon="📈" title="Reports" desc="P&L" href="/dashboard/reports" />
        <ActionCard icon="👷" title="Workers" desc="Manage" href="/dashboard/workers" />
      </div>
    </div>
  )
}

function Card({ label, value, color = 'gray' }: any) {
  const colors: any = { indigo: 'text-indigo-600', green: 'text-green-600', red: 'text-red-600' }
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <p className="text-gray-500 text-xs uppercase font-bold mb-2">{label}</p>
      <p className={`text-3xl font-bold ${colors[color] || 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function Line({ label, value, red = false }: any) {
  return <div className="flex justify-between pb-2 border-b border-gray-100">
    <span className="text-gray-600">{label}</span>
    <span className={`font-bold ${red ? 'text-red-600' : ''}`}>{value}</span>
  </div>
}

function InfoCard({ title, value, link, linkText, color }: any) {
  const colors: any = { blue: 'bg-blue-50 border-blue-500 text-blue-900 text-blue-600',
    orange: 'bg-orange-50 border-orange-500 text-orange-900 text-orange-600',
    purple: 'bg-purple-50 border-purple-500 text-purple-900 text-purple-600' }
  const [bg, border, text, linkColor] = colors[color].split(' ')
  return (
    <div className={`${bg} border-l-4 ${border} p-6 rounded-xl`}>
      <p className={`text-sm font-bold uppercase mb-2 ${text}`}>{title}</p>
      <p className={`text-3xl font-bold ${linkColor}`}>{value}</p>
      <Link href={link} className={`text-xs hover:underline mt-2 block font-medium ${linkColor}`}>{linkText} →</Link>
    </div>
  )
}

function ActionCard({ icon, title, desc, href }: any) {
  return (
    <Link href={href} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all">
      <p className="text-2xl mb-2">{icon}</p>
      <p className="font-bold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500">{desc}</p>
    </Link>
  )
}
