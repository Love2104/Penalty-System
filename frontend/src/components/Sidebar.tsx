'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  MenuSquare,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { ThemeToggle } from '@/components/ThemeToggle';

const primaryLinks = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/sheets', label: 'Sheets', icon: FileSpreadsheet },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const links = user?.role === 'SUPERADMIN'
    ? [...primaryLinks, { href: '/admin', label: 'Admin', icon: Settings2 }]
    : primaryLinks;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.button
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            type="button"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[312px] max-w-[88vw] flex-col border-r border-[var(--line)] bg-[color:var(--surface-elevated)] p-5 shadow-2xl backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-10 lg:h-screen lg:w-[288px] lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="eyebrow">Election Commission</p>
              <h1 className="mt-1 font-display text-lg font-bold">Penalty Control</h1>
              <p className="mt-1 text-sm muted">Student and sheet workflow</p>
            </div>
          </div>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] lg:hidden"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="panel-soft mt-6 space-y-3 p-4">
          <div>
            <p className="text-sm font-semibold">{user?.email ?? 'No user loaded'}</p>
            <p className="mt-1 text-sm muted">{user?.role ?? 'Signed out'}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2 text-xs muted dark:bg-white/5">
            Use the directory for student context, then jump to sheets for operational work.
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">
            Workspace
          </p>
        </div>

        <nav className="mt-3 flex-1 space-y-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);

            return (
              <Link
                key={href}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? 'bg-slate-950 text-white shadow-lg dark:bg-white dark:text-slate-950'
                    : 'text-[color:var(--foreground-muted)] hover:bg-white/70 hover:text-[color:var(--foreground)] dark:hover:bg-white/10 dark:hover:text-white'
                }`}
                href={href}
                onClick={onClose}
              >
                <span className="inline-flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
                {active && <MenuSquare className="h-4 w-4" />}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-4 border-t border-[var(--line)] pt-5">
          <div className="flex justify-center lg:justify-start">
            <ThemeToggle />
          </div>
          <button
            className="button-secondary w-full justify-between"
            onClick={handleLogout}
            type="button"
          >
            Sign out
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
