'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { StepProgress } from '@/components/step-progress'
import { createBrowserClient } from '@supabase/ssr'
import { User, UserRole } from '@/types'

type AdminProject = {
  id: string
  name: string
  description: string | null
  company_id: string
  step: number
  status?: 'active' | 'completed' | 'paused'
  company?: { name?: string | null } | null
}

type AdminCompany = {
  id: string
  name: string
}

type AdminDeliverable = {
  id: string
  project_id: string
  company_id: string
  type: string
  visibility: 'internal' | 'client'
  title: string | null
  created_at: string
  versions: AdminDeliverableVersion[]
}

type AdminDeliverableVersion = {
  id: string
  deliverable_id: string
  company_id: string
  version_no: number
  status: string
  title: string | null
  created_at: string
}

type AdminAsset = {
  id: string
  deliverable_version_id: string
  path: string
  original_name: string | null
  created_at: string
}

const deliverableTypeOptions = [
  { value: 'keyword', label: '키워드분석' },
  { value: 'ads', label: '광고세팅' },
  { value: 'management', label: '위탁관리' },
  { value: 'influencer', label: '인플루언서마케팅' },
  { value: 'creative', label: '광고크리에이티브' },
  { value: 'seo', label: 'SEO' },
]

const getFileNameFromPath = (path?: string | null) => {
  if (!path) return null
  const parts = path.split('/')
  return parts[parts.length - 1] || null
}


export default function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [project, setProject] = useState<AdminProject | null>(null)
  const [deliverables, setDeliverables] = useState<AdminDeliverable[]>([])
  const [assetsByVersion, setAssetsByVersion] = useState<Record<string, AdminAsset[]>>({})
  const [companies, setCompanies] = useState<AdminCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showDeliverableModal, setShowDeliverableModal] = useState(false)
  const [deliverableTitle, setDeliverableTitle] = useState('')
  const [deliverableType, setDeliverableType] = useState('keyword')
  const [deliverableVisibility, setDeliverableVisibility] = useState<'internal' | 'client'>('internal')
  const [deliverableError, setDeliverableError] = useState<string | null>(null)
  const [creatingDeliverable, setCreatingDeliverable] = useState(false)

  const [showVersionModal, setShowVersionModal] = useState(false)
  const [versionTitle, setVersionTitle] = useState('')
  const [versionError, setVersionError] = useState<string | null>(null)
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [selectedDeliverable, setSelectedDeliverable] = useState<AdminDeliverable | null>(null)
  const [stepUpdating, setStepUpdating] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null)
  const [assetDeleteError, setAssetDeleteError] = useState<string | null>(null)
  const [deletingProject, setDeletingProject] = useState(false)
  const [deleteProjectError, setDeleteProjectError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCompanyId, setEditCompanyId] = useState('')
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const buildAssetsByVersion = (assets: AdminAsset[]) =>
    assets.reduce<Record<string, AdminAsset[]>>((acc, asset) => {
      if (!acc[asset.deliverable_version_id]) {
        acc[asset.deliverable_version_id] = []
      }
      acc[asset.deliverable_version_id].push(asset)
      return acc
    }, {})

  const fetchProject = async () => {
    const response = await fetch(`/api/admin/projects/${resolvedParams.id}`, { cache: 'no-store' })
    if (response.status === 401) {
      router.replace('/login')
      return
    }
    if (response.status === 403) {
      router.replace('/app/projects')
      return
    }
    if (!response.ok) {
      setError('프로젝트 정보를 불러올 수 없습니다')
      return
    }
    const data = await response.json()
    setProject(data?.project ?? null)
    setDeliverables(Array.isArray(data?.deliverables) ? data.deliverables : [])
    const assets = Array.isArray(data?.assets) ? data.assets : []
    setAssetsByVersion(buildAssetsByVersion(assets))
  }

  const handleStepChange = async (nextStep: number) => {
    if (!project) return
    setStepUpdating(true)
    setStepError(null)

    const response = await fetch(`/api/admin/projects/${resolvedParams.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: nextStep }),
    })

    if (!response.ok) {
      setStepError('STEP 변경에 실패했습니다')
      setStepUpdating(false)
      return
    }

    const data = await response.json().catch(() => null)
    setProject((prev) => (prev ? { ...prev, step: data?.project?.step ?? nextStep } : prev))
    setStepUpdating(false)
  }

  const handleStatusChange = async (nextStatus: 'active' | 'completed' | 'paused') => {
    if (!project) return
    setStatusUpdating(true)
    setStatusError(null)

    const response = await fetch(`/api/admin/projects/${resolvedParams.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })

    if (!response.ok) {
      setStatusError('상태 변경에 실패했습니다')
      setStatusUpdating(false)
      return
    }

    const data = await response.json().catch(() => null)
    setProject((prev) => (prev ? { ...prev, status: data?.project?.status ?? nextStatus } : prev))
    setStatusUpdating(false)
  }

  const handleDeleteAsset = async (assetId: string, versionId: string) => {
    const confirmed = window.confirm('정말 이 파일을 삭제하시겠습니까?')
    if (!confirmed) return

    setDeletingAssetId(assetId)
    setAssetDeleteError(null)

    const response = await fetch(`/api/admin/assets/${assetId}`, { method: 'DELETE' })

    if (!response.ok) {
      setAssetDeleteError('파일 삭제에 실패했습니다')
      setDeletingAssetId(null)
      return
    }

    setAssetsByVersion((prev) => {
      const updated = { ...prev }
      const nextAssets = (updated[versionId] ?? []).filter((asset) => asset.id !== assetId)
      if (nextAssets.length > 0) {
        updated[versionId] = nextAssets
      } else {
        delete updated[versionId]
      }
      return updated
    })

    setDeletingAssetId(null)
  }

  const handleDeleteProject = async () => {
    if (!project) return
    const confirmed = window.confirm(
      `정말 ${project.name}을 삭제하시겠습니까? 모든 산출물과 파일이 삭제됩니다.`
    )
    if (!confirmed) return

    setDeletingProject(true)
    setDeleteProjectError(null)

    const response = await fetch(`/api/admin/projects/${resolvedParams.id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      setDeleteProjectError('프로젝트 삭제에 실패했습니다')
      setDeletingProject(false)
      return
    }

    router.replace('/app/admin/projects')
  }

  const openEditModal = () => {
    if (!project) return
    setEditName(project.name)
    setEditDescription(project.description ?? '')
    setEditCompanyId(project.company_id)
    setEditError(null)
    setShowEditModal(true)
  }

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

      if (active) {
        setCurrentUser(user)
      }

      await fetchProject()

      const companiesResponse = await fetch('/api/admin/companies', { cache: 'no-store' })
      if (companiesResponse.ok) {
        const companyData = await companiesResponse.json()
        const items = Array.isArray(companyData?.companies) ? companyData.companies : []
        if (active) {
          setCompanies(items)
        }
      }

      if (active) {
        setLoading(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [resolvedParams.id, router])

  if (loading && !currentUser) {
    return <div className="p-6 text-sm text-gray-500">로딩 중...</div>
  }

  if (error && !currentUser) {
    return <div className="p-6 text-sm text-red-600">{error}</div>
  }

  if (!currentUser) {
    return <div className="p-6 text-sm text-gray-500">사용자 정보를 확인할 수 없습니다.</div>
  }

  if (!project) {
    return (
      <AppLayout user={currentUser}>
        <div className="text-center py-12">프로젝트 정보를 찾을 수 없습니다.</div>
      </AppLayout>
    )
  }

  const currentStatus = project.status ?? 'active'

  return (
    <AppLayout user={currentUser}>
      <div className="max-w-6xl space-y-6">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <button
                onClick={openEditModal}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                프로젝트 수정
              </button>
              {currentStatus === 'active' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('completed')}
                  disabled={statusUpdating}
                  className="px-3 py-1.5 rounded-md text-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  완료 처리
                </button>
              )}
              {currentStatus === 'completed' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('active')}
                  disabled={statusUpdating}
                  className="px-3 py-1.5 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  재개
                </button>
              )}
              {currentStatus === 'paused' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('active')}
                    disabled={statusUpdating}
                    className="px-3 py-1.5 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    재개
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('completed')}
                    disabled={statusUpdating}
                    className="px-3 py-1.5 rounded-md text-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    완료 처리
                  </button>
                </>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{project.description || '설명 없음'}</p>
              <p className="text-xs text-gray-500 mt-1">고객사: {project.company?.name ?? '미지정'}</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-border bg-white p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-sm font-medium text-gray-700">프로젝트 STEP</span>
              {stepUpdating && <span className="text-xs text-gray-500">저장 중...</span>}
            </div>
            <StepProgress
              currentStep={project.step ?? 0}
              onStepChange={handleStepChange}
              readonly={false}
            />
            {stepError && <div className="mt-2 text-xs text-red-600">{stepError}</div>}
            {statusError && <div className="mt-2 text-xs text-red-600">{statusError}</div>}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Deliverable</h2>
          <button
            onClick={() => setShowDeliverableModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md"
          >
            <Plus className="w-4 h-4" />
            새 Deliverable 추가
          </button>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {assetDeleteError && <div className="text-sm text-red-600">{assetDeleteError}</div>}

        <div className="space-y-4">
          {deliverables.length === 0 ? (
            <div className="bg-muted rounded-lg p-8 text-center text-gray-600">등록된 Deliverable이 없습니다</div>
          ) : (
            deliverables.map((deliverable) => (
              <div key={deliverable.id} className="bg-white border border-border rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{deliverable.title || '제목 없음'}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      타입: {deliverable.type} · 공개범위: {deliverable.visibility}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDeliverable(deliverable)
                      setShowVersionModal(true)
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                  >
                    <Plus className="w-4 h-4" />
                    새 버전 추가
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {deliverable.versions?.length ? (
                    deliverable.versions.map((version) => {
                      const assets = assetsByVersion[version.id] ?? []

                      return (
                        <div key={version.id} className="flex flex-col gap-2 bg-muted rounded-md p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">v{version.version_no}</p>
                              <p className="text-xs text-gray-500">{version.title || '제목 없음'}</p>
                            </div>
                            <span className="text-xs text-gray-500">{version.status}</span>
                          </div>
                          <div className="space-y-1">
                            {assets.length ? (
                              assets.map((asset) => {
                                const fileName = asset.original_name ?? getFileNameFromPath(asset.path) ?? '파일'

                                return (
                                  <div key={asset.id} className="flex items-center justify-between text-xs text-gray-600">
                                    <span className="truncate">{fileName}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAsset(asset.id, version.id)}
                                      disabled={deletingAssetId === asset.id}
                                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                                    >
                                      {deletingAssetId === asset.id ? '삭제 중...' : '삭제'}
                                    </button>
                                  </div>
                                )
                              })
                            ) : (
                              <p className="text-xs text-gray-400">업로드된 파일 없음</p>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-sm text-gray-500">버전이 없습니다</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {deleteProjectError && <div className="text-sm text-red-600">{deleteProjectError}</div>}
          <button
            type="button"
            onClick={handleDeleteProject}
            disabled={deletingProject}
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deletingProject ? '삭제 중...' : '프로젝트 삭제'}
          </button>
        </div>
      </div>

      {showDeliverableModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">새 Deliverable 추가</h3>
              <button onClick={() => setShowDeliverableModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={deliverableTitle}
                onChange={(e) => setDeliverableTitle(e.target.value)}
                placeholder="제목"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <select
                value={deliverableType}
                onChange={(e) => setDeliverableType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {deliverableTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={deliverableVisibility}
                onChange={(e) => setDeliverableVisibility(e.target.value as 'internal' | 'client')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="internal">내부용</option>
                <option value="client">고객사 공개</option>
              </select>
              {deliverableError && <p className="text-sm text-red-600">{deliverableError}</p>}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeliverableModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                취소
              </button>
              <button
                disabled={creatingDeliverable}
                onClick={async () => {
                  if (!deliverableTitle.trim()) {
                    setDeliverableError('제목을 입력하세요')
                    return
                  }
                  setDeliverableError(null)
                  setCreatingDeliverable(true)

                  const response = await fetch('/api/admin/deliverables', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: deliverableTitle.trim(),
                      type: deliverableType,
                      visibility: deliverableVisibility,
                      projectId: project.id,
                      companyId: project.company_id,
                    }),
                  })

                  if (!response.ok) {
                    setDeliverableError('Deliverable 생성에 실패했습니다')
                    setCreatingDeliverable(false)
                    return
                  }

                  setDeliverableTitle('')
                  setDeliverableType('keyword')
                  setDeliverableVisibility('internal')
                  setCreatingDeliverable(false)
                  setShowDeliverableModal(false)
                  await fetchProject()
                }}
                className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50"
              >
                {creatingDeliverable ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">프로젝트 수정</h3>
              <button onClick={() => setShowEditModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="프로젝트명"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder="설명 (선택)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
              <select
                value={editCompanyId}
                onChange={(event) => setEditCompanyId(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                취소
              </button>
              <button
                disabled={editing}
                onClick={async () => {
                  if (!editName.trim()) {
                    setEditError('프로젝트명을 입력하세요')
                    return
                  }

                  setEditing(true)
                  setEditError(null)

                  const response = await fetch(`/api/admin/projects/${resolvedParams.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: editName.trim(),
                      description: editDescription.trim() || null,
                      companyId: editCompanyId,
                    }),
                  })

                  if (!response.ok) {
                    setEditError('프로젝트 수정에 실패했습니다')
                    setEditing(false)
                    return
                  }

                  setShowEditModal(false)
                  setEditing(false)
                  await fetchProject()
                }}
                className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50"
              >
                {editing ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVersionModal && selectedDeliverable && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">새 버전 추가</h3>
              <button
                onClick={() => {
                  setShowVersionModal(false)
                  setSelectedDeliverable(null)
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              value={versionTitle}
              onChange={(e) => setVersionTitle(e.target.value)}
              placeholder="버전 제목"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {versionError && <p className="text-sm text-red-600">{versionError}</p>}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowVersionModal(false)
                  setSelectedDeliverable(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                취소
              </button>
              <button
                disabled={creatingVersion}
                onClick={async () => {
                  if (!versionTitle.trim()) {
                    setVersionError('제목을 입력하세요')
                    return
                  }
                  setVersionError(null)
                  setCreatingVersion(true)

                  const response = await fetch('/api/admin/deliverable-versions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: versionTitle.trim(),
                      deliverableId: selectedDeliverable.id,
                      companyId: selectedDeliverable.company_id,
                    }),
                  })

                  if (!response.ok) {
                    setVersionError('버전 생성에 실패했습니다')
                    setCreatingVersion(false)
                    return
                  }

                  setVersionTitle('')
                  setCreatingVersion(false)
                  setShowVersionModal(false)
                  setSelectedDeliverable(null)
                  await fetchProject()
                }}
                className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50"
              >
                {creatingVersion ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
