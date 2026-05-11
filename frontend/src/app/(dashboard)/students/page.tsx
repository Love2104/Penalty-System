'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Search, Sparkles, X } from 'lucide-react';
import api from '@/lib/api';
import StudentInfoButton from '@/components/StudentInfoButton';
import RoleBadges from '@/components/RoleBadges';
import { StudentRole } from '@/lib/role-intelligence';

interface StudentRecord {
  roll: string;
  name: string;
  email: string | null;
  program: string | null;
  dept: string | null;
  hall: string | null;
  image_url: string | null;
  roles: StudentRole[];
  has_conflict: boolean;
  penalty_count: number;
}

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface FiltersResponse {
  halls: FilterOption[];
  programs: FilterOption[];
}

interface StudentSearchResponse {
  data: StudentRecord[];
  meta: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    return response?.data?.error || fallback;
  }

  return fallback;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [hall, setHall] = useState('');
  const [program, setProgram] = useState('');
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const [filters, setFilters] = useState<FiltersResponse>({ halls: [], programs: [] });

  useEffect(() => {
    let active = true;

    const loadFilters = async () => {
      try {
        const response = await api.get<FiltersResponse>('/students/filters');
        if (active) {
          setFilters(response.data);
        }
      } catch {
        if (active) {
          setError('Unable to load student filters.');
        }
      } finally {
        if (active) {
          setLoadingFilters(false);
        }
      }
    };

    void loadFilters();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<StudentSearchResponse>('/students/search', {
          params: {
            q: query,
            page,
            hall,
            program,
          },
        });

        if (active) {
          setStudents(response.data.data);
          setMeta(response.data.meta);
        }
      } catch (requestError) {
        if (active) {
          setError(getErrorMessage(requestError, 'Unable to search students.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [hall, page, program, query]);

  const activeFilters = useMemo(
    () => [query, hall, program].filter(Boolean).length,
    [hall, program, query],
  );

  const directoryIsEmpty =
    !loading &&
    !loadingFilters &&
    meta.total === 0 &&
    !query &&
    !hall &&
    !program &&
    filters.halls.length === 0 &&
    filters.programs.length === 0;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="panel p-6 sm:p-7">
          <p className="eyebrow">Student directory</p>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
            Search quickly, inspect role context, and review penalty history without jumping across screens.
          </h2>
          <p className="mt-3 max-w-3xl text-sm muted sm:text-base">
            This page is focused on finding a student fast. Search and filters stay at the top, and every row keeps the important review signals visible.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <div className="panel-soft p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Loaded filters</p>
                <p className="text-sm muted">
                  {loadingFilters
                    ? 'Loading filter lists...'
                    : `${filters.halls.length} halls and ${filters.programs.length} programs ready.`}
                </p>
              </div>
            </div>
          </div>

          <div className="panel-soft p-5">
            <p className="text-sm font-semibold">Directory size</p>
            <p className="mt-3 text-3xl font-bold">{meta.total.toLocaleString()}</p>
            <p className="mt-2 text-sm muted">Records matching the current search.</p>
          </div>

          <div className="panel-soft p-5">
            <p className="text-sm font-semibold">Active filters</p>
            <p className="mt-3 text-3xl font-bold">{activeFilters}</p>
            <p className="mt-2 text-sm muted">
              {activeFilters ? 'Refine further or clear filters to widen the search.' : 'No filters applied right now.'}
            </p>
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--foreground-soft)]" />
              <input
                className="field pl-11"
                onChange={(event) => {
                  setPage(1);
                  setQuery(event.target.value);
                }}
                placeholder="Search by name, roll number, or email"
                type="text"
                value={query}
              />
            </div>

            <select
              className="field"
              onChange={(event) => {
                setPage(1);
                setHall(event.target.value);
              }}
              value={hall}
            >
              <option value="">All halls</option>
              {filters.halls.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>

            <select
              className="field"
              onChange={(event) => {
                setPage(1);
                setProgram(event.target.value);
              }}
              value={program}
            >
              <option value="">All programs</option>
              {filters.programs.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>

            <button
              className="button-secondary"
              onClick={() => {
                setPage(1);
                setQuery('');
                setHall('');
                setProgram('');
              }}
              type="button"
            >
              Reset
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-[var(--line)] bg-white/55 px-3 py-1.5 dark:bg-white/5">
              Page {meta.page} of {meta.totalPages}
            </span>
            <span className="rounded-full border border-[var(--line)] bg-white/55 px-3 py-1.5 dark:bg-white/5">
              {meta.total.toLocaleString()} record{meta.total === 1 ? '' : 's'}
            </span>
            {query && (
              <span className="rounded-full border border-[var(--line)] bg-white/55 px-3 py-1.5 dark:bg-white/5">
                Query: {query}
              </span>
            )}
            {hall && (
              <span className="rounded-full border border-[var(--line)] bg-white/55 px-3 py-1.5 dark:bg-white/5">
                Hall: {hall}
              </span>
            )}
            {program && (
              <span className="rounded-full border border-[var(--line)] bg-white/55 px-3 py-1.5 dark:bg-white/5">
                Program: {program}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold">Directory results</p>
            <p className="text-sm muted">
              Review student details, role mappings, and repeat-offender flags from one list.
            </p>
          </div>
        </div>

        {error ? (
          <div className="px-6 py-10 text-center text-sm text-red-300">{error}</div>
        ) : loading ? (
          <div className="px-6 py-14 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-[color:var(--accent)]" />
            <p className="mt-3 text-sm muted">Searching records...</p>
          </div>
        ) : !students.length ? (
          <div className="px-6 py-14 text-center">
            <p className="text-lg font-semibold">
              {directoryIsEmpty ? 'No student records imported yet' : 'No matching students'}
            </p>
            <p className="mt-2 text-sm muted">
              {directoryIsEmpty
                ? 'The search is working, but the student directory database is still empty. Import the student dataset first, then search will start showing records here.'
                : 'Try broadening the search or clearing filters.'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--line)] bg-white/50 dark:bg-white/5">
                  <tr className="text-xs uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">
                    <th className="px-6 py-4 font-semibold">Student</th>
                    <th className="px-6 py-4 font-semibold">Roles</th>
                    <th className="px-6 py-4 font-semibold">Program</th>
                    <th className="px-6 py-4 font-semibold">Department</th>
                    <th className="px-6 py-4 font-semibold">Hall</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.roll}
                      className="border-b border-[var(--line)] align-top transition hover:bg-white/40 last:border-b-0 dark:hover:bg-white/5"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-start gap-4">
                          {student.image_url ? (
                            <button
                              className="h-12 w-12 overflow-hidden rounded-2xl border border-[var(--line)]"
                              onClick={() => setSelectedImage(student.image_url)}
                              type="button"
                            >
                              <img
                                alt={`${student.name} profile`}
                                className="h-full w-full object-cover"
                                src={student.image_url}
                              />
                            </button>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-white/55 text-sm font-semibold text-[color:var(--foreground-soft)] dark:bg-white/5">
                              {student.name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{student.name}</p>
                              {student.has_conflict && (
                                <span className="status-pill border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                  Conflict
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm muted">{student.roll}</p>
                            <p className="mt-1 text-sm muted">{student.email || 'No email available'}</p>
                            {student.penalty_count >= 2 && (
                              <p className="mt-2 text-xs font-semibold text-red-400">
                                Repeat offender - {student.penalty_count} penalties
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <RoleBadges maxVisible={2} roles={student.roles} />
                      </td>
                      <td className="px-6 py-5">{student.program || '-'}</td>
                      <td className="px-6 py-5">{student.dept || '-'}</td>
                      <td className="px-6 py-5">{student.hall || '-'}</td>
                      <td className="px-6 py-5 text-right">
                        <StudentInfoButton label="Inspect" roll={student.roll} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden">
              {students.map((student) => (
                <div key={student.roll} className="panel-soft p-4">
                  <div className="flex items-start gap-4">
                    {student.image_url ? (
                      <button
                        className="h-14 w-14 overflow-hidden rounded-2xl border border-[var(--line)]"
                        onClick={() => setSelectedImage(student.image_url)}
                        type="button"
                      >
                        <img alt={`${student.name} profile`} className="h-full w-full object-cover" src={student.image_url} />
                      </button>
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--line)] bg-white/55 text-lg font-semibold dark:bg-white/5">
                        {student.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{student.name}</p>
                        {student.has_conflict && (
                          <span className="status-pill border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            Conflict
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm muted">{student.roll}</p>
                      <p className="mt-1 text-sm muted">{student.email || 'No email available'}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <RoleBadges maxVisible={2} roles={student.roles} />
                    <div className="grid gap-2 text-sm muted sm:grid-cols-3">
                      <p>Program: {student.program || '-'}</p>
                      <p>Department: {student.dept || '-'}</p>
                      <p>Hall: {student.hall || '-'}</p>
                    </div>
                    {student.penalty_count >= 2 && (
                      <p className="text-xs font-semibold text-red-400">
                        Repeat offender - {student.penalty_count} penalties
                      </p>
                    )}
                    <StudentInfoButton label="Inspect student" roll={student.roll} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-4 sm:px-6">
          <p className="text-sm muted">Use the inspect button for full profile, role, and history details.</p>
          <div className="flex gap-2">
            <button
              className="button-secondary px-4 py-2.5"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Previous
            </button>
            <button
              className="button-secondary px-4 py-2.5"
              disabled={page === meta.totalPages}
              onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-[32px] border border-[var(--line)] bg-[color:var(--surface-elevated)] p-3"
              exit={{ opacity: 0, scale: 0.98 }}
              initial={{ opacity: 0, scale: 0.98 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="absolute right-5 top-5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-slate-950/60 text-white"
                onClick={() => setSelectedImage(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
              <img alt="Student profile" className="max-h-[84vh] rounded-[24px] object-contain" src={selectedImage} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
