'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { createBrowserClient } from '@supabase/ssr'
import { User, UserRole } from '@/types'

type ApiProject = {
  id: string
  name: string
  description: string | null
  created_at: string
  company_id: string
  companies?: { name?: string } | { name?: string }[] | null
}

const getCompanyName = (company: ApiProject['companies']) => {
  if (!company) return ''
  if (Array.isArray(company)) return company[0]?.name ?? ''
  return company.name ?? ''
}

export default function AdminProjectsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true

    const loadData = async () => {
      setLoading(true)
      setError(null)

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { session } } = await supabase.auth.getSession()

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

      const projectsResponse = await fetch('/api/admin/projects', { cache: 'no-store' })
      if (!projectsResponse.ok) {
        if (active) {
          setError('프로젝트 목록을 불러올 수 없습니다')
          setLoading(false)
        }
        return
      }

      const data = await projectsResponse.json()
      const items = Array.isArray(data?.projects) ? data.projects : []

      if (active) {
        setCurrentUser(user)
        setProjects(items)
        setLoading(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [router])

  const filteredProjects = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return projects
    return projects.filter((project) => project.name.toLowerCase().includes(keyword))
  }, [projects, query])

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
      <div className="max-w-6xl">
        <div className="flex flex-col gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">프로젝트 관리</h1>
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="프로젝트명 검색"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {loading && <div className="text-sm text-gray-500 mb-4">목록을 불러오는 중...</div>}
        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        <div className="space-y-3">
          {filteredProjects.length === 0 ? (
            <div className="bg-muted rounded-lg p-8 text-center text-gray-600">
              등록된 프로젝트가 없습니다
            </div>
          ) : (
            filteredProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => router.push(`/app/admin/projects/${project.id}`)}
                className="w-full text-left bg-white border border-border rounded-lg p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {project.description || '설명 없음'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>{getCompanyName(project.companies) || '고객사 미지정'}</p>
                    <p className="mt-1">{new Date(project.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  )
}
