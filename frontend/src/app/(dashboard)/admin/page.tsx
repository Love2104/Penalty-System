'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Loader2, ShieldCheck, UploadCloud, Users2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

interface UserRecord {
  id: string;
  email: string;
  role: string;
  is_verified: boolean;
  created_at: string;
}

interface UploadSummary {
  election_year: number;
  groups_processed: number;
  mappings_created: number;
  conflicts_detected: number;
  conflicts: Array<{
    student_roll: string;
    conflicts: unknown[];
  }>;
  message?: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    return response?.data?.error || fallback;
  }

  return fallback;
};

export default function AdminPage() {
  const { user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [roleFile, setRoleFile] = useState<File | null>(null);
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [uploadingRoles, setUploadingRoles] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);

  useEffect(() => {
    if (user?.role !== 'SUPERADMIN') {
      return;
    }

    let active = true;

    const loadUsers = async () => {
      try {
        const response = await api.get<UserRecord[]>('/auth/users');
        if (active) {
          setUsers(response.data);
        }
      } catch (error) {
        if (active) {
          setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to load current admins.') });
        }
      } finally {
        if (active) {
          setFetchingUsers(false);
        }
      }
    };

    void loadUsers();

    return () => {
      active = false;
    };
  }, [user?.role]);

  if (user?.role !== 'SUPERADMIN') {
    return (
      <div className="panel mx-auto max-w-2xl px-6 py-14 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-[color:var(--accent)]" />
        <h2 className="mt-4 text-2xl font-semibold">Superadmin access required</h2>
        <p className="mt-2 text-sm muted">Only the superadmin account can view or change administration settings.</p>
      </div>
    );
  }

  const refreshUsers = async () => {
    const response = await api.get<UserRecord[]>('/auth/users');
    setUsers(response.data);
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.post('/auth/register', { email, role, password });
      setMessage({ type: 'success', text: 'Admin registered successfully.' });
      setEmail('');
      setPassword('');
      await refreshUsers();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to register this user.') });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roleFile) {
      setMessage({ type: 'error', text: 'Select a JSON file before uploading role intelligence data.' });
      return;
    }

    setUploadingRoles(true);
    setMessage(null);
    setUploadSummary(null);

    try {
      const formData = new FormData();
      formData.append('file', roleFile);
      formData.append('election_year', String(uploadYear));
      formData.append('replace_existing', String(replaceExisting));

      const response = await api.post<UploadSummary>('/roles/upload-json', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setRoleFile(null);
      setUploadSummary(response.data);
      setMessage({ type: 'success', text: response.data.message || 'Role intelligence uploaded successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to upload role intelligence.') });
    } finally {
      setUploadingRoles(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden p-6 sm:p-8">
        <p className="eyebrow">Administration</p>
        <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
          Manage privileged users and maintain the election role intelligence dataset.
        </h2>
        <p className="mt-4 max-w-3xl text-base muted">
          This area is reserved for the superadmin workflow. Access control, onboarding, and role mapping uploads are now grouped into one clearer operations surface.
        </p>
      </section>

      {message && (
        <div
          className={`rounded-3xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/20 bg-red-500/10 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <article className="panel p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">Register a new admin</p>
              <p className="text-sm muted">Grant portal access to an approved email address.</p>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleRegister}>
            <div>
              <label className="mb-2 block text-sm font-semibold">Email address</label>
              <input
                className="field"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@iitk.ac.in"
                required
                type="email"
                value={email}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Password (optional)</label>
              <input
                className="field"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Defaults to Love@2004"
                type="password"
                value={password}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Role</label>
              <select className="field" onChange={(event) => setRole(event.target.value)} value={role}>
                <option value="ADMIN">Admin</option>
                <option value="SUPERADMIN">Superadmin</option>
              </select>
            </div>

            <button className="button-primary w-full" disabled={loading || !email} type="submit">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users2 className="h-4 w-4" />}
              Register user
            </button>
          </form>
        </article>

        <article className="panel overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[var(--line)] px-6 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
              <Users2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">Current access list</p>
              <p className="text-sm muted">All privileged portal users, newest first.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {fetchingUsers ? (
              <div className="px-6 py-14 text-center">
                <Loader2 className="mx-auto h-7 w-7 animate-spin text-[color:var(--accent)]" />
                <p className="mt-3 text-sm muted">Loading current access...</p>
              </div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--line)] bg-white/50 dark:bg-white/5">
                  <tr className="text-xs uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Verified</th>
                    <th className="px-6 py-4 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((record) => (
                    <tr key={record.id} className="border-b border-[var(--line)] last:border-b-0">
                      <td className="px-6 py-4">{record.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`status-pill ${
                            record.role === 'SUPERADMIN'
                              ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              : 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                          }`}
                        >
                          {record.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">{record.is_verified ? 'Yes' : 'No'}</td>
                      <td className="px-6 py-4">{new Date(record.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {!users.length && (
                    <tr>
                      <td className="px-6 py-10 text-center text-sm muted" colSpan={4}>
                        No privileged users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </article>
      </section>

      <section className="panel p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold">Role intelligence upload</p>
            <p className="text-sm muted">Import structured election-role mappings for student conflict detection.</p>
          </div>
        </div>

        <form className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]" onSubmit={handleRoleUpload}>
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--line-strong)] bg-white/55 px-6 py-12 text-center transition hover:bg-white/70 dark:bg-white/5 dark:hover:bg-white/10">
              <UploadCloud className="h-8 w-8 text-[color:var(--accent)]" />
              <p className="mt-4 text-base font-semibold">
                {roleFile ? roleFile.name : 'Choose role intelligence JSON'}
              </p>
              <p className="mt-2 text-sm muted">
                Upload the structured candidate, proposer, seconder, and campaigner dataset.
              </p>
              <input
                accept=".json,application/json"
                className="hidden"
                onChange={(event) => setRoleFile(event.target.files?.[0] || null)}
                type="file"
              />
            </label>

            <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm muted">
              Existing mappings for the selected year can be replaced automatically to keep the role graph clean and predictable.
            </div>
          </div>

          <div className="space-y-4 rounded-[28px] border border-[var(--line)] bg-white/55 p-5 dark:bg-white/5">
            <div>
              <label className="mb-2 block text-sm font-semibold">Election year</label>
              <input
                className="field"
                max={3000}
                min={2000}
                onChange={(event) => setUploadYear(Number(event.target.value))}
                type="number"
                value={uploadYear}
              />
            </div>

            <label className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3 text-sm dark:bg-white/5">
              <span>Replace existing mappings for this year</span>
              <input
                checked={replaceExisting}
                className="h-4 w-4 accent-[color:var(--accent)]"
                onChange={(event) => setReplaceExisting(event.target.checked)}
                type="checkbox"
              />
            </label>

            <button className="button-primary w-full" disabled={uploadingRoles || !roleFile} type="submit">
              {uploadingRoles ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Upload role JSON
            </button>

            {uploadSummary && (
              <div className="rounded-[28px] border border-[var(--line)] bg-white/70 p-4 text-sm dark:bg-white/5">
                <p className="font-semibold">Upload summary</p>
                <div className="mt-3 space-y-2 muted">
                  <p>Election year: {uploadSummary.election_year}</p>
                  <p>Groups processed: {uploadSummary.groups_processed}</p>
                  <p>Mappings created: {uploadSummary.mappings_created}</p>
                  <p>Conflicts detected: {uploadSummary.conflicts_detected}</p>
                </div>
                {!!uploadSummary.conflicts_detected && (
                  <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                      Conflict preview
                    </p>
                    <div className="mt-2 space-y-1 text-sm muted">
                      {uploadSummary.conflicts.slice(0, 3).map((conflict) => (
                        <p key={conflict.student_roll}>
                          {conflict.student_roll} is linked across {conflict.conflicts.length} overlapping election context(s).
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
