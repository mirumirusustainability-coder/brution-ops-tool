'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ApiCompany, CompanyMetadata } from './types';

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

export function NotesTab({ company, onUpdate }: NotesTabProps) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<CompanyMetadata>(company.metadata ?? {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(company.metadata ?? {});
  }, [company]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            수정
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
          Pain Point
        </h3>
        {isEditing ? (
          <textarea
            value={draft.pain_point ?? ''}
            onChange={(e) => updateField('pain_point', e.target.value)}
            className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
          />
        ) : (
          renderTextValue(draft.pain_point)
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
          내부 관리
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
    </div>
  );
}
