'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DownloadButtonProps {
  status: string;
  userRole: string;
  assetId?: string;
  fileName?: string;
  className?: string;
}

export function DownloadButton({
  status,
  userRole,
  assetId,
  fileName,
  className,
}: DownloadButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 고객은 published만 다운로드 가능
  const isClient = userRole.startsWith('client');
  const canDownload = isClient ? status === 'published' : true;
  const disabled = !canDownload || !assetId || loading;

  const handleDownload = async () => {
    if (disabled || !assetId) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/download`, {
        cache: 'no-store',
      });

      if (response.status === 401) {
        router.replace('/login');
        setError('로그인이 필요합니다');
        return;
      }

      if (response.status === 403) {
        setError('승인/공개 완료 시 다운로드 가능');
        return;
      }

      if (response.status === 404) {
        setError('파일을 찾을 수 없습니다.');
        return;
      }

      if (response.status === 429) {
        setError('잠시 후 다시 시도해 주세요.');
        return;
      }

      if (!response.ok) {
        setError('서버/네트워크 오류가 발생했습니다.');
        return;
      }

      const data = await response.json();
      const signedUrl = data?.signedUrl ?? data?.url;

      if (!signedUrl) {
        setError('서버/네트워크 오류가 발생했습니다.');
        return;
      }

      window.open(signedUrl, '_blank', 'noreferrer');
    } catch (err) {
      setError('서버/네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleDownload}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-primary text-white hover:bg-primary-hover cursor-pointer',
          className
        )}
      >
        <Download className="w-4 h-4" />
        {loading ? '다운로드 준비 중...' : '다운로드'}
      </button>
      {!canDownload && isClient && (
        <p className="text-xs text-gray-500 mt-1">승인 완료 후 다운로드 가능합니다</p>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
