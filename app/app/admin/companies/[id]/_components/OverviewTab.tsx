'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { ApiCompany, ApiProject, CompanyMetadata } from './types';

type OverviewTabProps = {
  company: ApiCompany;
  projects: ApiProject[];
  onUpdate?: (metadata: CompanyMetadata) => Promise<void>;
};

const STEP_LABELS: Record<number, string> = {
  0: '스타터패키지',
  1: '브랜드기획',
  2: '디자인·인증',
  3: '생산·납품',
  4: '출시',
};

const emptyValue = <p className="text-sm text-gray-400 italic">-</p>;

const renderTextValue = (value?: string | null) =>
  value ? <p className="text-sm text-gray-900">{value}</p> : emptyValue;

function ProjectCard({ project }: { project: ApiProject }) {
  const router = useRouter();
  const step = project.step ?? 0;
  const status = project.status ?? 'active';

  const cardStyle =
    status === 'completed'
      ? 'bg-gray-50 border border-gray-200 text-gray-400'
      : status === 'paused'
      ? 'bg-white border-2 border-yellow-300'
      : 'bg-white border border-gray-200';

  const stepBadgeStyle =
    status === 'completed'
      ? 'bg-gray-200 text-gray-500'
      : 'bg-blue-100 text-blue-700';

  const statusLabel =
    status === 'completed' ? '완료' : status === 'paused' ? '일시정지' : '진행중';

  const statusBadgeStyle =
    status === 'completed'
      ? 'bg-gray-200 text-gray-500'
      : status === 'paused'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-green-100 text-green-700';

  return (
    <button
      type="button"
      onClick={() => router.push(`/app/admin/projects/${project.id}`)}
      className={`w-full text-left rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${cardStyle}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className={`text-sm font-semibold ${status === 'completed' ? 'text-gray-400' : 'text-gray-900'}`}>
          {project.name ?? '(이름 없음)'}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stepBadgeStyle}`}>
            STEP {step}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeStyle}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      <p className={`text-xs mb-2 ${status === 'completed' ? 'text-gray-400' : 'text-gray-500'}`}>
        {STEP_LABELS[step] ?? `STEP ${step}`}
      </p>

      <div className="flex gap-1">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${
              s <= step
                ? status === 'completed'
                  ? 'bg-gray-400'
                  : status === 'paused'
                  ? 'bg-yellow-400'
                  : 'bg-blue-500'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </button>
  );
}

export function OverviewTab({
  company,
  projects,
  onUpdate,
}: OverviewTabProps) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profileDraft, setProfileDraft] = useState<CompanyMetadata>(company.metadata ?? {});
  const [profileError, setProfileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProfileDraft(company.metadata ?? {});
  }, [company]);

  const updateField = (key: keyof CompanyMetadata, value: CompanyMetadata[keyof CompanyMetadata]) => {
    setProfileDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setProfileError(null);
    try {
      if (!onUpdate) {
        setProfileError('프로필 저장에 실패했습니다');
        showToast('프로필 저장에 실패했습니다', 'error');
        return;
      }
      await onUpdate(profileDraft);
      setIsEditing(false);
      showToast('프로필이 저장되었습니다', 'success');
    } catch {
      setProfileError('프로필 저장에 실패했습니다');
      showToast('프로필 저장에 실패했습니다', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setProfileDraft(company.metadata ?? {});
    setProfileError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">고객사 프로필</h2>
          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setProfileError(null);
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              프로필 수정
            </button>
          )}
        </div>

        {profileError && <p className="text-sm text-red-600 mb-3">{profileError}</p>}

        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
            기본 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">사업자번호</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileDraft.biz_no ?? ''}
                  onChange={(e) => updateField('biz_no', e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                renderTextValue(profileDraft.biz_no ?? company.metadata?.biz_no ?? null)
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">주소</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileDraft.address ?? ''}
                  onChange={(e) => updateField('address', e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                renderTextValue(profileDraft.address ?? company.metadata?.address ?? null)
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">대표 연락처</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileDraft.phone ?? ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                renderTextValue(profileDraft.phone ?? company.metadata?.phone ?? null)
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">대표자 이름</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileDraft.representative_name ?? ''}
                  onChange={(e) => updateField('representative_name', e.target.value)}
                  placeholder="홍길동"
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                renderTextValue(profileDraft.representative_name ?? company.metadata?.representative_name ?? null)
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">담당자 이메일</label>
              {isEditing ? (
                <input
                  type="email"
                  value={profileDraft.contact_email ?? ''}
                  onChange={(e) => updateField('contact_email', e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                renderTextValue(profileDraft.contact_email ?? company.metadata?.contact_email ?? null)
              )}
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end gap-2 mt-6">
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

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">프로젝트</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-gray-500">진행 중인 프로젝트가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
