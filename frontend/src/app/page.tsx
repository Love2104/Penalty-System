'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, KeyRound, Loader2, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { ThemeToggle } from '@/components/ThemeToggle';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    return response?.data?.error || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
};

export default function LoginPage() {
  const router = useRouter();
  const { token, hasHydrated, setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hasHydrated && token) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, router, token]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post<{
        message: string;
        token: string;
        user: { id: string; email: string; role: string };
      }>('/auth/login', { email, password });

      setAuth(response.data.user, response.data.token);
      router.replace('/dashboard');
    } catch (loginError) {
      setError(getErrorMessage(loginError, 'Incorrect email or password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const headingText = 'Sign in to Penalty Portal';
  const subText = 'Enter your authorized IITK email address and password to access the operational workspace.';

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="panel relative overflow-hidden p-8 sm:p-10 lg:p-12">
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-br from-amber-500/20 via-transparent to-sky-500/10" />
          <div className="relative">
            <p className="eyebrow">Election Commission Workspace</p>
            <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-tight sm:text-5xl">
              Manage penalty review, spreadsheet coordination, and secure member access from one operational workspace.
            </h1>
            <p className="mt-5 max-w-2xl text-base muted sm:text-lg">
              This interface is built for approved EC members to review cases, sync sheet data, and move records from draft to dispatch with clearer status control.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ['Secure access', 'Email and password authentication for approved IITK Election Commission members.'],
                ['Sheet coordination', 'Link Google Sheets, discover tabs, and keep review activity organized.'],
                ['Dispatch workflow', 'Track draft, review, approval, and final communication from one place.'],
              ].map(([title, copy]) => (
                <div key={title} className="panel-soft p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold">{title}</h2>
                  <p className="mt-2 text-sm muted">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel p-6 sm:p-8">
          <div className="rounded-[28px] bg-slate-950 px-5 py-6 text-white dark:bg-white dark:text-slate-950">
            <p className="eyebrow text-amber-300 dark:text-amber-700">Member Access</p>
            <h2 className="mt-3 font-display text-3xl font-bold">{headingText}</h2>
            <p className="mt-2 text-sm text-slate-300 dark:text-slate-600">{subText}</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded-3xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300"
                exit={{ opacity: 0, y: -10 }}
                initial={{ opacity: 0, y: -10 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form className="mt-6 space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="mb-2 block text-sm font-semibold">Institute email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--foreground-soft)]" />
                <input
                  className="field pl-11"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@iitk.ac.in"
                  required
                  type="email"
                  value={email}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Password</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--foreground-soft)]" />
                <input
                  className="field pl-11"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                />
              </div>
            </div>

            <button className="button-primary w-full" disabled={loading} type="submit">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Sign In
            </button>
          </form>

          <div className="mt-6 rounded-3xl border border-[var(--line)] bg-white/55 px-4 py-4 text-sm muted dark:bg-white/5">
            Access is restricted to approved EC roles. The default password is <strong>Love@2004</strong>. If your account needs to be added, contact the superadmin at lovec23@iitk.ac.in.
          </div>
        </section>
      </div>
    </main>
  );
}
