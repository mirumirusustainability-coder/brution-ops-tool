'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다');
        setIsLoading(false);
        return;
      }

      console.log('signIn data:', JSON.stringify(data));
      console.log('session:', data?.session);
      console.log('access_token:', data?.session?.access_token);

      const accessToken = data?.session?.access_token;
      const meResponse = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
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
      } else if (me?.role === 'staff_admin') {
        router.push('/app/admin');
      } else {
        router.push('/app/projects');
      }
    } catch (err) {
      setError('로그인 처리 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      setResetError('이메일을 입력해 주세요');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);
    const { error: resetErrorResponse } = await supabase.auth.resetPasswordForEmail(resetEmail);
    if (resetErrorResponse) {
      setResetError(resetErrorResponse.message);
      setResetLoading(false);
      return;
    }
    setResetSuccess('입력하신 이메일로 재설정 링크를 발송했습니다');
    setResetLoading(false);
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
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center gap-2">
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
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

          <div className="text-right">
            <button
              type="button"
              onClick={() => {
                setResetOpen(true);
                setResetEmail(email);
                setResetError(null);
                setResetSuccess(null);
              }}
              className="text-xs text-primary hover:underline"
            >
              비밀번호를 잊으셨나요?
            </button>
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

        {resetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">비밀번호 재설정</h2>
              <p className="text-sm text-gray-600 mb-4">
                가입한 이메일을 입력하시면 재설정 링크를 보내드립니다
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="your@email.com"
              />
              {resetError && <p className="mt-2 text-sm text-red-600">{resetError}</p>}
              {resetSuccess && <p className="mt-2 text-sm text-green-600">{resetSuccess}</p>}
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={resetLoading}
                  className="px-3 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50"
                >
                  {resetLoading ? '발송 중...' : '재설정 링크 발송'}
                </button>
              </div>
            </div>
          </div>
        )}

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
