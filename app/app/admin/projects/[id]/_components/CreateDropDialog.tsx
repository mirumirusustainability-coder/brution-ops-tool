'use client';

import { useRef, useState } from 'react';
import { Plus, Loader2, Paperclip } from 'lucide-react';
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DELIVERABLE_TYPE_GROUPS, DELIVERABLE_TYPE_LABELS } from '@/lib/constants';

const getToken = async () => {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

/**
 * 원샷 드롭 생성 모달: 종류 + 제목 + (선택)파일을 한 번에 → /api/admin/drops.
 * 기존 3단 플로우(드롭 → 버전 → 업로드)를 대체하는 단순 경로.
 */
export function CreateDropDialog({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('');
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<'client' | 'internal'>('client');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setType('');
    setTitle('');
    setVisibility('client');
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = async () => {
    if (!type || !title.trim() || saving) return;
    setSaving(true);
    try {
      const token = await getToken();
      const form = new FormData();
      form.append('projectId', projectId);
      form.append('type', type);
      form.append('title', title.trim());
      form.append('visibility', visibility);
      if (file) form.append('file', file);

      const res = await fetch('/api/admin/drops', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? '드롭 생성에 실패했습니다.', 'error');
        return;
      }
      showToast('새 드롭이 추가되었습니다.', 'success');
      setOpen(false);
      reset();
      onCreated();
    } catch {
      showToast('드롭 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        새 드롭
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 드롭 만들기</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>종류</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="산출물 종류 선택" />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERABLE_TYPE_GROUPS.map((g) => (
                    <SelectGroup key={g.label}>
                      <SelectLabel>{g.label}</SelectLabel>
                      {g.types.map((t) => (
                        <SelectItem key={t} value={t}>
                          {DELIVERABLE_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>제목</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 1차 키워드 분석 리포트"
              />
            </div>

            <div className="space-y-1.5">
              <Label>공개 범위</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as 'client' | 'internal')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">고객사 공개</SelectItem>
                  <SelectItem value="internal">내부 전용</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>파일 (선택)</Label>
              <input
                ref={fileRef}
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="w-full justify-start font-normal text-muted-foreground"
              >
                <Paperclip className="w-4 h-4" />
                {file ? file.name : '파일 첨부 (나중에 추가 가능)'}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={!type || !title.trim() || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              만들기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
