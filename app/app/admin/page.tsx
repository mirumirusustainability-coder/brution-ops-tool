'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, FolderOpen, TrendingUp, Users } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { STEP_LABELS } from '@/lib/constants'
import { createBrowserClient } from '@supabase/ssr'
import { User, UserRole } from '@/types'

type DashboardProject = {
  id: string
  name: string
  step: number
  status?: 'active' | 'completed' | 'paused'
  created_at: string
  updated_at?: string | null
  companies?: { name?: string } | { name?: string }[] | null
}

type DashboardCounts = {
  projects: number
  activeProjects: number
  companies: number
  users: number
}

type StepCounts = Record<number, number>

const getCompanyName = (company: DashboardProject['companies']) => {
  if (!company) return ''
  if (Array.isArray(company)) return company[0]?.name ?? ''
  return company.name ?? ''
}

const statusLabelMap: Record<string, string> = {
  active: '진행중',
  completed: '완료',
  paused: '보류',
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [counts, setCounts] = useState<DashboardCounts | null>(null)
  const [stepCounts, setStepCounts] = useState<StepCounts>({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 })
  const [pendingVersions, setPendingVersions] = useState(0)
  const [pausedProjects, setPausedProjects] = useState(0)
  const [recentProjects, setRecentProjects] = useState<DashboardProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadData = async () => {
      setLoading(true)
      setError(null)

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
        role: string | null
        companyId: string | null
        mustChangePassword: boolean
        status: string
      } | null = null

      if (sessionRole) {
        me = {
          userId: session.user.id,
          email: session.user.email ?? '',
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
            setError('사용자 정보를 불러올 수 없습니다')
            setLoading(false)
          }
          return
        }

        me = await meResponse.json()
      }

      const user: User = {
        id: me?.userId ?? '',
        email: me?.email ?? '',
        name: me?.email ?? '',
        role: (me?.role ?? 'staff') as UserRole,
        companyId: me?.companyId ?? '',
        mustChangePassword: me?.mustChangePassword ?? false,
        status: (me?.status ?? 'active') as 'active' | 'inactive',
      }

      if (user.role !== 'staff_admin') {
        router.replace('/app/projects')
        return
      }

      const response = await fetch('/api/admin/dashboard', { cache: 'no-store' })
      if (!response.ok) {
        if (active) {
          setError('대시보드 정보를 불러올 수 없습니다')
          setLoading(false)
        }
        return
      }

      const data = await response.json()
      if (active) {
        setCurrentUser(user)
        setCounts(data?.counts ?? null)
        setStepCounts(data?.stepCounts ?? { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 })
        setPendingVersions(data?.pendingVersions ?? 0)
        setPausedProjects(data?.pausedProjects ?? 0)
        setRecentProjects(Array.isArray(data?.recentProjects) ? data.recentProjects : [])
        setLoading(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [router])

  const totalProjects = counts?.projects ?? 0
  const stepTotal = useMemo(
    () => ({
      0: stepCounts[0] ?? 0,
      1: stepCounts[1] ?? 0,
      2: stepCounts[2] ?? 0,
      3: stepCounts[3] ?? 0,
      4: stepCounts[4] ?? 0,
    }),
    [stepCounts]
  )

  const statusBadgeStyles: Record<string, string> = {
    active: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    paused: 'bg-gray-100 text-gray-600',
  }

  if (loading && !currentUser) {
    return <div className="p-6 text-sm text-gray-500">로딩 중...</div>
  }

  if (error && !currentUser) {
    return <div className="p-6 text-sm text-red-600">{error}</div>
  }

  if (!currentUser) {
    return <div className="p-6 text-sm text-gray-500">사용자 정보를 확인할 수 없습니다.</div>
  }

  return (
    <AppLayout user={currentUser}>
      <div className="max-w-6xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">어드민 대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">운영 현황을 빠르게 확인하세요.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">전체 프로젝트</p>
              <FolderOpen className="h-5 w-5 text-blue-500" />
            </div>
            <p className="mt-3 text-4xl font-semibold text-gray-900">{counts?.projects ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">진행중 프로젝트</p>
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-3 text-4xl font-semibold text-gray-900">
              {counts?.activeProjects ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">전체 고객사</p>
              <Building2 className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="mt-3 text-4xl font-semibold text-gray-900">{counts?.companies ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">전체 담당자</p>
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <p className="mt-3 text-4xl font-semibold text-gray-900">{counts?.users ?? 0}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-lg border border-border bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">STEP별 프로젝트 현황</h2>
              <span className="text-xs text-gray-400">총 {totalProjects}건</span>
            </div>
            <div className="space-y-3">
              {Object.entries(stepTotal).map(([stepKey, count]) => {
                const step = Number(stepKey)
                const ratio = totalProjects > 0 ? Math.round((count / totalProjects) * 100) : 0
                return (
                  <div key={step} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>
                        STEP {step} · {STEP_LABELS[step]}
                      </span>
                      <span>{count}건</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">액션 필요</h2>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => router.push('/app/admin/projects')}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 text-left hover:bg-gray-100"
              >
                <p className="text-xs text-gray-500">검토중 버전</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{pendingVersions}</p>
              </button>
              <button
                type="button"
                onClick={() => router.push('/app/admin/projects')}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 text-left hover:bg-gray-100"
              >
                <p className="text-xs text-gray-500">보류 프로젝트</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{pausedProjects}</p>
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">최근 프로젝트</h2>
            <button
              type="button"
              onClick={() => router.push('/app/admin/projects')}
              className="text-sm text-primary hover:text-primary-hover"
            >
              전체 보기
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">최근 프로젝트를 불러오는 중...</div>
          ) : recentProjects.length === 0 ? (
            <div className="text-sm text-gray-500">등록된 프로젝트가 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => {
                const statusValue = project.status ?? 'active'
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => router.push(`/app/admin/projects/${project.id}`)}
                    className="w-full rounded-lg border border-border px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-gray-900">
                          {getCompanyName(project.companies) || '미지정'}
                        </p>
                        <p className="text-lg font-semibold text-gray-800">{project.name}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          마지막 업데이트: {new Date(project.updated_at ?? project.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-500 space-y-2">
                        <p>
                          STEP {project.step} · {STEP_LABELS[project.step]}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            statusBadgeStyles[statusValue]
                          }`}
                        >
                          {statusLabelMap[statusValue] ?? '진행중'}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
