'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronRight, Plus, Search, X } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { ToastContainer } from '@/components/toast'
import { createBrowserClient } from '@supabase/ssr'
import { useToast } from '@/hooks/use-toast'
import { STEP_LABELS } from '@/lib/constants'
import { User, UserRole } from '@/types'

const BRUTION_ID = '00000000-0000-0000-0000-000000000001'
const COL_WIDTHS_KEY = 'brution-project-col-widths'

type ApiProject = {
  step: number
  id: string
  name: string
  description: string | null
  created_at: string
  company_id: string
  status?: 'active' | 'completed' | 'paused'
  metadata?: { launch_date?: string | null; assignee?: string | null } | null
  companies?: { id?: string; name?: string; metadata?: Record<string, any> | null } | { id?: string; name?: string; metadata?: Record<string, any> | null }[] | null
  deliverables?: { deliverable_versions?: { status?: string }[] }[] | null
}

type ApiCompany = { id: string; name: string }

const stepOptions = [
  { value: 0, label: 'STEP 0 · 스타터 패키지' },
  { value: 1, label: 'STEP 1 · 브랜드 기획' },
  { value: 2, label: 'STEP 2 · 디자인·인증' },
  { value: 3, label: 'STEP 3 · 생산·납품' },
  { value: 4, label: 'STEP 4 · 출시' },
]

const stepBadgeColors: Record<number, string> = {
  0: 'bg-gray-100 text-gray-700',
  1: 'bg-blue-50 text-blue-700',
  2: 'bg-purple-50 text-purple-700',
  3: 'bg-orange-50 text-orange-700',
  4: 'bg-green-50 text-green-700',
}

const getCompany = (c: ApiProject['companies']) => {
  if (!c) return { id: '', name: '', metadata: null as Record<string, any> | null }
  const obj = Array.isArray(c) ? c[0] : c
  return { id: obj?.id ?? '', name: obj?.name ?? '', metadata: obj?.metadata ?? null }
}

const getDday = (dateStr?: string | null) => {
  if (!dateStr) return { label: '미설정', color: 'text-gray-400', accent: false }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end = new Date(dateStr); end.setHours(0, 0, 0, 0)
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: `D+${Math.abs(diff)}`, color: 'text-red-600 font-semibold', accent: true }
  if (diff <= 7) return { label: `D-${diff}`, color: 'text-red-600 font-semibold', accent: true }
  if (diff <= 30) return { label: `D-${diff}`, color: 'text-yellow-600 font-semibold', accent: false }
  return { label: `D-${diff}`, color: 'text-green-600', accent: false }
}

const getDropCounts = (deliverables: ApiProject['deliverables']) => {
  let published = 0, in_review = 0, draft = 0
  ;(deliverables ?? []).forEach((d) => {
    ;(d.deliverable_versions ?? []).forEach((v) => {
      if (v.status === 'published') published++
      else if (v.status === 'in_review') in_review++
      else if (v.status === 'draft') draft++
    })
  })
  return { published, in_review, draft }
}

// ─── resizable column widths ──────────────────────────────────────────────

const DEFAULT_COL_WIDTHS = [300, 200, 140, 150, 120, 120] // all px

function useColumnWidths() {
  const [widths, setWidths] = useState(DEFAULT_COL_WIDTHS)
  const [mounted, setMounted] = useState(false)
  const dragging = useRef(false)
  const dragIdx = useRef(-1)
  const startX = useRef(0)
  const startWidths = useRef([...DEFAULT_COL_WIDTHS])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COL_WIDTHS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === 6) setWidths(parsed)
      }
    } catch {}
    setMounted(true)
  }, [])

  const onMouseDown = (e: React.MouseEvent, colIdx: number) => {
    e.preventDefault()
    dragging.current = true
    dragIdx.current = colIdx
    startX.current = e.clientX
    startWidths.current = [...widths]

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const delta = ev.clientX - startX.current
      const next = [...startWidths.current]
      // adjust the column to the left of the divider
      const minW = 80
      const maxW = 500
      const newVal = startWidths.current[colIdx] + delta
      next[colIdx] = Math.max(minW, Math.min(maxW, newVal))
      setWidths(next)
    }

    const onUp = () => {
      dragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setWidths((w) => { try { localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(w)) } catch {}; return w })
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return { widths, mounted, onMouseDown }
}

// ─── types ────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'step'
type Filter = 'all' | 'step0' | 'step1' | 'step2' | 'step3' | 'step4' | 'active' | 'completed'

// ─── page component ──────────────────────────────────────────────────────

export default function AdminProjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const cols = useColumnWidths()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [companies, setCompanies] = useState<ApiCompany[]>([])
  const [staffUsers, setStaffUsers] = useState<{ user_id: string; name: string | null; email: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [collapsedSteps, setCollapsedSteps] = useState<Set<number>>(new Set())

  // create modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCompanyId, setFormCompanyId] = useState('')
  const [formStep, setFormStep] = useState(0)
  const [formLaunchDate, setFormLaunchDate] = useState('')
  const [formAssignee, setFormAssignee] = useState('')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const fp = searchParams.get('filter')
    if (fp === 'active') setFilter('active')
    else setFilter('all')
  }, [searchParams])

  useEffect(() => {
    let active = true
    const loadData = async () => {
      setLoading(true); setError(null)
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const sessionRole = session.user.user_metadata?.role ?? null
      let me: any = null
      if (sessionRole) {
        me = { userId: session.user.id, email: session.user.email ?? '', role: sessionRole, companyId: session.user.user_metadata?.company_id ?? null, mustChangePassword: false, status: 'active' }
      } else {
        const r = await fetch('/api/auth/me', { cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` } })
        if (r.status === 401) { router.replace('/login'); return }
        if (!r.ok) { if (active) { setError('사용자 정보를 불러올 수 없습니다'); setLoading(false) }; return }
        me = await r.json()
      }
      const user: User = { id: me.userId, email: me.email, name: me.email, role: me.role as UserRole, companyId: me.companyId ?? '', mustChangePassword: me.mustChangePassword, status: me.status as 'active' | 'inactive' }
      if (user.role !== 'staff_admin') { router.replace('/app/projects'); return }
      const [pRes, cRes, sRes] = await Promise.all([
        fetch('/api/admin/projects', { cache: 'no-store' }),
        fetch('/api/admin/companies', { cache: 'no-store' }),
        fetch('/api/admin/staff', { cache: 'no-store' }),
      ])
      if (active) {
        if (pRes.ok) { const d = await pRes.json(); setProjects(Array.isArray(d?.projects) ? d.projects : []) }
        else setError('프로젝트 목록을 불러올 수 없습니다')
        if (cRes.ok) { const d = await cRes.json(); setCompanies(Array.isArray(d?.companies) ? d.companies : []) }
        if (sRes.ok) { const d = await sRes.json(); setStaffUsers(Array.isArray(d?.staff) ? d.staff : []) }
        setCurrentUser(user); setLoading(false)
      }
    }
    loadData()
    return () => { active = false }
  }, [router])

  useEffect(() => {
    if (!isOpen) return
    const h = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [isOpen])

  useEffect(() => {
    if (!formCompanyId) { setSelectedCompany(null); return }
    const m = companies.find((c) => c.id === formCompanyId)
    if (m) setSelectedCompany(m)
  }, [companies, formCompanyId])

  const filteredModalCompanies = useMemo(() => {
    const kw = searchQuery.trim().toLowerCase()
    const avail = companies.filter((c) => c.id !== BRUTION_ID)
    if (!kw) return avail
    return avail.filter((c) => c.name.toLowerCase().includes(kw))
  }, [companies, searchQuery])

  const filteredProjects = useMemo(() => {
    const kw = query.trim().toLowerCase()
    let result = projects.filter((p) => {
      if (p.company_id === BRUTION_ID) return false
      const co = getCompany(p.companies)
      if (co.id === BRUTION_ID) return false
      return true
    })
    if (filter === 'active') result = result.filter((p) => (p.status ?? 'active') === 'active')
    else if (filter === 'completed') result = result.filter((p) => p.status === 'completed')
    else if (filter.startsWith('step')) result = result.filter((p) => p.step === Number(filter.replace('step', '')))
    if (kw) result = result.filter((p) => p.name.toLowerCase().includes(kw) || getCompany(p.companies).name.toLowerCase().includes(kw))
    return [...result].sort((a, b) => {
      const endA = a.metadata?.launch_date ?? ''
      const endB = b.metadata?.launch_date ?? ''
      if (!endA && !endB) return 0; if (!endA) return 1; if (!endB) return -1
      return new Date(endA).getTime() - new Date(endB).getTime()
    })
  }, [projects, query, filter])

  const filterTabs: { key: Filter; label: string }[] = [
    { key: 'all', label: '전체' }, { key: 'step0', label: 'STEP 0' }, { key: 'step1', label: 'STEP 1' }, { key: 'step2', label: 'STEP 2' }, { key: 'step3', label: 'STEP 3' }, { key: 'step4', label: 'STEP 4' }, { key: 'active', label: '진행중' }, { key: 'completed', label: '완료' },
  ]

  const stepGroups = useMemo(() => {
    const g: Record<number, ApiProject[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] }
    filteredProjects.forEach((p) => { const s = p.step ?? 0; if (g[s]) g[s].push(p) })
    return g
  }, [filteredProjects])

  const toggleStep = (s: number) => setCollapsedSteps((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })

  const handleCreate = async () => {
    if (!formName.trim()) { setFormError('프로젝트명을 입력하세요'); return }
    if (!formCompanyId) { setFormError('고객사를 선택하세요'); return }
    setCreating(true); setFormError(null)
    const metadata: Record<string, any> = {}
    if (formLaunchDate) metadata.launch_date = formLaunchDate
    if (formAssignee) metadata.assignee = formAssignee
    const r = await fetch('/api/admin/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: formName.trim(), description: formDescription.trim() || null, companyId: formCompanyId, step: formStep, metadata: Object.keys(metadata).length ? metadata : undefined }) })
    if (!r.ok) { setFormError('프로젝트 생성에 실패했습니다'); showToast('프로젝트 생성에 실패했습니다', 'error'); setCreating(false); return }
    setFormName(''); setFormDescription(''); setFormStep(0); setFormCompanyId(''); setFormLaunchDate(''); setFormAssignee(''); setSelectedCompany(null); setSearchQuery(''); setIsOpen(false); setShowCreateModal(false); setCreating(false)
    showToast('프로젝트가 생성되었습니다', 'success')
    const pr = await fetch('/api/admin/projects', { cache: 'no-store' })
    if (pr.ok) { const d = await pr.json(); setProjects(Array.isArray(d?.projects) ? d.projects : []) }
  }

  // ── grid template ─────────────────────────────────────────────────────────

  const gridTemplate = `${cols.widths[0]}px ${cols.widths[1]}px ${cols.widths[2]}px ${cols.widths[3]}px ${cols.widths[4]}px ${cols.widths[5]}px`

  const [isDragging, setIsDragging] = useState(false)
  const Divider = ({ idx }: { idx: number }) => (
    <div
      onMouseDown={(e) => { setIsDragging(true); cols.onMouseDown(e, idx); const up = () => { setIsDragging(false); document.removeEventListener('mouseup', up) }; document.addEventListener('mouseup', up) }}
      className="absolute top-0 bottom-0 w-3 -right-1.5 cursor-col-resize z-10 flex items-center justify-center group"
    >
      <div className="w-0.5 h-4 bg-gray-300 rounded-full group-hover:bg-blue-400 group-active:bg-blue-500 transition-colors" />
    </div>
  )

  const renderRow = (project: ApiProject) => {
    const co = getCompany(project.companies)
    const launchDate = project.metadata?.launch_date ?? null
    const dday = getDday(launchDate)
    const drops = getDropCounts(project.deliverables)
    const step = project.step ?? 0
    const assignee = (project.metadata?.assignee as string) ?? (co.metadata?.brution_manager as string) ?? '-'

    return (
      <div
        key={project.id}
        onClick={() => router.push(`/app/admin/projects/${project.id}`)}
        className={`relative grid gap-2 px-4 py-3 items-center cursor-pointer hover:bg-blue-50/40 transition-colors ${dday.accent ? 'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-red-500 before:rounded-r' : ''}`}
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
          <p className="text-xs text-gray-400 truncate">{co.name || '미지정'}</p>
        </div>
        <div><span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${stepBadgeColors[step] ?? 'bg-gray-100 text-gray-700'}`}>STEP {step} · {STEP_LABELS[step]}</span></div>
        <div><span className={`text-xs whitespace-nowrap ${dday.color}`}>{dday.label}</span></div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />{drops.published}</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />{drops.in_review}</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />{drops.draft}</span>
        </div>
        <div className="text-xs text-gray-600 truncate">{assignee}</div>
        <div className="text-xs text-gray-500">
          {(() => {
            const feed = Array.isArray(co.metadata?.activity_feed) ? co.metadata.activity_feed : []
            if (feed.length === 0) return '-'
            const sorted = [...feed].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            return new Date(sorted[0].created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
          })()}
        </div>
      </div>
    )
  }

  if (loading && !currentUser) return <div className="p-6 min-h-screen" />
  if (error && !currentUser) return <div className="p-6 text-sm text-red-600">{error}</div>
  if (!currentUser) return <div className="p-6 text-sm text-gray-500">사용자 정보를 확인할 수 없습니다.</div>

  return (
    <AppLayout user={currentUser}>
      <div className="max-w-6xl" style={{ visibility: cols.mounted ? 'visible' : 'hidden' }}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">프로젝트 관리</h1>
            <p className="text-sm text-gray-500 mt-0.5">총 {filteredProjects.length}건</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-hover transition-colors"><Plus className="w-4 h-4" /> 새 프로젝트</button>
        </div>

        {/* Search + Filters + View toggle */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="프로젝트명 / 고객사명 검색" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          {filterTabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setFilter(t.key)} className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${filter === t.key ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{t.label}</button>
          ))}
          <div className="ml-auto flex rounded-lg border border-gray-200 overflow-hidden">
            <button type="button" onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-xs font-medium ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>목록</button>
            <button type="button" onClick={() => setViewMode('step')} className={`px-3 py-1.5 text-xs font-medium ${viewMode === 'step' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>STEP별</button>
          </div>
        </div>

        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        {/* List view */}
        {viewMode === 'list' && (
          <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${isDragging ? 'cursor-col-resize' : ''}`}>
            {/* Header */}
            <div className="hidden md:grid gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide" style={{ gridTemplateColumns: gridTemplate }}>
              {['프로젝트', 'STEP', '출시 D-day', '드롭', '담당자', '최근 활동'].map((label, i) => (
                <div key={label} className="relative">
                  {label}
                  {i < 5 && <Divider idx={i} />}
                </div>
              ))}
            </div>
            {filteredProjects.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-500">등록된 프로젝트가 없습니다</div>
            ) : (
              <div className="divide-y divide-gray-100">{filteredProjects.map(renderRow)}</div>
            )}
          </div>
        )}

        {/* Step group view */}
        {viewMode === 'step' && (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((step) => {
              const items = stepGroups[step] ?? []
              const collapsed = collapsedSteps.has(step)
              return (
                <div key={step} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button type="button" onClick={() => toggleStep(step)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      {collapsed ? <ChevronRight className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stepBadgeColors[step]}`}>STEP {step}</span>
                      <span className="text-sm font-medium text-gray-700">{STEP_LABELS[step]}</span>
                    </div>
                    <span className="text-xs text-gray-400">{items.length}건</span>
                  </button>
                  {!collapsed && items.length > 0 && <div className="divide-y divide-gray-100">{items.map(renderRow)}</div>}
                  {!collapsed && items.length === 0 && <div className="p-6 text-center text-xs text-gray-400">프로젝트 없음</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">새 프로젝트 추가</h3>
              <button onClick={() => setShowCreateModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">프로젝트명 *</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="프로젝트명" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="relative" ref={dropdownRef}>
                <label className="text-xs text-gray-500 mb-1 block">고객사 *</label>
                <button type="button" onClick={() => setIsOpen((v) => !v)} className="w-full px-3 py-2 border border-gray-300 rounded-md flex items-center justify-between">
                  <span className={selectedCompany ? 'text-gray-900' : 'text-gray-400'}>{selectedCompany ? selectedCompany.name : '고객사를 선택하세요'}</span>
                  {selectedCompany && <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setSelectedCompany(null); setFormCompanyId(''); setSearchQuery(''); setIsOpen(false) }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCompany(null); setFormCompanyId(''); setSearchQuery(''); setIsOpen(false) } }} className="ml-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></span>}
                </button>
                {isOpen && (
                  <div className="absolute z-50 mt-2 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                    <div className="p-2"><input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="고객사 검색" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" /></div>
                    <div className="max-h-48 overflow-y-auto py-1">
                      {filteredModalCompanies.length === 0 ? <div className="px-3 py-2 text-sm text-gray-500">검색 결과가 없습니다</div> : filteredModalCompanies.map((c) => (
                        <button key={c.id} type="button" onClick={() => { setSelectedCompany(c); setFormCompanyId(c.id); setSearchQuery(''); setIsOpen(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{c.name}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">STEP</label>
                  <select value={formStep} onChange={(e) => setFormStep(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    {stepOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">출시 예정일</label>
                  <input type="date" value={formLaunchDate} onChange={(e) => setFormLaunchDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">담당자</label>
                <select value={formAssignee} onChange={(e) => setFormAssignee(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="">선택</option>
                  {staffUsers.map((s) => <option key={s.user_id} value={s.name ?? s.email}>{s.name ?? s.email}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">프로젝트 설명</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="설명 (선택)" className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={3} />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowCreateModal(false); setFormError(null) }} className="px-4 py-2 border border-gray-300 rounded-md">취소</button>
              <button type="button" disabled={creating} onClick={handleCreate} className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50">{creating ? '생성 중...' : '추가'}</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </AppLayout>
  )
}
