'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Building2, FileText, TrendingUp } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { STEP_LABELS } from '@/lib/constants'
import { createBrowserClient } from '@supabase/ssr'
import { User, UserRole } from '@/types'
import { useToast } from '@/hooks/use-toast'

type DdayCompany = {
  id: string
  name: string
  contract_end: string
  daysLeft: number
}

type FeedItem = {
  id: string
  type: string
  content: string
  author: string
  created_at: string
  pinned?: boolean
  company_id: string
  company_name: string
}

type DashboardData = {
  activeCompanies: number
  contractCompleted: number
  draftVersions: number
  ddayCompanies: DdayCompany[]
  recentActivityFeed: FeedItem[]
  stepCounts: Record<number, number>
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadData = async () => {
      setDataLoading(true)

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const sessionRole = session.user.user_metadata?.role ?? null
      let me: {
        userId: string
        email: string
        name: string | null
        role: string | null
        companyId: string | null
        mustChangePassword: boolean
        status: string
      } | null = null

      if (sessionRole) {
        me = {
          userId: session.user.id,
          email: session.user.email ?? '',
          name: session.user.user_metadata?.name ?? null,
          role: sessionRole,
          companyId: session.user.user_metadata?.company_id ?? null,
          mustChangePassword: false,
          status: 'active',
        }
      } else {
        const meResponse = await fetch('/api/auth/me', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        if (meResponse.status === 401) {
          router.replace('/login')
          return
        }

        if (!meResponse.ok) {
          if (active) {
            showToast('사용자 정보를 불러올 수 없습니다', 'error')
            setDataLoading(false)
          }
          return
        }

        me = await meResponse.json()
      }

      const user: User = {
        id: me?.userId ?? '',
        email: me?.email ?? '',
        name: me?.name ?? me?.email ?? '',
        role: (me?.role ?? 'staff') as UserRole,
        companyId: me?.companyId ?? '',
        mustChangePassword: me?.mustChangePassword ?? false,
        status: (me?.status ?? 'active') as 'active' | 'inactive',
      }

      if (user.role !== 'staff_admin') {
        router.replace('/app/projects')
        return
      }

      if (active) setCurrentUser(user)

      const response = await fetch('/api/admin/dashboard', { cache: 'no-store' })
      if (!response.ok) {
        if (active) {
          showToast('대시보드 정보를 불러올 수 없습니다', 'error')
          setDataLoading(false)
        }
        return
      }

      const json = await response.json()
      if (active) {
        setData(json)
        setDataLoading(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [router, showToast])

  const stepMax = useMemo(
    () => Math.max(...Object.values(data?.stepCounts ?? { 0: 0 }), 1),
    [data]
  )

  const stepTotal = useMemo(
    () => Object.values(data?.stepCounts ?? {}).reduce((sum, n) => sum + n, 0),
    [data]
  )

  const ddayUrgency = useMemo(() => {
    const min = data?.ddayCompanies?.[0]?.daysLeft ?? null
    if (min === null || (data?.ddayCompanies?.length ?? 0) === 0) return 'none'
    return min <= 7 ? 'red' : 'yellow'
  }, [data])

  if (!currentUser) {
    return <div className="p-6 text-sm text-gray-400">로딩 중...</div>
  }

  return (
    <AppLayout user={currentUser}>
      <div className="max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">안녕하세요, 브루션 관리자님!</h1>
          <p className="text-sm text-gray-500 mt-1">운영 현황을 빠르게 확인하세요.</p>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 진행 중인 고객사 */}
          <button
            type="button"
            onClick={() => router.push('/app/admin/companies')}
            className="rounded-lg border border-border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">진행 중인 고객사</p>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-3 text-4xl font-bold text-gray-900">
              {dataLoading ? '—' : (data?.activeCompanies ?? 0)}
            </p>
          </button>

          {/* 이번달 계약 완료 */}
          <button
            type="button"
            onClick={() => router.push('/app/admin/companies')}
            className="rounded-lg border border-border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">계약 완료</p>
              <Building2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-3 text-4xl font-bold text-gray-900">
              {dataLoading ? '—' : (data?.contractCompleted ?? 0)}
            </p>
          </button>

          {/* 처리 대기 드롭 */}
          <button
            type="button"
            onClick={() => router.push('/app/admin/projects')}
            className="rounded-lg border border-border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">처리 대기 드롭</p>
              <FileText className="h-4 w-4 text-orange-500" />
            </div>
            <p className="mt-3 text-4xl font-bold text-gray-900">
              {dataLoading ? '—' : (data?.draftVersions ?? 0)}
            </p>
          </button>

          {/* D-day 임박 — 클릭 가능, 내부 목록 표시 */}
          <button
            type="button"
            onClick={() => router.push('/app/admin/companies')}
            className={`rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
              ddayUrgency === 'red'
                ? 'border-red-200 bg-red-50'
                : ddayUrgency === 'yellow'
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-border bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <p
                className={`text-sm ${
                  ddayUrgency === 'red'
                    ? 'text-red-600'
                    : ddayUrgency === 'yellow'
                      ? 'text-yellow-700'
                      : 'text-gray-500'
                }`}
              >
                D-day 임박
              </p>
              <AlertTriangle
                className={`h-4 w-4 ${
                  ddayUrgency === 'red'
                    ? 'text-red-500'
                    : ddayUrgency === 'yellow'
                      ? 'text-yellow-500'
                      : 'text-gray-400'
                }`}
              />
            </div>
            <p
              className={`mt-3 text-4xl font-bold ${
                ddayUrgency === 'red'
                  ? 'text-red-700'
                  : ddayUrgency === 'yellow'
                    ? 'text-yellow-700'
                    : 'text-gray-900'
              }`}
            >
              {dataLoading ? '—' : (data?.ddayCompanies?.length ?? 0)}
            </p>
            {/* 고객사 목록 */}
            {!dataLoading && (
              <div className="mt-3 space-y-1">
                {(data?.ddayCompanies?.length ?? 0) === 0 ? (
                  <p className="text-xs text-gray-400">D-day 임박 고객사 없음</p>
                ) : (
                  data!.ddayCompanies.slice(0, 3).map((company) => (
                    <div key={company.id} className="flex items-center justify-between gap-1">
                      <p className="text-xs text-gray-700 truncate">{company.name}</p>
                      <span
                        className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                          company.daysLeft <= 7
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        D-{company.daysLeft}
                      </span>
                    </div>
                  ))
                )}
                {(data?.ddayCompanies?.length ?? 0) > 3 && (
                  <p className="text-xs text-gray-400">+{data!.ddayCompanies.length - 3}개 더</p>
                )}
              </div>
            )}
          </button>
        </div>

        {/* Main 2-column */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 최근 활동 피드 */}
          <div className="rounded-lg border border-border bg-white p-5 min-h-[220px]">
            <h2 className="text-base font-semibold text-gray-900 mb-4">최근 활동</h2>
            {!dataLoading && !data?.recentActivityFeed?.length ? (
              <p className="text-sm text-gray-400">활동 기록이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {(dataLoading
                  ? ([] as FeedItem[])
                  : (data?.recentActivityFeed ?? [])
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(`/app/admin/companies/${item.company_id}`)}
                    className="w-full rounded-lg border border-gray-100 px-3 py-2.5 text-left hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-blue-600 truncate">
                          {item.company_name}
                        </p>
                        <p className="text-sm text-gray-700 truncate mt-0.5">{item.content}</p>
                      </div>
                      <p className="text-xs text-gray-400 shrink-0">
                        {new Date(item.created_at).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* STEP별 현황 */}
          <div className="rounded-lg border border-border bg-white p-5 min-h-[220px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">STEP별 현황</h2>
              <span className="text-xs text-gray-400">총 {stepTotal}건</span>
            </div>
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((step) => {
                const count = data?.stepCounts?.[step] ?? 0
                const ratio = dataLoading ? 0 : Math.round((count / stepMax) * 100)
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => router.push('/app/admin/projects')}
                    className="w-full space-y-1 text-left group"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                        STEP {step} · {STEP_LABELS[step]}
                      </span>
                      <span className="text-gray-500">{dataLoading ? '—' : `${count}건`}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
