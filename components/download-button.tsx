import { Download } from 'lucide-react';
import { VersionStatus, UserRole } from '@/types';
import { cn } from '@/lib/utils';

interface DownloadButtonProps {
  status: VersionStatus;
  userRole: UserRole;
  fileName?: string;
  fileUrl?: string;
  className?: string;
}

export function DownloadButton({
  status,
  userRole,
  fileName,
  fileUrl,
  className,
}: DownloadButtonProps) {
  // 고객은 published만 다운로드 가능
  const isClient = userRole.startsWith('client');
  const canDownload = isClient ? status === 'published' : true;

  const handleDownload = () => {
    if (!canDownload || !fileUrl) return;
    
    // Mock download (실제로는 API 호출)
    console.log('Downloading:', fileName);
    alert(`다운로드: ${fileName}\n(실제 환경에서는 파일 다운로드가 시작됩니다)`);
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleDownload}
        disabled={!canDownload}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
          canDownload
            ? 'bg-primary text-white hover:bg-primary-hover cursor-pointer'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          className
        )}
      >
        <Download className="w-4 h-4" />
        다운로드
      </button>
      {!canDownload && isClient && (
        <p className="text-xs text-gray-500 mt-1">
          승인 완료 후 다운로드 가능합니다
        </p>
      )}
    </div>
  );
}
