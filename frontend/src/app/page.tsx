'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, KeyRound, Loader2, Phone, ShieldCheck, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import {
  auth,
  ConfirmationResult,
  getFirebaseSetupError,
  getPhoneAuthTestingConfig,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from '@/lib/firebase';
import { formatIndianPhone, toE164, toIndianLocalNumber } from '@/lib/phone';
import { useAuthStore } from '@/store/useAuthStore';
import { ThemeToggle } from '@/components/ThemeToggle';

type OtpStage = 'phone' | 'otp';

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

const getFirebaseErrorCode = (error: unknown) =>
  typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: unknown }).code)
    : '';

export default function LoginPage() {
  const router = useRouter();
  const { token, hasHydrated, setAuth } = useAuthStore();
  const firebaseSetupError = getFirebaseSetupError();
  const testingConfig = getPhoneAuthTestingConfig();
  const demoPhoneDigits = toIndianLocalNumber(testingConfig.demoPhoneNumber);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [otpStage, setOtpStage] = useState<OtpStage>('phone');

  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasHydrated && token) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, router, token]);

  const clearFeedback = () => {
    setError('');
    setMessage('');
  };

  const getRecaptchaVerifier = useCallback(() => {
    if (!auth) {
      throw new Error(firebaseSetupError || 'Firebase Phone Auth is not configured.');
    }

    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }

    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved, continue with signInWithPhoneNumber
      },
      'expired-callback': () => {
        setError('reCAPTCHA expired. Please try again.');
      },
    });

    recaptchaVerifierRef.current = verifier;
    return verifier;
  }, [firebaseSetupError]);

  const requestOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    clearFeedback();

    try {
      if (!auth) {
        throw new Error(firebaseSetupError || 'Firebase Phone Auth is not configured.');
      }

      const e164Phone = toE164(phone);
      const appVerifier = getRecaptchaVerifier();

      const confirmation = await signInWithPhoneNumber(auth, e164Phone, appVerifier);
      confirmationResultRef.current = confirmation;

      setMessage('OTP sent! Check your phone for the 6-digit code.');
      setOtpStage('otp');
    } catch (requestError: unknown) {
      console.error('OTP request error:', requestError);
      const errorCode = getFirebaseErrorCode(requestError);

      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }

      if (errorCode === 'auth/invalid-phone-number') {
        setError('Invalid phone number format. Please enter a valid 10-digit Indian mobile number.');
      } else if (errorCode === 'auth/billing-not-enabled') {
        setError(
          testingConfig.appVerificationDisabledForTesting && testingConfig.demoPhoneNumber
            ? `Live SMS is not enabled on this Firebase project. Use the configured Firebase test number ${formatIndianPhone(testingConfig.demoPhoneNumber)} for local verification, or enable billing before trying a real number.`
            : 'Live SMS is not enabled on this Firebase project. Enable Firebase Phone Auth billing for real SMS, or configure a Firebase fictional test number for development.',
        );
      } else if (errorCode === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a while before trying again.');
      } else if (errorCode === 'auth/captcha-check-failed') {
        setError('reCAPTCHA verification failed. Please refresh the page and try again.');
      } else {
        setError(getErrorMessage(requestError, 'Failed to send OTP. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    clearFeedback();

    try {
      if (!confirmationResultRef.current) {
        setError('No OTP session found. Please request a new OTP.');
        setOtpStage('phone');
        return;
      }

      const userCredential = await confirmationResultRef.current.confirm(otp);
      const idToken = await userCredential.user.getIdToken();

      const response = await api.post<{
        message: string;
        token: string;
        user: { id: string; email: string; phone: string | null; role: string };
      }>('/auth/firebase-phone-login', { idToken });

      setAuth(response.data.user, response.data.token);
      router.replace('/dashboard');
    } catch (verifyError: unknown) {
      console.error('OTP verification error:', verifyError);
      const errorCode = getFirebaseErrorCode(verifyError);

      if (errorCode === 'auth/invalid-verification-code') {
        setError('Incorrect OTP. Please check the code and try again.');
      } else if (errorCode === 'auth/code-expired') {
        setError('OTP has expired. Please request a new one.');
        setOtpStage('phone');
      } else {
        setError(getErrorMessage(verifyError, 'OTP verification failed. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const goBackToPhone = () => {
    setOtpStage('phone');
    setOtp('');
    confirmationResultRef.current = null;

    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore
      }
      recaptchaVerifierRef.current = null;
    }

    clearFeedback();
  };

  const headingText = otpStage === 'phone' ? 'Sign in with Phone OTP' : 'Verify your OTP';

  const subText =
    otpStage === 'phone'
      ? 'Enter your authorized mobile number to receive a 6-digit OTP via SMS.'
      : `We sent a 6-digit OTP to ${formatIndianPhone(phone)}. Enter it below to sign in.`;

  const footerText =
    'Firebase sends a 6-digit OTP to your approved mobile number. After verification, the backend issues your secure JWT session token for the correct EC role.';

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
      <div id="recaptcha-container" ref={recaptchaContainerRef} />

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
                ['Secure access', 'Phone OTP verification via Firebase for approved EC accounts only.'],
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
          <div className="rounded-[28px] bg-slate-950 px-5 py-6 text-white dark:bg-white dark:text-slate-950">
            <p className="eyebrow text-amber-300 dark:text-amber-700">Member Access</p>
            <h2 className="mt-3 font-display text-3xl font-bold">{headingText}</h2>
            <p className="mt-2 text-sm text-slate-300 dark:text-slate-600">{subText}</p>
          </div>

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

          <AnimatePresence mode="wait">
            {otpStage === 'phone' ? (
              <motion.form
                key="phone-form"
                animate={{ opacity: 1, x: 0 }}
                className="mt-6 space-y-5"
                exit={{ opacity: 0, x: -20 }}
                initial={{ opacity: 0, x: 20 }}
                onSubmit={requestOtp}
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold">Mobile number</label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--foreground-soft)]" />
                    <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-sm font-medium text-[color:var(--foreground-soft)]">
                      +91
                    </span>
                    <input
                      className="field pl-[4.5rem]"
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      required
                      type="tel"
                      value={phone}
                    />
                  </div>
                  <p className="mt-2 text-xs muted">
                    Accepted formats: <span className="font-mono">9876543210</span>,{' '}
                    <span className="font-mono">919876543210</span>, or{' '}
                    <span className="font-mono">+919876543210</span>.
                  </p>
                  <p className="mt-2 text-xs muted">
                    Firebase may send a verification SMS and standard carrier charges can apply on real numbers.
                  </p>
                </div>

                {testingConfig.demoPhoneNumber && (
                  <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-950 dark:text-amber-100">
                    <p className="font-semibold">Demo test login</p>
                    <p className="mt-1">
                      Number: <span className="font-mono">{formatIndianPhone(testingConfig.demoPhoneNumber)}</span>
                      {testingConfig.demoOtpCode && (
                        <>
                          {' '}| OTP: <span className="font-mono">{testingConfig.demoOtpCode}</span>
                        </>
                      )}
                    </p>
                    <button
                      className="mt-3 inline-flex items-center rounded-full border border-amber-600/20 px-3 py-1.5 text-xs font-semibold transition hover:bg-amber-500/10"
                      onClick={() => setPhone(demoPhoneDigits)}
                      type="button"
                    >
                      Use demo number
                    </button>
                  </div>
                )}

                <button className="button-primary w-full" disabled={loading || phone.length !== 10} type="submit">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Send OTP
                </button>
              </motion.form>
            ) : (
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
                      placeholder="123456"
                      required
                      type="text"
                      value={otp}
                    />
                  </div>
                </div>

                {testingConfig.demoOtpCode && (
                  <button
                    className="inline-flex items-center rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent-strong)]"
                    onClick={() => setOtp(testingConfig.demoOtpCode)}
                    type="button"
                  >
                    Use demo OTP
                  </button>
                )}

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
                  onClick={goBackToPhone}
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change number or resend OTP
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-6 rounded-3xl border border-[var(--line)] bg-white/55 px-4 py-4 text-sm muted dark:bg-white/5">
            {footerText}
          </div>
        </section>
      </div>
    </main>
  );
}
