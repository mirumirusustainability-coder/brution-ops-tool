'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ApiCompany, CompanyMetadata, ContactHistoryEntry } from './types';

type ProjectNote = {
  date: string;
  time?: string | null;
  author?: string | null;
  content: string;
};

type NotesTabProps = {
  company: ApiCompany;
  onUpdate: (metadata: CompanyMetadata) => Promise<void>;
  projects?: Array<{
    id: string;
    name: string | null;
    metadata?: { notes?: ProjectNote[] | null } | null;
  }>;
  onUpdateProjectNotes?: (projectId: string, notes: ProjectNote[]) => Promise<void>;
};

const clientTierOptions = ['일반', 'VIP', '파트너'];

const emptyValue = <p className="text-sm text-gray-400 italic">-</p>;
const renderTextValue = (value?: string | null) =>
  value ? <p className="text-sm text-gray-900">{value}</p> : emptyValue;

const clientTierStyles: Record<string, string> = {
  일반: 'bg-gray-100 text-gray-600',
  VIP: 'bg-yellow-50 text-yellow-700',
  파트너: 'bg-purple-50 text-purple-700',
};

const renderBadgeValue = (value?: string | null, styleMap?: Record<string, string>) => {
  if (!value) return emptyValue;
  const styles = styleMap?.[value] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles}`}>
      {value}
    </span>
  );
};

const getToday = () => new Date().toISOString().slice(0, 10);

export function NotesTab({ company, onUpdate, projects = [], onUpdateProjectNotes }: NotesTabProps) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<CompanyMetadata>(company.metadata ?? {});
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDate, setNewDate] = useState(getToday());
  const [newContent, setNewContent] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDate, setEditDate] = useState(getToday());
  const [editContent, setEditContent] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<number | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [projectEditTarget, setProjectEditTarget] = useState<{
    projectId: string;
    index: number;
  } | null>(null);
  const [projectEditDate, setProjectEditDate] = useState(getToday());
  const [projectEditTime, setProjectEditTime] = useState('');
  const [projectEditAuthor, setProjectEditAuthor] = useState('');
  const [projectEditContent, setProjectEditContent] = useState('');
  const [showProjectEditModal, setShowProjectEditModal] = useState(false);
  const [projectDeleteTarget, setProjectDeleteTarget] = useState<{
    projectId: string;
    index: number;
  } | null>(null);
  const [projectDeleteConfirmText, setProjectDeleteConfirmText] = useState('');

  useEffect(() => {
    setDraft(company.metadata ?? {});
  }, [company]);

  const contactHistory = Array.isArray(draft.contact_history) ? draft.contact_history : [];
  const sortedHistory = useMemo(
    () =>
      contactHistory
        .map((entry, index) => ({ entry, index }))
        .sort((a, b) => (b.entry.date ?? '').localeCompare(a.entry.date ?? '')),
    [contactHistory]
  );

  const getNoteTimestamp = (note: { date?: string; time?: string | null }) => {
    if (!note?.date) return 0;
    const timeValue = note.time && note.time.trim() ? note.time : '00:00';
    const timestamp = new Date(`${note.date}T${timeValue}:00`);
    return Number.isNaN(timestamp.getTime()) ? 0 : timestamp.getTime();
  };

  const projectNoteItems = useMemo(() => {
    const items = projects.flatMap((project) => {
      const notes = Array.isArray(project.metadata?.notes) ? project.metadata?.notes : [];
      return notes.map((note, index) => ({
        projectId: project.id,
        projectName: project.name ?? '프로젝트',
        note,
        index,
      }));
    });

    return items.sort((a, b) => getNoteTimestamp(b.note) - getNoteTimestamp(a.note));
  }, [projects]);

  const updateField = (key: keyof CompanyMetadata, value: CompanyMetadata[keyof CompanyMetadata]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(draft);
      setIsEditing(false);
      showToast('메모 정보가 저장되었습니다', 'success');
    } catch {
      showToast('메모 정보 저장에 실패했습니다', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraft(company.metadata ?? {});
  };

  const handleAddHistory = async () => {
    if (!newContent.trim()) {
      showToast('컨택 내용을 입력해 주세요', 'info');
      return;
    }
    const entry: ContactHistoryEntry = {
      date: newDate || getToday(),
      content: newContent.trim(),
      author: newAuthor.trim() || null,
    };
    const nextHistory = [...contactHistory, entry];
    const nextDraft = { ...draft, contact_history: nextHistory };
    setDraft(nextDraft);
    try {
      await onUpdate(nextDraft);
      showToast('컨택 히스토리가 추가되었습니다', 'success');
      setNewContent('');
      setNewAuthor('');
      setNewDate(getToday());
      setShowAddForm(false);
    } catch {
      showToast('컨택 히스토리 저장에 실패했습니다', 'error');
    }
  };

  const handleDeleteHistory = async (index: number) => {
    const nextHistory = contactHistory.filter((_, idx) => idx !== index);
    const nextDraft = { ...draft, contact_history: nextHistory };
    setDraft(nextDraft);
    try {
      await onUpdate(nextDraft);
      showToast('컨택 히스토리가 삭제되었습니다', 'success');
      setDeleteTargetIndex(null);
      setDeleteConfirmText('');
    } catch {
      showToast('컨택 히스토리 삭제에 실패했습니다', 'error');
    }
  };

  const openEditModal = (index: number) => {
    const entry = contactHistory[index];
    if (!entry) return;
    setEditingIndex(index);
    setEditDate(entry.date ?? getToday());
    setEditContent(entry.content ?? '');
    setEditAuthor(entry.author ?? '');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingIndex(null);
    setEditDate(getToday());
    setEditContent('');
    setEditAuthor('');
  };

  const handleEditHistory = async () => {
    if (editingIndex === null) return;
    if (!editContent.trim()) {
      showToast('컨택 내용을 입력해 주세요', 'info');
      return;
    }
    const nextHistory = contactHistory.map((entry, idx) =>
      idx === editingIndex
        ? {
            ...entry,
            date: editDate || getToday(),
            content: editContent.trim(),
            author: editAuthor.trim() || null,
          }
        : entry
    );
    const nextDraft = { ...draft, contact_history: nextHistory };
    setDraft(nextDraft);
    try {
      await onUpdate(nextDraft);
      showToast('컨택 히스토리가 수정되었습니다', 'success');
      closeEditModal();
    } catch {
      showToast('컨택 히스토리 수정에 실패했습니다', 'error');
    }
  };

  const getProjectNotesById = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    return Array.isArray(project?.metadata?.notes) ? project?.metadata?.notes : [];
  };

  const openProjectEditModal = (projectId: string, index: number) => {
    const notes = getProjectNotesById(projectId);
    const note = notes[index];
    if (!note) return;
    setProjectEditTarget({ projectId, index });
    setProjectEditDate(note.date ?? getToday());
    setProjectEditTime(note.time ?? '');
    setProjectEditAuthor(note.author ?? '');
    setProjectEditContent(note.content ?? '');
    setShowProjectEditModal(true);
  };

  const closeProjectEditModal = () => {
    setShowProjectEditModal(false);
    setProjectEditTarget(null);
    setProjectEditDate(getToday());
    setProjectEditTime('');
    setProjectEditAuthor('');
    setProjectEditContent('');
  };

  const handleProjectEditSave = async () => {
    if (!projectEditTarget) return;
    if (!projectEditContent.trim()) {
      showToast('프로젝트 메모 내용을 입력해 주세요', 'info');
      return;
    }
    if (!onUpdateProjectNotes) {
      showToast('프로젝트 메모를 수정할 수 없습니다', 'error');
      return;
    }

    const notes = getProjectNotesById(projectEditTarget.projectId);
    const nextNotes = notes.map((note, idx) =>
      idx === projectEditTarget.index
        ? {
            ...note,
            date: projectEditDate || getToday(),
            time: projectEditTime?.trim() ? projectEditTime : null,
            author: projectEditAuthor.trim() || null,
            content: projectEditContent.trim(),
          }
        : note
    );

    try {
      await onUpdateProjectNotes(projectEditTarget.projectId, nextNotes);
      showToast('프로젝트 메모가 수정되었습니다', 'success');
      closeProjectEditModal();
    } catch {
      showToast('프로젝트 메모 수정에 실패했습니다', 'error');
    }
  };

  const handleProjectDelete = async () => {
    if (!projectDeleteTarget) return;
    if (projectDeleteConfirmText !== '삭제') return;
    if (!onUpdateProjectNotes) {
      showToast('프로젝트 메모를 삭제할 수 없습니다', 'error');
      return;
    }

    const notes = getProjectNotesById(projectDeleteTarget.projectId);
    const nextNotes = notes.filter((_, idx) => idx !== projectDeleteTarget.index);

    try {
      await onUpdateProjectNotes(projectDeleteTarget.projectId, nextNotes);
      showToast('프로젝트 메모가 삭제되었습니다', 'success');
      setProjectDeleteTarget(null);
      setProjectDeleteConfirmText('');
    } catch {
      showToast('프로젝트 메모 삭제에 실패했습니다', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">히스토리</h2>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            내부 메모 수정
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
          내부 메모
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Client Tier</label>
            {isEditing ? (
              <select
                value={draft.client_tier ?? ''}
                onChange={(e) => updateField('client_tier', e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">선택</option>
                {clientTierOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-1">{renderBadgeValue(draft.client_tier ?? null, clientTierStyles)}</div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">마지막 컨택일</label>
            {isEditing ? (
              <input
                type="date"
                value={draft.last_contact ?? ''}
                onChange={(e) => updateField('last_contact', e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              renderTextValue(draft.last_contact)
            )}
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Internal Notes</label>
            {isEditing ? (
              <textarea
                value={draft.internal_notes ?? ''}
                onChange={(e) => updateField('internal_notes', e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
              />
            ) : (
              renderTextValue(draft.internal_notes)
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">컨택 히스토리</h3>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="text-sm text-primary font-medium"
          >
            + 새 컨택 추가
          </button>
        </div>

        {showAddForm && (
          <div className="space-y-3 rounded-lg border border-dashed border-gray-200 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">날짜</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">작성자</label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="홍길동"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">내용</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[90px]"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddHistory}
                className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover"
              >
                저장
              </button>
            </div>
          </div>
        )}

        {sortedHistory.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 컨택 히스토리가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {sortedHistory.map(({ entry, index }) => (
              <div key={`${entry.date}-${index}`} className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {entry.date} · {entry.author || '담당자 미지정'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{entry.content}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(index)}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTargetIndex(index);
                      setDeleteConfirmText('');
                    }}
                    className="text-xs text-red-500 hover:text-red-600 underline"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">프로젝트 메모</h3>
        </div>

        {projectNoteItems.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 프로젝트 메모가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {projectNoteItems.map((item) => (
              <div
                key={`${item.projectId}-${item.index}`}
                className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">
                      {[item.note.date, item.note.time].filter(Boolean).join(' ')}
                      {item.note.author ? ` · ${item.note.author}` : ''}
                    </p>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                      {item.projectName}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{item.note.content}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openProjectEditModal(item.projectId, item.index)}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProjectDeleteTarget({ projectId: item.projectId, index: item.index });
                      setProjectDeleteConfirmText('');
                    }}
                    className="text-xs text-red-500 hover:text-red-600 underline"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-sm rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">컨택 히스토리 수정</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">날짜</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">작성자</label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  placeholder="홍길동"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">내용</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[90px]"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleEditHistory}
                className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectEditModal && projectEditTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-sm rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">프로젝트 메모 수정</h3>
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">날짜</label>
                  <input
                    type="date"
                    value={projectEditDate}
                    onChange={(e) => setProjectEditDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">시간</label>
                  <input
                    type="time"
                    value={projectEditTime}
                    onChange={(e) => setProjectEditTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">작성자</label>
                <input
                  type="text"
                  value={projectEditAuthor}
                  onChange={(e) => setProjectEditAuthor(e.target.value)}
                  placeholder="홍길동"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">내용</label>
                <textarea
                  value={projectEditContent}
                  onChange={(e) => setProjectEditContent(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[90px]"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeProjectEditModal}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleProjectEditSave}
                className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {projectDeleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-sm rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">프로젝트 메모 삭제</h3>
            <p className="text-sm text-gray-600">
              삭제하려면 아래에 <strong>삭제</strong>를 입력하세요.
            </p>
            <input
              value={projectDeleteConfirmText}
              onChange={(e) => setProjectDeleteConfirmText(e.target.value)}
              placeholder="삭제"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setProjectDeleteTarget(null);
                  setProjectDeleteConfirmText('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm"
              >
                취소
              </button>
              <button
                disabled={projectDeleteConfirmText !== '삭제'}
                onClick={handleProjectDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      )}

      {deleteTargetIndex !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-sm rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">삭제 확인</h3>
            <p className="text-sm text-gray-600">
              삭제하려면 아래에 <strong>삭제</strong>를 입력하세요.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="삭제"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setDeleteTargetIndex(null);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm"
              >
                취소
              </button>
              <button
                disabled={deleteConfirmText !== '삭제'}
                onClick={() => handleDeleteHistory(deleteTargetIndex)}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
