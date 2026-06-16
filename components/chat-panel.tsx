'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

type ChatMessage = {
  id: string;
  sender_id: string;
  sender_role: 'staff' | 'client';
  sender_name: string;
  text: string;
  created_at: string;
};

const getAccessToken = async () => {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const sameDay = (a: string, b: string) => a.slice(0, 10) === b.slice(0, 10);
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

export function ChatPanel({ companyId, className }: { companyId: string; className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [side, setSide] = useState<'staff' | 'client'>('staff');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  };

  const load = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`/api/companies/${companyId}/chat`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '채팅을 불러올 수 없습니다.');
        return;
      }
      setSide(data.side);
      setMessages((prev) => {
        const changed = prev.length !== data.messages.length;
        if (changed) requestAnimationFrame(scrollToBottom);
        return data.messages;
      });
      setError(null);
    } catch {
      setError('채팅을 불러오지 못했습니다.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    initialized.current = false;
    load(true).then(() => {
      initialized.current = true;
      scrollToBottom();
    });
    const interval = setInterval(() => load(false), 8000); // 폴링
    return () => clearInterval(interval);
  }, [load]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`/api/companies/${companyId}/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '메시지 전송에 실패했습니다.');
        return;
      }
      setMessages((prev) => [...prev, data.message]);
      setInput('');
      requestAnimationFrame(scrollToBottom);
    } catch {
      setError('메시지 전송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`flex flex-col h-full min-h-0 ${className ?? ''}`}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-2 space-y-2">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            {error ?? '아직 대화가 없습니다. 첫 메시지를 보내보세요.'}
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_role === side;
            const showDay = i === 0 || !sameDay(messages[i - 1].created_at, m.created_at);
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="flex justify-center my-3">
                    <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {fmtDay(m.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!mine && (
                      <span className="text-[11px] text-gray-500 mb-0.5 px-1">
                        {m.sender_name}
                        <span className="ml-1 text-gray-300">
                          {m.sender_role === 'staff' ? '· 브루션' : '· 고객사'}
                        </span>
                      </span>
                    )}
                    <div className="flex items-end gap-1.5">
                      {mine && <span className="text-[10px] text-gray-400">{fmtTime(m.created_at)}</span>}
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                          mine
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                        }`}
                      >
                        {m.text}
                      </div>
                      {!mine && <span className="text-[10px] text-gray-400">{fmtTime(m.created_at)}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && messages.length > 0 && (
        <p className="text-xs text-red-500 px-2 py-1">{error}</p>
      )}

      <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t border-gray-200">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as unknown as React.FormEvent);
            }
          }}
          placeholder="메시지를 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"
          rows={1}
          className="flex-1 resize-none px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary max-h-28"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="px-4 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
