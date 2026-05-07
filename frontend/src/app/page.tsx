'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { ThemeToggle } from '@/components/ThemeToggle';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    return response?.data?.error || fallback;
  }

  return fallback;
};

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, token, hasHydrated } = useAuthStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (hasHydrated && token) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, router, token]);

  const requestOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post<{ message: string }>('/auth/login', { email });
      setMessage(response.data.message);
      setStep(2);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Failed to send OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post<{
        token: string;
        user: { id: string; email: string; role: string };
      }>('/auth/verify-otp', { email, otp });

      setAuth(response.data.user, response.data.token);
      router.push('/dashboard');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Invalid OTP.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="panel relative overflow-hidden p-8 sm:p-10 lg:p-12">
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-br from-amber-500/20 via-transparent to-sky-500/10" />
          <div className="relative">
            <p className="eyebrow">Production Control Room</p>
            <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-tight sm:text-5xl">
              Election penalty operations, cleaned up for real-world deployment.
            </h1>
            <p className="mt-5 max-w-2xl text-base muted sm:text-lg">
              Review student intelligence, manage Google Sheet workflows, and dispatch penalty communication from one production-ready workspace.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ['Secure access', 'OTP-based entry for approved EC accounts only.'],
                ['Review workflow', 'From draft to dispatch with clearer status control.'],
                ['Deployment-ready', 'Prepared for Firebase frontend and Render backend rollout.'],
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
            <h2 className="mt-3 font-display text-3xl font-bold">Sign in to continue</h2>
            <p className="mt-2 text-sm text-slate-300 dark:text-slate-600">
              Use your authorized institute email to receive a one-time login code.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {(error || message) && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className={`mt-5 rounded-3xl border px-4 py-3 text-sm ${
                  error
                    ? 'border-red-500/20 bg-red-500/10 text-red-300'
                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                }`}
                exit={{ opacity: 0, y: -10 }}
                initial={{ opacity: 0, y: -10 }}
              >
                {error || message}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="otp-request"
                animate={{ opacity: 1, x: 0 }}
                className="mt-6 space-y-5"
                exit={{ opacity: 0, x: -20 }}
                initial={{ opacity: 0, x: 20 }}
                onSubmit={requestOtp}
              >
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

                <button className="button-primary w-full" disabled={loading} type="submit">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Send OTP
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="otp-verify"
                animate={{ opacity: 1, x: 0 }}
                className="mt-6 space-y-5"
                exit={{ opacity: 0, x: 20 }}
                initial={{ opacity: 0, x: -20 }}
                onSubmit={verifyOtp}
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold">Verification code</label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--foreground-soft)]" />
                    <input
                      className="field pl-11 text-center font-mono text-lg tracking-[0.45em]"
                      maxLength={6}
                      onChange={(event) => setOtp(event.target.value)}
                      placeholder="123456"
                      required
                      type="text"
                      value={otp}
                    />
                  </div>
                </div>

                <button className="button-primary w-full" disabled={loading} type="submit">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Verify and continue
                </button>

                <button
                  className="button-secondary w-full"
                  onClick={() => {
                    setStep(1);
                    setOtp('');
                    setError('');
                    setMessage('');
                  }}
                  type="button"
                >
                  Use another email
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-6 rounded-3xl border border-[var(--line)] bg-white/55 px-4 py-4 text-sm muted dark:bg-white/5">
            OTP delivery is still secured from the backend. EmailJS support will be wired for production messaging without exposing the login flow on the client.
          </div>
        </section>
      </div>
    </main>
  );
}
