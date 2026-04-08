'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Breadcrumb } from '@/components/breadcrumb'
import { StepProgress } from '@/components/step-progress'
import { ToastContainer } from '@/components/toast'
import { createBrowserClient } from '@supabase/ssr'
import {
  DELIVERABLE_TYPE_LABELS,
  DELIVERABLE_STEP_ORDER,
  STEP_DELIVERABLE_GROUPS,
  STEP_LABELS,
} from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import { DeliverableType, User, UserRole, VersionStatus } from '@/types'

type ProjectNote = {
  date: string
  time?: string | null
  author?: string | null
  content: string
}

type ProjectMetadata = {
  notes?: ProjectNote[] | null
}

type CompanyMetadata = {
  contact_history?: ProjectNote[] | null
}

type AdminProject = {
  id: string
  name: string
  description: string | null
  company_id: string
  step: number
  status?: 'active' | 'completed' | 'paused'
  notes?: ProjectNote[] | null
  metadata?: ProjectMetadata | null
  company?: { name?: string | null; metadata?: CompanyMetadata | null } | null
}

type AdminCompany = {
  id: string
  name: string
}

type DeleteTarget =
  | { type: 'asset'; assetId: string; versionId: string }
  | { type: 'project' }
  | { type: 'deliverable'; deliverable: AdminDeliverable }
  | { type: 'version'; versionId: string }

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
  file_name?: string | null
  name?: string | null
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
  const { showToast } = useToast()
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
  const [showMemoModal, setShowMemoModal] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const getTodayDate = () => new Date().toISOString().slice(0, 10)
  const getCurrentTime = () => new Date().toTimeString().slice(0, 5)

  const [contactDate, setContactDate] = useState(getTodayDate())
  const [contactTime, setContactTime] = useState(getCurrentTime())
  const [contactAuthor, setContactAuthor] = useState('')
  const [contactContent, setContactContent] = useState('')
  const [memoSaving, setMemoSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'asset' | 'project' | 'deliverable' | 'version'
    id: string
    versionId?: string
    deliverable?: AdminDeliverable
    label: string
  } | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

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
    const projectData = data?.project ?? null
    const companyData = data?.company ?? projectData?.company ?? null
    setProject(projectData ? { ...projectData, company: companyData } : projectData)

    const deliverableItems = Array.isArray(data?.deliverables)
      ? data.deliverables
      : Array.isArray(projectData?.deliverables)
        ? projectData.deliverables
        : []
    setDeliverables(deliverableItems)

    const assets = Array.isArray(data?.assets)
      ? data.assets
      : deliverableItems.flatMap((deliverable: any) =>
          (deliverable.deliverable_versions ?? deliverable.versions ?? []).flatMap(
            (version: any) => version.assets ?? []
          )
        )
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
      showToast('STEP 변경에 실패했습니다', 'error')
      setStepUpdating(false)
      return
    }

    const data = await response.json().catch(() => null)
    setProject((prev) => (prev ? { ...prev, step: data?.project?.step ?? nextStep } : prev))
    showToast('STEP이 변경되었습니다', 'success')
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
      showToast('상태 변경에 실패했습니다', 'error')
      setStatusUpdating(false)
      return
    }

    const data = await response.json().catch(() => null)
    setProject((prev) => (prev ? { ...prev, status: data?.project?.status ?? nextStatus } : prev))
    showToast('상태가 변경되었습니다', 'success')
    setStatusUpdating(false)
  }

  const executeDeleteAsset = async (assetId: string, versionId: string) => {
    setDeletingAssetId(assetId)
    setAssetDeleteError(null)

    const response = await fetch(`/api/admin/assets/${assetId}`, { method: 'DELETE' })

    if (!response.ok) {
      setAssetDeleteError('파일 삭제에 실패했습니다')
      showToast('파일 삭제에 실패했습니다', 'error')
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

    showToast('삭제되었습니다', 'success')
    setDeletingAssetId(null)
  }

  const executeDeleteProject = async () => {
    if (!project) return

    setDeletingProject(true)
    setDeleteProjectError(null)

    const response = await fetch(`/api/admin/projects/${resolvedParams.id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      setDeleteProjectError('프로젝트 삭제에 실패했습니다')
      showToast('프로젝트 삭제에 실패했습니다', 'error')
      setDeletingProject(false)
      return
    }

    showToast('프로젝트가 삭제되었습니다', 'success')
    router.replace('/app/admin/projects')
  }

  const executeDeliverableDelete = async (deliverable: AdminDeliverable) => {
    setDeletingDeliverableId(deliverable.id)
    setDeliverableDeleteError(null)

    const response = await fetch(`/api/admin/deliverables/${deliverable.id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      setDeliverableDeleteError('드롭 삭제에 실패했습니다')
      showToast('드롭 삭제에 실패했습니다', 'error')
      setDeletingDeliverableId(null)
      return
    }

    setDeletingDeliverableId(null)
    showToast('삭제되었습니다', 'success')
    await fetchProject()
  }

  const executeVersionDelete = async (versionId: string) => {
    setDeletingVersionId(versionId)
    setVersionDeleteError(null)

    const response = await fetch(`/api/admin/deliverable-versions/${versionId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      setVersionDeleteError('버전 삭제에 실패했습니다')
      showToast('버전 삭제에 실패했습니다', 'error')
      setDeletingVersionId(null)
      return
    }

    await fetchProject()
    showToast('삭제되었습니다', 'success')
    setDeletingVersionId(null)
  }

  const performDelete = async () => {
    if (!deleteConfirm) return
    if (deleteConfirmText !== '삭제') return

    if (deleteConfirm.type === 'asset' && deleteConfirm.versionId) {
      await executeDeleteAsset(deleteConfirm.id, deleteConfirm.versionId)
    } else if (deleteConfirm.type === 'project') {
      await executeDeleteProject()
    } else if (deleteConfirm.type === 'deliverable' && deleteConfirm.deliverable) {
      await executeDeliverableDelete(deleteConfirm.deliverable)
    } else if (deleteConfirm.type === 'version') {
      await executeVersionDelete(deleteConfirm.id)
    }

    setDeleteConfirm(null)
    setDeleteConfirmText('')
  }

  const handleDeleteAsset = (assetId: string, versionId: string) => {
    setDeleteConfirm({ type: 'asset', id: assetId, versionId, label: '파일' })
    setDeleteConfirmText('')
  }

  const handleDeleteProject = () => {
    if (!project) return
    setDeleteConfirm({ type: 'project', id: resolvedParams.id, label: project.name })
    setDeleteConfirmText('')
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
      showToast('드롭 수정에 실패했습니다', 'error')
      setSavingDeliverable(false)
      return
    }

    setShowDeliverableEditModal(false)
    setSavingDeliverable(false)
    showToast('드롭이 수정되었습니다', 'success')
    await fetchProject()
  }

  const handleDeliverableDelete = (deliverable: AdminDeliverable) => {
    setDeleteConfirm({
      type: 'deliverable',
      id: deliverable.id,
      deliverable,
      label: deliverable.title || '드롭',
    })
    setDeleteConfirmText('')
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
      showToast('버전 상태 변경에 실패했습니다', 'error')
      setVersionUpdatingId(null)
      return
    }

    await fetchProject()
    showToast('버전 상태가 변경되었습니다', 'success')
    setVersionUpdatingId(null)
  }

  const handleVersionDelete = (versionId: string) => {
    setDeleteConfirm({ type: 'version', id: versionId, label: '버전' })
    setDeleteConfirmText('')
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
      showToast('파일 업로드에 실패했습니다', 'error')
      setUploadingVersionId(null)
      return
    }

    await fetchProject()
    showToast('파일이 업로드되었습니다', 'success')
    setUploadingVersionId(null)
  }

  const openEditModal = () => {
    if (!project) return
    setEditName(project.name)
    setEditDescription(project.description ?? '')
    setEditCompanyId(project.company_id ?? '')
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
        name?: string | null
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

      if (active) {
        setCurrentUser(user)
      }

      await fetchProject()

      const companiesResponse = await fetch('/api/admin/companies', { cache: 'no-store' })
      if (companiesResponse.ok) {
        const companyData = await companiesResponse.json()
        const items = Array.isArray(companyData?.companies) ? companyData.companies : []
        const filteredItems = items.filter(
          (item: { id?: string }) => item.id !== '00000000-0000-0000-0000-000000000001'
        )
        if (active) {
          setCompanies(filteredItems)
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

  useEffect(() => {
    if (currentUser?.name && !contactAuthor) {
      setContactAuthor(currentUser.name)
    }
  }, [currentUser, contactAuthor])

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

  const projectNotes = Array.isArray(project.metadata?.notes)
    ? project.metadata?.notes
    : Array.isArray(project.notes)
      ? project.notes
      : []
  const companyNotes = Array.isArray(project.company?.metadata?.contact_history)
    ? project.company?.metadata?.contact_history
    : []
  const combinedNotes = [
    ...companyNotes.map((note) => ({
      ...note,
      source: 'company' as const,
      sourceLabel: project.company?.name ?? '고객사',
    })),
    ...projectNotes.map((note) => ({
      ...note,
      source: 'project' as const,
      sourceLabel: project.name,
    })),
  ]
  const getNoteTimestamp = (note: { date?: string; time?: string | null }) => {
    if (!note?.date) return 0
    const timeValue = note.time && note.time.trim() ? note.time : '00:00'
    const timestamp = new Date(`${note.date}T${timeValue}:00`)
    return Number.isNaN(timestamp.getTime()) ? 0 : timestamp.getTime()
  }

  const sortedNotes = combinedNotes
    .slice()
    .sort((a, b) => getNoteTimestamp(b) - getNoteTimestamp(a))

  const handleAddMemo = async () => {
    if (!contactContent.trim()) {
      showToast('컨택 내용을 입력해 주세요', 'info')
      return
    }

    const nextNote: ProjectNote = {
      date: contactDate,
      time: contactTime || null,
      author: contactAuthor.trim() || null,
      content: contactContent.trim(),
    }
    const nextNotes = [...projectNotes, nextNote]
    setMemoSaving(true)

    let response: Response
    try {
      response = await fetch(`/api/admin/projects/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: nextNotes }),
      })
    } catch (error) {
      console.error('컨택 히스토리 저장 요청 실패', error)
      showToast('컨택 히스토리 저장에 실패했습니다', 'error')
      setMemoSaving(false)
      return
    }

    if (!response.ok) {
      showToast('컨택 히스토리 저장에 실패했습니다', 'error')
      setMemoSaving(false)
      return
    }

    setProject((prev) =>
      prev
        ? { ...prev, metadata: { ...(prev.metadata ?? {}), notes: nextNotes } }
        : prev
    )
    setContactContent('')
    setContactDate(getTodayDate())
    setContactTime(getCurrentTime())
    setContactAuthor(currentUser?.name ?? '')
    setShowContactForm(false)
    setMemoSaving(false)
    showToast('컨택 히스토리가 저장되었습니다', 'success')
  }

  return (
    <AppLayout user={currentUser}>
      <div className="max-w-6xl space-y-6">
        <Breadcrumb
          items={[
            { label: '브루션 관리자', href: '/app/admin' },
            { label: '프로젝트 관리', href: '/app/admin/projects' },
            { label: project.name },
          ]}
        />
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
            <div className="text-right space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowMemoModal(true)
                  setShowContactForm(false)
                  setContactContent('')
                  setContactDate(new Date().toISOString().slice(0, 10))
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                🕐 컨택 히스토리 ({combinedNotes.length}개)
              </button>
              <div>
                <p className="text-sm text-gray-600">{project.description || '설명 없음'}</p>
                {project.company_id ? (
                  <span className="text-xs text-gray-500 mt-1">
                    고객사:{' '} 
                    <button type="button" 
                    onClick={() => router.push(`/app/admin/companies/${project.company_id}`)}
                    className="text-xs text-blue-500 hover:text-blue-700 underline"
                    >
                    {project.company?.name ?? '미지정'}
                    </button>
                    </span>
                ) : (
                  <span className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                    <span>고객사: 미지정</span>
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="text-xs text-blue-500 hover:text-blue-700 underline cursor-pointer"
                    >
                      지정하기
                    </button>
                  </span>
                )}
              </div>
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
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">{deliverable.title || '제목 없음'}</h3>
                    <p className="text-sm text-gray-500">
                      타입: {DELIVERABLE_TYPE_LABELS[deliverable.type]} · 공개범위: {deliverable.visibility}
                    </p>
                    <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-600">
                      STEP {project.step ?? 0} · {STEP_LABELS[project.step ?? 0]}
                    </span>
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
                              <p className="text-sm text-gray-500">{version.title || '제목 없음'}</p>
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
                                const displayName =
                                  asset.file_name || asset.name || getFileNameFromPath(asset.path) || '파일'

                                return (
                                  <div key={asset.id} className="flex items-center justify-between text-sm text-gray-600">
                                    <span className="truncate">{displayName}</span>
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
                              <p className="text-sm text-gray-400">업로드된 파일 없음</p>
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
                    showToast('드롭 생성에 실패했습니다', 'error')
                    setCreatingDeliverable(false)
                    return
                  }

                  setDeliverableTitle('')
                  setDeliverableType(getDefaultDeliverableType(currentStep))
                  setDeliverableVisibility('internal')
                  setCreatingDeliverable(false)
                  setShowDeliverableModal(false)
                  showToast('드롭이 생성되었습니다', 'success')
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
                    showToast('프로젝트 수정에 실패했습니다', 'error')
                    setEditing(false)
                    return
                  }

                  setShowEditModal(false)
                  setEditing(false)
                  showToast('프로젝트가 수정되었습니다', 'success')
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

            <div className="space-y-2">
              <label className="text-base font-semibold text-gray-800">버전 제목</label>
              <input
                value={versionTitle}
                onChange={(e) => setVersionTitle(e.target.value)}
                placeholder="버전 제목을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-base font-semibold"
              />
            </div>
            {versionError && <p className="text-sm text-red-600">{versionError}</p>}
            <div className="space-y-1">
              <label className="text-sm text-gray-500 uppercase tracking-wide">버전</label>
              <input
                type="text"
                value="자동 생성 · draft"
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-500 bg-gray-50"
              />
            </div>

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
                    showToast('버전 생성에 실패했습니다', 'error')
                    setCreatingVersion(false)
                    return
                  }

                  setVersionTitle('')
                  setCreatingVersion(false)
                  setShowVersionModal(false)
                  setSelectedDeliverable(null)
                  showToast('버전이 생성되었습니다', 'success')
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

      {showMemoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white w-full max-w-lg rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">컨택 히스토리</h3>
              <button
                onClick={() => {
                  setShowMemoModal(false)
                  setShowContactForm(false)
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3">
              {sortedNotes.length === 0 ? (
                <p className="text-sm text-gray-500">등록된 컨택 히스토리가 없습니다.</p>
              ) : (
                sortedNotes.map((note, index) => {
                  const badgeStyle =
                    note.source === 'company'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-blue-50 text-blue-600'

                  return (
                    <div key={`${note.date}-${index}`} className="border-b border-gray-100 pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500">
                          {[note.date?.replace(/-/g, '.'), note.time].filter(Boolean).join(' ')}
                          {note.author ? ` · ${note.author}` : ''}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyle}`}
                        >
                          {note.sourceLabel}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{note.content}</p>
                    </div>
                  )
                })
              )}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setShowContactForm((prev) => !prev)
                  setContactDate(getTodayDate())
                  setContactTime(getCurrentTime())
                  setContactAuthor(currentUser?.name ?? '')
                }}
                className="text-sm font-medium text-primary"
              >
                + 새 컨택 추가
              </button>
              {showContactForm && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="date"
                      value={contactDate}
                      onChange={(e) => setContactDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="time"
                      value={contactTime}
                      onChange={(e) => setContactTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    value={contactAuthor}
                    onChange={(e) => setContactAuthor(e.target.value)}
                    placeholder="작성자"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <textarea
                    value={contactContent}
                    onChange={(e) => setContactContent(e.target.value)}
                    placeholder="컨택 내용을 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[90px]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddMemo}
                      disabled={memoSaving}
                      className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50"
                    >
                      {memoSaving ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowMemoModal(false)
                  setShowContactForm(false)
                }}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-sm rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">삭제 확인</h3>
            <p className="text-sm text-gray-600">
              <strong>{deleteConfirm.label}</strong>을(를) 삭제하려면
              <br />
              아래에 <strong>삭제</strong>를 입력하세요.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder="삭제"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setDeleteConfirm(null)
                  setDeleteConfirmText('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm"
              >
                취소
              </button>
              <button
                disabled={deleteConfirmText !== '삭제'}
                onClick={performDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </AppLayout>
  )
}
