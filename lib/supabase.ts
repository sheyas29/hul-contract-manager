import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export type Worker = {
  id: string
  name: string
  phone: string | null
  account_number: string | null
  join_date: string
  status: 'active' | 'inactive' | 'resigned'
  role: 'worker' | 'supervisor'
  base_salary: number
  created_at: string
  updated_at: string
}

export type DailyTon = {
  id: string
  worker_id: string
  date: string
  tons_lifted: number
  notes: string | null
  created_at: string
}

export type Advance = {
  id: string
  worker_id: string
  advance_amount: number
  advance_date: string
  reason: string | null
  total_repaid: number
  balance: number
  status: 'pending' | 'repaying' | 'completed'
  created_at: string
}

export type AdvanceRepayment = {
  id: string
  advance_id: string
  month: number
  year: number
  deduction_amount: number
  is_paid: boolean
  paid_date: string | null
  created_at: string
}

export type SalaryPayment = {
  id: string
  worker_id: string
  month: number
  year: number
  base_salary: number
  hul_direct_payment: number
  advance_deductions: number
  other_deductions: number
  net_salary: number
  payment_date: string | null
  payment_status: 'pending' | 'paid' | 'partial'
  notes: string | null
  created_at: string
}

export type MonthlyBilling = {
  id: string
  month: number
  year: number
  total_tons: number
  rate_per_ton: number
  amount_from_hul: number
  payment_date: string | null
  payment_status: 'pending' | 'received' | 'partial'
  notes: string | null
  created_at: string
}
