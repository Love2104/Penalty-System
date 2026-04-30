'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Loader2, User as UserIcon } from 'lucide-react';
import api from '@/lib/api';

interface Student {
  roll: string;
  name: string;
  email: string;
  program: string;
  dept: string;
  hall: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  // Advanced filters
  const [dept, setDept] = useState('');
  const [hall, setHall] = useState('');
  const [program, setProgram] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students/search', {
        params: { q, page, dept, hall, program }
      });
      setStudents(res.data.data);
      setMeta(res.data.meta);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchStudents();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [q, dept, hall, program]);

  useEffect(() => {
    fetchStudents();
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Student Database</h1>
        <p className="text-zinc-400">Search and verify student details securely.</p>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by Name, Roll, or Email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full bg-black/50 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          
          <div className="flex gap-4">
            <select 
              value={hall}
              onChange={(e) => setHall(e.target.value)}
              className="bg-black/50 border border-zinc-800 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All Halls</option>
              <option value="HALL3">Hall 3</option>
              <option value="HALL5">Hall 5</option>
              <option value="HALL12">Hall 12</option>
              <option value="GH">GH</option>
            </select>
            
            <select 
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="bg-black/50 border border-zinc-800 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All Programs</option>
              <option value="BTech">BTech</option>
              <option value="MTech">MTech</option>
              <option value="PhD">PhD</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-black/30">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900/50 text-zinc-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Roll No</th>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Program</th>
                <th className="px-6 py-4 font-medium">Dept</th>
                <th className="px-6 py-4 font-medium">Hall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Searching records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
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
                    <td className="px-6 py-4 font-medium text-white">{student.roll}</td>
                    <td className="px-6 py-4 text-zinc-300 flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center">
                        <UserIcon className="h-3 w-3" />
                      </div>
                      {student.name}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">{student.email}</td>
                    <td className="px-6 py-4 text-zinc-400">{student.program}</td>
                    <td className="px-6 py-4 text-zinc-400 truncate max-w-[150px]">{student.dept}</td>
                    <td className="px-6 py-4 text-zinc-400">{student.hall}</td>
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
    </div>
  );
}
