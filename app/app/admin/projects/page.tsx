'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Search, X } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { ToastContainer } from '@/components/toast'
import { createBrowserClient } from '@supabase/ssr'
import { useToast } from '@/hooks/use-toast'
import { User, UserRole } from '@/types'

type ApiProject = {
  id: string
  name: string
  description: string | null
  created_at: string
  company_id: string
  status?: 'active' | 'completed' | 'paused'
  companies?: { name?: string } | { name?: string }[] | null
  deliverables?: { deliverable_versions?: { status?: string }[] }[] | null
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

const statusBadgeStyles: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  paused: 'bg-gray-100 text-gray-600',
}

const statusLabelMap: Record<string, string> = {
  active: '진행중',
  completed: '완료',
  paused: '보류',
}

const getCompanyName = (company: ApiProject['companies']) => {
  if (!company) return ''
  if (Array.isArray(company)) return company[0]?.name ?? ''
  return company.name ?? ''
}

export default function AdminProjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [companies, setCompanies] = useState<ApiCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'paused'>('all')
  const [inReviewOnly, setInReviewOnly] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCompanyId, setFormCompanyId] = useState('')
  const [formStep, setFormStep] = useState(0)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const filterParam = searchParams.get('filter')
    if (filterParam === 'active' || filterParam === 'paused') {
      setStatusFilter(filterParam)
      setInReviewOnly(false)
    } else if (filterParam === 'in_review') {
      setStatusFilter('all')
      setInReviewOnly(true)
    } else {
      setStatusFilter('all')
      setInReviewOnly(false)
    }
  }, [searchParams])

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

  const handleDeleteProject = async (project: ApiProject) => {
    const confirmed = window.confirm(`정말 ${project.name}을 삭제하시겠습니까?`)
    if (!confirmed) return

    setDeletingId(project.id)
    const response = await fetch(`/api/admin/projects/${project.id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      showToast('프로젝트 삭제에 실패했습니다', 'error')
      setDeletingId(null)
      return
    }

    setProjects((prev) => prev.filter((item) => item.id !== project.id))
    showToast('프로젝트가 삭제되었습니다', 'success')
    setDeletingId(null)
  }

  const filteredProjects = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    let result = projects
    if (statusFilter !== 'all') {
      result = result.filter((project) => (project.status ?? 'active') === statusFilter)
    }
    if (inReviewOnly) {
      result = result.filter((project) =>
        project.deliverables?.some((deliverable) =>
          deliverable.deliverable_versions?.some((version) => version.status === 'in_review')
        )
      )
    }
    if (!keyword) return result
    return result.filter((project) =>
      project.name.toLowerCase().includes(keyword) ||
      getCompanyName(project.companies).toLowerCase().includes(keyword)
    )
  }, [projects, query, statusFilter, inReviewOnly])

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
              placeholder="프로젝트명 또는 고객사명으로 검색"
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
                  onClick={() => {
                    setStatusFilter(tab.value as 'all' | 'active' | 'completed' | 'paused')
                    setInReviewOnly(false)
                  }}
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
                      showToast('프로젝트 생성에 실패했습니다', 'error')
                      setCreating(false)
                      return
                    }

                    setFormName('')
                    setFormDescription('')
                    setFormStep(0)
                    setShowCreateModal(false)
                    setCreating(false)
                    showToast('프로젝트가 생성되었습니다', 'success')

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

        <div className="overflow-hidden rounded-lg border border-border bg-white">
          {filteredProjects.length === 0 ? (
            <div className="bg-muted rounded-lg p-8 text-center text-gray-600">
              등록된 프로젝트가 없습니다
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">고객사</th>
                  <th className="px-4 py-3 text-left font-semibold">프로젝트명</th>
                  <th className="px-4 py-3 text-left font-semibold">STEP</th>
                  <th className="px-4 py-3 text-left font-semibold">상태</th>
                  <th className="px-4 py-3 text-left font-semibold">생성일</th>
                  <th className="px-4 py-3 text-right font-semibold">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => {
                  const statusValue = project.status ?? 'active'
                  const statusLabel = statusLabelMap[statusValue] ?? '진행중'
                  const statusStyle = statusBadgeStyles[statusValue] ?? statusBadgeStyles.active

                  return (
                    <tr key={project.id} className="group border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-base font-semibold text-gray-900">
                          {getCompanyName(project.companies) || '미지정'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{project.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{project.description || '설명 없음'}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">STEP {project.step ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(project.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => router.push(`/app/admin/projects/${project.id}`)}
                            className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-white"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(project)}
                            disabled={deletingId === project.id}
                            className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === project.id ? '삭제 중...' : '삭제'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <ToastContainer />
    </AppLayout>
  )
}
