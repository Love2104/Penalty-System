'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import api, { getApiBaseUrl } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import RoleBadges from '@/components/RoleBadges';
import StudentInfoButton from '@/components/StudentInfoButton';
import { StudentInfoResponse, StudentRole } from '@/lib/role-intelligence';

const initialFormData = {
  type: 'GBM',
  name: '',
  roll_no: '',
  email: '',
  clause: '',
  nature: 'Level 0',
  remarks: '',
  comment: '',
};

type RowFormState = typeof initialFormData;

interface StudentSearchResult {
  roll: string;
  name: string;
  email: string | null;
  program: string | null;
  dept: string | null;
  hall: string | null;
  roles: StudentRole[];
  has_conflict: boolean;
  penalty_count: number;
}

interface ClauseOption {
  id?: string;
  title: string;
  description: string;
  category: string;
}

interface PenaltyRow {
  id: string;
  type: string;
  name: string;
  roll_no: string;
  email: string;
  clause: string;
  nature: string;
  remarks: string;
  comment: string;
  student_roles?: StudentRole[];
  student_has_conflict?: boolean;
  student_penalty_count?: number;
}

interface SheetDetails {
  id: string;
  name: string;
  status: string;
  created_by: string;
  creator?: { email: string };
  spreadsheet?: { id: string; name: string; google_spreadsheet_url?: string | null };
  rows: PenaltyRow[];
}

interface StudentSearchResponse {
  data: StudentSearchResult[];
}

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

export default function TabDetailsPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [sheet, setSheet] = useState<SheetDetails | null>(null);
  const [clauses, setClauses] = useState<ClauseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showRowForm, setShowRowForm] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RowFormState>(initialFormData);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<StudentSearchResult[]>([]);
  const [selectedStudentContext, setSelectedStudentContext] = useState<StudentSearchResult | null>(null);
  const [selectedStudentInfo, setSelectedStudentInfo] = useState<StudentInfoResponse | null>(null);
  const [loadingStudentInfo, setLoadingStudentInfo] = useState(false);
  const [clauseQuery, setClauseQuery] = useState('');
  const [showClauseResults, setShowClauseResults] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [resendingRowId, setResendingRowId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadPage = async () => {
      try {
        const [sheetResponse, clausesResponse] = await Promise.all([
          api.get<SheetDetails>(`/sheets/tabs/${id}`),
          api.get<ClauseOption[]>('/sheets/clauses'),
        ]);

        if (active) {
          setSheet(sheetResponse.data);
          setClauses(clausesResponse.data);
        }
      } catch (error) {
        if (active) {
          setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to load this tab.') });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!showRowForm || studentQuery.trim().length < 3) {
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await api.get<StudentSearchResponse>('/students/search', {
          params: { q: studentQuery, limit: 5 },
        });

        if (active) {
          setStudentResults(response.data.data);
        }
      } catch {
        if (active) {
          setStudentResults([]);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [showRowForm, studentQuery]);

  const refreshSheet = async () => {
    const response = await api.get<SheetDetails>(`/sheets/tabs/${id}`);
    setSheet(response.data);
  };

  const resetRowForm = () => {
    setFormData(initialFormData);
    setStudentQuery('');
    setStudentResults([]);
    setSelectedStudentContext(null);
    setSelectedStudentInfo(null);
    setClauseQuery('');
    setShowClauseResults(false);
    setEditingRowId(null);
    setShowRowForm(false);
  };

  const fetchStudentInfo = async (roll: string) => {
    setLoadingStudentInfo(true);

    try {
      const response = await api.get<StudentInfoResponse>(`/roles/student/${roll}/full-info`);
      setSelectedStudentInfo(response.data);
    } catch {
      setSelectedStudentInfo(null);
    } finally {
      setLoadingStudentInfo(false);
    }
  };

  const selectStudent = async (student: StudentSearchResult) => {
    setFormData((current) => ({
      ...current,
      name: student.name,
      roll_no: student.roll,
      email: student.email || '',
    }));
    setSelectedStudentContext(student);
    setSelectedStudentInfo(null);
    setStudentQuery('');
    setStudentResults([]);
    await fetchStudentInfo(student.roll);
  };

  const openCreateRow = () => {
    setBanner(null);
    setFormData(initialFormData);
    setStudentQuery('');
    setStudentResults([]);
    setSelectedStudentContext(null);
    setSelectedStudentInfo(null);
    setClauseQuery('');
    setShowClauseResults(false);
    setEditingRowId(null);
    setShowRowForm(true);
  };

  const openEditRow = async (row: PenaltyRow) => {
    setBanner(null);
    setEditingRowId(row.id);
    setFormData({
      type: row.type,
      name: row.name,
      roll_no: row.roll_no,
      email: row.email,
      clause: row.clause,
      nature: row.nature,
      remarks: row.remarks,
      comment: row.comment || '',
    });
    setSelectedStudentContext({
      roll: row.roll_no,
      name: row.name,
      email: row.email,
      program: null,
      dept: null,
      hall: null,
      roles: row.student_roles || [],
      has_conflict: row.student_has_conflict || false,
      penalty_count: row.student_penalty_count || 0,
    });
    setSelectedStudentInfo(null);
    setClauseQuery(row.clause);
    setShowClauseResults(false);
    setShowRowForm(true);
    await fetchStudentInfo(row.roll_no);
  };

  const handleRowSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBanner(null);

    try {
      if (editingRowId) {
        await api.put(`/sheets/tabs/${id}/rows/${editingRowId}`, formData);
        setBanner({ type: 'success', text: 'Penalty record updated successfully.' });
      } else {
        await api.post(`/sheets/tabs/${id}/rows`, formData);
        setBanner({ type: 'success', text: 'Penalty record added successfully.' });
      }

      resetRowForm();
      await refreshSheet();
    } catch (error) {
      setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to save this record.') });
    }
  };

  const deleteRow = async (rowId: string) => {
    if (!window.confirm('Delete this penalty record?')) {
      return;
    }

    try {
      await api.delete(`/sheets/tabs/${id}/rows/${rowId}`);
      setBanner({ type: 'success', text: 'Penalty record deleted.' });
      await refreshSheet();
    } catch (error) {
      setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to delete this record.') });
    }
  };

  const changeStatus = async (status: string) => {
    try {
      const response = await api.post<{ message: string }>(`/sheets/tabs/${id}/status`, { status });
      setBanner({ type: 'success', text: response.data.message || `Tab status updated to ${status}.` });
      await refreshSheet();
    } catch (error) {
      setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to update the tab status.') });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setBanner(null);

    try {
      const response = await api.post<{ message: string }>(`/sheets/tabs/${id}/sync-google`);
      setBanner({ type: 'success', text: response.data.message || 'Tab synced successfully.' });
      await refreshSheet();
    } catch (error) {
      setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to sync to Google Sheets.') });
    } finally {
      setSyncing(false);
    }
  };

  const resendRowEmail = async (rowId: string) => {
    setResendingRowId(rowId);
    setBanner(null);

    try {
      const response = await api.post<{ message: string }>(`/sheets/tabs/${id}/rows/${rowId}/resend-email`);
      setBanner({ type: 'success', text: response.data.message || 'Penalty email resent successfully.' });
    } catch (error) {
      setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to resend the penalty email.') });
    } finally {
      setResendingRowId(null);
    }
  };

  const deleteSheet = async () => {
    if (!window.confirm('Delete this tab and all of its penalty rows?')) {
      return;
    }

    try {
      const destination = sheet?.spreadsheet?.id ? `/sheets/view?id=${sheet.spreadsheet.id}` : '/sheets';
      await api.delete(`/sheets/tabs/${id}`);
      router.push(destination);
    } catch (error) {
      setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to delete this tab.') });
    }
  };

  const downloadCsv = async () => {
    setDownloadingCsv(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/sheets/tabs/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error('Download failed.');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${sheet?.name || 'tab'}_penalties.csv`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setBanner({ type: 'error', text: getErrorMessage(error, 'Unable to download CSV.') });
    } finally {
      setDownloadingCsv(false);
    }
  };

  const selectedRoles = selectedStudentInfo?.roles || selectedStudentContext?.roles || [];
  const selectedPenaltyHistory = selectedStudentInfo?.penalty_history || [];
  const selectedPenaltyCount =
    selectedStudentInfo?.risk_indicator.total_penalties ?? selectedStudentContext?.penalty_count ?? 0;
  const selectedHasConflict =
    selectedStudentInfo?.has_conflict ?? selectedStudentContext?.has_conflict ?? false;
  const normalizedClauseQuery = clauseQuery.trim().toLowerCase();
  const filteredClauses = clauses
    .filter((clause) => {
      if (!normalizedClauseQuery) {
        return true;
      }

      const haystack = `${clause.title} ${clause.category} ${clause.description}`.toLowerCase();
      return normalizedClauseQuery.split(/\s+/).every((tokenPart) => haystack.includes(tokenPart));
    })
    .slice(0, 10);
  const selectedClause = clauses.find((clause) => clause.title === formData.clause) || null;

  if (loading) {
    return (
      <div className="panel px-6 py-14 text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-[color:var(--accent)]" />
        <p className="mt-3 text-sm muted">Loading tab editor...</p>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="panel px-6 py-14 text-center">
        <p className="text-xl font-semibold">{id ? 'Tab not found' : 'Tab ID is missing'}</p>
      </div>
    );
  }

  const canManageWorkflow = ['ADMIN', 'SUPERADMIN'].includes(user?.role || '');
  const isDraft = sheet.status === 'DRAFT';
  const isReview = sheet.status === 'UNDER_REVIEW';
  const isApproved = sheet.status === 'FINAL_APPROVED';
  const isSent = sheet.status === 'SENT';
  const parentHref = sheet.spreadsheet?.id ? `/sheets/view?id=${sheet.spreadsheet.id}` : '/sheets';

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-start gap-4">
          <button className="button-secondary px-4 py-2.5" onClick={() => router.push(parentHref)} type="button">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="min-w-0 flex-1">
            {sheet.spreadsheet && (
              <Link className="eyebrow" href={parentHref}>
                {sheet.spreadsheet.name}
              </Link>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">{sheet.name}</h2>
              <span className={`status-pill ${statusTone(sheet.status)}`}>{sheet.status}</span>
            </div>
            <p className="mt-3 text-base muted">
              Created by {sheet.creator?.email || sheet.created_by}. Use the workflow controls below to move this tab from draft through dispatch.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="button-secondary"
              disabled={syncing || !sheet.rows.length}
              onClick={handleSync}
              type="button"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync
            </button>
            <button
              className="button-secondary"
              disabled={downloadingCsv || !sheet.rows.length}
              onClick={downloadCsv}
              type="button"
            >
              {downloadingCsv ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              CSV
            </button>
            {isDraft && canManageWorkflow && (
              <button className="button-primary" onClick={() => changeStatus('UNDER_REVIEW')} type="button">
                <Send className="h-4 w-4" />
                Submit for review
              </button>
            )}
            {isReview && canManageWorkflow && (
              <>
                <button className="button-secondary border-red-500/25 text-red-400 hover:bg-red-500/10" onClick={() => changeStatus('DRAFT')} type="button">
                  <AlertTriangle className="h-4 w-4" />
                  Reject to draft
                </button>
                <button className="button-primary" onClick={() => changeStatus('FINAL_APPROVED')} type="button">
                  <CheckCircle2 className="h-4 w-4" />
                  Approve tab
                </button>
              </>
            )}
            {isApproved && canManageWorkflow && (
              <button className="button-primary" onClick={() => changeStatus('SENT')} type="button">
                <Send className="h-4 w-4" />
                Dispatch emails
              </button>
            )}
            <button className="button-secondary border-red-500/25 text-red-400 hover:bg-red-500/10" onClick={deleteSheet} type="button">
              <Trash2 className="h-4 w-4" />
              Delete tab
            </button>
          </div>
        </div>
      </section>

      {banner && (
        <div
          className={`rounded-3xl border px-4 py-3 text-sm ${
            banner.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/20 bg-red-500/10 text-red-300'
          }`}
        >
          {banner.text}
        </div>
      )}

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-5 sm:px-6">
          <div>
            <p className="text-lg font-semibold">Penalty records</p>
            <p className="mt-1 text-sm muted">
              {sheet.rows.length} record{sheet.rows.length === 1 ? '' : 's'} in this tab.
              {isSent
                ? ' This tab has already been dispatched; updates remain possible, and you can resend mail per student.'
                : ' You can keep editing before dispatch.'}
            </p>
          </div>
          {canManageWorkflow && (
            <button className="button-primary" onClick={openCreateRow} type="button">
              <Plus className="h-4 w-4" />
              Add record
            </button>
          )}
        </div>

        {showRowForm && canManageWorkflow && (
          <div className="border-b border-[var(--line)] px-5 py-5 sm:px-6">
            <form className="grid gap-4" onSubmit={handleRowSubmit}>
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
                <div className="relative">
                  <label className="mb-2 block text-sm font-semibold">Search student</label>
                  <Search className="pointer-events-none absolute left-4 top-[3.05rem] h-4 w-4 text-[color:var(--foreground-soft)]" />
                  <input
                    className="field pl-11"
                    onChange={(event) => {
                      setStudentQuery(event.target.value);
                      if (event.target.value.trim().length < 3) {
                        setStudentResults([]);
                      }
                    }}
                    placeholder="Type name or roll number"
                    type="text"
                    value={studentQuery}
                  />
                  {!!studentResults.length && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-[24px] border border-[var(--line)] bg-[color:var(--surface-strong)] shadow-xl">
                      {studentResults.map((student) => (
                        <button
                          key={student.roll}
                          className="block w-full border-b border-[var(--line)] px-4 py-3 text-left last:border-b-0 hover:bg-white/60 dark:hover:bg-white/5"
                          onClick={() => void selectStudent(student)}
                          type="button"
                        >
                          <p className="font-semibold">{student.name}</p>
                          <p className="mt-1 text-sm muted">{student.roll}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">Name</label>
                  <input className="field" readOnly type="text" value={formData.name} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">Roll number</label>
                  <input className="field" readOnly type="text" value={formData.roll_no} />
                </div>
              </div>

              {(selectedStudentContext || selectedStudentInfo) && (
                <div className="rounded-[28px] border border-[var(--line)] bg-white/55 p-5 dark:bg-white/5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">Student intelligence snapshot</p>
                      <div className="mt-3">
                        <RoleBadges roles={selectedRoles} />
                      </div>
                    </div>
                    <div className="text-right text-sm muted">
                      <p>Total penalties: {selectedPenaltyCount}</p>
                      {selectedPenaltyCount >= 2 && <p className="mt-1 text-red-400">Repeat offender flagged</p>}
                    </div>
                  </div>

                  {selectedHasConflict && (
                    <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                      Conflict detected: this student appears in multiple candidate groups for the same election year.
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white/65 p-4 dark:bg-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Recent penalty history</p>
                      {loadingStudentInfo && <Loader2 className="h-4 w-4 animate-spin text-[color:var(--accent)]" />}
                    </div>
                    {loadingStudentInfo ? (
                      <p className="mt-3 text-sm muted">Loading previous penalty history...</p>
                    ) : !selectedPenaltyHistory.length ? (
                      <p className="mt-3 text-sm muted">No previous penalties found for this student.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {selectedPenaltyHistory.slice(0, 3).map((penalty) => (
                          <div key={penalty.id} className="rounded-2xl border border-[var(--line)] bg-white/75 px-4 py-3 dark:bg-white/5">
                            <p className="text-sm font-semibold">{penalty.clause}</p>
                            <p className="mt-1 text-sm muted">{penalty.remarks}</p>
                            <p className="mt-2 text-xs text-mono-soft">
                              {penalty.nature} • {new Date(penalty.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold">Student email</label>
                  <input
                    className="field"
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    required
                    type="email"
                    value={formData.email}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold">Type</label>
                  <select
                    className="field"
                    onChange={(event) => setFormData({ ...formData, type: event.target.value })}
                    value={formData.type}
                  >
                    <option>GBM</option>
                    <option>Candidate</option>
                    <option>Office Bearer</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold">Nature</label>
                  <select
                    className="field"
                    onChange={(event) => setFormData({ ...formData, nature: event.target.value })}
                    value={formData.nature}
                  >
                    {['Level 0', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6'].map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <label className="mb-2 block text-sm font-semibold">Clause</label>
                  <input
                    className="field"
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setClauseQuery(nextValue);
                      setShowClauseResults(true);
                      if (formData.clause && nextValue !== formData.clause) {
                        setFormData({ ...formData, clause: '' });
                      }
                    }}
                    onFocus={() => setShowClauseResults(true)}
                    placeholder="Search clause or section"
                    required
                    type="text"
                    value={clauseQuery}
                  />
                  {showClauseResults && !!filteredClauses.length && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-[24px] border border-[var(--line)] bg-[color:var(--surface-strong)] shadow-xl">
                      {filteredClauses.map((clause, index) => (
                        <button
                          key={clause.id || `${clause.title}-${clause.category}-${index}`}
                          className="block w-full border-b border-[var(--line)] px-4 py-3 text-left last:border-b-0 hover:bg-white/60 dark:hover:bg-white/5"
                          onClick={() => {
                            setFormData({ ...formData, clause: clause.title });
                            setClauseQuery(clause.title);
                            setShowClauseResults(false);
                          }}
                          type="button"
                        >
                          <p className="font-semibold">{clause.title}</p>
                          <p className="mt-1 text-xs text-mono-soft">{clause.category}</p>
                          <p className="mt-1 text-sm muted">{clause.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedClause && (
                <div className="rounded-[28px] border border-[var(--line)] bg-white/55 p-5 dark:bg-white/5">
                  <p className="text-sm font-semibold">Selected clause</p>
                  <p className="mt-3 text-base font-semibold">{selectedClause.title}</p>
                  <p className="mt-2 text-sm muted">{selectedClause.description}</p>
                  <span className="status-pill mt-4 border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                    {selectedClause.category}
                  </span>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold">Remarks</label>
                  <input
                    className="field"
                    onChange={(event) => setFormData({ ...formData, remarks: event.target.value })}
                    placeholder="Official EC remark"
                    required
                    type="text"
                    value={formData.remarks}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold">Internal note</label>
                  <input
                    className="field"
                    onChange={(event) => setFormData({ ...formData, comment: event.target.value })}
                    placeholder="Internal EC note"
                    type="text"
                    value={formData.comment}
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button className="button-secondary" onClick={resetRowForm} type="button">
                  Cancel
                </button>
                <button className="button-primary" type="submit">
                  <Save className="h-4 w-4" />
                  {editingRowId ? 'Update record' : 'Save record'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="hidden overflow-x-auto xl:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-white/50 dark:bg-white/5">
              <tr className="text-xs uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">
                <th className="px-6 py-4 font-semibold">Student</th>
                <th className="px-6 py-4 font-semibold">Clause</th>
                <th className="px-6 py-4 font-semibold">Level</th>
                <th className="px-6 py-4 font-semibold">Remarks</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!sheet.rows.length ? (
                <tr>
                  <td className="px-6 py-14 text-center text-sm muted" colSpan={5}>
                    No penalty records yet. Use the Add record button to start.
                  </td>
                </tr>
              ) : (
                sheet.rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--line)] align-top last:border-b-0">
                    <td className="px-6 py-5">
                      <p className="font-semibold">{row.name}</p>
                      <p className="mt-1 text-sm muted">{row.roll_no} • {row.email}</p>
                      <div className="mt-3">
                        <RoleBadges maxVisible={2} roles={row.student_roles || []} />
                      </div>
                      {row.student_has_conflict && (
                        <p className="mt-2 text-xs font-semibold text-amber-400">Conflict detected across candidate groups</p>
                      )}
                      {(row.student_penalty_count || 0) >= 2 && (
                        <p className="mt-1 text-xs font-semibold text-red-400">
                          Repeat offender • {row.student_penalty_count} penalties
                        </p>
                      )}
                    </td>
                    <td className="max-w-[320px] px-6 py-5">
                      <p className="font-medium">{row.clause}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="status-pill border-[var(--line)] bg-white/55 dark:bg-white/5">{row.nature}</span>
                    </td>
                    <td className="px-6 py-5">
                      <p>{row.remarks}</p>
                      {row.comment && <p className="mt-2 text-sm muted">Note: {row.comment}</p>}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <StudentInfoButton label="Profile" roll={row.roll_no} />
                        {isSent && canManageWorkflow && (
                          <button
                            className="button-secondary px-3 py-2.5"
                            disabled={resendingRowId === row.id}
                            onClick={() => resendRowEmail(row.id)}
                            type="button"
                          >
                            {resendingRowId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </button>
                        )}
                        {canManageWorkflow && (
                          <>
                            <button className="button-secondary px-3 py-2.5" onClick={() => void openEditRow(row)} type="button">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              className="button-secondary border-red-500/25 px-3 py-2.5 text-red-400 hover:bg-red-500/10"
                              onClick={() => deleteRow(row.id)}
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 p-4 xl:hidden">
          {sheet.rows.map((row) => (
            <div key={row.id} className="rounded-[28px] border border-[var(--line)] bg-white/55 p-4 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{row.name}</p>
                  <p className="mt-1 text-sm muted">{row.roll_no} • {row.email}</p>
                </div>
                <span className="status-pill border-[var(--line)] bg-white/65 dark:bg-white/5">{row.nature}</span>
              </div>
              <div className="mt-3">
                <RoleBadges maxVisible={2} roles={row.student_roles || []} />
              </div>
              <p className="mt-4 text-sm font-semibold">{row.clause}</p>
              <p className="mt-2 text-sm muted">{row.remarks}</p>
              {row.comment && <p className="mt-2 text-sm muted">Note: {row.comment}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <StudentInfoButton label="Profile" roll={row.roll_no} />
                {isSent && canManageWorkflow && (
                  <button className="button-secondary px-4 py-2.5" onClick={() => resendRowEmail(row.id)} type="button">
                    {resendingRowId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Resend
                  </button>
                )}
                {canManageWorkflow && (
                  <>
                    <button className="button-secondary px-4 py-2.5" onClick={() => void openEditRow(row)} type="button">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      className="button-secondary border-red-500/25 px-4 py-2.5 text-red-400 hover:bg-red-500/10"
                      onClick={() => deleteRow(row.id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {!sheet.rows.length && (
            <div className="px-6 py-10 text-center text-sm muted">
              No penalty records yet. Use the Add record button to start.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
