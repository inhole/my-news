'use client';

import type { AxiosError } from 'axios';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Lock, LogIn, Mail } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLogin } from '@/hooks/use-queries';

type ApiErrorResponse = {
  message?: string | string[];
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useLogin();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    try {
      await login.mutateAsync({ email, password });
      router.push('/');
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      const responseMessage = axiosError.response?.data?.message;
      const message = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : responseMessage;

      setError(message || '로그인에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[560px] py-6">
      <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[var(--line)] sm:p-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">MY NEWS</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-[#111827]">로그인</h1>
          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            계정에 로그인하고 저장한 기사와 맞춤 뉴스를 확인하세요.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-2xl bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#4b5563]">이메일</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[var(--primary)] focus:bg-white"
                disabled={login.isPending}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#4b5563]">비밀번호</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[var(--primary)] focus:bg-white"
                disabled={login.isPending}
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={login.isPending}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {login.isPending ? (
              <>
                <LoadingSpinner size="small" />
                <span>로그인 중</span>
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>로그인</span>
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
