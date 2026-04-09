'use client';

import { useMemo, useState } from 'react';
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

const clientTierStyles: Record<string, string> = {
  일반: 'bg-gray-100 text-gray-600',
  VIP: 'bg-yellow-50 text-yellow-700',
  파트너: 'bg-purple-50 text-purple-700',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const getNow = () => new Date().toISOString();

// ─── sub-components ───────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: ApiProject }) {
  const router = useRouter();
  const step = project.step ?? 0;
  const status = project.status ?? 'active';

  const cardClass =
    status === 'completed'
      ? 'bg-gray-50 border border-gray-200'
      : status === 'paused'
      ? 'bg-white border-2 border-yellow-300'
      : 'bg-white border border-gray-200';

  const textClass = status === 'completed' ? 'text-gray-400' : 'text-gray-900';

  const barColor =
    status === 'completed'
      ? 'bg-gray-400'
      : status === 'paused'
      ? 'bg-yellow-400'
      : 'bg-blue-500';

  const statusLabel =
    status === 'completed' ? '완료' : status === 'paused' ? '일시정지' : '진행중';

  const statusBadge =
    status === 'completed'
      ? 'bg-gray-200 text-gray-500'
      : status === 'paused'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-green-100 text-green-700';

  return (
    <button
      type="button"
      onClick={() => router.push(`/app/admin/projects/${project.id}`)}
      className={`w-full text-left rounded-lg p-3 transition-shadow hover:shadow-md ${cardClass}`}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className={`text-xs font-semibold leading-snug ${textClass}`}>
          {project.name ?? '(이름 없음)'}
        </p>
        <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${statusBadge}`}>
          {statusLabel}
        </span>
      </div>
      <p className={`text-xs mb-2 ${status === 'completed' ? 'text-gray-400' : 'text-gray-500'}`}>
        STEP {step} · {STEP_LABELS[step] ?? `STEP ${step}`}
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${s <= step ? barColor : 'bg-gray-200'}`}
          />
        ))}
      </div>
    </button>
  );
}

function FeedItem({
  item,
  onEdit,
  onDelete,
}: {
  item: ActivityFeedItem;
  onEdit: (item: ActivityFeedItem) => void;
  onDelete: (item: ActivityFeedItem) => void;
}) {
  const dt = new Date(item.created_at);
  const dateStr = `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="group flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
            item.type === 'project' ? 'bg-green-400' : 'bg-blue-400'
          }`}
        />
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                item.type === 'project'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {item.type === 'project' ? '프로젝트' : '영업'}
            </span>
            {item.project_name && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                {item.project_name}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {dateStr} {timeStr} · {item.author}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
              title="수정"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
              title="삭제"
            >
              🗑️
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-line">{item.content}</p>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

type CompanyDetailClientProps = {
  currentUser: AppUser;
  company: ApiCompany;
  projects: ApiProject[];
  users: ApiUser[];
  error?: string | null;
};

type ModalType = 'contracts' | 'users' | null;
type FeedFilter = 'all' | 'sales' | 'project';

export function CompanyDetailClient({
  currentUser,
  company,
  projects,
  users,
  error,
}: CompanyDetailClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  // ── left panel editing ────────────────────────────────────────────────────
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<CompanyMetadata>(company.metadata ?? {});
  const [savingProfile, setSavingProfile] = useState(false);

  // ── modals ────────────────────────────────────────────────────────────────
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [showDeleteCompanyModal, setShowDeleteCompanyModal] = useState(false);

  // ── activity feed ─────────────────────────────────────────────────────────
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [feedContent, setFeedContent] = useState('');
  const [feedType, setFeedType] = useState<'sales' | 'project'>('sales');
  const [feedProjectId, setFeedProjectId] = useState('');
  const [savingFeed, setSavingFeed] = useState(false);

  // inline edit
  const [editingFeedItem, setEditingFeedItem] = useState<ActivityFeedItem | null>(null);
  const [editContent, setEditContent] = useState('');

  // delete confirm
  const [deleteFeedTarget, setDeleteFeedTarget] = useState<ActivityFeedItem | null>(null);

  const feedItems = useMemo<ActivityFeedItem[]>(() => {
    const raw = company.metadata?.activity_feed;
    if (!Array.isArray(raw)) return [];
    return [...raw].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [company.metadata]);

  const filteredFeed = useMemo(() => {
    if (feedFilter === 'all') return feedItems;
    return feedItems.filter((item) => item.type === feedFilter);
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

  // ── left panel ────────────────────────────────────────────────────────────

  const handleProfileSave = async () => {
    setSavingProfile(true);
    try {
      await patchCompany(profileDraft);
      setIsEditingProfile(false);
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

  // ── activity feed ─────────────────────────────────────────────────────────

  const handleAddFeed = async () => {
    if (!feedContent.trim()) { showToast('내용을 입력해 주세요', 'info'); return; }
    if (feedType === 'project' && !feedProjectId) { showToast('프로젝트를 선택해 주세요', 'info'); return; }

    const selectedProject = projects.find((p) => p.id === feedProjectId);
    const newItem: ActivityFeedItem = {
      id: genId(),
      type: feedType,
      project_id: feedType === 'project' ? feedProjectId : undefined,
      project_name: feedType === 'project' ? (selectedProject?.name ?? undefined) : undefined,
      content: feedContent.trim(),
      author: currentUser.name,
      created_at: getNow(),
    };

    const prevFeed = Array.isArray(company.metadata?.activity_feed) ? company.metadata.activity_feed : [];
    setSavingFeed(true);
    try {
      await patchCompany({ ...company.metadata, activity_feed: [...prevFeed, newItem] });
      setFeedContent('');
      setFeedProjectId('');
      showToast('기록이 추가되었습니다', 'success');
    } catch {
      showToast('저장에 실패했습니다', 'error');
    } finally {
      setSavingFeed(false);
    }
  };

  const openEditFeed = (item: ActivityFeedItem) => {
    setEditingFeedItem(item);
    setEditContent(item.content);
  };

  const handleEditFeedSave = async () => {
    if (!editingFeedItem) return;
    if (!editContent.trim()) { showToast('내용을 입력해 주세요', 'info'); return; }

    const prevFeed = Array.isArray(company.metadata?.activity_feed) ? company.metadata.activity_feed : [];
    const nextFeed = prevFeed.map((f) =>
      f.id === editingFeedItem.id ? { ...f, content: editContent.trim() } : f
    );
    try {
      await patchCompany({ ...company.metadata, activity_feed: nextFeed });
      setEditingFeedItem(null);
      showToast('수정되었습니다', 'success');
    } catch {
      showToast('수정에 실패했습니다', 'error');
    }
  };

  const handleDeleteFeed = async () => {
    if (!deleteFeedTarget) return;
    const prevFeed = Array.isArray(company.metadata?.activity_feed) ? company.metadata.activity_feed : [];
    const nextFeed = prevFeed.filter((f) => f.id !== deleteFeedTarget.id);
    try {
      await patchCompany({ ...company.metadata, activity_feed: nextFeed });
      setDeleteFeedTarget(null);
      showToast('삭제되었습니다', 'success');
    } catch {
      showToast('삭제에 실패했습니다', 'error');
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  const meta = company.metadata ?? {};
  const contractStatusBadge: Record<string, string> = {
    계약전: 'bg-gray-100 text-gray-600',
    진행중: 'bg-blue-50 text-blue-700',
    완료: 'bg-green-50 text-green-700',
  };

  const activeUsers = users.filter((u) => u.status === 'active');

  const inputCls = 'w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <AppLayout user={currentUser}>
      {/* ── 3-column layout ── */}
      <div className="flex gap-4 h-[calc(100vh-var(--topbar-h,64px)-3rem)] -m-6 p-6 overflow-hidden">

        {/* ── LEFT PANEL ── */}
        <aside className="w-64 shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Header card */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h1 className="text-base font-bold text-gray-900 leading-snug">{company.name}</h1>
              {!isEditingProfile && (
                <button
                  type="button"
                  onClick={() => { setIsEditingProfile(true); setProfileDraft(meta); }}
                  className="shrink-0 text-xs text-gray-400 hover:text-gray-700 underline"
                >
                  편집
                </button>
              )}
            </div>

            {/* badges */}
            <div className="flex flex-wrap gap-1 mb-3">
              {meta.contract_status && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${contractStatusBadge[meta.contract_status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {meta.contract_status}
                </span>
              )}
              {meta.client_tier && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${clientTierStyles[meta.client_tier] ?? 'bg-gray-100 text-gray-600'}`}>
                  {meta.client_tier}
                </span>
              )}
            </div>

            {/* contact info */}
            {!isEditingProfile ? (
              <div className="space-y-1 text-xs text-gray-600">
                {meta.representative_name && <p>👤 {meta.representative_name}</p>}
                {meta.phone && <p>📞 {meta.phone}</p>}
                {meta.contact_email && <p>✉️ {meta.contact_email}</p>}
                <div className="border-t border-gray-100 my-2" />
                {meta.biz_no && <p className="text-gray-500">사업자번호: {meta.biz_no}</p>}
                {meta.address && <p className="text-gray-500">주소: {meta.address}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                {([
                  ['representative_name', '대표자 이름'],
                  ['phone', '연락처'],
                  ['contact_email', '이메일'],
                  ['biz_no', '사업자번호'],
                  ['address', '주소'],
                ] as [keyof CompanyMetadata, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500">{label}</label>
                    <input
                      type="text"
                      value={(profileDraft[key] as string) ?? ''}
                      onChange={(e) => setProfileDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 text-xs py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleProfileSave}
                    disabled={savingProfile}
                    className="flex-1 text-xs py-1.5 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50"
                  >
                    {savingProfile ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            )}

            {/* internal note */}
            {meta.internal_notes && !isEditingProfile && (
              <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800 whitespace-pre-line">
                {meta.internal_notes}
              </div>
            )}
          </div>

          {/* delete button */}
          <button
            type="button"
            onClick={() => setShowDeleteCompanyModal(true)}
            className="text-xs text-red-500 hover:text-red-700 underline text-left px-1"
          >
            고객사 삭제
          </button>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </aside>

        {/* ── CENTER PANEL — Activity Feed ── */}
        <section className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
          {/* filter tabs */}
          <div className="flex gap-1 border-b border-gray-200 shrink-0">
            {(['all', 'sales', 'project'] as FeedFilter[]).map((f) => {
              const label = f === 'all' ? '전체' : f === 'sales' ? '영업' : '프로젝트';
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFeedFilter(f)}
                  className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                    feedFilter === f
                      ? 'border-primary text-primary font-semibold'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* feed list */}
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredFeed.length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-12">기록이 없습니다.</p>
            ) : (
              <div className="space-y-0">
                {filteredFeed.map((item) =>
                  editingFeedItem?.id === item.id ? (
                    <div key={item.id} className="ml-5 mb-4 border border-blue-200 bg-blue-50 rounded-lg p-3 space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[72px] bg-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingFeedItem(null)}
                          className="px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={handleEditFeedSave}
                          className="px-3 py-1.5 text-xs bg-primary text-white rounded-md hover:bg-primary-hover"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <FeedItem
                      key={item.id}
                      item={item}
                      onEdit={openEditFeed}
                      onDelete={(i) => setDeleteFeedTarget(i)}
                    />
                  )
                )}
              </div>
            )}
          </div>

          {/* input area */}
          <div className="shrink-0 border border-gray-200 rounded-xl bg-white p-3 space-y-2 shadow-sm">
            <textarea
              value={feedContent}
              onChange={(e) => setFeedContent(e.target.value)}
              placeholder="기록하기..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[72px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* type selector */}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  {(['sales', 'project'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setFeedType(t); if (t === 'sales') setFeedProjectId(''); }}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        feedType === t ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {t === 'sales' ? '영업' : '프로젝트'}
                    </button>
                  ))}
                </div>
                {/* project picker */}
                {feedType === 'project' && (
                  <select
                    value={feedProjectId}
                    onChange={(e) => setFeedProjectId(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">프로젝트 선택</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name ?? '(이름 없음)'}</option>
                    ))}
                  </select>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddFeed}
                disabled={savingFeed}
                className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
              >
                {savingFeed ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </section>

        {/* ── RIGHT PANEL ── */}
        <aside className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">

          {/* projects */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">프로젝트</h3>
            {projects.length === 0 ? (
              <p className="text-xs text-gray-400">진행 중인 프로젝트가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </div>

          {/* contract summary */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">계약 요약</h3>
              <button
                type="button"
                onClick={() => setOpenModal('contracts')}
                className="text-xs text-primary hover:underline"
              >
                상세 보기
              </button>
            </div>
            <div className="space-y-1.5 text-xs text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">계약 상태</span>
                <span>{meta.contract_status ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">총액</span>
                <span>
                  {meta.total_amount != null && meta.total_amount !== ''
                    ? `₩${Number(meta.total_amount).toLocaleString('ko-KR')}`
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">계약금 30%</span>
                <span>{meta.deposit_paid === true ? '✅ 완료' : meta.deposit_paid === false ? '❌ 미완료' : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">잔금 70%</span>
                <span>{meta.balance_paid === true ? '✅ 완료' : meta.balance_paid === false ? '❌ 미완료' : '-'}</span>
              </div>
            </div>
          </div>

          {/* team members */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                팀 멤버 ({activeUsers.length}/5)
              </h3>
              <button
                type="button"
                onClick={() => setOpenModal('users')}
                className="text-xs text-primary hover:underline"
              >
                멤버 관리
              </button>
            </div>
            {activeUsers.length === 0 ? (
              <p className="text-xs text-gray-400">등록된 멤버가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {activeUsers.map((u) => (
                  <div key={u.user_id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                      {(u.name ?? u.email).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{u.name ?? u.email}</p>
                      {u.job_title && <p className="text-xs text-gray-400 truncate">{u.job_title}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </aside>
      </div>

      {/* ── ContractsTab Modal ── */}
      {openModal === 'contracts' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold">계약 · 정산</h2>
              <button type="button" onClick={() => setOpenModal(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="overflow-y-auto p-6">
              <ContractsTab
                company={company}
                onUpdate={async (metadata) => {
                  await patchCompany(metadata);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── UsersTab Modal ── */}
      {openModal === 'users' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold">팀 · 멤버 관리</h2>
              <button type="button" onClick={() => setOpenModal(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="overflow-y-auto p-6">
              <UsersTab
                company={company}
                users={users}
                onRefresh={async () => { router.refresh(); }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Company Modal ── */}
      <DeleteConfirmModal
        isOpen={showDeleteCompanyModal}
        title="정말 삭제하시겠습니까?"
        description={`${company.name} 고객사와 모든 계정이 영구 삭제됩니다.`}
        onConfirm={handleDeleteCompany}
        onCancel={() => setShowDeleteCompanyModal(false)}
      />

      {/* ── Delete Feed Item Modal ── */}
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
