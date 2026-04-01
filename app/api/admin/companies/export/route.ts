import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import * as XLSX from 'xlsx'

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

    const headers = [
      '회사명',
      '사업자번호',
      '주소',
      '대표연락처',
      '담당자이름',
      '담당자이메일',
      '계약상태',
      '스타터패키지',
      '전체금액',
      '계약금입금',
      '잔금입금',
      '계약시작일',
      '계약종료일',
      'Lead Source',
      '관심카테고리',
      'Pain Point',
      'Client Tier',
      '메모',
    ]

    const rows = (companies ?? []).map((company) => {
      const metadata = (company.metadata ?? {}) as Record<string, any>
      const interestCategory = Array.isArray(metadata.interest_category)
        ? metadata.interest_category.join(', ')
        : ''
      const starterPackage = metadata.starter_package ? '예' : '아니오'
      const depositPaid = metadata.deposit_paid ? '예' : '아니오'
      const balancePaid = metadata.balance_paid ? '예' : '아니오'

      return [
        company.name ?? '',
        metadata.biz_no ?? '',
        metadata.address ?? '',
        metadata.phone ?? '',
        metadata.contact_name ?? '',
        metadata.contact_email ?? '',
        metadata.contract_status ?? '',
        starterPackage,
        metadata.total_amount ?? '',
        depositPaid,
        balancePaid,
        metadata.contract_start ?? '',
        metadata.contract_end ?? '',
        metadata.lead_source ?? '',
        interestCategory,
        metadata.pain_point ?? '',
        metadata.client_tier ?? '',
        metadata.internal_notes ?? '',
      ]
    })

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies')

    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })

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
