'use client';

import { useEffect, useMemo, useState } from 'react';
import { StepProgress } from '@/components/step-progress';
import { DELIVERABLE_TYPE_LABELS, STEP_LABELS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import type { ApiCompany, ApiProject, ApiProjectWithDrops, CompanyMetadata } from './types';

type OverviewTabProps = {
  company: ApiCompany;
  projects: ApiProject[];
  presentationMode: boolean;
  projectsWithDrops?: ApiProjectWithDrops[];
  onUpdate?: (metadata: CompanyMetadata) => Promise<void>;
};

const emptyValue = <p className="text-sm text-gray-400 italic">-</p>;

const renderTextValue = (value?: string | null) =>
  value ? <p className="text-sm text-gray-900">{value}</p> : emptyValue;

export function OverviewTab({
  company,
  projects,
  presentationMode,
  projectsWithDrops = [],
  onUpdate,
}: OverviewTabProps) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profileDraft, setProfileDraft] = useState<CompanyMetadata>(company.metadata ?? {});
  const [profileError, setProfileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProfileDraft(company.metadata ?? {});
    if (presentationMode) {
      setIsEditing(false);
      setProfileError(null);
    }
  }, [company, presentationMode]);

  useEffect(() => {
    if (presentationMode) {
      console.log('OverviewTab projectsWithDrops', projectsWithDrops);
    }
  }, [presentationMode, projectsWithDrops]);

  const latestProject = useMemo(() => (projects.length ? projects[0] : null), [projects]);
  const latestProjectStep = typeof latestProject?.step === 'number' ? latestProject.step : null;
  const latestStepLabel = latestProjectStep !== null ? STEP_LABELS[latestProjectStep] : null;
  const statusLabels: Record<string, string> = {
    active: '진행중',
    completed: '완료',
    paused: '일시정지',
  };
  const latestStatusLabel = latestProject?.status ? statusLabels[latestProject.status] : null;

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
      {presentationMode && (
        <div className="grid gap-4">
          {latestProjectStep !== null && latestStepLabel && (
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">STEP 진행도</h3>
                <span className="text-xs text-gray-500">
                  STEP {latestProjectStep} · {latestStepLabel}
                </span>
              </div>
              <StepProgress currentStep={latestProjectStep} readonly />
            </div>
          )}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">진행중인 프로젝트</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-24">프로젝트</span>
                <span className="font-medium text-gray-900">{latestProject?.name ?? '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-24">진행 상태</span>
                <span className="text-gray-700">{latestStatusLabel ?? '-'}</span>
              </div>
              {latestProject?.description && (
                <p className="text-sm text-gray-600">{latestProject.description}</p>
              )}
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">드롭 현황</h3>
            {projectsWithDrops.length === 0 ? (
              <p className="text-sm text-gray-500">등록된 산출물이 없습니다.</p>
            ) : (
              (() => {
                const dropBlocks = projectsWithDrops.map((project) => {
                  const deliverables = project.deliverables ?? [];
                  const filtered = deliverables.flatMap((deliverable) =>
                    (deliverable.deliverable_versions ?? [])
                      .filter((version) => version.status === 'draft' || version.status === 'in_review')
                      .map((version) => ({ deliverable, version }))
                  );

                  if (filtered.length === 0) return null;

                  return (
                    <div key={project.id} className="space-y-2">
                      <p className="text-sm font-semibold text-gray-800">{project.name ?? '프로젝트'}</p>
                      <div className="space-y-2">
                        {filtered.map(({ deliverable, version }) => {
                          const statusLabel = version.status ?? '-';
                          const badgeStyle =
                            version.status === 'in_review'
                              ? 'bg-orange-50 text-orange-700'
                              : 'bg-gray-100 text-gray-600';

                          return (
                            <div key={version.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">[{DELIVERABLE_TYPE_LABELS[deliverable.type as keyof typeof DELIVERABLE_TYPE_LABELS] ?? deliverable.type}]</span>
                                <span className="text-gray-700"> {deliverable.title ?? '제목 없음'}</span>
                                <span className="text-gray-500"> · {version.title ?? '버전 제목 없음'}</span>
                              </div>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyle}`}>
                                {statusLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });

                const visibleBlocks = dropBlocks.filter(Boolean);
                if (visibleBlocks.length === 0) {
                  return <p className="text-sm text-gray-500">등록된 산출물이 없습니다.</p>;
                }

                return <div className="space-y-4">{visibleBlocks}</div>;
              })()
            )}
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">컨택 히스토리</h3>
            {Array.isArray(company.metadata?.contact_history) && company.metadata?.contact_history.length ? (
              <div className="space-y-3">
                {company.metadata.contact_history
                  .slice()
                  .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
                  .map((entry, index) => (
                    <div key={`${entry.date}-${index}`} className="border-b border-gray-100 pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0">
                      <p className="text-sm font-semibold text-gray-700">{entry.date}</p>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{entry.content}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">등록된 컨택 히스토리가 없습니다.</p>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">고객사 프로필</h2>
          {!presentationMode && !isEditing && (
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
            {!presentationMode && (
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
            )}
            {!presentationMode && (
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
            )}
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
            {!presentationMode && (
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
            )}
          </div>
        </div>

        {!presentationMode && isEditing && (
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
    </div>
  );
}
