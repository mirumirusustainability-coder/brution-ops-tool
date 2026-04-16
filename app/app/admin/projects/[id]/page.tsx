'use client'

import { useEffect, useRef, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Plus, X } from 'lucide-react'
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
  DESIGN_TYPE_CATEGORIES,
  ALL_DESIGN_TYPES,
  getDesignCategory,
  DESIGN_VERSION_STEPS,
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
  { value: 'revision', label: '반영중' },
  { value: 'published', label: '최종본' },
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
  const [editLaunchDate, setEditLaunchDate] = useState('')
  const [editAssignee, setEditAssignee] = useState('')
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

  // ── resizable right panel (hooks must be before any early return) ────────
  const [rightWidth, setRightWidth] = useState(400)
  const [panelMounted, setPanelMounted] = useState(false)
  const rightDragging = useRef(false)

  // ── dot menu ────────────────────────────────────────────────────────────
  const [dotMenuOpen, setDotMenuOpen] = useState(false)
  const dotMenuRef = useRef<HTMLDivElement>(null)

  // ── center tab ──────────────────────────────────────────────────────────
  const [detailTab, setDetailTab] = useState<'drops' | 'gantt' | 'certs' | 'sample' | 'history'>('drops')

  // ── drop dot menu ────────────────────────────────────────────────────────
  const [dropMenuId, setDropMenuId] = useState<string | null>(null)
  const dropMenuRef = useRef<HTMLDivElement>(null)

  // ── memo slide panel ────────────────────────────────────────────────────
  const [memoSlideOpen, setMemoSlideOpen] = useState(false)

  // ── edit modal: step confirm ────────────────────────────────────────────
  const [editStep, setEditStep] = useState(0)
  const [editStepConfirm, setEditStepConfirm] = useState(false)

  // ── staff users for assignee ────────────────────────────────────────────
  const [staffUsers, setStaffUsers] = useState<{ user_id: string; name: string | null; email: string }[]>([])

  // ── memo delete ──────────────────────────────────────────────────────────
  const [memoDeleteIdx, setMemoDeleteIdx] = useState<number | null>(null)

  // ── memo input ──────────────────────────────────────────────────────────
  const [memoInput, setMemoInput] = useState('')
  const [memoSending, setMemoSending] = useState(false)
  const memoEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('brution-project-right-width')
      if (saved) { const n = Number(saved); if (n >= 280 && n <= 560) setRightWidth(n) }
    } catch {}
    setPanelMounted(true)
  }, [])

  useEffect(() => {
    if (!dotMenuOpen) return
    const h = (e: MouseEvent) => { if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node)) setDotMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [dotMenuOpen])

  useEffect(() => {
    if (!dropMenuId) return
    const h = (e: MouseEvent) => { if (dropMenuRef.current && !dropMenuRef.current.contains(e.target as Node)) setDropMenuId(null) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [dropMenuId])

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
    setEditLaunchDate((project as any).metadata?.launch_date ?? '')
    setEditAssignee((project as any).metadata?.assignee ?? '')
    setEditStep(project.step ?? 0)
    setEditStepConfirm(false)
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

      const staffResponse = await fetch('/api/admin/staff', { cache: 'no-store' })
      if (staffResponse.ok) {
        const staffData = await staffResponse.json()
        if (active) setStaffUsers(Array.isArray(staffData?.staff) ? staffData.staff : [])
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
    return <div className="p-6 min-h-screen" />
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
  const getNoteTimestamp = (note: { date?: string; time?: string | null }) => {
    if (!note?.date) return 0
    const timeValue = note.time && note.time.trim() ? note.time : '00:00'
    const timestamp = new Date(`${note.date}T${timeValue}:00`)
    return Number.isNaN(timestamp.getTime()) ? 0 : timestamp.getTime()
  }

  const sortedNotes = projectNotes
    .slice()
    .sort((a, b) => getNoteTimestamp(b) - getNoteTimestamp(a))

  const handleAddMemo = async () => {
    if (!contactContent.trim()) {
      showToast('메모 내용을 입력해 주세요', 'info')
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
      console.error('프로젝트 메모 저장 요청 실패', error)
      showToast('프로젝트 메모 저장에 실패했습니다', 'error')
      setMemoSaving(false)
      return
    }

    if (!response.ok) {
      showToast('프로젝트 메모 저장에 실패했습니다', 'error')
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
    showToast('프로젝트 메모가 저장되었습니다', 'success')
  }

  const onRightDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    rightDragging.current = true
    const startX = e.clientX
    const startW = rightWidth
    const onMove = (ev: MouseEvent) => {
      if (!rightDragging.current) return
      const next = Math.max(280, Math.min(560, startW - (ev.clientX - startX)))
      setRightWidth(next)
    }
    const onUp = () => {
      rightDragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setRightWidth((w) => { try { localStorage.setItem('brution-project-right-width', String(w)) } catch {}; return w })
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const handleDeleteMemo = async (noteIdx: number) => {
    const nextNotes = projectNotes.filter((_, i) => i !== noteIdx)
    try {
      const r = await fetch(`/api/admin/projects/${resolvedParams.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: nextNotes }) })
      if (!r.ok) { showToast('메모 삭제에 실패했습니다', 'error'); return }
      setProject((prev) => prev ? { ...prev, metadata: { ...(prev.metadata ?? {}), notes: nextNotes } } : prev)
      setMemoDeleteIdx(null)
      showToast('메모가 삭제되었습니다', 'success')
    } catch { showToast('메모 삭제에 실패했습니다', 'error') }
  }

  const handleSendMemo = async () => {
    if (!memoInput.trim() || memoSending) return
    const dept = currentUser?.role === 'staff_admin' ? '브루션 관리자' : '브루션 팀'
    const newNote: ProjectNote = {
      date: getTodayDate(),
      time: getCurrentTime(),
      author: `${currentUser?.name ?? ''}|${dept}`,
      content: memoInput.trim(),
    }
    const nextNotes = [...projectNotes, newNote]
    setMemoSending(true)
    setMemoInput('')
    try {
      const r = await fetch(`/api/admin/projects/${resolvedParams.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: nextNotes }) })
      if (!r.ok) { showToast('메모 저장에 실패했습니다', 'error'); setMemoSending(false); return }
      setProject((prev) => prev ? { ...prev, metadata: { ...(prev.metadata ?? {}), notes: nextNotes } } : prev)
      showToast('메모가 저장되었습니다', 'success')
      setTimeout(() => memoEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch { showToast('메모 저장에 실패했습니다', 'error') }
    finally { setMemoSending(false) }
  }

  // ── d-day ─────────────────────────────────────────────────────────────────
  const launchDate = (project.metadata as any)?.launch_date ?? null
  const ddayInfo = (() => {
    if (!launchDate) return { label: '미설정', color: 'text-gray-400', bg: 'bg-gray-100' }
    const today = new Date(); today.setHours(0,0,0,0)
    const end = new Date(launchDate); end.setHours(0,0,0,0)
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000*60*60*24))
    if (diff < 0) return { label: `D+${Math.abs(diff)}`, color: 'text-red-700', bg: 'bg-red-50' }
    if (diff <= 7) return { label: `D-${diff}`, color: 'text-red-700', bg: 'bg-red-50' }
    if (diff <= 30) return { label: `D-${diff}`, color: 'text-yellow-700', bg: 'bg-yellow-50' }
    return { label: `D-${diff}`, color: 'text-green-700', bg: 'bg-green-50' }
  })()

  return (
    <AppLayout user={currentUser}>
      <div className="space-y-3" style={{ visibility: panelMounted ? 'visible' : 'hidden' }}>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: '브루션 관리자', href: '/app/admin' },
            { label: '프로젝트 관리', href: '/app/admin/projects' },
            { label: project.name },
          ]}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ddayInfo.color} ${ddayInfo.bg}`}>{ddayInfo.label}</span>
            </div>
            <button type="button" onClick={() => router.push(`/app/admin/companies/${project.company_id}`)} className="text-sm text-gray-500 hover:text-blue-600 hover:underline mt-0.5">
              {project.company?.name ?? '미지정'}
            </button>
            {(project.metadata as any)?.assignee && <span className="text-xs text-gray-400 ml-3">담당: {(project.metadata as any).assignee}</span>}
          </div>
          {/* dot menu */}
          <div ref={dotMenuRef} className="relative">
            <button type="button" onClick={() => setDotMenuOpen((v) => !v)} className="p-2 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-lg leading-none">···</button>
            {dotMenuOpen && (
              <div className="absolute right-0 top-9 z-30 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                <button type="button" onClick={() => { setDotMenuOpen(false); openEditModal() }} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">프로젝트 수정</button>
                {currentStatus === 'active' && <>
                  <button type="button" onClick={() => { setDotMenuOpen(false); handleStatusChange('completed') }} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">완료 처리</button>
                  <button type="button" onClick={() => { setDotMenuOpen(false); handleStatusChange('paused') }} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">보류</button>
                </>}
                {currentStatus !== 'active' && <button type="button" onClick={() => { setDotMenuOpen(false); handleStatusChange('active') }} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">재개</button>}
                <div className="border-t border-gray-100 my-1" />
                <button type="button" onClick={() => { setDotMenuOpen(false); handleDeleteProject() }} className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50">프로젝트 삭제</button>
              </div>
            )}
          </div>
        </div>

        {/* STEP visualization */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3, 4].map((s) => {
              const isDone = s < currentStep
              const isCurrent = s === currentStep
              return (
                <div key={s} className="flex items-center gap-2">
                  <button type="button" onClick={() => !stepUpdating && handleStepChange(s)} disabled={stepUpdating} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${isDone ? 'bg-blue-500 border-blue-500 text-white' : isCurrent ? 'border-blue-500 text-blue-600 bg-white' : 'border-gray-200 text-gray-400 bg-white hover:border-gray-300'}`}>{s}</button>
                  {s < 4 && <div className={`w-8 h-0.5 ${s < currentStep ? 'bg-blue-500' : 'bg-gray-200'}`} />}
                </div>
              )
            })}
            <span className="ml-2 text-sm text-gray-600">STEP {currentStep} · {STEP_LABELS[currentStep]}</span>
          </div>
        </div>

        {/* 2-column layout */}
        <div className="flex h-[calc(100vh-var(--topbar-h,64px)-14rem)] overflow-hidden">
          {/* LEFT — main */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* tabs */}
            <div className="flex gap-1 border-b border-gray-200 shrink-0 mb-3">
              {([['drops', '드롭'], ['gantt', '간트차트'], ['certs', '인증 관리'], ['sample', '샘플/생산'], ['history', '히스토리']] as const).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setDetailTab(key)} className={`px-3 py-2 text-sm border-b-2 -mb-px ${detailTab === key ? 'border-primary text-primary font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{label}</button>
              ))}
            </div>

            {detailTab === 'drops' && (
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {/* existing drops content */}
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">드롭 목록</h2>
                  <button onClick={() => { setDeliverableType(getDefaultDeliverableType(currentStep)); setDeliverableTitle(''); setDeliverableVisibility('internal'); setDeliverableError(null); setShowDeliverableModal(true) }} className="flex items-center gap-1 text-sm text-primary hover:underline"><Plus className="w-4 h-4" /> 드롭 추가</button>
                </div>
                {orderedStepGroups.map((groupStep) => {
                  const groupDeliverables = deliverables.filter((d) => {
                    const stepTypes = STEP_DELIVERABLE_GROUPS[groupStep] || []
                    return stepTypes.includes(d.type as DeliverableType)
                  })
                  if (groupDeliverables.length === 0 && groupStep !== currentStep) return null
                  return (
                    <div key={groupStep}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">STEP {groupStep} · {STEP_LABELS[groupStep]}</h3>
                      {groupDeliverables.length === 0 ? (
                        <p className="text-xs text-gray-400 mb-3">등록된 드롭이 없습니다</p>
                      ) : (
                        <div className="space-y-2 mb-3">
                          {groupDeliverables.map((d) => (
                            <div key={d.id} className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-900">{d.title ?? DELIVERABLE_TYPE_LABELS[d.type]}</p>
                                    {(() => { const cat = getDesignCategory(d.type); return cat ? <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span> : null })()}
                                  </div>
                                  <p className="text-xs text-gray-400">{DELIVERABLE_TYPE_LABELS[d.type]} · {d.visibility === 'client' ? '고객사 공개' : '내부'}</p>
                                </div>
                                <div ref={dropMenuId === d.id ? dropMenuRef : undefined} className="relative">
                                  <button type="button" onClick={() => setDropMenuId(dropMenuId === d.id ? null : d.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-base leading-none">···</button>
                                  {dropMenuId === d.id && (
                                    <div className="absolute right-0 top-7 z-20 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                                      <button type="button" onClick={() => { setDropMenuId(null); setEditingDeliverable(d); setEditDeliverableTitle(d.title ?? ''); setEditDeliverableType(d.type); setEditDeliverableVisibility(d.visibility); setEditDeliverableError(null); setShowDeliverableEditModal(true) }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">드롭 수정</button>
                                      <div className="border-t border-gray-100 my-1" />
                                      <button type="button" onClick={() => { setDropMenuId(null); handleDeliverableDelete(d) }} disabled={deletingDeliverableId === d.id} className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">드롭 삭제</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* versions */}
                              {(d.versions ?? []).length > 0 && (
                                <div className="space-y-1.5 mt-2">
                                  {(d.versions ?? []).map((v) => {
                                    const vAssets = assetsByVersion[v.id] ?? []
                                    return (
                                      <div key={v.id} className="bg-gray-50 rounded-md p-2">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-700">v{v.version_no}</span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${DESIGN_VERSION_STEPS.find((s) => s.value === v.status)?.color ?? 'bg-gray-100 text-gray-600'}`}>{DESIGN_VERSION_STEPS.find((s) => s.value === v.status)?.label ?? v.status}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <select value={v.status} onChange={(e) => handleVersionStatusChange(v.id, e.target.value as VersionStatus)} disabled={versionUpdatingId === v.id} className="text-xs border border-gray-200 rounded px-1 py-0.5">
                                              {versionStatusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                            <label className="text-xs text-primary cursor-pointer hover:underline">
                                              {uploadingVersionId === v.id ? '...' : '📎'}
                                              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAdminUpload(v.id, f); e.currentTarget.value = '' }} />
                                            </label>
                                            <button type="button" onClick={() => handleVersionDelete(v.id)} disabled={deletingVersionId === v.id} className="text-xs text-red-400 hover:text-red-600">✕</button>
                                          </div>
                                        </div>
                                        {vAssets.length > 0 && (
                                          <div className="mt-1.5 space-y-1">
                                            {vAssets.map((a) => (
                                              <div key={a.id} className="flex items-center justify-between text-xs text-gray-600">
                                                <span className="truncate">{a.original_name ?? getFileNameFromPath(a.path) ?? a.id}</span>
                                                <button type="button" onClick={() => handleDeleteAsset(a.id, v.id)} disabled={deletingAssetId === a.id} className="text-red-400 hover:text-red-600 shrink-0">✕</button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              {/* design step progress bar */}
                              {ALL_DESIGN_TYPES.includes(d.type) && (d.versions ?? []).length > 0 && (() => {
                                const latestStatus = (d.versions ?? [])[(d.versions ?? []).length - 1]?.status ?? 'draft'
                                const stepIdx = DESIGN_VERSION_STEPS.findIndex((s) => s.value === latestStatus)
                                return (
                                  <div className="flex items-center gap-1 mt-2">
                                    {DESIGN_VERSION_STEPS.map((s, i) => (
                                      <div key={s.value} className="flex items-center gap-1">
                                        <div className={`h-1.5 flex-1 rounded-full min-w-[40px] ${i <= stepIdx ? 'bg-blue-500' : 'bg-gray-200'}`} />
                                        <span className={`text-[10px] whitespace-nowrap ${i <= stepIdx ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{s.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                )
                              })()}
                              <button type="button" onClick={() => { setSelectedDeliverable(d); setVersionTitle(''); setVersionError(null); setShowVersionModal(true) }} className="mt-2 text-xs text-primary hover:underline">+ 버전 추가</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {detailTab === 'gantt' && (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">간트차트는 Phase A 이후 구현 예정입니다.</div>
            )}

            {detailTab === 'certs' && (
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">인증 현황</h2>
                  <button type="button" onClick={() => {
                    const certs = Array.isArray((project?.metadata as any)?.certifications) ? (project?.metadata as any).certifications : []
                    const newCert = { id: Math.random().toString(36).slice(2, 10), name: '', status: '준비중', expected_date: '', agency: '', rejection_note: '' }
                    const next = [...certs, newCert]
                    fetch(`/api/admin/projects/${resolvedParams.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metadata: { certifications: next } }) })
                      .then((r) => { if (r.ok) { setProject((prev) => prev ? { ...prev, metadata: { ...(prev.metadata ?? {}), certifications: next } as any } : prev); showToast('인증이 추가되었습니다', 'success') } })
                  }} className="text-sm text-primary hover:underline">+ 인증 추가</button>
                </div>
                {(() => {
                  const certs = Array.isArray((project?.metadata as any)?.certifications) ? (project?.metadata as any).certifications : []
                  if (certs.length === 0) return <p className="text-sm text-gray-400 text-center py-6">등록된 인증이 없습니다.</p>
                  const certStatusStyles: Record<string, string> = { '준비중': 'bg-gray-100 text-gray-600', '신청완료': 'bg-blue-50 text-blue-600', '심사중': 'bg-yellow-50 text-yellow-600', '완료': 'bg-green-50 text-green-700', '반려': 'bg-red-50 text-red-600' }
                  return (
                    <div className="space-y-2">
                      {certs.map((cert: any, ci: number) => (
                        <div key={cert.id ?? ci} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input value={cert.name ?? ''} onChange={(e) => {
                              const next = [...certs]; next[ci] = { ...next[ci], name: e.target.value }
                              setProject((prev) => prev ? { ...prev, metadata: { ...(prev.metadata ?? {}), certifications: next } as any } : prev)
                            }} placeholder="인증명 (예: KC안전인증)" className="px-2 py-1.5 text-sm border border-gray-200 rounded-md" />
                            <select value={cert.status ?? '준비중'} onChange={(e) => {
                              const next = [...certs]; next[ci] = { ...next[ci], status: e.target.value }
                              setProject((prev) => prev ? { ...prev, metadata: { ...(prev.metadata ?? {}), certifications: next } as any } : prev)
                            }} className="px-2 py-1.5 text-sm border border-gray-200 rounded-md">
                              {['준비중', '신청완료', '심사중', '완료', '반려'].map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input type="date" value={cert.expected_date ?? ''} onChange={(e) => {
                              const next = [...certs]; next[ci] = { ...next[ci], expected_date: e.target.value }
                              setProject((prev) => prev ? { ...prev, metadata: { ...(prev.metadata ?? {}), certifications: next } as any } : prev)
                            }} className="px-2 py-1.5 text-sm border border-gray-200 rounded-md" />
                            <input value={cert.agency ?? ''} onChange={(e) => {
                              const next = [...certs]; next[ci] = { ...next[ci], agency: e.target.value }
                              setProject((prev) => prev ? { ...prev, metadata: { ...(prev.metadata ?? {}), certifications: next } as any } : prev)
                            }} placeholder="담당기관" className="px-2 py-1.5 text-sm border border-gray-200 rounded-md" />
                          </div>
                          {cert.status === '반려' && (
                            <textarea value={cert.rejection_note ?? ''} onChange={(e) => {
                              const next = [...certs]; next[ci] = { ...next[ci], rejection_note: e.target.value }
                              setProject((prev) => prev ? { ...prev, metadata: { ...(prev.metadata ?? {}), certifications: next } as any } : prev)
                            }} placeholder="반려 사유 / 개선사항" className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md" rows={2} />
                          )}
                          <div className="flex justify-between items-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${certStatusStyles[cert.status] ?? 'bg-gray-100 text-gray-600'}`}>{cert.status}</span>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => {
                                const next = certs.filter((_: any, i: number) => i !== ci)
                                fetch(`/api/admin/projects/${resolvedParams.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metadata: { certifications: next } }) })
                                  .then((r) => { if (r.ok) { setProject((prev) => prev ? { ...prev, metadata: { ...(prev.metadata ?? {}), certifications: next } as any } : prev); showToast('삭제되었습니다', 'success') } })
                              }} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                              <button type="button" onClick={() => {
                                fetch(`/api/admin/projects/${resolvedParams.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metadata: { certifications: certs } }) })
                                  .then((r) => { if (r.ok) { showToast('저장되었습니다', 'success') } else { showToast('저장에 실패했습니다', 'error') } })
                              }} className="text-xs text-primary hover:underline">저장</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}

            {detailTab === 'sample' && (
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {/* Sample checklist */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">샘플 체크리스트</p>
                  {(() => {
                    const checklist = (project?.metadata as any)?.sample_checklist ?? {}
                    const items = [
                      { key: 'sample_received', label: '샘플 수령' },
                      { key: 'modify', label: '개선/모디파이 사항' },
                      { key: 'pantone', label: '팬톤 컬러 지정' },
                      { key: 'barcode', label: '바코드 (KC인증번호 포함)' },
                      { key: 'package_design', label: '패키지 디자인 확정' },
                      { key: 'manual', label: '설명서 초안' },
                    ]
                    const statusOptions = ['미완료', '완료', '고객사 승인 대기', '승인완료']
                    const statusBorder: Record<string, string> = { '미완료': 'border-l-gray-300', '완료': 'border-l-green-500', '고객사 승인 대기': 'border-l-yellow-400', '승인완료': 'border-l-blue-500' }
                    const statusBg: Record<string, string> = { '미완료': 'bg-gray-50', '완료': 'bg-green-50', '고객사 승인 대기': 'bg-yellow-50', '승인완료': 'bg-blue-50' }
                    const statusText: Record<string, string> = { '미완료': 'text-gray-500', '완료': 'text-green-700', '고객사 승인 대기': 'text-yellow-700', '승인완료': 'text-blue-700' }
                    return (
                      <div className="space-y-2">
                        {items.map(({ key, label }) => {
                          const st = checklist[key] ?? '미완료'
                          return (
                            <div key={key} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-200 border-l-4 ${statusBorder[st] ?? 'border-l-gray-300'} ${statusBg[st] ?? 'bg-gray-50'}`}>
                              <span className="text-sm font-medium text-gray-800">{label}</span>
                              <select value={st} onChange={(e) => {
                                const next = { ...checklist, [key]: e.target.value }
                                fetch(`/api/admin/projects/${resolvedParams.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metadata: { sample_checklist: next } }) })
                                  .then((r) => { if (r.ok) setProject((prev) => prev ? { ...prev, metadata: { ...(prev.metadata ?? {}), sample_checklist: next } as any } : prev) })
                              }} className={`text-xs font-medium border border-gray-200 rounded-md px-2 py-1.5 ${statusText[st] ?? ''}`}>
                                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
                {/* QC */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">QC 검수</p>
                  {(() => {
                    const qc = (project?.metadata as any)?.qc_status ?? {}
                    const confirmBorder = qc.confirmed === '확인완료' ? 'border-l-green-500' : 'border-l-gray-300'
                    const confirmBg = qc.confirmed === '확인완료' ? 'bg-green-50' : 'bg-gray-50'
                    const resultVal = qc.result ?? '대기'
                    const resultBorder = resultVal === '합격' ? 'border-l-green-500' : resultVal === '불합격' ? 'border-l-red-400' : 'border-l-gray-300'
                    const resultBg = resultVal === '합격' ? 'bg-green-50' : resultVal === '불합격' ? 'bg-red-50' : 'bg-gray-50'
                    return (
                      <div className="space-y-2">
                        <div className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-200 border-l-4 ${confirmBorder} ${confirmBg}`}>
                          <span className="text-sm font-medium text-gray-800">고객사 의뢰 확인</span>
                          <select value={qc.confirmed ?? '미확인'} onChange={(e) => {
                            const next = { ...qc, confirmed: e.target.value }
                            fetch(`/api/admin/projects/${resolvedParams.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metadata: { qc_status: next } }) })
                              .then((r) => { if (r.ok) setProject((prev) => prev ? { ...prev, metadata: { ...(prev.metadata ?? {}), qc_status: next } as any } : prev) })
                          }} className="text-xs font-medium border border-gray-200 rounded-md px-2 py-1.5">
                            <option value="미확인">미확인</option>
                            <option value="확인완료">확인완료</option>
                          </select>
                        </div>
                        <div className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-200 border-l-4 ${resultBorder} ${resultBg}`}>
                          <span className="text-sm font-medium text-gray-800">검수 결과</span>
                          <select value={resultVal} onChange={(e) => {
                            const next = { ...qc, result: e.target.value }
                            fetch(`/api/admin/projects/${resolvedParams.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metadata: { qc_status: next } }) })
                              .then((r) => { if (r.ok) setProject((prev) => prev ? { ...prev, metadata: { ...(prev.metadata ?? {}), qc_status: next } as any } : prev) })
                          }} className="text-xs font-medium border border-gray-200 rounded-md px-2 py-1.5">
                            <option value="대기">대기</option>
                            <option value="합격">합격</option>
                            <option value="불합격">불합격</option>
                          </select>
                        </div>
                        {qc.result === '불합격' && (
                          <textarea value={qc.rework_note ?? ''} onChange={(e) => {
                            const next = { ...qc, rework_note: e.target.value }
                            fetch(`/api/admin/projects/${resolvedParams.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metadata: { qc_status: next } }) })
                              .then((r) => { if (r.ok) setProject((prev) => prev ? { ...prev, metadata: { ...(prev.metadata ?? {}), qc_status: next } as any } : prev) })
                          }} placeholder="재작업 요청 메모" className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md" rows={2} />
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {detailTab === 'history' && (
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">프로젝트 히스토리</p>
                  {sortedNotes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">기록이 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {sortedNotes.map((note, idx) => {
                        const parts = (note.author ?? '').split('|')
                        const name = parts[0] || '알 수 없음'
                        const dept = parts[1] || ''
                        return (
                          <div key={idx} className="flex gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">{name.charAt(0)}</div>
                            <div>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span className="font-medium text-gray-700">{name}</span>
                                {dept && <span>{dept}</span>}
                                <span>{note.date} {note.time ?? ''}</span>
                              </div>
                              <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">{note.content}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div onMouseDown={onRightDragStart} className="shrink-0 w-3 cursor-col-resize flex items-center justify-center mx-1 group">
            <div className="w-0.5 h-4 bg-gray-300 rounded-full group-hover:bg-blue-400 group-active:bg-blue-500 transition-colors" />
          </div>

          {/* RIGHT panel */}
          <aside style={{ width: rightWidth }} className="shrink-0 flex flex-col gap-3 overflow-hidden">
            {/* D-day + company link */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm text-center">
              <p className="text-xs text-gray-500 mb-1">출시 D-day</p>
              <p className={`text-2xl font-bold ${ddayInfo.color}`}>{ddayInfo.label}</p>
              {launchDate && <p className="text-xs text-gray-400 mt-1">{new Date(launchDate).toLocaleDateString('ko-KR')}</p>}
              <button type="button" onClick={() => router.push(`/app/admin/companies/${project.company_id}`)} className="mt-2 text-xs text-primary hover:underline flex items-center justify-center gap-1 mx-auto">고객사 바로가기 <ChevronRight className="w-3 h-3" /></button>
            </div>

            {/* description */}
            {project.description && (
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">설명</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{project.description}</p>
              </div>
            )}

            {/* design rounds */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">디자인 시안</p>
              <div className="flex gap-2">
                {['R1', 'R2', 'R3', 'Final'].map((round) => {
                  const rounds = (project?.metadata as any)?.design_rounds ?? {}
                  const done = rounds[round] === 'done'
                  return (
                    <button key={round} type="button" onClick={() => {
                      const next = { ...rounds, [round]: done ? null : 'done' }
                      fetch(`/api/admin/projects/${resolvedParams.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metadata: { design_rounds: next } }) })
                        .then((r) => { if (r.ok) setProject((prev) => prev ? { ...prev, metadata: { ...(prev.metadata ?? {}), design_rounds: next } as any } : prev) })
                    }} className={`flex-1 py-1.5 text-xs font-medium rounded-md border ${done ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>{round}</button>
                  )
                })}
              </div>
            </div>

            {/* design status */}
            {(() => {
              const designDrops = deliverables.filter((d) => ALL_DESIGN_TYPES.includes(d.type))
              if (designDrops.length === 0) return null
              return (
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">디자인 현황</p>
                  <div className="space-y-2">
                    {designDrops.map((d) => {
                      const cat = getDesignCategory(d.type)
                      const latestVersion = (d.versions ?? [])[(d.versions ?? []).length - 1]
                      const stepInfo = DESIGN_VERSION_STEPS.find((s) => s.value === (latestVersion?.status ?? 'draft'))
                      return (
                        <div key={d.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {cat && <span className={`text-[9px] px-1 py-0.5 rounded font-medium shrink-0 ${cat.color}`}>{cat.label.slice(0, 2)}</span>}
                            <span className="text-xs text-gray-700 truncate">{d.title ?? DELIVERABLE_TYPE_LABELS[d.type]}</span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${stepInfo?.color ?? 'bg-gray-100 text-gray-600'}`}>{stepInfo?.label ?? '대기'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* forwarding placeholder */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">포워딩 현황</p>
              <p className="text-xs text-gray-400">Phase D에서 구현 예정입니다.</p>
            </div>

            {/* memo widget — fills remaining height */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 shrink-0 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">프로젝트 메모</p>
                <button type="button" onClick={() => setMemoSlideOpen(true)} className="text-xs text-gray-400 hover:text-gray-700">확대 보기</button>
              </div>
              {/* messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {sortedNotes.length === 0 && <p className="text-xs text-gray-400 text-center py-4">메모가 없습니다.</p>}
                {[...sortedNotes].reverse().map((note, idx) => {
                  const origIdx = projectNotes.indexOf(note)
                  const parts = (note.author ?? '').split('|')
                  const name = parts[0] || '알 수 없음'
                  const dept = parts[1] || ''
                  const isAdmin = currentUser?.role === 'staff_admin'
                  return (
                    <div key={idx} className="group flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">{name.charAt(0)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-medium text-gray-700">{name}</span>
                          {dept && <span className="text-gray-400">{dept}</span>}
                          <span className="text-gray-300">{note.date} {note.time ?? ''}</span>
                          {isAdmin && memoDeleteIdx !== origIdx && (
                            <button type="button" onClick={() => setMemoDeleteIdx(origIdx)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity ml-auto">✕</button>
                          )}
                        </div>
                        {memoDeleteIdx === origIdx ? (
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <span className="text-gray-500">삭제하시겠습니까?</span>
                            <button type="button" onClick={() => handleDeleteMemo(origIdx)} className="text-red-500 hover:text-red-700 font-medium">확인</button>
                            <button type="button" onClick={() => setMemoDeleteIdx(null)} className="text-gray-400 hover:text-gray-600">취소</button>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 whitespace-pre-line mt-0.5">{note.content}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={memoEndRef} />
              </div>
              {/* input */}
              <div className="p-3 border-t border-gray-100 shrink-0">
                <div className="flex gap-2">
                  <textarea value={memoInput} onChange={(e) => setMemoInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMemo() } }} placeholder="메모 입력..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[36px] max-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" rows={1} />
                  <button type="button" onClick={handleSendMemo} disabled={memoSending || !memoInput.trim()} className="shrink-0 px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover disabled:opacity-50">{memoSending ? '...' : '전송'}</button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>


      {/* Memo Slide Panel */}
      {memoSlideOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMemoSlideOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[480px] max-w-full bg-white shadow-2xl flex flex-col animate-[slideIn_0.2s_ease-out]">
            <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <p className="text-base font-semibold text-gray-900">프로젝트 메모</p>
              <button type="button" onClick={() => setMemoSlideOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {sortedNotes.length === 0 && <p className="text-sm text-gray-400 text-center py-8">메모가 없습니다.</p>}
              {[...sortedNotes].reverse().map((note, idx) => {
                const origIdx = projectNotes.indexOf(note)
                const parts = (note.author ?? '').split('|')
                const name = parts[0] || '알 수 없음'
                const dept = parts[1] || ''
                const isAdmin = currentUser?.role === 'staff_admin'
                return (
                  <div key={idx} className="group flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center shrink-0 mt-0.5">{name.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-gray-700">{name}</span>
                        {dept && <span className="text-gray-400">{dept}</span>}
                        <span className="text-gray-300">{note.date} {note.time ?? ''}</span>
                        {isAdmin && memoDeleteIdx !== origIdx && (
                          <button type="button" onClick={() => setMemoDeleteIdx(origIdx)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity ml-auto">✕</button>
                        )}
                      </div>
                      {memoDeleteIdx === origIdx ? (
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="text-gray-500">삭제하시겠습니까?</span>
                          <button type="button" onClick={() => handleDeleteMemo(origIdx)} className="text-red-500 hover:text-red-700 font-medium">확인</button>
                          <button type="button" onClick={() => setMemoDeleteIdx(null)} className="text-gray-400 hover:text-gray-600">취소</button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 whitespace-pre-line mt-1">{note.content}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="p-4 border-t border-gray-100 shrink-0">
              <div className="flex gap-2">
                <textarea value={memoInput} onChange={(e) => setMemoInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMemo() } }} placeholder="메모 입력..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[40px] max-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" rows={1} />
                <button type="button" onClick={handleSendMemo} disabled={memoSending || !memoInput.trim()} className="shrink-0 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover disabled:opacity-50">{memoSending ? '...' : '전송'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <div>
                <select
                  value={deliverableType}
                  onChange={(e) => setDeliverableType(e.target.value as DeliverableType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {Object.entries(DESIGN_TYPE_CATEGORIES).map(([key, cat]) => (
                    <optgroup key={key} label={cat.label}>
                      {cat.types.map((type) => (
                        <option key={type} value={type}>{DELIVERABLE_TYPE_LABELS[type]}</option>
                      ))}
                    </optgroup>
                  ))}
                  {orderedStepGroups.map((step) => (
                    <optgroup
                      key={step}
                      label={`STEP ${step} · ${STEP_LABELS[step]}`}
                    >
                      {STEP_DELIVERABLE_GROUPS[step].map((type) => (
                        <option key={type} value={type}>
                          {DELIVERABLE_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {/* category badge preview */}
                {(() => { const cat = getDesignCategory(deliverableType); return cat ? <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span> : null })()}
              </div>
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
              <div>
                <select
                  value={editDeliverableType}
                  onChange={(event) => setEditDeliverableType(event.target.value as DeliverableType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {Object.entries(DESIGN_TYPE_CATEGORIES).map(([key, cat]) => (
                    <optgroup key={key} label={cat.label}>
                      {cat.types.map((type) => (
                        <option key={type} value={type}>{DELIVERABLE_TYPE_LABELS[type]}</option>
                      ))}
                    </optgroup>
                  ))}
                  {orderedStepGroups.map((step) => (
                    <optgroup
                      key={step}
                      label={`STEP ${step} · ${STEP_LABELS[step]}`}
                    >
                      {STEP_DELIVERABLE_GROUPS[step].map((type) => (
                        <option key={type} value={type}>
                          {DELIVERABLE_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {(() => { const cat = getDesignCategory(editDeliverableType); return cat ? <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span> : null })()}
              </div>
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
              <div>
                <label className="text-xs text-gray-500 mb-1 block">출시 예정일</label>
                <div className="relative">
                  <input
                    type="date"
                    value={editLaunchDate}
                    onChange={(event) => setEditLaunchDate(event.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${!editLaunchDate ? 'text-gray-400' : ''}`}
                  />
                  {!editLaunchDate && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-300 pointer-events-none">{new Date().toISOString().slice(0, 10)}</span>}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">담당자</label>
                <select
                  value={editAssignee}
                  onChange={(event) => setEditAssignee(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">선택</option>
                  {staffUsers.map((s) => (
                    <option key={s.user_id} value={s.name ?? s.email}>{s.name ?? s.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">STEP</label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <button key={s} type="button" onClick={() => { setEditStep(s); setEditStepConfirm(s !== (project?.step ?? 0)) }} className={`flex-1 py-2 text-xs font-semibold rounded-md border-2 transition-colors ${editStep === s ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>{s}</button>
                  ))}
                </div>
                {editStepConfirm && (
                  <p className="text-xs text-yellow-600 mt-1">STEP {editStep}으로 변경됩니다.</p>
                )}
              </div>
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

                  const editMetadata: Record<string, any> = {}
                  if (editLaunchDate) editMetadata.launch_date = editLaunchDate
                  else editMetadata.launch_date = null
                  if (editAssignee.trim()) editMetadata.assignee = editAssignee.trim()
                  else editMetadata.assignee = null

                  const response = await fetch(`/api/admin/projects/${resolvedParams.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: editName.trim(),
                      description: editDescription.trim() || null,
                      companyId: editCompanyId,
                      step: editStep,
                      metadata: editMetadata,
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
              <h3 className="text-lg font-semibold">프로젝트 메모</h3>
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
                <p className="text-sm text-gray-500">등록된 프로젝트 메모가 없습니다.</p>
              ) : (
                sortedNotes.map((note, index) => (
                  <button
                    key={`${note.date}-${index}`}
                    type="button"
                    onClick={() => router.push(`/app/admin/companies/${project.company_id}?tab=history`)}
                    className="w-full text-left border-b border-gray-100 pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500">
                        {[note.date?.replace(/-/g, '.'), note.time].filter(Boolean).join(' ')}
                        {note.author ? ` · ${note.author}` : ''}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{note.content}</p>
                  </button>
                ))
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
                + 새 메모 추가
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
                    placeholder="메모 내용을 입력하세요"
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
