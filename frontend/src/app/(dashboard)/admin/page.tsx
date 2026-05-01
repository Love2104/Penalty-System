'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { AlertTriangle, FileJson, Loader2, Shield, ShieldAlert, UploadCloud, UserPlus, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface User {
  id: string;
  email: string;
  role: string;
  is_verified: boolean;
  created_at: string;
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [roleFile, setRoleFile] = useState<File | null>(null);
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [uploadingRoles, setUploadingRoles] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<any | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setFetchingUsers(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'SUPERADMIN') {
      fetchUsers();
    }
  }, [user]);

  if (user?.role !== 'SUPERADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-zinc-400">You must be a Superadmin to view this page.</p>
      </div>
    );
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);
    try {
      await api.post('/auth/register', { email, role });
      setMessage({ type: 'success', text: 'Admin registered successfully!' });
      setEmail('');
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to register admin' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const response = await api.post('/roles/upload-json', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadSummary(response.data);
      setRoleFile(null);
      setMessage({ type: 'success', text: response.data.message || 'Role intelligence uploaded successfully.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to upload role intelligence JSON.' });
    } finally {
      setUploadingRoles(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Admin Management</h1>
        <p className="text-zinc-400">Add new Admins and manage existing access.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 lg:col-span-1 h-fit"
        >
          <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
            <div className="p-2 bg-zinc-900 rounded-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Register New User</h2>
          </div>

          {message && (
            <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@iitk.ac.in"
                className="w-full bg-black/50 border border-zinc-800 rounded-lg py-2.5 px-4 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-black/50 border border-zinc-800 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="ADMIN">Admin</option>
                <option value="SUPERADMIN">Superadmin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-white text-black font-semibold py-2.5 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Register User
            </button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
            <div className="p-2 bg-zinc-900 rounded-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Current Access List</h2>
          </div>

          {fetchingUsers ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 overflow-hidden bg-black/30">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-900/50 text-zinc-400 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium">Verified</th>
                    <th className="px-6 py-4 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${u.role === 'SUPERADMIN' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                          {u.role === 'SUPERADMIN' && <Shield className="h-3 w-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.is_verified ? (
                          <span className="text-green-400">Yes</span>
                        ) : (
                          <span className="text-zinc-500">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
          <div className="p-2 bg-zinc-900 rounded-lg">
            <FileJson className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Role Intelligence Upload</h2>
            <p className="text-sm text-zinc-500">CEO-only JSON ingestion for election role mapping.</p>
          </div>
        </div>

        <form onSubmit={handleRoleUpload} className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Election Role JSON</label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-black/40 px-6 py-10 text-center transition-colors hover:border-zinc-500 hover:bg-zinc-900/60">
                <UploadCloud className="h-8 w-8 text-zinc-400 mb-3" />
                <span className="text-sm font-medium text-white">
                  {roleFile ? roleFile.name : 'Choose role intelligence JSON'}
                </span>
                <span className="mt-2 text-xs text-zinc-500">
                  Upload the structured group/candidate/member dataset. Large files are supported.
                </span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(event) => setRoleFile(event.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm text-zinc-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
              <p>
                The upload is validated strictly. By default, it replaces all role mappings for the selected election year so re-uploads stay clean and fast.
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-zinc-800 bg-black/30 p-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Election Year</label>
              <input
                type="number"
                min={2000}
                max={3000}
                value={uploadYear}
                onChange={(event) => setUploadYear(Number(event.target.value))}
                className="w-full bg-black/50 border border-zinc-800 rounded-lg py-2.5 px-4 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
              <span>Replace existing mappings for this year</span>
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(event) => setReplaceExisting(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-black text-white"
              />
            </label>

            <button
              type="submit"
              disabled={uploadingRoles || !roleFile}
              className="w-full bg-white text-black font-semibold py-2.5 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {uploadingRoles && <Loader2 className="h-4 w-4 animate-spin" />}
              Upload Role JSON
            </button>

            {uploadSummary && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm">
                <p className="text-white font-semibold">Upload Summary</p>
                <div className="mt-3 space-y-2 text-zinc-400">
                  <p>Election year: {uploadSummary.election_year}</p>
                  <p>Groups processed: {uploadSummary.groups_processed}</p>
                  <p>Mappings created: {uploadSummary.mappings_created}</p>
                  <p>Conflicts detected: {uploadSummary.conflicts_detected}</p>
                </div>
                {uploadSummary.conflicts_detected > 0 && (
                  <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-yellow-200">
                    <p className="font-medium">Conflict preview</p>
                    <div className="mt-2 space-y-2 text-sm">
                      {uploadSummary.conflicts.slice(0, 3).map((conflict: any) => (
                        <p key={conflict.student_roll}>
                          {conflict.student_roll} linked across {conflict.conflicts.length} overlapping election context(s).
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
