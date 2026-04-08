'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import type { ApiCompany, CompanyMetadata, ContactHistoryEntry } from './types';

type NotesTabProps = {
  company: ApiCompany;
  onUpdate: (metadata: CompanyMetadata) => Promise<void>;
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
const getCurrentTime = () => new Date().toTimeString().slice(0, 5);

export function NotesTab({ company, onUpdate }: NotesTabProps) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<CompanyMetadata>(company.metadata ?? {});
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDate, setNewDate] = useState(getToday());
  const [newTime, setNewTime] = useState(getCurrentTime());
  const [newContent, setNewContent] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDate, setEditDate] = useState(getToday());
  const [editTime, setEditTime] = useState(getCurrentTime());
  const [editAuthor, setEditAuthor] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editingSubmitting, setEditingSubmitting] = useState(false);

  useEffect(() => {
    setDraft(company.metadata ?? {});
  }, [company]);

  const contactHistory = Array.isArray(draft.contact_history) ? draft.contact_history : [];
  const sortedHistory = useMemo(
    () =>
      contactHistory
        .map((entry, index) => ({ entry, index }))
        .sort((a, b) =>
          `${b.entry.date ?? ''}T${b.entry.time ?? '00:00'}`.localeCompare(
            `${a.entry.date ?? ''}T${a.entry.time ?? '00:00'}`
          )
        ),
    [contactHistory]
  );

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
      time: newTime || null,
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
      setNewTime(getCurrentTime());
      setShowAddForm(false);
    } catch {
      showToast('컨택 히스토리 저장에 실패했습니다', 'error');
    }
  };

  const performDeleteHistory = async (index: number) => {
    const nextHistory = contactHistory.filter((_, idx) => idx !== index);
    const nextDraft = { ...draft, contact_history: nextHistory };
    setDraft(nextDraft);
    try {
      await onUpdate(nextDraft);
      showToast('삭제되었습니다', 'success');
      setDeleteTargetIndex(null);
    } catch {
      showToast('컨택 히스토리 삭제에 실패했습니다', 'error');
    }
  };

  const openEditModal = (index: number) => {
    const target = contactHistory[index];
    if (!target) return;
    setEditingIndex(index);
    setEditDate(target.date || getToday());
    setEditTime(target.time || '');
    setEditAuthor(target.author || '');
    setEditContent(target.content || '');
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
            time: editTime || null,
            author: editAuthor.trim() || null,
            content: editContent.trim(),
          }
        : entry
    );
    const nextDraft = { ...draft, contact_history: nextHistory };
    setEditingSubmitting(true);
    setDraft(nextDraft);
    try {
      await onUpdate(nextDraft);
      showToast('수정되었습니다', 'success');
      setEditingIndex(null);
    } catch {
      showToast('컨택 히스토리 저장에 실패했습니다', 'error');
    } finally {
      setEditingSubmitting(false);
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
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">시간</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
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
                    {[entry.date, entry.time].filter(Boolean).join(' ')} · {entry.author || '담당자 미지정'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{entry.content}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(index)}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetIndex(index)}
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
      <DeleteConfirmModal
        isOpen={deleteTargetIndex !== null}
        title="컨택 히스토리 삭제"
        description='삭제하려면 "삭제"를 입력하세요.'
        onConfirm={async () => {
          if (deleteTargetIndex === null) return;
          await performDeleteHistory(deleteTargetIndex);
        }}
        onCancel={() => setDeleteTargetIndex(null)}
      />
      {editingIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">컨택 히스토리 수정</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="date"
                value={editDate}
                onChange={(event) => setEditDate(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="time"
                value={editTime}
                onChange={(event) => setEditTime(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <input
              type="text"
              value={editAuthor}
              onChange={(event) => setEditAuthor(event.target.value)}
              placeholder="작성자"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <textarea
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              placeholder="내용"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[90px]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingIndex(null)}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleEditHistory}
                disabled={editingSubmitting}
                className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50"
              >
                {editingSubmitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
