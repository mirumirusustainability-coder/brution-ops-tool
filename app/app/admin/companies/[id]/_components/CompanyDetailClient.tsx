'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { ToastContainer } from '@/components/toast';
import { useToast } from '@/hooks/use-toast';
import { ContractsTab } from './ContractsTab';
import { UsersTab } from './UsersTab';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import type {
  ActivityFeedItem,
  ApiCompany,
  ApiProject,
  ApiUser,
  CompanyMetadata,
} from './types';
import type { User as AppUser } from '@/types';

// ─── constants ────────────────────────────────────────────────────────────────

const STEP_LABELS: Record<number, string> = {
  0: '스타터패키지',
  1: '브랜드기획',
  2: '디자인·인증',
  3: '생산·납품',
  4: '출시',
};

const DEFAULT_SHORTCUTS = ['채팅', '견적서', '승인요청', '리포트'];

const LEFT_WIDTH_KEY = 'brution-company-left-width';
const RIGHT_WIDTH_KEY = 'brution-company-right-width';
const LEFT_DEFAULT = 260;
const LEFT_MIN = 200;
const LEFT_MAX = 320;
const RIGHT_DEFAULT = 340;
const RIGHT_MIN = 260;
const RIGHT_MAX = 420;

function useResizable(storageKey: string, defaultVal: number, min: number, max: number) {
  const [width, setWidth] = useState(defaultVal);
  const [mounted, setMounted] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(defaultVal);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const n = Number(saved);
        if (n >= min && n <= max) setWidth(n);
      }
    } catch {}
    setMounted(true);
  }, [storageKey, min, max]);

  const onMouseDown = (e: React.MouseEvent, direction: 1 | -1) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = (ev.clientX - startX.current) * direction;
      const next = Math.min(max, Math.max(min, startW.current + delta));
      setWidth(next);
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try { localStorage.setItem(storageKey, String(Math.min(max, Math.max(min, startW.current + 0)))); } catch {}
      // save final width
      setWidth((w) => { try { localStorage.setItem(storageKey, String(w)); } catch {} return w; });
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return { width, mounted, onMouseDown };
}

const contractBadgeStyles: Record<string, string> = {
  '리드': 'bg-gray-100 text-gray-600',
  '상담중': 'bg-blue-50 text-blue-600',
  '계약완료': 'bg-indigo-50 text-indigo-600',
  '진행중': 'bg-emerald-50 text-emerald-600',
  '완료': 'bg-green-50 text-green-700',
  '보류': 'bg-yellow-50 text-yellow-600',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const getNow = () => new Date().toISOString();

// ─── sub-components ───────────────────────────────────────────────────────────

function ProfileMenuDropdown({
  onEditProfile,
  onEditImage,
  onEditContract,
  onEditBrand,
  onEditShortcuts,
  onDelete,
}: {
  onEditProfile: () => void;
  onEditImage: () => void;
  onEditContract: () => void;
  onEditBrand: () => void;
  onEditShortcuts: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-base leading-none">···</button>
      {open && (
        <div className="absolute right-0 top-7 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          <button type="button" onClick={() => { setOpen(false); onEditProfile(); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">프로필 수정</button>
          <button type="button" onClick={() => { setOpen(false); onEditImage(); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">프로필 이미지 수정</button>
          <button type="button" onClick={() => { setOpen(false); onEditContract(); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">계약 내용 수정</button>
          <button type="button" onClick={() => { setOpen(false); onEditBrand(); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">브랜드 정보 수정</button>
          <button type="button" onClick={() => { setOpen(false); onEditShortcuts(); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">단축 기능 설정</button>
          <div className="border-t border-gray-100 my-1" />
          <button type="button" onClick={() => { setOpen(false); onDelete(); }} className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">고객사 삭제</button>
        </div>
      )}
    </div>
  );
}

function FeedItem({
  item,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  item: ActivityFeedItem;
  onEdit: (item: ActivityFeedItem) => void;
  onDelete: (item: ActivityFeedItem) => void;
  onTogglePin: (item: ActivityFeedItem) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const dt = new Date(item.created_at);
  const dateStr = `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className="group flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${item.type === 'project' ? 'bg-green-400' : 'bg-blue-400'}`} />
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {item.pinned && <span className="text-xs">📌</span>}
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${item.type === 'project' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {item.type === 'project' ? '프로젝트' : '영업'}
            </span>
            {item.project_name && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">{item.project_name}</span>}
            <span className="text-xs text-gray-400">{dateStr} {timeStr} · {item.author}</span>
          </div>
          <div ref={menuRef} className="relative shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => setMenuOpen((v) => !v)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-base leading-none" title="더보기">···</button>
            {menuOpen && (
              <div className="absolute right-0 top-6 z-20 w-32 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                <button type="button" onClick={() => { setMenuOpen(false); onEdit(item); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">수정</button>
                <button type="button" onClick={() => { setMenuOpen(false); onTogglePin(item); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">{item.pinned ? '핀 해제' : '핀 고정'}</button>
                <button type="button" onClick={() => { setMenuOpen(false); onDelete(item); }} className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">삭제</button>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-line">{item.content}</p>
      </div>
    </div>
  );
}

function FeedInput({
  projects,
  onSave,
  saving,
  content,
  setContent,
  feedType,
  setFeedType,
  feedProjectId,
  setFeedProjectId,
}: {
  projects: ApiProject[];
  onSave: () => void;
  saving: boolean;
  content: string;
  setContent: (v: string) => void;
  feedType: 'sales' | 'project';
  setFeedType: (v: 'sales' | 'project') => void;
  feedProjectId: string;
  setFeedProjectId: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="shrink-0 border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {!expanded ? (
        <button
          type="button"
          onClick={() => { setExpanded(true); setTimeout(() => textareaRef.current?.focus(), 0); }}
          className="w-full text-left px-4 py-3 text-sm text-gray-400 hover:bg-gray-50 transition-colors"
        >
          기록하기...
        </button>
      ) : (
        <div className="p-3 space-y-2">
          <textarea ref={textareaRef} value={content} onChange={(e) => setContent(e.target.value)} placeholder="기록하기..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[72px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(['sales', 'project'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => { setFeedType(t); if (t === 'sales') setFeedProjectId(''); }} className={`px-3 py-1.5 text-xs font-medium transition-colors ${feedType === t ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                    {t === 'sales' ? '영업' : '프로젝트'}
                  </button>
                ))}
              </div>
              {feedType === 'project' && (
                <select value={feedProjectId} onChange={(e) => setFeedProjectId(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">프로젝트 선택</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name ?? '(이름 없음)'}</option>)}
                </select>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setExpanded(false); setContent(''); setFeedProjectId(''); }} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">취소</button>
              <button type="button" onClick={() => { onSave(); setExpanded(false); }} disabled={saving} className="px-4 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50">{saving ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

type DropStatusCounts = { published: number; in_review: number; draft: number };

type CompanyDetailClientProps = {
  currentUser: AppUser;
  company: ApiCompany;
  projects: ApiProject[];
  users: ApiUser[];
  dropStatusCounts: DropStatusCounts;
  error?: string | null;
};

type ModalType = 'contracts' | 'users' | 'editProfile' | 'editContract' | 'editBrand' | null;
type FeedFilter = 'all' | 'sales' | 'project';
type CenterTab = 'overview' | 'chat' | 'history' | 'approvals';

export function CompanyDetailClient({
  currentUser,
  company,
  projects,
  users,
  dropStatusCounts,
  error,
}: CompanyDetailClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  // ── resizable panels ──────────────────────────────────────────────────────
  const leftPanel = useResizable(LEFT_WIDTH_KEY, LEFT_DEFAULT, LEFT_MIN, LEFT_MAX);
  const rightPanel = useResizable(RIGHT_WIDTH_KEY, RIGHT_DEFAULT, RIGHT_MIN, RIGHT_MAX);

  // ── modals ────────────────────────────────────────────────────────────────
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [showDeleteCompanyModal, setShowDeleteCompanyModal] = useState(false);

  // ── left panel editing ────────────────────────────────────────────────────
  const [profileDraft, setProfileDraft] = useState<CompanyMetadata>(company.metadata ?? {});
  const [savingProfile, setSavingProfile] = useState(false);

  // ── center tab ────────────────────────────────────────────────────────────
  const [centerTab, setCenterTab] = useState<CenterTab>('overview');

  // ── next action ───────────────────────────────────────────────────────────
  const [isEditingAction, setIsEditingAction] = useState(false);
  const [nextActionDraft, setNextActionDraft] = useState(company.metadata?.next_action ?? '');
  const [savingAction, setSavingAction] = useState(false);

  // ── activity feed ─────────────────────────────────────────────────────────
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [feedContent, setFeedContent] = useState('');
  const [feedType, setFeedType] = useState<'sales' | 'project'>('sales');
  const [feedProjectId, setFeedProjectId] = useState('');
  const [savingFeed, setSavingFeed] = useState(false);
  const [editingFeedItem, setEditingFeedItem] = useState<ActivityFeedItem | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteFeedTarget, setDeleteFeedTarget] = useState<ActivityFeedItem | null>(null);

  const feedItems = useMemo<ActivityFeedItem[]>(() => {
    const raw = company.metadata?.activity_feed;
    if (!Array.isArray(raw)) return [];
    return [...raw].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [company.metadata]);

  const filteredFeed = useMemo(() => {
    const base = feedFilter === 'all' ? feedItems : feedItems.filter((item) => item.type === feedFilter);
    return [...base].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [feedItems, feedFilter]);

  // ── helpers ───────────────────────────────────────────────────────────────

  const patchCompany = async (metadata: CompanyMetadata) => {
    const res = await fetch(`/api/admin/companies/${company.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata }),
    });
    if (res.status === 401) { router.replace('/login'); return; }
    if (!res.ok) throw new Error('UPDATE_FAILED');
    router.refresh();
  };

  const handleProfileSave = async () => {
    setSavingProfile(true);
    try {
      await patchCompany(profileDraft);
      setOpenModal(null);
      showToast('저장되었습니다', 'success');
    } catch {
      showToast('저장에 실패했습니다', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteCompany = async () => {
    const res = await fetch(`/api/admin/companies/${company.id}`, { method: 'DELETE' });
    if (res.status === 401) { router.replace('/login'); return; }
    if (!res.ok) { showToast('고객사 삭제에 실패했습니다', 'error'); return; }
    showToast('고객사가 삭제되었습니다', 'success');
    router.replace('/app/admin/companies');
  };

  const handleAddFeed = async () => {
    if (!feedContent.trim()) { showToast('내용을 입력해 주세요', 'info'); return; }
    if (feedType === 'project' && !feedProjectId) { showToast('프로젝트를 선택해 주세요', 'info'); return; }
    const selectedProject = projects.find((p) => p.id === feedProjectId);
    const newItem: ActivityFeedItem = {
      id: genId(), type: feedType,
      project_id: feedType === 'project' ? feedProjectId : undefined,
      project_name: feedType === 'project' ? (selectedProject?.name ?? undefined) : undefined,
      content: feedContent.trim(), author: currentUser.name, created_at: getNow(),
    };
    const prevFeed = Array.isArray(company.metadata?.activity_feed) ? company.metadata.activity_feed : [];
    setSavingFeed(true);
    try {
      await patchCompany({ ...company.metadata, activity_feed: [...prevFeed, newItem] });
      setFeedContent(''); setFeedProjectId('');
      showToast('기록이 추가되었습니다', 'success');
    } catch { showToast('저장에 실패했습니다', 'error'); }
    finally { setSavingFeed(false); }
  };

  const handleEditFeedSave = async () => {
    if (!editingFeedItem) return;
    if (!editContent.trim()) { showToast('내용을 입력해 주세요', 'info'); return; }
    const prevFeed = Array.isArray(company.metadata?.activity_feed) ? company.metadata.activity_feed : [];
    const nextFeed = prevFeed.map((f) => f.id === editingFeedItem.id ? { ...f, content: editContent.trim() } : f);
    try { await patchCompany({ ...company.metadata, activity_feed: nextFeed }); setEditingFeedItem(null); showToast('수정되었습니다', 'success'); }
    catch { showToast('수정에 실패했습니다', 'error'); }
  };

  const handleDeleteFeed = async () => {
    if (!deleteFeedTarget) return;
    const prevFeed = Array.isArray(company.metadata?.activity_feed) ? company.metadata.activity_feed : [];
    const nextFeed = prevFeed.filter((f) => f.id !== deleteFeedTarget.id);
    try { await patchCompany({ ...company.metadata, activity_feed: nextFeed }); setDeleteFeedTarget(null); showToast('삭제되었습니다', 'success'); }
    catch { showToast('삭제에 실패했습니다', 'error'); }
  };

  const handleTogglePin = async (item: ActivityFeedItem) => {
    const prevFeed = Array.isArray(company.metadata?.activity_feed) ? company.metadata.activity_feed : [];
    const nextFeed = prevFeed.map((f) => f.id === item.id ? { ...f, pinned: !f.pinned } : f);
    try { await patchCompany({ ...company.metadata, activity_feed: nextFeed }); showToast(item.pinned ? '핀이 해제되었습니다' : '핀으로 고정되었습니다', 'success'); }
    catch { showToast('저장에 실패했습니다', 'error'); }
  };

  const handleSaveNextAction = async () => {
    setSavingAction(true);
    try { await patchCompany({ ...company.metadata, next_action: nextActionDraft.trim() || null }); setIsEditingAction(false); showToast('저장되었습니다', 'success'); }
    catch { showToast('저장에 실패했습니다', 'error'); }
    finally { setSavingAction(false); }
  };

  // ── computed ──────────────────────────────────────────────────────────────

  const meta = company.metadata ?? {};
  const activeUsers = users.filter((u) => u.status === 'active');
  const shortcuts = (meta.shortcut_actions as string[] | undefined) ?? DEFAULT_SHORTCUTS;
  const inputCls = 'w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

  const ddayInfo = useMemo(() => {
    const end = meta.contract_end;
    if (!end) return { label: '미설정', color: 'text-gray-400', bg: 'bg-gray-100' };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const endDate = new Date(end); endDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: `D+${Math.abs(diff)}`, color: 'text-red-700', bg: 'bg-red-50' };
    if (diff <= 7) return { label: `D-${diff}`, color: 'text-red-700', bg: 'bg-red-50' };
    if (diff <= 30) return { label: `D-${diff}`, color: 'text-yellow-700', bg: 'bg-yellow-50' };
    return { label: `D-${diff}`, color: 'text-green-700', bg: 'bg-green-50' };
  }, [meta.contract_end]);

  const aiCreditLimit = (meta.ai_credit_limit as number) ?? 100;
  const aiCreditUsed = (meta.ai_credit_used as number) ?? 0;
  const aiCreditPct = aiCreditLimit > 0 ? Math.min(100, Math.round((aiCreditUsed / aiCreditLimit) * 100)) : 0;

  const highestStep = useMemo(() => {
    let max = -1;
    projects.forEach((p) => { if ((p.step ?? -1) > max) max = p.step ?? -1; });
    return max >= 0 ? max : null;
  }, [projects]);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout user={currentUser}>
      <div className="flex h-[calc(100vh-var(--topbar-h,64px)-3rem)] -m-6 p-6 overflow-hidden" style={{ visibility: leftPanel.mounted ? 'visible' : 'hidden' }}>

        {/* ── LEFT PANEL ── */}
        <aside style={{ width: leftPanel.width }} className="shrink-0 flex flex-col gap-3 overflow-y-auto">
          {/* profile card */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-3">
              {/* avatar */}
              <div className="flex items-center gap-3">
                {meta.profile_image_url ? (
                  <img src={meta.profile_image_url as string} alt={company.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="text-sm font-bold text-gray-900 truncate">{company.name}</h1>
                  {meta.brand_name && <p className="text-xs text-gray-400 truncate">{meta.brand_name}</p>}
                </div>
              </div>
              <ProfileMenuDropdown
                onEditProfile={() => { setProfileDraft(meta); setOpenModal('editProfile'); }}
                onEditImage={() => showToast('프로필 이미지 수정은 준비 중입니다', 'info')}
                onEditContract={() => { setProfileDraft(meta); setOpenModal('editContract'); }}
                onEditBrand={() => { setProfileDraft(meta); setOpenModal('editBrand'); }}
                onEditShortcuts={() => showToast('단축 기능 설정은 준비 중입니다', 'info')}
                onDelete={() => setShowDeleteCompanyModal(true)}
              />
            </div>

            {/* shortcuts bar */}
            <div className="flex gap-1 mb-3">
              {shortcuts.slice(0, 4).map((s) => (
                <button key={s} type="button" className="flex-1 text-center py-1.5 text-xs text-gray-500 bg-gray-50 rounded hover:bg-gray-100 truncate">{s}</button>
              ))}
            </div>

            {/* badges */}
            <div className="flex flex-wrap gap-1 mb-3">
              {meta.contract_status && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${contractBadgeStyles[meta.contract_status] ?? 'bg-gray-100 text-gray-600'}`}>{meta.contract_status}</span>
              )}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ddayInfo.color} ${ddayInfo.bg}`}>{ddayInfo.label}</span>
            </div>

            {/* basic info */}
            <div className="space-y-1 text-xs text-gray-600">
              {meta.representative_name && <p>👤 {meta.representative_name}</p>}
              {meta.phone && <p>📞 {meta.phone}</p>}
              {meta.contact_email && <p>✉️ {meta.contact_email}</p>}
              <p className="text-gray-400">{meta.homepage_url ? <a href={meta.homepage_url} target="_blank" rel="noopener noreferrer" className="hover:underline">🌐 홈페이지</a> : '🌐 홈페이지 미등록'}</p>
              <p className="text-gray-400">{meta.smartstore_url ? <a href={meta.smartstore_url} target="_blank" rel="noopener noreferrer" className="hover:underline">🛒 스마트스토어</a> : '🛒 스마트스토어 미등록'}</p>
              <p className="text-gray-400">{meta.coupang_url ? <a href={meta.coupang_url} target="_blank" rel="noopener noreferrer" className="hover:underline">📦 쿠팡</a> : '📦 쿠팡 미등록'}</p>
            </div>

            <div className="border-t border-gray-100 my-3" />

            {/* contract info */}
            <div className="space-y-1 text-xs text-gray-600">
              <p className="text-gray-500 font-medium mb-1">계약 정보</p>
              <div className="flex justify-between"><span className="text-gray-400">패키지</span><span>{meta.package_type ?? '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">계약금액</span><span>{meta.contract_amount != null ? `₩${Number(meta.contract_amount).toLocaleString()}` : '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">계약기간</span><span>{meta.contract_start ?? '-'} ~ {meta.contract_end ?? '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">사업자번호</span><span>{meta.biz_no ?? '-'}</span></div>
            </div>

            <div className="border-t border-gray-100 my-3" />

            {/* brand info */}
            <div className="space-y-1 text-xs text-gray-600">
              <p className="text-gray-500 font-medium mb-1">브랜드 정보</p>
              <div className="flex justify-between"><span className="text-gray-400">브랜드</span><span>{meta.brand_name ?? '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">타겟</span><span className="truncate max-w-[100px]">{meta.brand_target ?? '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">톤앤매너</span><span className="truncate max-w-[100px]">{meta.brand_tone ?? '-'}</span></div>
            </div>

            <div className="border-t border-gray-100 my-3" />

            {/* AI credit */}
            <div className="space-y-1 text-xs text-gray-600">
              <p className="text-gray-500 font-medium mb-1">AI 크레딧</p>
              <div className="flex justify-between"><span className="text-gray-400">사용량</span><span>{aiCreditUsed} / {aiCreditLimit}</span></div>
              <div className="h-1.5 rounded-full bg-gray-100 mt-1">
                <div className={`h-1.5 rounded-full ${aiCreditPct > 80 ? 'bg-red-400' : 'bg-blue-500'}`} style={{ width: `${aiCreditPct}%` }} />
              </div>
            </div>

            <div className="border-t border-gray-100 my-3" />

            {/* brution manager */}
            <div className="space-y-1 text-xs text-gray-600">
              <p className="text-gray-500 font-medium mb-1">브루션 담당</p>
              <div className="flex justify-between"><span className="text-gray-400">담당자</span><span>{meta.brution_manager ?? '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">정기 미팅</span><span>{meta.regular_meeting ?? '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">마지막 소통</span><span>{meta.last_communication ?? '-'}</span></div>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </aside>

        {/* Left divider */}
        <div
          onMouseDown={(e) => leftPanel.onMouseDown(e, 1)}
          className="shrink-0 w-1 cursor-col-resize rounded-full hover:bg-blue-400 active:bg-blue-500 transition-colors bg-transparent mx-1"
        />

        {/* ── CENTER PANEL ── */}
        <section className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
          {/* tabs */}
          <div className="flex gap-1 border-b border-gray-200 shrink-0">
            {([
              ['overview', '개요'],
              ['chat', '채팅'],
              ['history', '히스토리'],
              ['approvals', '승인 관리'],
            ] as [CenterTab, string][]).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setCenterTab(key)} className={`px-3 py-2 text-sm border-b-2 -mb-px ${centerTab === key ? 'border-primary text-primary font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{label}</button>
            ))}
          </div>

          {/* tab content */}
          {centerTab === 'overview' && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* STEP visualization */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">STEP 진행</p>
                <div className="flex items-center gap-2 mb-3">
                  {[0, 1, 2, 3, 4].map((s) => {
                    const currentStep = highestStep ?? -1;
                    const isCurrent = s === currentStep;
                    const isDone = s < currentStep;
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${isDone ? 'bg-blue-500 border-blue-500 text-white' : isCurrent ? 'border-blue-500 text-blue-600 bg-white' : 'border-gray-200 text-gray-400 bg-white'}`}>{s}</div>
                        {s < 4 && <div className={`w-6 h-0.5 ${s < currentStep ? 'bg-blue-500' : 'bg-gray-200'}`} />}
                      </div>
                    );
                  })}
                </div>
                {highestStep !== null && (
                  <p className="text-xs text-gray-500">현재: STEP {highestStep} · {STEP_LABELS[highestStep]}</p>
                )}
              </div>

              {/* activity feed */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex gap-1 mb-3">
                  {(['all', 'sales', 'project'] as FeedFilter[]).map((f) => (
                    <button key={f} type="button" onClick={() => setFeedFilter(f)} className={`px-2.5 py-1 text-xs rounded-full ${feedFilter === f ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {f === 'all' ? '전체' : f === 'sales' ? '영업' : '프로젝트'}
                    </button>
                  ))}
                </div>
                {filteredFeed.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">기록이 없습니다.</p>
                ) : (
                  <div className="space-y-0">
                    {filteredFeed.map((item) =>
                      editingFeedItem?.id === item.id ? (
                        <div key={item.id} className="ml-5 mb-4 border border-blue-200 bg-blue-50 rounded-lg p-3 space-y-2">
                          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[72px] bg-white" />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setEditingFeedItem(null)} className="px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50">취소</button>
                            <button type="button" onClick={handleEditFeedSave} className="px-3 py-1.5 text-xs bg-primary text-white rounded-md hover:bg-primary-hover">저장</button>
                          </div>
                        </div>
                      ) : (
                        <FeedItem key={item.id} item={item} onEdit={(i) => { setEditingFeedItem(i); setEditContent(i.content); }} onDelete={(i) => setDeleteFeedTarget(i)} onTogglePin={handleTogglePin} />
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {centerTab === 'chat' && (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">채팅 기능은 Phase B에서 구현 예정입니다.</div>
          )}

          {centerTab === 'history' && (
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">활동 히스토리</p>
                {feedItems.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">기록이 없습니다.</p>
                ) : (
                  <div className="space-y-0">
                    {feedItems.map((item) => (
                      <FeedItem key={item.id} item={item} onEdit={(i) => { setEditingFeedItem(i); setEditContent(i.content); setCenterTab('overview'); }} onDelete={(i) => setDeleteFeedTarget(i)} onTogglePin={handleTogglePin} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {centerTab === 'approvals' && (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">승인 관리 기능은 Phase B에서 구현 예정입니다.</div>
          )}

          {/* input area — always visible on overview */}
          {centerTab === 'overview' && (
            <FeedInput projects={projects} onSave={handleAddFeed} saving={savingFeed} content={feedContent} setContent={setFeedContent} feedType={feedType} setFeedType={setFeedType} feedProjectId={feedProjectId} setFeedProjectId={setFeedProjectId} />
          )}
        </section>

        {/* Right divider */}
        <div
          onMouseDown={(e) => rightPanel.onMouseDown(e, -1)}
          className="shrink-0 w-1 cursor-col-resize rounded-full hover:bg-blue-400 active:bg-blue-500 transition-colors bg-transparent mx-1"
        />

        {/* ── RIGHT PANEL ── */}
        <aside style={{ width: rightPanel.width }} className="shrink-0 flex flex-col gap-3 overflow-y-auto">
          {/* D-day */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-500 mb-1">출시 D-day</p>
            <p className={`text-2xl font-bold ${ddayInfo.color}`}>{ddayInfo.label}</p>
            {meta.contract_end && <p className="text-xs text-gray-400 mt-1">{new Date(meta.contract_end).toLocaleDateString('ko-KR')}</p>}
          </div>

          {/* drop status */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">드롭 현황</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" />Published</span><span className="font-semibold">{dropStatusCounts.published}</span></div>
              <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400" />In Review</span><span className="font-semibold">{dropStatusCounts.in_review}</span></div>
              <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400" />Draft</span><span className="font-semibold">{dropStatusCounts.draft}</span></div>
            </div>
          </div>

          {/* projects */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">프로젝트</p>
            {projects.length === 0 ? (
              <p className="text-xs text-gray-400">프로젝트 없음</p>
            ) : (
              <div className="space-y-2">
                {projects.map((p) => (
                  <button key={p.id} type="button" onClick={() => router.push(`/app/admin/projects/${p.id}`)} className="w-full text-left rounded-lg border border-gray-100 p-2 hover:bg-gray-50 transition">
                    <p className="text-xs font-medium text-gray-900 truncate">{p.name ?? '(이름 없음)'}</p>
                    <p className="text-xs text-gray-400">STEP {p.step ?? 0} · {p.status === 'completed' ? '완료' : p.status === 'paused' ? '일시정지' : '진행중'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* team members */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">멤버 ({activeUsers.length}/5)</p>
              <button type="button" onClick={() => setOpenModal('users')} className="text-xs text-primary hover:underline">관리</button>
            </div>
            {activeUsers.length === 0 ? (
              <p className="text-xs text-gray-400">멤버 없음</p>
            ) : (
              <div className="space-y-1.5">
                {activeUsers.map((u) => (
                  <div key={u.user_id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">{(u.name ?? u.email).charAt(0).toUpperCase()}</div>
                    <p className="text-xs text-gray-700 truncate">{u.name ?? u.email}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* next action */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">다음 액션</p>
              {!isEditingAction && <button type="button" onClick={() => { setIsEditingAction(true); setNextActionDraft(meta.next_action ?? ''); }} className="text-xs text-gray-400 hover:text-gray-700 underline">편집</button>}
            </div>
            {isEditingAction ? (
              <div className="space-y-2">
                <textarea value={nextActionDraft} onChange={(e) => setNextActionDraft(e.target.value)} placeholder="다음 액션을 입력하세요" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs min-h-[48px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsEditingAction(false)} className="flex-1 text-xs py-1 border border-gray-300 rounded-md hover:bg-gray-50">취소</button>
                  <button type="button" onClick={handleSaveNextAction} disabled={savingAction} className="flex-1 text-xs py-1 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50">{savingAction ? '저장 중...' : '저장'}</button>
                </div>
              </div>
            ) : (
              <p className={`text-xs whitespace-pre-line ${meta.next_action ? 'text-gray-700' : 'text-gray-400'}`}>{meta.next_action || '다음 액션을 입력하세요'}</p>
            )}
          </div>
        </aside>
      </div>

      {/* ── Modals ── */}

      {/* Edit Profile Modal */}
      {openModal === 'editProfile' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold">프로필 수정</h2>
              <button type="button" onClick={() => setOpenModal(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-3">
              {([
                ['representative_name', '대표자 이름'], ['phone', '연락처'], ['contact_email', '이메일'],
                ['biz_no', '사업자번호'], ['address', '주소'],
                ['homepage_url', '홈페이지 URL'], ['smartstore_url', '스마트스토어 URL'], ['coupang_url', '쿠팡 URL'],
              ] as [keyof CompanyMetadata, string][]).map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500">{label}</label>
                  <input type="text" value={(profileDraft[key] as string) ?? ''} onChange={(e) => setProfileDraft((prev) => ({ ...prev, [key]: e.target.value }))} className={inputCls} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button type="button" onClick={() => setOpenModal(null)} className="flex-1 text-sm py-2 border border-gray-300 rounded-md hover:bg-gray-50">취소</button>
              <button type="button" onClick={handleProfileSave} disabled={savingProfile} className="flex-1 text-sm py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50">{savingProfile ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contract Modal */}
      {openModal === 'editContract' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold">계약 내용 수정</h2>
              <button type="button" onClick={() => setOpenModal(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-3">
              <div>
                <label className="text-xs text-gray-500">패키지</label>
                <select value={(profileDraft.package_type as string) ?? ''} onChange={(e) => setProfileDraft((prev) => ({ ...prev, package_type: e.target.value || null }))} className={inputCls}>
                  <option value="">선택</option>
                  <option value="starter">스타터</option>
                  <option value="standard">스탠다드</option>
                  <option value="premium">프리미엄</option>
                </select>
              </div>
              {([
                ['contract_amount', '계약금액', 'number'], ['contract_start', '계약 시작일', 'date'], ['contract_end', '출시 예정일', 'date'],
                ['total_amount', '총액', 'number'],
              ] as [keyof CompanyMetadata, string, string][]).map(([key, label, type]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500">{label}</label>
                  <input type={type} value={(profileDraft[key] as string) ?? ''} onChange={(e) => setProfileDraft((prev) => ({ ...prev, [key]: e.target.value }))} className={inputCls} />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500">계약 상태</label>
                <select value={(profileDraft.contract_status as string) ?? ''} onChange={(e) => setProfileDraft((prev) => ({ ...prev, contract_status: e.target.value || null }))} className={inputCls}>
                  <option value="">선택</option>
                  {['리드', '상담중', '계약완료', '진행중', '완료', '보류'].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button type="button" onClick={() => setOpenModal(null)} className="flex-1 text-sm py-2 border border-gray-300 rounded-md hover:bg-gray-50">취소</button>
              <button type="button" onClick={handleProfileSave} disabled={savingProfile} className="flex-1 text-sm py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50">{savingProfile ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Brand Modal */}
      {openModal === 'editBrand' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold">브랜드 정보 수정</h2>
              <button type="button" onClick={() => setOpenModal(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-3">
              {([
                ['brand_name', '브랜드명'], ['brand_target', '타겟'], ['brand_tone', '톤앤매너'], ['brand_forbidden', '금지 방향'],
              ] as [keyof CompanyMetadata, string][]).map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500">{label}</label>
                  <input type="text" value={(profileDraft[key] as string) ?? ''} onChange={(e) => setProfileDraft((prev) => ({ ...prev, [key]: e.target.value }))} className={inputCls} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button type="button" onClick={() => setOpenModal(null)} className="flex-1 text-sm py-2 border border-gray-300 rounded-md hover:bg-gray-50">취소</button>
              <button type="button" onClick={handleProfileSave} disabled={savingProfile} className="flex-1 text-sm py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50">{savingProfile ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Contracts Modal */}
      {openModal === 'contracts' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold">계약 · 정산</h2>
              <button type="button" onClick={() => setOpenModal(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="overflow-y-auto p-6">
              <ContractsTab company={company} onUpdate={async (metadata) => { await patchCompany(metadata); }} />
            </div>
          </div>
        </div>
      )}

      {/* Users Modal */}
      {openModal === 'users' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold">팀 · 멤버 관리</h2>
              <button type="button" onClick={() => setOpenModal(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="overflow-y-auto p-6">
              <UsersTab company={company} users={users} onRefresh={async () => { router.refresh(); }} />
            </div>
          </div>
        </div>
      )}

      {/* Delete Company Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteCompanyModal}
        title="정말 삭제하시겠습니까?"
        description={`${company.name} 고객사와 모든 계정이 영구 삭제됩니다.`}
        onConfirm={handleDeleteCompany}
        onCancel={() => setShowDeleteCompanyModal(false)}
      />

      {/* Delete Feed Item Modal */}
      <DeleteConfirmModal
        isOpen={deleteFeedTarget !== null}
        title="기록 삭제"
        description="이 기록을 삭제하시겠습니까?"
        onConfirm={handleDeleteFeed}
        onCancel={() => setDeleteFeedTarget(null)}
      />

      <ToastContainer />
    </AppLayout>
  );
}
