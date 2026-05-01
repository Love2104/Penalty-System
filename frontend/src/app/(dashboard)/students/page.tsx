'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2, Search, User as UserIcon, X } from 'lucide-react';
import api from '@/lib/api';
import StudentInfoButton from '@/components/StudentInfoButton';
import RoleBadges from '@/components/RoleBadges';
import { StudentRole } from '@/lib/role-intelligence';

interface Student {
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

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<{ halls: FilterOption[]; programs: FilterOption[] }>({
    halls: [],
    programs: [],
  });

  // Advanced filters
  const [dept, setDept] = useState('');
  const [hall, setHall] = useState('');
  const [program, setProgram] = useState('');

  const fetchStudents = async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await api.get('/students/search', {
        params: { q, page: targetPage, dept, hall, program }
      });
      setStudents(res.data.data);
      setMeta(res.data.meta);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    setLoadingFilters(true);
    try {
      const res = await api.get('/students/filters');
      setFilterOptions(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingFilters(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStudents();
    }, 350);
    return () => clearTimeout(delayDebounceFn);
  }, [page, q, dept, hall, program]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Student Database</h1>
        <p className="text-zinc-400">Search and verify student details securely.</p>
      </div>

      <div className="glass-card border-zinc-800 p-5 sm:p-6">
        <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by Name, Roll, or Email..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-zinc-800 bg-black/50 py-3 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <select
              value={hall}
              onChange={(e) => {
                setHall(e.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-zinc-800 bg-black/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All Halls</option>
              {filterOptions.halls.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>

            <select
              value={program}
              onChange={(e) => {
                setProgram(e.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-zinc-800 bg-black/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All Programs</option>
              {filterOptions.programs.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <span className="rounded-full border border-zinc-800 bg-black/40 px-3 py-1.5">
            {loadingFilters ? 'Loading hall/program filters...' : `${filterOptions.halls.length} halls loaded`}
          </span>
          <span className="rounded-full border border-zinc-800 bg-black/40 px-3 py-1.5">
            {filterOptions.programs.length} programs loaded
          </span>
          {(hall || program || dept || q) && (
            <button
              onClick={() => {
                setHall('');
                setProgram('');
                setDept('');
                setQ('');
                setPage(1);
              }}
              className="rounded-full border border-zinc-700 px-3 py-1.5 text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-black/30">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900/50 text-zinc-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Election Roles</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Program</th>
                <th className="px-6 py-4 font-medium">Dept</th>
                <th className="px-6 py-4 font-medium">Hall</th>
                <th className="px-6 py-4 font-medium text-right">Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Searching records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                students.map((student, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={student.roll} 
                    className="hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-zinc-300 flex items-center gap-3">
                      {student.image_url ? (
                        <img 
                          src={student.image_url} 
                          alt={`${student.name}'s profile`} 
                          className="h-8 w-8 rounded-full object-cover border border-zinc-700 bg-zinc-900 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          onClick={() => setSelectedImage(student.image_url)}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 fallback-icon ${student.image_url ? 'hidden' : ''}`}>
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-white">{student.name}</span>
                          {student.has_conflict && <AlertTriangle className="h-4 w-4 text-yellow-400" />}
                        </div>
                        <p className="text-xs text-zinc-500">{student.roll}</p>
                        {student.penalty_count >= 2 && (
                          <p className="mt-1 text-xs text-red-300">Repeat offender | {student.penalty_count} penalties</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadges roles={student.roles} maxVisible={2} />
                    </td>
                    <td className="px-6 py-4 text-zinc-400">{student.email || '-'}</td>
                    <td className="px-6 py-4 text-zinc-400">{student.program || '-'}</td>
                    <td className="px-6 py-4 text-zinc-400 truncate max-w-[150px]">{student.dept || '-'}</td>
                    <td className="px-6 py-4 text-zinc-400">{student.hall || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <StudentInfoButton roll={student.roll} />
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <span className="text-sm text-zinc-500">
              Showing page {meta.page} of {meta.totalPages} ({meta.total} records)
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-zinc-800 rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-800 transition-colors"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-4 py-2 border border-zinc-800 rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-800 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-900"
            >
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors z-10"
              >
                <X className="h-5 w-5" />
              </button>
              <img 
                src={selectedImage} 
                alt="Enlarged profile" 
                className="w-full h-full object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
