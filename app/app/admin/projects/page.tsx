'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, X } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { createBrowserClient } from '@supabase/ssr'
import { User, UserRole } from '@/types'

type ApiProject = {
  id: string
  name: string
  description: string | null
  created_at: string
  company_id: string
  status?: 'active' | 'completed' | 'paused'
  companies?: { name?: string } | { name?: string }[] | null
}

type ApiCompany = {
  id: string
  name: string
}

const stepOptions = [
  { value: 0, label: 'STEP 0 · 스타터 패키지' },
  { value: 1, label: 'STEP 1 · 브랜드 기획' },
  { value: 2, label: 'STEP 2 · 디자인·인증' },
  { value: 3, label: 'STEP 3 · 생산·납품' },
  { value: 4, label: 'STEP 4 · 출시' },
]

const statusTabs = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '진행중' },
  { value: 'completed', label: '완료' },
  { value: 'paused', label: '보류' },
]

const getCompanyName = (company: ApiProject['companies']) => {
  if (!company) return ''
  if (Array.isArray(company)) return company[0]?.name ?? ''
  return company.name ?? ''
}

export default function AdminProjectsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [companies, setCompanies] = useState<ApiCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'paused'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCompanyId, setFormCompanyId] = useState('')
  const [formStep, setFormStep] = useState(0)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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

      const loadProjects = async () => {
        const projectsResponse = await fetch('/api/admin/projects', { cache: 'no-store' })
        if (!projectsResponse.ok) {
          if (active) {
            setError('프로젝트 목록을 불러올 수 없습니다')
            setLoading(false)
          }
          return false
        }

        const data = await projectsResponse.json()
        const items = Array.isArray(data?.projects) ? data.projects : []
        if (active) {
          setProjects(items)
        }
        return true
      }

      const loadCompanies = async () => {
        const response = await fetch('/api/admin/companies', { cache: 'no-store' })
        if (!response.ok) {
          if (active) {
            setError('고객사 목록을 불러올 수 없습니다')
          }
          return false
        }
        const data = await response.json()
        const items = Array.isArray(data?.companies) ? data.companies : []
        if (active) {
          setCompanies(items)
          if (!formCompanyId && items.length > 0) {
            setFormCompanyId(items[0].id)
          }
        }
        return true
      }

      await Promise.all([loadProjects(), loadCompanies()])

      if (active) {
        setCurrentUser(user)
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
    let result = projects
    if (statusFilter !== 'all') {
      result = result.filter((project) => (project.status ?? 'active') === statusFilter)
    }
    if (!keyword) return result
    return result.filter((project) => project.name.toLowerCase().includes(keyword))
  }, [projects, query, statusFilter])

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-gray-900">프로젝트 관리</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              새 프로젝트 추가
            </button>
          </div>
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
          <div className="flex flex-wrap gap-2">
            {statusTabs.map((tab) => {
              const isActive = statusFilter === tab.value
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value as 'all' | 'active' | 'completed' | 'paused')}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    isActive
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {loading && <div className="text-sm text-gray-500 mb-4">목록을 불러오는 중...</div>}
        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-lg bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">새 프로젝트 추가</h3>
                <button onClick={() => setShowCreateModal(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="프로젝트명"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <textarea
                  value={formDescription}
                  onChange={(event) => setFormDescription(event.target.value)}
                  placeholder="설명 (선택)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
                <select
                  value={formCompanyId}
                  onChange={(event) => setFormCompanyId(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                <select
                  value={formStep}
                  onChange={(event) => setFormStep(Number(event.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {stepOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {formError && <p className="text-sm text-red-600">{formError}</p>}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setFormError(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={creating}
                  onClick={async () => {
                    if (!formName.trim()) {
                      setFormError('프로젝트명을 입력하세요')
                      return
                    }
                    if (!formCompanyId) {
                      setFormError('고객사를 선택하세요')
                      return
                    }

                    setCreating(true)
                    setFormError(null)

                    const response = await fetch('/api/admin/projects', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: formName.trim(),
                        description: formDescription.trim() || null,
                        companyId: formCompanyId,
                        step: formStep,
                      }),
                    })

                    if (!response.ok) {
                      setFormError('프로젝트 생성에 실패했습니다')
                      setCreating(false)
                      return
                    }

                    setFormName('')
                    setFormDescription('')
                    setFormStep(0)
                    setShowCreateModal(false)
                    setCreating(false)

                    const projectsResponse = await fetch('/api/admin/projects', { cache: 'no-store' })
                    if (projectsResponse.ok) {
                      const data = await projectsResponse.json()
                      const items = Array.isArray(data?.projects) ? data.projects : []
                      setProjects(items)
                    }
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50"
                >
                  {creating ? '생성 중...' : '추가'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {filteredProjects.length === 0 ? (
            <div className="bg-muted rounded-lg p-8 text-center text-gray-600">
              등록된 프로젝트가 없습니다
            </div>
          ) : (
            filteredProjects.map((project) => {
              const isCompleted = (project.status ?? 'active') === 'completed'

              return (
                <button
                  key={project.id}
                  onClick={() => router.push(`/app/admin/projects/${project.id}`)}
                  className={`w-full text-left border border-border rounded-lg p-5 hover:shadow-sm transition-shadow ${
                    isCompleted ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-semibold ${isCompleted ? 'text-gray-600' : 'text-gray-900'}`}>
                        {project.name}
                      </h3>
                      <p className={`text-sm mt-1 ${isCompleted ? 'text-gray-500' : 'text-gray-500'}`}>
                        {project.description || '설명 없음'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        고객사: {getCompanyName(project.companies) || '미지정'}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p className="mt-1">{new Date(project.created_at).toLocaleDateString('ko-KR')}</p>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </AppLayout>
  )
}
