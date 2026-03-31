'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  companies?: { name?: string } | { name?: string }[] | null
}

type DashboardCounts = {
  projects: number
  activeProjects: number
  companies: number
  users: number
}

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
        setRecentProjects(Array.isArray(data?.recentProjects) ? data.recentProjects : [])
        setLoading(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [router])

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
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs text-gray-500">전체 프로젝트</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {counts?.projects ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs text-gray-500">진행중 프로젝트</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {counts?.activeProjects ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs text-gray-500">전체 고객사</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {counts?.companies ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs text-gray-500">전체 담당자</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {counts?.users ?? 0}
            </p>
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
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => router.push(`/app/admin/projects/${project.id}`)}
                  className="w-full rounded-lg border border-border px-4 py-3 text-left hover:bg-gray-50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {getCompanyName(project.companies) || '미지정'}
                      </p>
                      <p className="text-sm text-gray-700">{project.name}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>
                        STEP {project.step} · {STEP_LABELS[project.step]}
                      </p>
                      <p className="mt-1">
                        상태: {statusLabelMap[project.status ?? 'active'] ?? '진행중'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
