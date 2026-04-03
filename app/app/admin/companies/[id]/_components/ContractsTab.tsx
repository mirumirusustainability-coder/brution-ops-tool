'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ApiCompany, CompanyMetadata } from './types';

type ContractsTabProps = {
  company: ApiCompany;
  onUpdate: (metadata: CompanyMetadata) => Promise<void>;
};

const contractStatusOptions = ['계약전', '진행중', '완료'];
const leadSourceOptions = ['지인소개', 'SNS', '광고', '콜드아웃리치', '기타'];
const interestCategoryOptions = [
  '뷰티',
  '식품/음료',
  '유아/베이비',
  '패션',
  '반려동물',
  '가전/디지털',
  '생활/주방',
  '인테리어/가구',
  '기타',
];
const channelOptions = [
  '네이버',
  '쿠팡',
  '오픈마켓 (G마켓/옥션/11번가)',
  '공동구매 (SNS)',
  '오프라인 매장',
  '해외 쇼핑몰',
  '기타',
];

const emptyValue = <p className="text-sm text-gray-400 italic">-</p>;
const renderTextValue = (value?: string | null) =>
  value ? <p className="text-sm text-gray-900">{value}</p> : emptyValue;
const renderAmountValue = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return emptyValue;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) return emptyValue;
  return <p className="text-sm text-gray-900">₩{numeric.toLocaleString('ko-KR')}</p>;
};
const renderArrayValue = (value?: string[] | null) =>
  Array.isArray(value) && value.length > 0 ? renderTextValue(value.join(', ')) : emptyValue;

const formatArrayWithOther = (value?: string[] | null, other?: string | null) => {
  const items = Array.isArray(value) ? value : [];
  if (!items.length) return [];
  return items.map((item) => (item === '기타' && other ? `기타(${other})` : item));
};

const contractStatusStyles: Record<string, string> = {
  계약전: 'bg-gray-100 text-gray-600',
  진행중: 'bg-blue-50 text-blue-600',
  완료: 'bg-green-50 text-green-600',
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

const renderBooleanBadge = (value?: boolean | null) => {
  if (value === null || value === undefined) return emptyValue;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        value ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
      }`}
    >
      {value ? '✅ 완료' : '❌ 미완료'}
    </span>
  );
};

export function ContractsTab({ company, onUpdate }: ContractsTabProps) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profileDraft, setProfileDraft] = useState<CompanyMetadata>(company.metadata ?? {});
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState({ contract: true, sales: false, business: false });

  useEffect(() => {
    setProfileDraft(company.metadata ?? {});
  }, [company]);

  const interestCategories = Array.isArray(profileDraft.interest_category) ? profileDraft.interest_category : [];
  const currentChannels = Array.isArray(profileDraft.current_channel) ? profileDraft.current_channel : [];
  const targetChannels = Array.isArray(profileDraft.target_channel) ? profileDraft.target_channel : [];
  const interestCategoryDisplay = formatArrayWithOther(
    interestCategories,
    profileDraft.interest_category_other ?? null
  );
  const currentChannelDisplay = formatArrayWithOther(currentChannels, profileDraft.current_channel_other ?? null);
  const targetChannelDisplay = formatArrayWithOther(targetChannels, profileDraft.target_channel_other ?? null);

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateField = (key: keyof CompanyMetadata, value: CompanyMetadata[keyof CompanyMetadata]) => {
    setProfileDraft((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayValue = (key: keyof CompanyMetadata, value: string) => {
    setProfileDraft((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const exists = current.includes(value);
      const next = exists ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(profileDraft);
      setIsEditing(false);
      showToast('계약 정보가 저장되었습니다', 'success');
    } catch {
      showToast('계약 정보 저장에 실패했습니다', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setProfileDraft(company.metadata ?? {});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">계약 · 정산</h2>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            수정
          </button>
        ) : null}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <button
          type="button"
          onClick={() => toggleSection('contract')}
          className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 uppercase tracking-wide pb-2 border-b border-gray-100"
        >
          <span>계약 & 정산</span>
          {openSections.contract ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        <div
          className={`${
            openSections.contract
              ? 'max-h-[9999px] opacity-100 overflow-hidden transition-all duration-300 ease-in-out'
              : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">계약 상태</label>
              {isEditing ? (
                <select
                  value={profileDraft.contract_status ?? ''}
                  onChange={(e) => updateField('contract_status', e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">선택</option>
                  {contractStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-1">{renderBadgeValue(profileDraft.contract_status ?? null, contractStatusStyles)}</div>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">스타터 패키지</p>
              {isEditing ? (
                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={Boolean(profileDraft.starter_package)}
                    onChange={(e) => updateField('starter_package', e.target.checked)}
                  />
                  <div className="w-10 h-6 bg-gray-200 peer-checked:bg-primary rounded-full relative transition-colors">
                    <span className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                  </div>
                  <span className="text-sm text-gray-600">
                    {profileDraft.starter_package ? 'ON' : 'OFF'}
                  </span>
                </label>
              ) : (
                <div>{renderBooleanBadge(profileDraft.starter_package)}</div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">프로젝트 전체 금액 (원)</label>
              {isEditing ? (
                <input
                  type="number"
                  value={profileDraft.total_amount ?? ''}
                  onChange={(e) => updateField('total_amount', e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                renderAmountValue(profileDraft.total_amount)
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">예상 발주 수량</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileDraft.est_order_qty ?? ''}
                  onChange={(e) => updateField('est_order_qty', e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                renderTextValue(profileDraft.est_order_qty)
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">계약금 30% 입금</p>
              {isEditing ? (
                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={Boolean(profileDraft.deposit_paid)}
                    onChange={(e) => updateField('deposit_paid', e.target.checked)}
                  />
                  <div className="w-10 h-6 bg-gray-200 peer-checked:bg-primary rounded-full relative transition-colors">
                    <span className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                  </div>
                  <span className="text-sm text-gray-600">
                    {profileDraft.deposit_paid ? 'ON' : 'OFF'}
                  </span>
                </label>
              ) : (
                <div>{renderBooleanBadge(profileDraft.deposit_paid)}</div>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">잔금 70% 입금</p>
              {isEditing ? (
                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={Boolean(profileDraft.balance_paid)}
                    onChange={(e) => updateField('balance_paid', e.target.checked)}
                  />
                  <div className="w-10 h-6 bg-gray-200 peer-checked:bg-primary rounded-full relative transition-colors">
                    <span className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                  </div>
                  <span className="text-sm text-gray-600">
                    {profileDraft.balance_paid ? 'ON' : 'OFF'}
                  </span>
                </label>
              ) : (
                <div>{renderBooleanBadge(profileDraft.balance_paid)}</div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">계약 시작일</label>
              {isEditing ? (
                <input
                  type="date"
                  value={profileDraft.contract_start ?? ''}
                  onChange={(e) => updateField('contract_start', e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                renderTextValue(profileDraft.contract_start)
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">계약 종료일</label>
              {isEditing ? (
                <input
                  type="date"
                  value={profileDraft.contract_end ?? ''}
                  onChange={(e) => updateField('contract_end', e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                renderTextValue(profileDraft.contract_end)
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <button
          type="button"
          onClick={() => toggleSection('sales')}
          className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 uppercase tracking-wide pb-2 border-b border-gray-100"
        >
          <span>영업 & 유입</span>
          {openSections.sales ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        <div
          className={`${
            openSections.sales
              ? 'max-h-[9999px] opacity-100 overflow-hidden transition-all duration-300 ease-in-out'
              : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Lead Source</label>
              {isEditing ? (
                <select
                  value={profileDraft.lead_source ?? ''}
                  onChange={(e) => updateField('lead_source', e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">선택</option>
                  {leadSourceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                renderTextValue(profileDraft.lead_source ?? null)
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">첫 상담일</label>
              {isEditing ? (
                <input
                  type="date"
                  value={profileDraft.first_contact ?? ''}
                  onChange={(e) => updateField('first_contact', e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                renderTextValue(profileDraft.first_contact)
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">목표 런칭 시기</label>
              {isEditing ? (
                <input
                  type="date"
                  value={profileDraft.target_launch ?? ''}
                  onChange={(e) => updateField('target_launch', e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                renderTextValue(profileDraft.target_launch)
              )}
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">관심 카테고리</p>
              {isEditing ? (
                <div className="flex flex-wrap gap-3">
                  {interestCategoryOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={interestCategories.includes(option)}
                        onChange={() => toggleArrayValue('interest_category', option)}
                        className="accent-primary"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ) : (
                renderArrayValue(interestCategoryDisplay)
              )}
              {isEditing && interestCategories.includes('기타') && (
                <input
                  type="text"
                  value={profileDraft.interest_category_other ?? ''}
                  onChange={(e) => updateField('interest_category_other', e.target.value)}
                  placeholder="직접 입력"
                  className="mt-2 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              )}
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">현재 판매 채널</p>
              {isEditing ? (
                <div className="flex flex-wrap gap-3">
                  {interestCategoryOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={currentChannels.includes(option)}
                        onChange={() => toggleArrayValue('current_channel', option)}
                        className="accent-primary"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ) : (
                renderArrayValue(currentChannelDisplay)
              )}
              {isEditing && currentChannels.includes('기타') && (
                <input
                  type="text"
                  value={profileDraft.current_channel_other ?? ''}
                  onChange={(e) => updateField('current_channel_other', e.target.value)}
                  placeholder="직접 입력"
                  className="mt-2 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              )}
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">진출 희망 채널</p>
              {isEditing ? (
                <div className="flex flex-wrap gap-3">
                  {channelOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={targetChannels.includes(option)}
                        onChange={() => toggleArrayValue('target_channel', option)}
                        className="accent-primary"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ) : (
                renderArrayValue(targetChannelDisplay)
              )}
              {isEditing && targetChannels.includes('기타') && (
                <input
                  type="text"
                  value={profileDraft.target_channel_other ?? ''}
                  onChange={(e) => updateField('target_channel_other', e.target.value)}
                  placeholder="직접 입력"
                  className="mt-2 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {isEditing && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
