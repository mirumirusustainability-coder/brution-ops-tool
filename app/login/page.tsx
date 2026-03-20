'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { LogIn, AlertCircle } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다');
        setIsLoading(false);
        return;
      }

      const meResponse = await fetch('/api/auth/me', { cache: 'no-store' });
      if (meResponse.status === 401) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다');
        setIsLoading(false);
        return;
      }

      if (meResponse.status === 403) {
        setError('비활성화된 계정입니다');
        setIsLoading(false);
        return;
      }

      if (!meResponse.ok) {
        setError('로그인 처리 중 오류가 발생했습니다');
        setIsLoading(false);
        return;
      }

      const me = await meResponse.json();
      if (me?.mustChangePassword) {
        router.replace('/force-password-change');
      } else {
        router.replace('/app/projects');
      }
    } catch (err) {
      setError('로그인 처리 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Brution</h1>
          <p className="text-gray-600">운영지원툴 로그인</p>
        </div>

        {/* 발급형 계정 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                관리자 발급 계정으로 로그인하세요
              </p>
              <p className="text-xs text-blue-700">
                셀프 회원가입은 지원하지 않습니다. 계정이 필요하시면 관리자에게 문의하세요.
              </p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-hover transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              '로그인 중...'
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                로그인
              </>
            )}
          </button>
        </form>

        {/* 회원가입 링크 없음 (SSOT 하드룰) */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            계정 문의: admin@brution.com
          </p>
        </div>
      </div>
    </div>
  );
}
