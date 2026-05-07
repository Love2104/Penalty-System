'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, History, Info, Loader2, ShieldAlert, UserRound, X } from 'lucide-react';
import api from '@/lib/api';
import { formatRiskTone, StudentInfoResponse } from '@/lib/role-intelligence';
import RoleBadges from '@/components/RoleBadges';

interface StudentInfoButtonProps {
  roll: string;
  buttonClassName?: string;
  label?: string;
}

const tabClassName = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-semibold transition ${
    active
      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
      : 'text-[color:var(--foreground-muted)] hover:bg-white/60 hover:text-[color:var(--foreground)] dark:hover:bg-white/10 dark:hover:text-white'
  }`;

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    return response?.data?.error || 'Failed to load student intelligence panel.';
  }

  return 'Failed to load student intelligence panel.';
};

export default function StudentInfoButton({
  roll,
  buttonClassName,
  label = 'Open profile',
}: StudentInfoButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentInfoResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'roles' | 'history'>('profile');

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || student || loading) {
      return;
    }

    const loadStudent = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<StudentInfoResponse>(`/roles/student/${roll}/full-info`);
        setStudent(response.data);
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setLoading(false);
      }
    };

    void loadStudent();
  }, [loading, open, roll, student]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setActiveTab('profile');
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setActiveTab('profile');
  };

  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-md sm:p-6"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="panel flex h-[min(860px,calc(100vh-2rem))] w-[min(1040px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[32px]"
            exit={{ opacity: 0, scale: 0.98, y: 16 }}
            initial={{ opacity: 0, scale: 0.98, y: 16 }}
            onClick={(event) => event.stopPropagation()}
            transition={{ duration: 0.18 }}
          >
            <div className="border-b border-[var(--line)] bg-[color:var(--surface-elevated)] px-5 py-5 sm:px-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="eyebrow">Student Intelligence</p>
                  <h2 className="mt-2 truncate font-display text-2xl font-bold sm:text-3xl">
                    {student?.profile.name || roll}
                  </h2>
                  <p className="mt-1 text-sm muted">{roll}</p>
                </div>

                <div className="flex items-center gap-3">
                  {student && (
                    <span className={`status-pill ${formatRiskTone(student.risk_indicator.level)}`}>
                      Risk {student.risk_indicator.level} - {student.risk_indicator.total_penalties} penalties
                    </span>
                  )}
                  <button
                    aria-label="Close student panel"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-white/60 dark:bg-white/5"
                    onClick={close}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button className={tabClassName(activeTab === 'profile')} onClick={() => setActiveTab('profile')} type="button">
                  Profile
                </button>
                <button className={tabClassName(activeTab === 'roles')} onClick={() => setActiveTab('roles')} type="button">
                  Roles
                </button>
                <button className={tabClassName(activeTab === 'history')} onClick={() => setActiveTab('history')} type="button">
                  Penalty history
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-7 w-7 animate-spin text-[color:var(--accent)]" />
                </div>
              ) : error ? (
                <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                  {error}
                </div>
              ) : !student ? (
                <div className="panel-soft px-5 py-10 text-center text-sm muted">
                  No student data is available for this record.
                </div>
              ) : (
                <>
                  {activeTab === 'profile' && (
                    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                      <section className="panel-soft p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
                            <UserRound className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Profile overview</h3>
                            <p className="text-sm muted">Basic student data currently stored in the portal.</p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          {[
                            ['Name', student.profile.name || 'Not available'],
                            ['Roll', student.profile.roll],
                            ['Program', student.profile.program || 'Not available'],
                            ['Department', student.profile.dept || 'Not available'],
                            ['Hall', student.profile.hall || 'Not available'],
                            ['Email', student.profile.email || 'Not available'],
                          ].map(([labelText, value]) => (
                            <div key={labelText} className="rounded-2xl border border-[var(--line)] bg-white/55 p-4 dark:bg-white/5">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground-soft)]">{labelText}</p>
                              <p className="mt-2 break-words text-sm">{value}</p>
                            </div>
                          ))}
                        </div>
                      </section>

                      <div className="space-y-4">
                        <section className="panel-soft p-5">
                          <h3 className="text-lg font-semibold">Risk indicator</h3>
                          <div className={`mt-4 rounded-3xl border p-4 ${formatRiskTone(student.risk_indicator.level)}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em]">Current posture</p>
                            <p className="mt-2 text-2xl font-bold">{student.risk_indicator.level}</p>
                            <p className="mt-2 text-sm">
                              Total penalties: {student.risk_indicator.total_penalties}
                            </p>
                            <p className="mt-1 text-sm">
                              {student.risk_indicator.repeat_offender ? 'Repeat-offender flag is active' : 'No repeat-offender flag right now'}
                            </p>
                          </div>
                        </section>

                        <section className="panel-soft p-5">
                          <h3 className="text-lg font-semibold">Election snapshot</h3>
                          <div className="mt-4">
                            <RoleBadges roles={student.roles} />
                          </div>
                          {student.has_conflict && (
                            <div className="mt-4 flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              <p>This student appears in multiple candidate groups for the same election year.</p>
                            </div>
                          )}
                        </section>
                      </div>
                    </div>
                  )}

                  {activeTab === 'roles' && (
                    <div className="space-y-4">
                      {student.has_conflict && (
                        <div className="rounded-3xl border border-amber-500/25 bg-amber-500/10 p-5">
                          <div className="flex gap-3 text-sm text-amber-800 dark:text-amber-200">
                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                              <p className="font-semibold">Conflict detected</p>
                              <p className="mt-1">
                                Review this role mapping before using it in a penalty decision.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {!student.roles.length ? (
                        <div className="panel-soft px-5 py-10 text-center text-sm muted">
                          No election roles are mapped for this student.
                        </div>
                      ) : (
                        student.roles.map((role, index) => (
                          <div
                            key={`${role.role_type}-${role.candidate_roll}-${role.group_id}-${role.election_year}-${index}`}
                            className="panel-soft p-5"
                          >
                            <div className="flex flex-wrap items-center gap-3">
                              <RoleBadges roles={[role]} />
                              <span className="status-pill border-[var(--line)] bg-white/55 text-[color:var(--foreground-muted)] dark:bg-white/5">
                                Election {role.election_year}
                              </span>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground-soft)]">Candidate</p>
                                <p className="mt-2 text-sm">{role.candidate_name}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground-soft)]">Candidate roll</p>
                                <p className="mt-2 text-sm">{role.candidate_roll}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground-soft)]">Post</p>
                                <p className="mt-2 text-sm">{role.post}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className="space-y-4">
                      {!student.penalty_history.length ? (
                        <div className="panel-soft px-5 py-10 text-center text-sm muted">
                          No penalty history was found for this student.
                        </div>
                      ) : (
                        student.penalty_history.map((penalty) => (
                          <div key={penalty.id} className="panel-soft p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <span className="status-pill border-[var(--line)] bg-white/55 text-[color:var(--foreground)] dark:bg-white/5">
                                <History className="h-3.5 w-3.5" />
                                {penalty.nature}
                              </span>
                              <span className="text-xs text-mono-soft">
                                {new Date(penalty.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <h3 className="mt-4 text-base font-semibold">{penalty.clause}</h3>
                            <p className="mt-2 text-sm muted">{penalty.remarks}</p>
                            <p className="mt-3 text-xs text-mono-soft">
                              Sheet: {penalty.sheet_name || penalty.sheet_id}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        className={
          buttonClassName ||
          'button-secondary px-4 py-2.5 text-xs sm:text-sm'
        }
        onClick={() => setOpen(true)}
        type="button"
      >
        <Info className="h-4 w-4" />
        {label}
      </button>

      {portalTarget ? createPortal(modal, portalTarget) : null}
    </>
  );
}
