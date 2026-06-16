import { VersionStatus } from '@/types';
import { VERSION_STATUS_META } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: VersionStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = VERSION_STATUS_META[status] ?? { label: status, tone: 'neutral' as const };
  return (
    <Badge variant={meta.tone} className={className}>
      {meta.label}
    </Badge>
  );
}
