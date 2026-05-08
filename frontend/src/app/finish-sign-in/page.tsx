'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Firebase Email Link sign-in is no longer used.
 * This page simply redirects to the home (OTP login) page.
 */
export default function FinishSignInPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section className="panel w-full max-w-xl p-6 sm:p-8 text-center">
        <h1 className="font-display text-2xl font-bold">Redirecting…</h1>
        <p className="mt-3 text-sm muted">
          Firebase Email Link sign-in has been replaced by Email OTP. Redirecting to the login page.
        </p>
      </section>
    </main>
  );
}
