'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowRight,
  Clock3,
  FileSpreadsheet,
  Layers3,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import api from '@/lib/api';

interface RecentTab {
  id: string;
  name: string;
  status: string;
  created_at: string;
  creator?: { email: string };
  spreadsheet?: { id: string; name: string };
}

interface DashboardStatsResponse {
  totalSpreadsheets: number;
  totalTabs: number;
  underReview: number;
  approved: number;
  totalStudentsPenalized: number;
  recentTabs: RecentTab[];
}

const metricCards = [
  {
    key: 'totalSpreadsheets',
    label: 'Linked spreadsheets',
    icon: FileSpreadsheet,
    accent: 'text-sky-500',
  },
  {
    key: 'totalTabs',
    label: 'Active tabs',
    icon: Layers3,
    accent: 'text-violet-500',
  },
  {
    key: 'underReview',
    label: 'Awaiting review',
    icon: Clock3,
    accent: 'text-amber-500',
  },
  {
    key: 'totalStudentsPenalized',
    label: 'Students impacted',
    icon: Users,
    accent: 'text-emerald-500',
  },
] as const;

const statusTone = (status: string) => {
  switch (status) {
    case 'UNDER_REVIEW':
      return 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'FINAL_APPROVED':
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case 'SENT':
      return 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300';
    default:
      return 'border-[var(--line)] bg-white/55 text-[color:var(--foreground-muted)] dark:bg-white/5';
  }
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const response = await api.get<DashboardStatsResponse>('/sheets/dashboard-stats');
        if (active) {
          setStats(response.data);
        }
      } catch {
        if (active) {
          setError('Unable to load the dashboard right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const underReviewTabs = useMemo(
    () => stats?.recentTabs.filter((tab) => tab.status === 'UNDER_REVIEW') ?? [],
    [stats],
  );

  if (loading) {
    return (
      <div className="panel flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
          <p className="mt-4 text-sm muted">Loading dashboard intelligence...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="panel px-6 py-14 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-[color:var(--accent)]" />
        <h2 className="mt-4 text-2xl font-semibold">Dashboard unavailable</h2>
        <p className="mt-2 muted">{error || 'No dashboard data was returned.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel p-6 sm:p-7">
          <p className="eyebrow">Operations snapshot</p>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
            {stats.underReview} tab{stats.underReview === 1 ? '' : 's'} are waiting for review, and {stats.approved} are already approved.
          </h2>
          <p className="mt-3 max-w-3xl text-sm muted sm:text-base">
            Use the dashboard for the current queue, jump to sheets for operational work, and open the student directory when you need more context before approving a case.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="button-primary" href="/sheets">
              Open sheet operations
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link className="button-secondary" href="/students">
              Open student directory
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="panel-soft p-5">
            <p className="text-sm font-semibold">Review queue</p>
            <p className="mt-3 text-3xl font-bold">{underReviewTabs.length}</p>
            <p className="mt-2 text-sm muted">Tabs that still need a decision.</p>
          </div>

          <div className="panel-soft p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Dispatch readiness</p>
                <p className="text-sm muted">
                  {stats.approved} approved tab{stats.approved === 1 ? '' : 's'} are ready for communication handling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ key, label, icon: Icon, accent }) => (
          <div key={key} className="panel p-5">
            <div className="flex items-center justify-between">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 ${accent} dark:bg-white/5`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-mono-soft text-xs uppercase tracking-[0.2em]">Live</span>
            </div>
            <p className="mt-5 text-3xl font-bold">{stats[key].toLocaleString()}</p>
            <p className="mt-2 text-sm muted">{label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Review queue</p>
              <h3 className="mt-2 text-2xl font-semibold">Tabs awaiting action</h3>
            </div>
            <span className="status-pill border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              {underReviewTabs.length} active
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {!underReviewTabs.length ? (
              <div className="panel-soft px-5 py-10 text-center text-sm muted">
                Nothing is waiting for review right now.
              </div>
            ) : (
              underReviewTabs.map((tab) => (
                <div
                  key={tab.id}
                  className="panel-soft flex flex-col gap-4 p-4 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-base font-semibold">{tab.name}</p>
                    <p className="mt-1 text-sm muted">
                      {tab.spreadsheet?.name || 'Unassigned spreadsheet'} - created by {tab.creator?.email || 'Unknown'}
                    </p>
                  </div>
                  <Link className="button-secondary" href={`/tabs/view?id=${tab.id}`}>
                    Open tab
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Activity feed</p>
              <h3 className="mt-2 text-2xl font-semibold">Recent changes</h3>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2 text-xs muted dark:bg-white/5">
              Latest {stats.recentTabs.length} update{stats.recentTabs.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {!stats.recentTabs.length ? (
              <div className="panel-soft px-5 py-10 text-center text-sm muted">
                No recent activity has been recorded yet.
              </div>
            ) : (
              stats.recentTabs.map((tab) => (
                <Link
                  key={tab.id}
                  className="panel-soft block p-4 transition hover:-translate-y-0.5"
                  href={`/tabs/view?id=${tab.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold">{tab.name}</p>
                      <p className="mt-1 text-sm muted">
                        {tab.spreadsheet?.name || 'No spreadsheet'} - {tab.creator?.email || 'Unknown'}
                      </p>
                    </div>
                    <span className={`status-pill ${statusTone(tab.status)}`}>{tab.status}</span>
                  </div>
                  <p className="mt-4 text-xs text-mono-soft">
                    {formatDistanceToNow(new Date(tab.created_at), { addSuffix: true })}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
