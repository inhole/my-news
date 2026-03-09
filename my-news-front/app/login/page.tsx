'use client';

import type { AxiosError } from 'axios';
import { useState, FormEvent } from 'react';
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
    <div className="px-5 py-8">
      <div className="rounded-[28px] border border-[#ddd6cd] bg-[#fbfaf7] p-7 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#eef1f6] text-[#2f3947]">
            <LogIn className="h-8 w-8" />
          </div>
          <h1 className="text-[1.9rem] font-black tracking-[-0.05em] text-[#2f3947]">
            로그인
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#697280]">
            My News에서 저장한 기사와 개인화된 뉴스를 이어서 확인하세요.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-[18px] border border-red-200 bg-red-50 px-4 py-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm leading-6 text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#495463]">이메일</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a0a8b4]" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-[18px] border border-[#ddd6cd] bg-white py-3 pl-12 pr-4 text-[#202733] outline-none transition focus:border-[#ef7d2a]"
                disabled={login.isPending}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#495463]">비밀번호</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a0a8b4]" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full rounded-[18px] border border-[#ddd6cd] bg-white py-3 pl-12 pr-4 text-[#202733] outline-none transition focus:border-[#ef7d2a]"
                disabled={login.isPending}
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={login.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#2f3947] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#252d39] disabled:opacity-60"
          >
            {login.isPending ? (
              <>
                <LoadingSpinner size="small" />
                <span>로그인 중</span>
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                <span>로그인</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 rounded-[18px] bg-[#f3efe8] px-4 py-4 text-center text-xs leading-6 text-[#697280]">
          데모 계정: demo@example.com / password123
        </div>
      </div>
    </div>
  );
}
