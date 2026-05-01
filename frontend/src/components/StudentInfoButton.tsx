'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Info, Loader2, ShieldAlert, User2, X } from 'lucide-react';
import api from '@/lib/api';
import { formatRiskTone, StudentInfoResponse } from '@/lib/role-intelligence';
import RoleBadges from './RoleBadges';

interface StudentInfoButtonProps {
  roll: string;
  buttonClassName?: string;
  label?: string;
}

const tabButtonClass = (isActive: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white text-black' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
  }`;

export default function StudentInfoButton({
  roll,
  buttonClassName,
  label = 'Info',
}: StudentInfoButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'roles' | 'history'>('profile');
  const [data, setData] = useState<StudentInfoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || data || loading) return;

    const fetchInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/roles/student/${roll}/full-info`);
        setData(response.data);
      } catch (requestError: any) {
        setError(requestError.response?.data?.error || 'Failed to load student intelligence panel.');
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [data, loading, open, roll]);

  const closeModal = () => {
    setOpen(false);
    setActiveTab('profile');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          buttonClassName ||
          'inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800'
        }
      >
        <Info className="h-4 w-4" />
        {label}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-zinc-800 bg-zinc-900/80 px-6 py-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Student Intelligence Panel</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">
                    {data?.profile.name || roll}
                  </h2>
                  <p className="text-sm text-zinc-400">{roll}</p>
                </div>
                <button
                  onClick={closeModal}
                  className="rounded-full border border-zinc-700 p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="border-b border-zinc-800 px-6 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button className={tabButtonClass(activeTab === 'profile')} onClick={() => setActiveTab('profile')}>
                    Profile
                  </button>
                  <button className={tabButtonClass(activeTab === 'roles')} onClick={() => setActiveTab('roles')}>
                    Roles
                  </button>
                  <button className={tabButtonClass(activeTab === 'history')} onClick={() => setActiveTab('history')}>
                    Penalty History
                  </button>
                  {data && (
                    <span className={`ml-auto inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${formatRiskTone(data.risk_indicator.level)}`}>
                      Risk: {data.risk_indicator.level} | {data.risk_indicator.total_penalties} penalties
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-[calc(90vh-12rem)] overflow-y-auto px-6 py-5">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                  </div>
                ) : error ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                    {error}
                  </div>
                ) : !data ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-10 text-center text-zinc-500">
                    No student details available.
                  </div>
                ) : (
                  <>
                    {activeTab === 'profile' && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                            <div className="mb-4 flex items-center gap-3">
                              <div className="rounded-xl border border-zinc-800 bg-black p-3 text-zinc-400">
                                <User2 className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-white">Basic Info</h3>
                                <p className="text-sm text-zinc-500">Core student profile details.</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Name</p>
                                <p className="mt-2 text-sm text-white">{data.profile.name || 'Not available'}</p>
                              </div>
                              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Roll</p>
                                <p className="mt-2 text-sm text-white">{data.profile.roll}</p>
                              </div>
                              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Program</p>
                                <p className="mt-2 text-sm text-white">{data.profile.program || 'Not available'}</p>
                              </div>
                              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Department</p>
                                <p className="mt-2 text-sm text-white">{data.profile.dept || 'Not available'}</p>
                              </div>
                              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Hall</p>
                                <p className="mt-2 text-sm text-white">{data.profile.hall || 'Not available'}</p>
                              </div>
                              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Email</p>
                                <p className="mt-2 break-all text-sm text-white">{data.profile.email || 'Not available'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                              <h3 className="text-lg font-semibold text-white">Risk Indicator</h3>
                              <div className={`mt-4 rounded-2xl border p-4 ${formatRiskTone(data.risk_indicator.level)}`}>
                                <p className="text-xs uppercase tracking-[0.2em]">Current Level</p>
                                <p className="mt-2 text-2xl font-bold">{data.risk_indicator.level}</p>
                                <p className="mt-2 text-sm">
                                  Total penalties: {data.risk_indicator.total_penalties}
                                </p>
                                <p className="mt-1 text-sm">
                                  {data.risk_indicator.repeat_offender ? 'Repeat offender flagged' : 'No repeat-offender flag'}
                                </p>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                              <h3 className="text-lg font-semibold text-white">Election Snapshot</h3>
                              <div className="mt-4">
                                <RoleBadges roles={data.roles} />
                              </div>
                              {data.has_conflict && (
                                <div className="mt-4 flex gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                  <p>This student is linked to multiple candidate groups in the same election year.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'roles' && (
                      <div className="space-y-4">
                        {data.has_conflict && (
                          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                            <div className="flex items-start gap-3 text-sm text-yellow-100">
                              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                              <div>
                                <p className="font-semibold">Conflict detected</p>
                                <p className="mt-1 text-yellow-200">
                                  The same student appears in multiple candidate groups. Review the role mapping before assigning penalties.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          {data.roles.length === 0 ? (
                            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-10 text-center text-zinc-500">
                              No election roles mapped for this student.
                            </div>
                          ) : (
                            data.roles.map((role, index) => (
                              <div key={`${role.role_type}-${role.candidate_roll}-${role.group_id}-${index}`} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                                <div className="flex flex-wrap items-center gap-3">
                                  <RoleBadges roles={[role]} />
                                  <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300">
                                    Election {role.election_year}
                                  </span>
                                </div>
                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Candidate</p>
                                    <p className="mt-2 text-sm text-white">{role.candidate_name}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Candidate Roll</p>
                                    <p className="mt-2 text-sm text-white">{role.candidate_roll}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Post</p>
                                    <p className="mt-2 text-sm text-white">{role.post}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === 'history' && (
                      <div className="space-y-3">
                        {data.penalty_history.length === 0 ? (
                          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-10 text-center text-zinc-500">
                            No penalty history found for this student.
                          </div>
                        ) : (
                          data.penalty_history.map((penalty) => (
                            <div key={penalty.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="rounded-full border border-zinc-700 bg-black/50 px-3 py-1 text-xs font-medium text-zinc-300">
                                  {penalty.nature}
                                </span>
                                <span className="text-xs text-zinc-500">
                                  {new Date(penalty.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <h3 className="mt-4 text-base font-semibold text-white">{penalty.clause}</h3>
                              <p className="mt-2 text-sm text-zinc-300">{penalty.remarks}</p>
                              <p className="mt-3 text-xs text-zinc-500">
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
    </>
  );
}
