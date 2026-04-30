'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Loader2, Save, Send, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export default function SheetDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [sheet, setSheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addingRow, setAddingRow] = useState(false);
  const [clauses, setClauses] = useState<any[]>([]);

  // Search autocomplete
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Row Form
  const [formData, setFormData] = useState({
    type: 'GBM',
    name: '',
    roll_no: '',
    email: '',
    clause: '',
    nature: 'Level 0',
    remarks: '',
    comment: ''
  });

  const fetchSheet = async () => {
    try {
      const res = await api.get(`/sheets/${id}`);
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
    } catch (error) {}
  };

  useEffect(() => {
    fetchSheet();
    fetchClauses();
  }, [id]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (studentQuery.length > 2 && addingRow) {
        setSearching(true);
        try {
          const res = await api.get('/students/search', { params: { q: studentQuery, limit: 5 } });
          setStudentResults(res.data.data);
        } catch(e) {}
        setSearching(false);
      } else {
        setStudentResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [studentQuery, addingRow]);

  const selectStudent = (student: any) => {
    setFormData(prev => ({
      ...prev,
      name: student.name,
      roll_no: student.roll,
      email: student.email || ''
    }));
    setStudentQuery('');
    setStudentResults([]);
  };

  const handleAddRow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/sheets/${id}/rows`, formData);
      setAddingRow(false);
      setFormData({
        type: 'GBM', name: '', roll_no: '', email: '', clause: '', nature: 'Level 0', remarks: '', comment: ''
      });
      fetchSheet();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add row');
    }
  };

  const deleteRow = async (rowId: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/sheets/${id}/rows/${rowId}`);
      fetchSheet();
    } catch (error) {
      console.error(error);
    }
  };

  const changeStatus = async (newStatus: string) => {
    try {
      await api.post(`/sheets/${id}/status`, { status: newStatus });
      fetchSheet();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to change status');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-zinc-500 h-8 w-8" /></div>;
  if (!sheet) return <div className="text-white text-center py-20">Sheet not found</div>;

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isDraft = sheet.status === 'DRAFT';
  const isReview = sheet.status === 'UNDER_REVIEW';
  const isApproved = sheet.status === 'FINAL_APPROVED';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/sheets')} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            {sheet.name}
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
              {sheet.status}
            </span>
          </h1>
          <p className="text-zinc-400">Created by {sheet.creator?.email || sheet.created_by}</p>
        </div>
        
        <div className="ml-auto flex gap-3">
          {isDraft && (
            <button onClick={() => changeStatus('UNDER_REVIEW')} className="bg-yellow-500 text-black font-semibold rounded-lg py-2.5 px-4 hover:bg-yellow-400 transition-colors flex items-center gap-2">
              <Send className="h-4 w-4" /> Submit for Review
            </button>
          )}
          {isReview && isSuperAdmin && (
            <>
              <button onClick={() => changeStatus('DRAFT')} className="bg-destructive text-white font-semibold rounded-lg py-2.5 px-4 hover:bg-red-600 transition-colors flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Reject to Draft
              </button>
              <button onClick={() => changeStatus('FINAL_APPROVED')} className="bg-green-500 text-black font-semibold rounded-lg py-2.5 px-4 hover:bg-green-400 transition-colors flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Approve Sheet
              </button>
            </>
          )}
          {isApproved && isSuperAdmin && (
            <button onClick={() => changeStatus('SENT')} className="bg-blue-500 text-white font-semibold rounded-lg py-2.5 px-4 hover:bg-blue-600 transition-colors flex items-center gap-2">
              <Send className="h-4 w-4" /> Dispatch Emails
            </button>
          )}
        </div>
      </div>

      <div className="glass-card overflow-hidden border-zinc-800">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-black/50">
          <h2 className="text-xl font-bold text-white">Penalty Records ({sheet.rows.length})</h2>
          {isDraft && (
            <button onClick={() => setAddingRow(!addingRow)} className="bg-white text-black font-medium rounded-lg py-2 px-4 hover:bg-zinc-200 transition-colors flex items-center gap-2 text-sm">
              <Plus className="h-4 w-4" /> Add Record
            </button>
          )}
        </div>

        {addingRow && isDraft && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="p-6 bg-zinc-900 border-b border-zinc-800">
            <form onSubmit={handleAddRow} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <label className="text-xs font-medium text-zinc-400 mb-1 block">Search Student</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input 
                      type="text" 
                      value={studentQuery}
                      onChange={(e) => setStudentQuery(e.target.value)}
                      placeholder="Type name or roll..." 
                      className="w-full bg-black/50 border border-zinc-700 rounded-lg py-2 pl-9 pr-3 text-white focus:ring-1 focus:ring-primary/50 text-sm"
                    />
                  </div>
                  {studentResults.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                      {studentResults.map(s => (
                        <div key={s.roll} onClick={() => selectStudent(s)} className="px-4 py-2 hover:bg-zinc-800 cursor-pointer text-sm text-white">
                          <span className="font-medium">{s.name}</span> <span className="text-zinc-500">({s.roll})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1 block">Name</label>
                  <input readOnly value={formData.name} className="w-full bg-black/50 border border-zinc-800 rounded-lg py-2 px-3 text-white text-sm opacity-70" required />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1 block">Roll No</label>
                  <input readOnly value={formData.roll_no} className="w-full bg-black/50 border border-zinc-800 rounded-lg py-2 px-3 text-white text-sm opacity-70" required />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Type</label>
                <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full bg-black/50 border border-zinc-700 rounded-lg py-2 px-3 text-white text-sm focus:ring-1 focus:ring-primary/50">
                  <option>GBM</option>
                  <option>Candidate</option>
                  <option>Office Bearer</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Clause</label>
                <select required value={formData.clause} onChange={(e) => setFormData({...formData, clause: e.target.value})} className="w-full bg-black/50 border border-zinc-700 rounded-lg py-2 px-3 text-white text-sm focus:ring-1 focus:ring-primary/50">
                  <option value="">Select Clause...</option>
                  {clauses.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                  <option value="Custom">Custom / Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Nature (Level)</label>
                <select value={formData.nature} onChange={(e) => setFormData({...formData, nature: e.target.value})} className="w-full bg-black/50 border border-zinc-700 rounded-lg py-2 px-3 text-white text-sm focus:ring-1 focus:ring-primary/50">
                  <option>Level 0</option><option>Level 1</option><option>Level 2</option>
                  <option>Level 3</option><option>Level 4</option><option>Level 5</option><option>Level 6</option>
                </select>
              </div>

              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1 block">Remarks (Official)</label>
                  <input required value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} placeholder="E.g., Warning Issued" className="w-full bg-black/50 border border-zinc-700 rounded-lg py-2 px-3 text-white text-sm focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1 block">Comment (Internal EC note)</label>
                  <input value={formData.comment} onChange={(e) => setFormData({...formData, comment: e.target.value})} placeholder="Internal note..." className="w-full bg-black/50 border border-zinc-700 rounded-lg py-2 px-3 text-white text-sm focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>

              <div className="lg:col-span-3 flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setAddingRow(false)} className="px-4 py-2 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-white text-black font-semibold rounded-lg text-sm hover:bg-zinc-200 flex items-center gap-2"><Save className="h-4 w-4" /> Save Record</button>
              </div>
            </form>
          </motion.div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-black text-zinc-400 uppercase text-xs border-b border-zinc-800">
              <tr>
                <th className="px-4 py-4 font-medium">Type</th>
                <th className="px-4 py-4 font-medium">Student</th>
                <th className="px-4 py-4 font-medium">Clause</th>
                <th className="px-4 py-4 font-medium">Level</th>
                <th className="px-4 py-4 font-medium">Remarks</th>
                {isDraft && <th className="px-4 py-4 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-black/30">
              {sheet.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">No records added yet.</td>
                </tr>
              ) : (
                sheet.rows.map((row: any) => (
                  <tr key={row.id} className="hover:bg-zinc-900/50 transition-colors group">
                    <td className="px-4 py-3 text-zinc-300">{row.type}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{row.name}</p>
                      <p className="text-xs text-zinc-500">{row.roll_no} • {row.email}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-300 truncate max-w-[200px]" title={row.clause}>{row.clause}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs border border-zinc-700 font-mono">
                        {row.nature}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-zinc-300 text-sm">{row.remarks}</p>
                      {row.comment && <p className="text-xs text-zinc-600 mt-1 italic">Note: {row.comment}</p>}
                    </td>
                    {isDraft && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteRow(row.id)} className="text-destructive hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          Delete
                        </button>
                      </td>
                    )}
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
