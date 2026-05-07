'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, ShieldAlert } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/store/useAuthStore';

const pageCopy: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Overview',
    subtitle: 'Track live sheets, student risk patterns, and current review load.',
  },
  '/students': {
    title: 'Student Intelligence',
    subtitle: 'Search students, inspect election roles, and review prior penalties quickly.',
  },
  '/sheets': {
    title: 'Sheet Operations',
    subtitle: 'Link Google Sheets, sync tabs, and manage production dispatch workflows.',
  },
  '/admin': {
    title: 'Administration',
    subtitle: 'Control access and maintain the election role intelligence dataset.',
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, hasHydrated } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!token || !user) {
      router.replace('/');
    }
  }, [hasHydrated, router, token, user]);

  const header = useMemo(() => {
    const matchedEntry = Object.entries(pageCopy).find(([route]) => pathname.startsWith(route));
    return matchedEntry?.[1] ?? pageCopy['/dashboard'];
  }, [pathname]);

  if (!hasHydrated || !token || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="panel flex max-w-sm flex-col items-center gap-4 px-8 py-10 text-center">
          <ShieldAlert className="h-10 w-10 text-[color:var(--accent)]" />
          <div>
            <p className="page-title text-2xl">Preparing workspace</p>
            <p className="mt-2 muted">Restoring your secure session and loading the control room.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[288px_minmax(0,1fr)]">
      <Sidebar onClose={() => setSidebarOpen(false)} open={sidebarOpen} />

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color:var(--surface-elevated)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1480px] items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] lg:hidden"
              onClick={() => setSidebarOpen(true)}
              type="button"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="eyebrow">Workspace</p>
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold">{header.title}</h1>
                  <p className="text-sm muted">{header.subtitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <span className="status-pill border-[var(--line)] bg-white/70 text-[color:var(--foreground)] dark:bg-white/5">
                    {user.role}
                  </span>
                  <div className="rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm muted dark:bg-white/5">
                    {user.email}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
