'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { ArrowRight, Loader2, MailCheck } from 'lucide-react';
import api from '@/lib/api';
import { ensureFirebaseAuthPersistence, isFirebaseEmailLinkConfigured } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';

const EMAIL_LINK_STORAGE_KEY = 'penalty-system-email-link';

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

export default function FinishSignInPage() {
  const router = useRouter();
  const { setAuth, token, hasHydrated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('Validating your sign-in link...');
  const [error, setError] = useState('');

  useEffect(() => {
    if (hasHydrated && token) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, router, token]);

  useEffect(() => {
    const prepare = async () => {
      try {
        if (!isFirebaseEmailLinkConfigured) {
          throw new Error('Firebase Email Link Auth is not configured in the frontend environment.');
        }

        const auth = await ensureFirebaseAuthPersistence();
        if (!isSignInWithEmailLink(auth, window.location.href)) {
          throw new Error('This sign-in link is invalid or has already been used.');
        }

        const storedEmail = window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY) || '';
        if (storedEmail) {
          setEmail(storedEmail);
          setMessage('Confirm and finish sign-in for the saved email below.');
        } else {
          setMessage('Confirm the email address that requested this sign-in link.');
        }
      } catch (prepareError) {
        setError(getErrorMessage(prepareError, 'Unable to prepare Firebase sign-in.'));
      } finally {
        setLoading(false);
      }
    };

    void prepare();
  }, []);

  const completeSignIn = async (incomingEmail?: string) => {
    const confirmedEmail = (incomingEmail || email).trim().toLowerCase();
    if (!confirmedEmail) {
      setError('Email is required to complete sign-in.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const auth = await ensureFirebaseAuthPersistence();
      const userCredential = await signInWithEmailLink(auth, confirmedEmail, window.location.href);
      window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);

      const idToken = await userCredential.user.getIdToken(true);
      const response = await api.post<{
        token: string;
        user: { id: string; email: string; role: string };
      }>('/auth/firebase/session', { idToken });

      setAuth(response.data.user, response.data.token);
      router.replace('/dashboard');
    } catch (signInError) {
      setError(getErrorMessage(signInError, 'Unable to complete email-link sign-in.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await completeSignIn();
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section className="panel w-full max-w-xl p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
          <MailCheck className="h-6 w-6" />
        </div>

        <p className="eyebrow mt-5">Firebase Sign-In</p>
        <h1 className="mt-3 font-display text-3xl font-bold">Complete your secure login</h1>
        <p className="mt-3 text-sm muted">{error || message}</p>

        {loading ? (
          <div className="mt-6 flex items-center gap-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing sign-in...
          </div>
        ) : !error ? (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold">Confirm your email</label>
              <input
                className="field"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@iitk.ac.in"
                required
                type="email"
                value={email}
              />
            </div>

            <button className="button-primary w-full" disabled={submitting} type="submit">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {email ? 'Finish sign-in' : 'Confirm and continue'}
            </button>
          </form>
        ) : null}

        {error && (
          <div className="mt-6">
            <Link className="button-secondary" href="/">
              Return to login
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
