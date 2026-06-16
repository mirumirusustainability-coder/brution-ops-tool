'use client';

import { useState } from 'react';
import { FolderPlus, Loader2, Check } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { showToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserRole } from '@/types';
import type { ExportBody } from '@/lib/tool-export';

const getToken = async () => {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

type ProjectOption = { id: string; name: string; companyName?: string };

const isStaff = (role: UserRole) => role === 'staff_admin' || role === 'staff_member';

export function SaveToProject({
  userRole,
  defaultTitle,
  getBody,
  disabled,
  className,
}: {
  userRole: UserRole;
  defaultTitle: string;
  getBody: () => ExportBody; // { tool, rows? , payload? }
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState(defaultTitle);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isStaff(userRole)) return null; // 직원만 저장 가능

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/projects', {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.projects)) {
        setProjects(
          data.projects.map((p: any) => ({
            id: p.id,
            name: p.name,
            companyName: Array.isArray(p.companies) ? p.companies[0]?.name : p.companies?.name,
          }))
        );
      } else {
        showToast(data.error ?? '프로젝트 목록을 불러올 수 없습니다.', 'error');
      }
    } catch {
      showToast('프로젝트 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next) {
      setTitle(defaultTitle);
      setSaved(false);
      if (projects.length === 0) loadProjects();
    }
  };

  const handleSave = async () => {
    if (!projectId || saving) return;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/tools/save-as-drop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...getBody(), projectId, title: title.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? '저장에 실패했습니다.', 'error');
        return;
      }
      setSaved(true);
      showToast(`'${data.projectName}' 프로젝트에 드롭으로 저장되었습니다.`, 'success');
      setTimeout(() => setOpen(false), 900);
    } catch {
      showToast('저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => handleOpen(true)}
        className={className}
      >
        <FolderPlus className="w-4 h-4" />
        프로젝트에 저장
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프로젝트에 드롭으로 저장</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>프로젝트</Label>
              <Select value={projectId} onValueChange={setProjectId} disabled={loadingProjects}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingProjects ? '불러오는 중...' : '프로젝트 선택'} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.companyName ? ` · ${p.companyName}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>산출물 제목</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="산출물 제목" />
            </div>

            <p className="text-xs text-muted-foreground">
              저장하면 선택한 프로젝트에 <strong>검토 대기(초안)</strong> 드롭으로 추가됩니다. 담당자
              검토 후 공개하면 고객사가 다운로드할 수 있어요.
            </p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={!projectId || saving || saved}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4" />
              ) : (
                <FolderPlus className="w-4 h-4" />
              )}
              {saved ? '저장됨' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
