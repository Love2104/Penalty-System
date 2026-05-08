'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, KeyRound, Loader2, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { ThemeToggle } from '@/components/ThemeToggle';

type OtpStage = 'email' | 'otp';

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
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [otpStage, setOtpStage] = useState<OtpStage>('email');

  useEffect(() => {
    if (hasHydrated && token) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, router, token]);

  const clearFeedback = () => {
    setError('');
    setMessage('');
  };

  /* ───── Backend Email OTP flow ───── */
  const requestOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    clearFeedback();

    try {
      const response = await api.post<{ message: string }>('/auth/login', { email });
      setMessage(response.data.message || 'OTP sent! Check your email.');
      setOtpStage('otp');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Failed to send OTP. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    clearFeedback();

    try {
      const response = await api.post<{
        message: string;
        token: string;
        user: { id: string; email: string; role: string };
      }>('/auth/verify-otp', { email, otp });

      setAuth(response.data.user, response.data.token);
      router.replace('/dashboard');
    } catch (verifyError) {
      setError(getErrorMessage(verifyError, 'OTP verification failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const goBackToEmail = () => {
    setOtpStage('email');
    setOtp('');
    clearFeedback();
  };

  /* ───── Descriptions ───── */
  const headingText =
    otpStage === 'email'
      ? 'Sign in with OTP'
      : 'Verify your OTP';

  const subText =
    otpStage === 'email'
      ? 'Enter your authorized institute email to receive a 6-digit OTP.'
      : `We sent a 6-digit OTP to ${email}. Enter it below to sign in.`;

  const footerText =
    'A 6-digit OTP is sent to your email via Brevo. After verification, the backend issues a secure JWT session token for your approved role.';

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
                ['Secure access', 'Email OTP verification via Brevo for approved EC accounts only.'],
                ['Review workflow', 'From draft to dispatch with clearer status control.'],
                ['Deployment-ready', 'Prepared for Firebase frontend hosting and Render backend rollout.'],
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
          {/* ─── Header ─── */}
          <div className="rounded-[28px] bg-slate-950 px-5 py-6 text-white dark:bg-white dark:text-slate-950">
            <p className="eyebrow text-amber-300 dark:text-amber-700">Member Access</p>
            <h2 className="mt-3 font-display text-3xl font-bold">{headingText}</h2>
            <p className="mt-2 text-sm text-slate-300 dark:text-slate-600">{subText}</p>
          </div>

          {/* ─── Feedback ─── */}
          <AnimatePresence mode="wait">
            {(error || message) && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className={`mt-5 rounded-3xl border px-4 py-3 text-sm ${
                  error
                    ? 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300'
                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                }`}
                exit={{ opacity: 0, y: -10 }}
                initial={{ opacity: 0, y: -10 }}
              >
                {error || message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Forms ─── */}
          <AnimatePresence mode="wait">
            {otpStage === 'email' ? (
              /* OTP - Step 1: Enter email */
              <motion.form
                key="otp-email-form"
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
              /* OTP - Step 2: Enter OTP code */
              <motion.form
                key="otp-verify-form"
                animate={{ opacity: 1, x: 0 }}
                className="mt-6 space-y-5"
                exit={{ opacity: 0, x: 20 }}
                initial={{ opacity: 0, x: -20 }}
                onSubmit={verifyOtp}
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold">One-time password</label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--foreground-soft)]" />
                    <input
                      autoFocus
                      className="field pl-11 tracking-[0.3em] text-center text-lg font-bold"
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                      pattern="\d{6}"
                      placeholder="••••••"
                      required
                      type="text"
                      value={otp}
                    />
                  </div>
                </div>

                <button
                  className="button-primary w-full"
                  disabled={loading || otp.length !== 6}
                  type="submit"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Verify &amp; Sign in
                </button>

                <button
                  className="button-secondary w-full"
                  disabled={loading}
                  onClick={goBackToEmail}
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change email or resend OTP
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* ─── Footer info ─── */}
          <div className="mt-6 rounded-3xl border border-[var(--line)] bg-white/55 px-4 py-4 text-sm muted dark:bg-white/5">
            {footerText}
          </div>
        </section>
      </div>
    </main>
  );
}
