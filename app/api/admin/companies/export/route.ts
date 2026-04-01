import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import ExcelJS from 'exceljs'

import { isStaffAdmin } from '@/lib/supabase/auth'
import { createSupabaseAdmin } from '@/lib/supabase/server'

const getProfile = async () => {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {}
        },
        remove: (name, options) => {
          try {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 })
          } catch {}
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('UNAUTHORIZED')
  }

  const admin = createSupabaseAdmin()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('user_id, email, name, role, company_id, status, must_change_password')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('UNAUTHORIZED')
  }

  if (profile.status !== 'active') {
    throw new Error('INACTIVE')
  }

  return profile
}

export const GET = async () => {
  try {
    const profile = await getProfile()
    if (!isStaffAdmin(profile.role)) {
      return new Response(JSON.stringify({ error: 'FORBIDDEN' }), { status: 403 })
    }

    const admin = createSupabaseAdmin()
    const { data: companies, error } = await admin
      .from('companies')
      .select('id, name, metadata, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      return new Response(JSON.stringify({ error: 'COMPANIES_FETCH_FAILED' }), { status: 500 })
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('고객사 목록')

    worksheet.columns = [
      { header: '회사명', key: 'name', width: 20 },
      { header: '사업자번호', key: 'biz_no', width: 15 },
      { header: '주소', key: 'address', width: 30 },
      { header: '대표연락처', key: 'phone', width: 15 },
      { header: '담당자이름', key: 'contact_name', width: 15 },
      { header: '담당자이메일', key: 'contact_email', width: 25 },
      { header: '계약상태', key: 'contract_status', width: 12 },
      { header: '스타터패키지', key: 'starter_package', width: 12 },
      { header: '전체금액', key: 'total_amount', width: 15 },
      { header: '계약금입금', key: 'deposit_paid', width: 12 },
      { header: '잔금입금', key: 'balance_paid', width: 12 },
      { header: '계약시작일', key: 'contract_start', width: 12 },
      { header: '계약종료일', key: 'contract_end', width: 12 },
      { header: 'Lead Source', key: 'lead_source', width: 15 },
      { header: '관심카테고리', key: 'interest_category', width: 20 },
      { header: 'Pain Point', key: 'pain_point', width: 30 },
      { header: 'Client Tier', key: 'client_tier', width: 10 },
      { header: '내부메모', key: 'internal_notes', width: 30 },
    ]

    ;(companies ?? []).forEach((company) => {
      const m = (company.metadata ?? {}) as Record<string, any>
      worksheet.addRow({
        name: company.name ?? '',
        biz_no: m.biz_no ?? '',
        address: m.address ?? '',
        phone: m.phone ?? '',
        contact_name: m.contact_name ?? '',
        contact_email: m.contact_email ?? '',
        contract_status: m.contract_status ?? '',
        starter_package: m.starter_package ? 'Y' : 'N',
        total_amount: m.total_amount ?? '',
        deposit_paid: m.deposit_paid ? 'Y' : 'N',
        balance_paid: m.balance_paid ? 'Y' : 'N',
        contract_start: m.contract_start ?? '',
        contract_end: m.contract_end ?? '',
        lead_source: m.lead_source ?? '',
        interest_category: Array.isArray(m.interest_category) ? m.interest_category.join(', ') : '',
        pain_point: m.pain_point ?? '',
        client_tier: m.client_tier ?? '',
        internal_notes: m.internal_notes ?? '',
      })
    })

    const buffer = await workbook.xlsx.writeBuffer()

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="brution-companies.xlsx"',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return new Response(JSON.stringify({ error: message }), { status })
  }
}
