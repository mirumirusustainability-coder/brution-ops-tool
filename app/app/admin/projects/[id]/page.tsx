'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { StepProgress } from '@/components/step-progress'
import { createBrowserClient } from '@supabase/ssr'
import {
  DELIVERABLE_TYPE_LABELS,
  DELIVERABLE_STEP_ORDER,
  STEP_DELIVERABLE_GROUPS,
  STEP_LABELS,
} from '@/lib/constants'
import { DeliverableType, User, UserRole, VersionStatus } from '@/types'

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
  type: DeliverableType
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
  status: VersionStatus
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

const versionStatusOptions = [
  { value: 'draft', label: '검토중' },
  { value: 'in_review', label: '완료' },
]

const getDefaultDeliverableType = (step?: number) => {
  const group = STEP_DELIVERABLE_GROUPS[typeof step === 'number' ? step : 0]
  return group?.[0] ?? STEP_DELIVERABLE_GROUPS[0][0]
}

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
  const [deliverableType, setDeliverableType] = useState<DeliverableType>('keyword_report')
  const [deliverableVisibility, setDeliverableVisibility] = useState<'internal' | 'client'>('internal')
  const [deliverableError, setDeliverableError] = useState<string | null>(null)
  const [creatingDeliverable, setCreatingDeliverable] = useState(false)
  const [showDeliverableEditModal, setShowDeliverableEditModal] = useState(false)
  const [editingDeliverable, setEditingDeliverable] = useState<AdminDeliverable | null>(null)
  const [editDeliverableTitle, setEditDeliverableTitle] = useState('')
  const [editDeliverableType, setEditDeliverableType] = useState<DeliverableType>('keyword_report')
  const [editDeliverableVisibility, setEditDeliverableVisibility] = useState<'internal' | 'client'>('internal')
  const [editDeliverableError, setEditDeliverableError] = useState<string | null>(null)
  const [savingDeliverable, setSavingDeliverable] = useState(false)
  const [deletingDeliverableId, setDeletingDeliverableId] = useState<string | null>(null)
  const [deliverableDeleteError, setDeliverableDeleteError] = useState<string | null>(null)

  const [showVersionModal, setShowVersionModal] = useState(false)
  const [versionTitle, setVersionTitle] = useState('')
  const [versionError, setVersionError] = useState<string | null>(null)
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [selectedDeliverable, setSelectedDeliverable] = useState<AdminDeliverable | null>(null)
  const [uploadingVersionId, setUploadingVersionId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [versionUpdatingId, setVersionUpdatingId] = useState<string | null>(null)
  const [versionUpdateError, setVersionUpdateError] = useState<string | null>(null)
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null)
  const [versionDeleteError, setVersionDeleteError] = useState<string | null>(null)
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

  const openDeliverableEditModal = (deliverable: AdminDeliverable) => {
    setEditingDeliverable(deliverable)
    setEditDeliverableTitle(deliverable.title || '')
    setEditDeliverableType(deliverable.type)
    setEditDeliverableVisibility(deliverable.visibility)
    setEditDeliverableError(null)
    setShowDeliverableEditModal(true)
  }

  const handleDeliverableUpdate = async () => {
    if (!editingDeliverable) return
    if (!editDeliverableTitle.trim()) {
      setEditDeliverableError('제목을 입력하세요')
      return
    }

    setSavingDeliverable(true)
    setEditDeliverableError(null)

    const response = await fetch(`/api/admin/deliverables/${editingDeliverable.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editDeliverableTitle.trim(),
        type: editDeliverableType,
        visibility: editDeliverableVisibility,
      }),
    })

    if (!response.ok) {
      setEditDeliverableError('드롭 수정에 실패했습니다')
      setSavingDeliverable(false)
      return
    }

    setShowDeliverableEditModal(false)
    setSavingDeliverable(false)
    await fetchProject()
  }

  const handleDeliverableDelete = async (deliverable: AdminDeliverable) => {
    const confirmed = window.confirm(
      `정말 ${deliverable.title || '드롭'}을 삭제하시겠습니까? 모든 버전과 파일이 삭제됩니다.`
    )
    if (!confirmed) return

    setDeletingDeliverableId(deliverable.id)
    setDeliverableDeleteError(null)

    const response = await fetch(`/api/admin/deliverables/${deliverable.id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      setDeliverableDeleteError('드롭 삭제에 실패했습니다')
      setDeletingDeliverableId(null)
      return
    }

    setDeletingDeliverableId(null)
    await fetchProject()
  }

  const handleVersionStatusChange = async (versionId: string, nextStatus: string) => {
    setVersionUpdatingId(versionId)
    setVersionUpdateError(null)

    const response = await fetch(`/api/admin/deliverable-versions/${versionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })

    if (!response.ok) {
      setVersionUpdateError('버전 상태 변경에 실패했습니다')
      setVersionUpdatingId(null)
      return
    }

    await fetchProject()
    setVersionUpdatingId(null)
  }

  const handleVersionDelete = async (versionId: string) => {
    const confirmed = window.confirm('정말 이 버전을 삭제하시겠습니까? 모든 파일이 삭제됩니다.')
    if (!confirmed) return

    setDeletingVersionId(versionId)
    setVersionDeleteError(null)

    const response = await fetch(`/api/admin/deliverable-versions/${versionId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      setVersionDeleteError('버전 삭제에 실패했습니다')
      setDeletingVersionId(null)
      return
    }

    await fetchProject()
    setDeletingVersionId(null)
  }

  const handleAdminUpload = async (versionId: string, file: File) => {
    if (!project) return

    setUploadingVersionId(versionId)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('deliverableVersionId', versionId)
    formData.append('projectId', project.id)
    formData.append('companyId', project.company_id)

    const response = await fetch('/api/admin/assets', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      setUploadError('파일 업로드에 실패했습니다')
      setUploadingVersionId(null)
      return
    }

    await fetchProject()
    setUploadingVersionId(null)
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
  const currentStep = typeof project.step === 'number' ? project.step : 0
  const orderedStepGroups = [
    currentStep,
    ...DELIVERABLE_STEP_ORDER.filter((step) => step !== currentStep),
  ]

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
                <>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('completed')}
                    disabled={statusUpdating}
                    className="px-3 py-1.5 rounded-md text-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    완료 처리
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('paused')}
                    disabled={statusUpdating}
                    className="px-3 py-1.5 rounded-md text-sm text-white bg-gray-500 hover:bg-gray-600 disabled:opacity-50"
                  >
                    보류
                  </button>
                </>
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
          <h2 className="text-xl font-semibold text-gray-900">드롭</h2>
          <button
            onClick={() => {
              setDeliverableType(getDefaultDeliverableType(project?.step))
              setShowDeliverableModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md"
          >
            <Plus className="w-4 h-4" />
            새 드롭 추가
          </button>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {assetDeleteError && <div className="text-sm text-red-600">{assetDeleteError}</div>}
        {uploadError && <div className="text-sm text-red-600">{uploadError}</div>}
        {versionUpdateError && <div className="text-sm text-red-600">{versionUpdateError}</div>}
        {versionDeleteError && <div className="text-sm text-red-600">{versionDeleteError}</div>}
        {deliverableDeleteError && <div className="text-sm text-red-600">{deliverableDeleteError}</div>}

        <div className="space-y-4">
          {deliverables.length === 0 ? (
            <div className="bg-muted rounded-lg p-8 text-center text-gray-600">등록된 드롭이 없습니다</div>
          ) : (
            deliverables.map((deliverable) => (
              <div key={deliverable.id} className="bg-white border border-border rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{deliverable.title || '제목 없음'}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      타입: {DELIVERABLE_TYPE_LABELS[deliverable.type]} · 공개범위: {deliverable.visibility}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openDeliverableEditModal(deliverable)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeliverableDelete(deliverable)}
                      disabled={deletingDeliverableId === deliverable.id}
                      className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-md disabled:opacity-50"
                    >
                      {deletingDeliverableId === deliverable.id ? '삭제 중...' : '삭제'}
                    </button>
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
                </div>

                <div className="mt-4 space-y-2">
                  {deliverable.versions?.length ? (
                    deliverable.versions.map((version) => {
                      const assets = assetsByVersion[version.id] ?? []
                      const inputId = `admin-upload-${version.id}`
                      const normalizedStatus = version.status
                      const statusValue = versionStatusOptions.some(
                        (option) => option.value === normalizedStatus
                      )
                        ? normalizedStatus
                        : 'draft'

                      return (
                        <div key={version.id} className="flex flex-col gap-3 bg-muted rounded-md p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">v{version.version_no}</p>
                              <p className="text-xs text-gray-500">{version.title || '제목 없음'}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={statusValue}
                                onChange={(event) =>
                                  handleVersionStatusChange(version.id, event.target.value)
                                }
                                disabled={versionUpdatingId === version.id}
                                className="px-2 py-1 text-xs border border-gray-300 rounded-md"
                              >
                                {versionStatusOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                id={inputId}
                                type="file"
                                className="hidden"
                                onChange={(event) => {
                                  const selectedFile = event.target.files?.[0]
                                  if (selectedFile) {
                                    handleAdminUpload(version.id, selectedFile)
                                    event.target.value = ''
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById(inputId) as HTMLInputElement | null
                                  input?.click()
                                }}
                                disabled={uploadingVersionId === version.id}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                              >
                                {uploadingVersionId === version.id ? '업로드 중...' : '파일 업로드'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleVersionDelete(version.id)}
                                disabled={deletingVersionId === version.id}
                                className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-md disabled:opacity-50"
                              >
                                {deletingVersionId === version.id ? '삭제 중...' : '버전 삭제'}
                              </button>
                            </div>
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
              <h3 className="text-lg font-semibold">새 드롭 추가</h3>
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
                onChange={(e) => setDeliverableType(e.target.value as DeliverableType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {orderedStepGroups.map((step) => (
                  <optgroup
                    key={step}
                    label={`STEP ${step} · ${STEP_LABELS[step]}`}
                    className={step === currentStep ? 'font-semibold text-blue-600' : ''}
                  >
                    {STEP_DELIVERABLE_GROUPS[step].map((type) => (
                      <option key={type} value={type}>
                        {DELIVERABLE_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </optgroup>
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
                    setDeliverableError('드롭 생성에 실패했습니다')
                    setCreatingDeliverable(false)
                    return
                  }

                  setDeliverableTitle('')
                  setDeliverableType(getDefaultDeliverableType(currentStep))
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

      {showDeliverableEditModal && editingDeliverable && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">드롭 수정</h3>
              <button onClick={() => setShowDeliverableEditModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={editDeliverableTitle}
                onChange={(event) => setEditDeliverableTitle(event.target.value)}
                placeholder="제목"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <select
                value={editDeliverableType}
                onChange={(event) => setEditDeliverableType(event.target.value as DeliverableType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {orderedStepGroups.map((step) => (
                  <optgroup
                    key={step}
                    label={`STEP ${step} · ${STEP_LABELS[step]}`}
                    className={step === currentStep ? 'font-semibold text-blue-600' : ''}
                  >
                    {STEP_DELIVERABLE_GROUPS[step].map((type) => (
                      <option key={type} value={type}>
                        {DELIVERABLE_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <select
                value={editDeliverableVisibility}
                onChange={(event) =>
                  setEditDeliverableVisibility(event.target.value as 'internal' | 'client')
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="internal">내부용</option>
                <option value="client">고객사 공개</option>
              </select>
              {editDeliverableError && <p className="text-sm text-red-600">{editDeliverableError}</p>}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeliverableEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                취소
              </button>
              <button
                disabled={savingDeliverable}
                onClick={handleDeliverableUpdate}
                className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50"
              >
                {savingDeliverable ? '저장 중...' : '저장'}
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
