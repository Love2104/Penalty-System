'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
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
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import RoleBadges from '@/components/RoleBadges';
import StudentInfoButton from '@/components/StudentInfoButton';
import { StudentRole } from '@/lib/role-intelligence';

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

export default function TabDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const [sheet, setSheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clauses, setClauses] = useState<any[]>([]);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<StudentSearchResult[]>([]);
  const [formData, setFormData] = useState(initialFormData);
  const [selectedStudentContext, setSelectedStudentContext] = useState<StudentSearchResult | null>(null);
  const [showRowForm, setShowRowForm] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [resendingRowId, setResendingRowId] = useState<string | null>(null);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSheet = async () => {
    try {
      const res = await api.get(`/sheets/tabs/${id}`);
      setSheet(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClauses = async () => {
    try {
      const res = await api.get('/sheets/clauses');
      setClauses(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    setLoading(true);
    setSheet(null);
    setBanner(null);
    setFormData(initialFormData);
    setShowRowForm(false);
    setEditingRowId(null);
    setStudentQuery('');
    setStudentResults([]);
    setSelectedStudentContext(null);
    fetchSheet();
    fetchClauses();
  }, [id]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (studentQuery.length > 2 && showRowForm) {
        try {
          const res = await api.get('/students/search', {
            params: { q: studentQuery, limit: 5 },
          });
          setStudentResults(res.data.data);
        } catch (error) {
          console.error(error);
        }
      } else {
        setStudentResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [studentQuery, showRowForm]);

  const resetRowForm = () => {
    setFormData(initialFormData);
    setStudentQuery('');
    setStudentResults([]);
    setSelectedStudentContext(null);
    setEditingRowId(null);
    setShowRowForm(false);
  };

  const selectStudent = (student: StudentSearchResult) => {
    setFormData((prev) => ({
      ...prev,
      name: student.name,
      roll_no: student.roll,
      email: student.email || '',
    }));
    setStudentQuery('');
    setStudentResults([]);
    setSelectedStudentContext(student);
  };

  const openCreateRow = () => {
    setBanner(null);
    setFormData(initialFormData);
    setSelectedStudentContext(null);
    setEditingRowId(null);
    setShowRowForm(true);
  };

  const openEditRow = (row: any) => {
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
    setShowRowForm(true);
  };

  const handleRowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRowId) {
        await api.put(`/sheets/tabs/${id}/rows/${editingRowId}`, formData);
        setBanner({ type: 'success', text: 'Record updated. Sync this tab to Google, then resend mail only to affected students if needed.' });
      } else {
        await api.post(`/sheets/tabs/${id}/rows`, formData);
        setBanner({ type: 'success', text: 'Penalty record added. Sync this tab to Google, then resend mail only to affected students if needed.' });
      }
      resetRowForm();
      await fetchSheet();
    } catch (error: any) {
      setBanner({ type: 'error', text: error.response?.data?.error || 'Failed to save row' });
    }
  };

  const deleteRow = async (rowId: string) => {
    if (!confirm('Are you sure you want to delete this penalty record?')) return;
    try {
      await api.delete(`/sheets/tabs/${id}/rows/${rowId}`);
      setBanner({ type: 'success', text: 'Record deleted.' });
      await fetchSheet();
    } catch (error: any) {
      setBanner({ type: 'error', text: error.response?.data?.error || 'Failed to delete row' });
    }
  };

  const handleSyncToGoogle = async () => {
    setSyncing(true);
    setBanner(null);
    try {
      const res = await api.post(`/sheets/tabs/${id}/sync-google`);
      setBanner({ type: 'success', text: res.data.message || 'Synced to Google Sheets!' });
    } catch (error: any) {
      setBanner({ type: 'error', text: error.response?.data?.error || 'Sync failed.' });
    } finally {
      setSyncing(false);
    }
  };

  const resendRowEmail = async (rowId: string) => {
    setResendingRowId(rowId);
    setBanner(null);
    try {
      const res = await api.post(`/sheets/tabs/${id}/rows/${rowId}/resend-email`);
      setBanner({ type: 'success', text: res.data.message || 'Penalty email resent successfully.' });
    } catch (error: any) {
      setBanner({ type: 'error', text: error.response?.data?.error || 'Failed to resend penalty email.' });
    } finally {
      setResendingRowId(null);
    }
  };

  const handleDeleteSheet = async () => {
    if (!confirm('Are you sure you want to permanently delete this tab and all its records?')) return;
    try {
      const destination = sheet?.spreadsheet?.id ? `/sheets/${sheet.spreadsheet.id}` : '/sheets';
      await api.delete(`/sheets/tabs/${id}`);
      router.push(destination);
    } catch (error: any) {
      setBanner({ type: 'error', text: error.response?.data?.error || 'Failed to delete tab' });
    }
  };

  const changeStatus = async (newStatus: string) => {
    try {
      const res = await api.post(`/sheets/tabs/${id}/status`, { status: newStatus });
      setBanner({ type: 'success', text: res.data.message || `Tab status updated to ${newStatus}.` });
      fetchSheet();
    } catch (error: any) {
      setBanner({ type: 'error', text: error.response?.data?.error || 'Failed to change status' });
    }
  };

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/sheets/tabs/${id}/download`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${sheet?.name || 'tab'}_penalties.csv`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error: any) {
      setBanner({ type: 'error', text: error.message || 'Failed to download CSV' });
    } finally {
      setDownloadingCsv(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!sheet) {
    return <div className="py-20 text-center text-white">Tab not found</div>;
  }

  const canManageWorkflow = ['ADMIN', 'SUPERADMIN'].includes(user?.role || '');
  const isDraft = sheet.status === 'DRAFT';
  const isReview = sheet.status === 'UNDER_REVIEW';
  const isApproved = sheet.status === 'FINAL_APPROVED';
  const isSent = sheet.status === 'SENT';
  const canResendPersonal = isSent && canManageWorkflow;
  const canEdit = canManageWorkflow;
  const parentHref = sheet.spreadsheet?.id ? `/sheets/${sheet.spreadsheet.id}` : '/sheets';

  return (
    <div className="space-y-6">
      <div className="mb-8 flex flex-wrap items-start gap-4">
        <button
          onClick={() => router.push(parentHref)}
          className="mt-1 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          {sheet.spreadsheet && (
            <Link href={parentHref} className="mb-2 inline-flex text-sm text-zinc-500 transition-colors hover:text-white">
              {sheet.spreadsheet.name}
            </Link>
          )}
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight text-white">
            {sheet.name}
            <span className={`rounded-full border px-3 py-1 text-sm font-medium ${
              isDraft ? 'border-zinc-700 bg-zinc-800 text-zinc-300' :
              isReview ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' :
              isApproved ? 'border-green-500/30 bg-green-500/10 text-green-400' :
              'border-blue-500/30 bg-blue-500/10 text-blue-400'
            }`}>
              {sheet.status}
            </span>
          </h1>
          <p className="text-zinc-400">Created by {sheet.creator?.email || sheet.created_by}</p>
        </div>

        <div className="ml-auto flex flex-wrap gap-3">
          <button
            onClick={handleSyncToGoogle}
            disabled={syncing || sheet.rows.length === 0}
            className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2.5 font-medium text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync to Google
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={downloadingCsv || sheet.rows.length === 0}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {downloadingCsv ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download CSV
          </button>

          {isDraft && canManageWorkflow && (
            <button
              onClick={() => changeStatus('UNDER_REVIEW')}
              className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 font-semibold text-black transition-colors hover:bg-yellow-400"
            >
              <Send className="h-4 w-4" /> Submit for Review
            </button>
          )}
          {isReview && canManageWorkflow && (
            <>
              <button
                onClick={() => changeStatus('DRAFT')}
                className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 font-semibold text-white transition-colors hover:bg-red-600"
              >
                <AlertTriangle className="h-4 w-4" /> Reject to Draft
              </button>
              <button
                onClick={() => changeStatus('FINAL_APPROVED')}
                className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 font-semibold text-black transition-colors hover:bg-green-400"
              >
                <CheckCircle className="h-4 w-4" /> Approve Tab
              </button>
            </>
          )}
          {isApproved && canManageWorkflow && (
            <button
              onClick={() => changeStatus('SENT')}
              className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-blue-600"
            >
              <Send className="h-4 w-4" /> Dispatch Emails
            </button>
          )}
          <button
            onClick={handleDeleteSheet}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2.5 font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" /> Delete Tab
          </button>
        </div>
      </div>

      {banner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg border p-3 text-center text-sm ${
            banner.type === 'success'
              ? 'border-green-500/20 bg-green-500/10 text-green-400'
              : 'border-destructive/20 bg-destructive/10 text-red-400'
          }`}
        >
          {banner.text}
        </motion.div>
      )}

      <div className="glass-card overflow-hidden border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-800 bg-black/50 p-6">
          <div>
            <h2 className="text-xl font-bold text-white">Penalty Records ({sheet.rows.length})</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {canEdit
                ? isSent
                  ? 'This tab has already been dispatched. You can still add, edit, delete, sync, and resend mail only to affected students.'
                  : 'You can add, edit, or delete penalty records at any stage. Sync to Google whenever you are ready.'
                : 'This tab is read-only for your account.'}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={openCreateRow}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
            >
              <Plus className="h-4 w-4" /> Add Record
            </button>
          )}
        </div>

        {showRowForm && canEdit && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            className="border-b border-zinc-800 bg-zinc-900 p-6"
          >
            <form onSubmit={handleRowSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:col-span-3">
                <div className="relative">
                  <label className="mb-1 block text-xs font-medium text-zinc-400">Search Student</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={studentQuery}
                      onChange={(e) => setStudentQuery(e.target.value)}
                      placeholder="Type name or roll..."
                      className="w-full rounded-lg border border-zinc-700 bg-black/50 py-2 pl-9 pr-3 text-sm text-white focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  {studentResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                      {studentResults.map((student) => (
                        <div
                          key={student.roll}
                          onClick={() => selectStudent(student)}
                          className="cursor-pointer px-4 py-3 text-sm text-white hover:bg-zinc-800"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{student.name}</span>
                            <span className="text-zinc-500">({student.roll})</span>
                          </div>
                          <div className="mt-2">
                            <RoleBadges roles={student.roles} maxVisible={2} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">Name</label>
                  <input
                    readOnly
                    value={formData.name}
                    className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white opacity-70"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">Roll No</label>
                  <input
                    readOnly
                    value={formData.roll_no}
                    className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white opacity-70"
                    required
                  />
                </div>
              </div>

              {selectedStudentContext && (
                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 lg:col-span-3">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Election Role Intelligence</p>
                      <div className="mt-3">
                        <RoleBadges roles={selectedStudentContext.roles} />
                      </div>
                    </div>
                    <div className="text-right text-sm text-zinc-400">
                      <p>Total penalties: {selectedStudentContext.penalty_count}</p>
                      {selectedStudentContext.penalty_count >= 2 && <p className="mt-1 text-red-300">Repeat offender flagged</p>}
                    </div>
                  </div>
                  {selectedStudentContext.has_conflict && (
                    <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
                      Conflict detected: this student appears in multiple candidate groups for the same election year.
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Student Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student@example.com"
                  className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary/50"
                >
                  <option>GBM</option>
                  <option>Candidate</option>
                  <option>Office Bearer</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Clause</label>
                <select
                  required
                  value={formData.clause}
                  onChange={(e) => setFormData({ ...formData, clause: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary/50"
                >
                  <option value="">Select Clause...</option>
                  {clauses.map((clause) => (
                    <option key={clause.id} value={clause.title}>
                      {clause.title}
                    </option>
                  ))}
                  <option value="Custom">Custom / Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Nature (Level)</label>
                <select
                  value={formData.nature}
                  onChange={(e) => setFormData({ ...formData, nature: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary/50"
                >
                  <option>Level 0</option>
                  <option>Level 1</option>
                  <option>Level 2</option>
                  <option>Level 3</option>
                  <option>Level 4</option>
                  <option>Level 5</option>
                  <option>Level 6</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">Remarks (Official)</label>
                  <input
                    required
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="E.g., Warning Issued"
                    className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">Comment (Internal EC note)</label>
                  <input
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    placeholder="Internal note..."
                    className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="mt-2 flex justify-end gap-3 lg:col-span-3">
                <button
                  type="button"
                  onClick={resetRowForm}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
                >
                  <Save className="h-4 w-4" /> {editingRowId ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-black text-xs uppercase text-zinc-400">
              <tr>
                <th className="px-4 py-4 font-medium">Type</th>
                <th className="px-4 py-4 font-medium">Student</th>
                <th className="px-4 py-4 font-medium">Clause</th>
                <th className="px-4 py-4 font-medium">Level</th>
                <th className="px-4 py-4 font-medium">Remarks</th>
                <th className="px-4 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-black/30">
              {sheet.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    No penalty records yet. Click "Add Record" to get started.
                  </td>
                </tr>
              ) : (
                sheet.rows.map((row: any) => (
                  <tr key={row.id} className="group transition-colors hover:bg-zinc-900/50">
                    <td className="px-4 py-3 text-zinc-300">{row.type}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{row.name}</p>
                      <p className="text-xs text-zinc-500">{row.roll_no} | {row.email}</p>
                      <div className="mt-2">
                        <RoleBadges roles={row.student_roles || []} maxVisible={2} />
                      </div>
                      {row.student_has_conflict && (
                        <p className="mt-2 text-xs text-yellow-300">Conflict detected across candidate groups</p>
                      )}
                      {row.student_penalty_count >= 2 && (
                        <p className="mt-1 text-xs text-red-300">Repeat offender | {row.student_penalty_count} penalties</p>
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-zinc-300" title={row.clause}>{row.clause}</td>
                    <td className="px-4 py-3">
                      <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-300">{row.nature}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-zinc-300">{row.remarks}</p>
                      {row.comment && <p className="mt-1 text-xs italic text-zinc-600">Note: {row.comment}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <StudentInfoButton
                          roll={row.roll_no}
                          buttonClassName="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
                        />
                        {canResendPersonal && (
                          <button
                            onClick={() => resendRowEmail(row.id)}
                            disabled={resendingRowId === row.id}
                            className="rounded-lg border border-blue-500/30 p-2 text-blue-300 hover:bg-blue-500/10 disabled:opacity-50"
                            title="Resend mail to this student"
                          >
                            {resendingRowId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </button>
                        )}
                        {canEdit && (
                          <>
                            <button onClick={() => openEditRow(row)} className="rounded-lg border border-zinc-700 p-2 text-zinc-300 hover:bg-zinc-800" title="Edit">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => deleteRow(row.id)} className="rounded-lg border border-red-500/30 p-2 text-red-300 hover:bg-red-500/10" title="Delete">
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
      </div>
    </div>
  );
}
