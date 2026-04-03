'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Mail, User, UserPlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import type { ApiCompany, ApiUser } from './types';

type UsersTabProps = {
  company: ApiCompany;
  users: ApiUser[];
  onRefresh: () => Promise<void>;
};

type EditDraft = {
  name: string;
  phone: string;
  job_title: string;
};

export function UsersTab({ company, users, onRefresh }: UsersTabProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [issuedCredentials, setIssuedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [createCopyStatus, setCreateCopyStatus] = useState(false);
  const [userTempPasswords, setUserTempPasswords] = useState<Record<string, string>>({});
  const [copyStatusByUser, setCopyStatusByUser] = useState<Record<string, boolean>>({});
  const [resetLoading, setResetLoading] = useState<Record<string, boolean>>({});
  const [removeLoading, setRemoveLoading] = useState<Record<string, boolean>>({});
  const [businessCardUploading, setBusinessCardUploading] = useState<Record<string, boolean>>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({ name: '', phone: '', job_title: '' });
  const [editLoading, setEditLoading] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<ApiUser | null>(null);

  const activeUserCount = users.filter((item) => item.status === 'active').length;
  const canAddUser = activeUserCount < 5;

  useEffect(() => {
    if (editingUserId && !users.find((item) => item.user_id === editingUserId)) {
      setEditingUserId(null);
    }
  }, [editingUserId, users]);

  const handleCopyCredentials = async (emailValue: string, passwordValue: string, key: string) => {
    try {
      await navigator.clipboard.writeText(`이메일: ${emailValue}\n임시 비밀번호: ${passwordValue}`);
      if (key === 'create') {
        setCreateCopyStatus(true);
        setTimeout(() => setCreateCopyStatus(false), 2000);
      } else {
        setCopyStatusByUser((prev) => ({ ...prev, [key]: true }));
        setTimeout(() => setCopyStatusByUser((prev) => ({ ...prev, [key]: false })), 2000);
      }
    } catch {
      showToast('복사에 실패했습니다', 'error');
    }
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canAddUser) {
      setFormError('최대 5명 제한에 도달했습니다.');
      return;
    }
    setFormError(null);
    setIssuedCredentials(null);
    setSubmitting(true);

    const response = await fetch(`/api/admin/companies/${company.id}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, phone, job_title: jobTitle, role: 'client_admin' }),
    });

    if (response.status === 401) {
      router.replace('/login');
      return;
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error ?? '사용자 발급에 실패했습니다.';
      setFormError(message);
      showToast(message, 'error');
      setSubmitting(false);
      return;
    }

    const issuedPassword = data?.tempPassword ?? null;
    if (issuedPassword) {
      setIssuedCredentials({ email, password: issuedPassword });
      setCreateCopyStatus(false);
    }
    setName('');
    setEmail('');
    setPhone('');
    setJobTitle('');
    setSubmitting(false);
    showToast('사용자가 발급되었습니다.', 'success');
    await onRefresh();
  };

  const handleResetPassword = async (userId: string) => {
    setResetLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const response = await fetch(`/api/admin/companies/${company.id}/users/${userId}/reset-password`, {
        method: 'POST',
      });

      if (response.status === 401) {
        router.replace('/login');
        return;
      }

      if (!response.ok) {
        showToast('임시 비밀번호 발급에 실패했습니다', 'error');
        return;
      }

      const data = await response.json().catch(() => null);
      const newPassword = data?.tempPassword;
      if (newPassword) {
        setUserTempPasswords((prev) => ({ ...prev, [userId]: newPassword }));
        setCopyStatusByUser((prev) => ({ ...prev, [userId]: false }));
        showToast('임시 비밀번호가 발급되었습니다', 'success');
      }
    } finally {
      setResetLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleRemoveUser = (user: ApiUser) => {
    setDeleteTarget(user);
  };

  const handleConfirmUserDelete = async () => {
    if (!deleteTarget) return;
    const userId = deleteTarget.user_id;
    setRemoveLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const response = await fetch(`/api/admin/companies/${company.id}/users/${userId}`, { method: 'DELETE' });
      if (response.status === 401) {
        router.replace('/login');
        return;
      }
      if (!response.ok) {
        showToast('사용자 제거에 실패했습니다', 'error');
        return;
      }
      await onRefresh();
      showToast('사용자가 제거되었습니다', 'success');
      setDeleteTarget(null);
    } finally {
      setRemoveLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleBusinessCardUpload = async (user: ApiUser, file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      showToast('jpeg/png/webp/pdf 파일만 업로드할 수 있습니다', 'error');
      return;
    }

    setBusinessCardUploading((prev) => ({ ...prev, [user.user_id]: true }));

    try {
      const supabase = createClientComponentClient();
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${company.id}/${user.user_id}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('business-cards')
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        showToast('명함 업로드에 실패했습니다', 'error');
        return;
      }

      const { data } = supabase.storage.from('business-cards').getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) {
        showToast('명함 URL 생성에 실패했습니다', 'error');
        return;
      }

      const response = await fetch(`/api/admin/companies/${company.id}/users/${user.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_card_url: publicUrl }),
      });

      if (!response.ok) {
        showToast('명함 저장에 실패했습니다', 'error');
        return;
      }

      await onRefresh();
      showToast('명함이 업로드되었습니다', 'success');
    } catch {
      showToast('명함 업로드에 실패했습니다', 'error');
    } finally {
      setBusinessCardUploading((prev) => ({ ...prev, [user.user_id]: false }));
    }
  };

  const handleBusinessCardDelete = async (user: ApiUser) => {
    setBusinessCardUploading((prev) => ({ ...prev, [user.user_id]: true }));
    try {
      const response = await fetch(`/api/admin/companies/${company.id}/users/${user.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_card_url: null }),
      });
      if (!response.ok) {
        showToast('명함 삭제에 실패했습니다', 'error');
        return;
      }
      await onRefresh();
      showToast('명함이 삭제되었습니다', 'success');
    } finally {
      setBusinessCardUploading((prev) => ({ ...prev, [user.user_id]: false }));
    }
  };

  const handleEditUser = (user: ApiUser) => {
    setEditingUserId(user.user_id);
    setEditDraft({
      name: user.name ?? '',
      phone: user.phone ?? '',
      job_title: user.job_title ?? '',
    });
  };

  const handleSaveUser = async (userId: string) => {
    setEditLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const response = await fetch(`/api/admin/companies/${company.id}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editDraft.name,
          phone: editDraft.phone,
          job_title: editDraft.job_title,
        }),
      });
      if (response.status === 401) {
        router.replace('/login');
        return;
      }
      if (!response.ok) {
        showToast('사용자 정보 수정에 실패했습니다', 'error');
        return;
      }
      await onRefresh();
      setEditingUserId(null);
      showToast('사용자 정보가 수정되었습니다', 'success');
    } finally {
      setEditLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {!canAddUser && (
        <div className="mb-2 bg-red-50 border-2 border-red-200 rounded-md p-4">
          <div className="flex gap-2">
            <div>
              <p className="text-sm font-medium text-red-900 mb-1">최대 사용자 수 도달</p>
              <p className="text-xs text-red-700">
                MVP 하드 제한으로 고객사당 최대 5명까지만 사용자를 발급할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">새 사용자 발급</h2>
        <form className="space-y-4" onSubmit={handleCreateUser}>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canAddUser || submitting}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="홍길동"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!canAddUser || submitting}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="user@company.com"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">연락처 (선택)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!canAddUser || submitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="010-0000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">직급 (선택)</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                disabled={!canAddUser || submitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="예: 대표, 팀장, 담당자"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!canAddUser || submitting}
            className="w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-hover transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {submitting ? '발급 중...' : '사용자 발급 (임시 비밀번호 자동 생성)'}
          </button>

          {issuedCredentials && (
            <div className="border border-green-200 bg-green-50 rounded-md p-4 text-sm text-green-800">
              <p className="font-semibold mb-2">✅ 사용자 발급 완료</p>
              <div className="space-y-1 text-sm">
                <p>이메일: {issuedCredentials.email}</p>
                <p>임시 PW: {issuedCredentials.password}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCredentials(issuedCredentials.email, issuedCredentials.password, 'create')}
                className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-sm border border-green-300 rounded-md text-green-800 hover:bg-green-100"
              >
                {createCopyStatus ? '✅ 복사됨' : '📋 ID/PW 복사하기'}
              </button>
            </div>
          )}

          {formError && <p className="text-sm text-red-600 text-center">{formError}</p>}
        </form>
      </div>

      <div className="bg-white border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">현재 사용자 목록</h2>
        <div className="space-y-3">
          {users.length === 0 ? (
            <div className="text-sm text-gray-500">등록된 사용자가 없습니다</div>
          ) : (
            users.map((item) => {
              const tempPasswordValue = userTempPasswords[item.user_id];
              const businessCardUrl = item.business_card_url ?? null;
              const businessCardInputId = `business-card-${item.user_id}`;
              const isBusinessCardImage = !!businessCardUrl && /\.(png|jpe?g|webp)(\?|$)/i.test(businessCardUrl);
              const isEditing = editingUserId === item.user_id;

              return (
                <div
                  key={item.user_id}
                  onClick={() => {
                    if (editingUserId !== item.user_id) handleEditUser(item);
                  }}
                  className="bg-muted rounded-md p-4 border border-transparent hover:border-gray-200 hover:shadow-sm transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.name ? `${item.name}${item.job_title ? ` · ${item.job_title}` : ''}` : '이름 없음'}
                        </p>
                        <p className="text-xs text-gray-500">{item.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleResetPassword(item.user_id);
                        }}
                        disabled={resetLoading[item.user_id]}
                        className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-white disabled:opacity-50"
                      >
                        {resetLoading[item.user_id] ? '재발급 중...' : '재발급'}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveUser(item);
                        }}
                        disabled={removeLoading[item.user_id]}
                        className="p-1.5 rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        aria-label="삭제"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-4 grid md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={editDraft.name}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="이름"
                      />
                      <input
                        type="text"
                        value={editDraft.phone}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="연락처"
                      />
                      <input
                        type="text"
                        value={editDraft.job_title}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, job_title: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="직급"
                      />
                      <div className="md:col-span-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingUserId(null);
                          }}
                          className="px-3 py-1.5 text-xs border border-gray-300 rounded-md"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSaveUser(item.user_id);
                          }}
                          disabled={editLoading[item.user_id]}
                          className="px-3 py-1.5 text-xs bg-primary text-white rounded-md disabled:opacity-50"
                        >
                          {editLoading[item.user_id] ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    {businessCardUrl ? (
                      <div className="flex items-center gap-3">
                        {isBusinessCardImage ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              window.open(businessCardUrl, '_blank');
                            }}
                            className="border border-gray-200 rounded-md overflow-hidden"
                          >
                            <img src={businessCardUrl} alt="business card" className="w-16 h-16 object-cover" />
                          </button>
                        ) : (
                          <a
                            href={businessCardUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            PDF 보기
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const input = document.getElementById(businessCardInputId) as HTMLInputElement | null;
                            input?.click();
                          }}
                          disabled={businessCardUploading[item.user_id]}
                          className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-white disabled:opacity-50"
                        >
                          {businessCardUploading[item.user_id] ? '업로드 중...' : '🔄 교체'}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleBusinessCardDelete(item);
                          }}
                          disabled={businessCardUploading[item.user_id]}
                          className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
                        >
                          삭제
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const input = document.getElementById(businessCardInputId) as HTMLInputElement | null;
                          input?.click();
                        }}
                        disabled={businessCardUploading[item.user_id]}
                        className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-white disabled:opacity-50"
                      >
                        {businessCardUploading[item.user_id] ? '업로드 중...' : '📎 명함 업로드'}
                      </button>
                    )}
                    <input
                      id={businessCardInputId}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        handleBusinessCardUpload(item, file);
                        e.currentTarget.value = '';
                      }}
                    />
                  </div>

                  {tempPasswordValue && (
                    <div className="mt-3 border border-green-200 bg-green-50 rounded-md p-4 text-sm text-green-800">
                      <p className="font-semibold mb-2">✅ 사용자 재발급 완료</p>
                      <div className="space-y-1 text-sm">
                        <p>이메일: {item.email}</p>
                        <p>임시 PW: {tempPasswordValue}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleCopyCredentials(item.email, tempPasswordValue, item.user_id);
                        }}
                        className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-sm border border-green-300 rounded-md text-green-800 hover:bg-green-100"
                      >
                        {copyStatusByUser[item.user_id] ? '✅ 복사됨' : '📋 ID/PW 복사하기'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="정말 삭제하시겠습니까?"
        description={`${deleteTarget?.name ?? deleteTarget?.email ?? ''} 계정이 영구 삭제됩니다.`}
        onConfirm={handleConfirmUserDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
