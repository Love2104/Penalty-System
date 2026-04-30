'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, FileText, Loader2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';

export default function SheetsPage() {
  const [sheets, setSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');

  const fetchSheets = async () => {
    try {
      const res = await api.get('/sheets');
      setSheets(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheets();
  }, []);

  const createSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSheetName.trim()) return;
    try {
      await api.post('/sheets', { name: newSheetName });
      setNewSheetName('');
      setIsCreating(false);
      fetchSheets();
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
      case 'UNDER_REVIEW': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'FINAL_APPROVED': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'SENT': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Penalty Sheets</h1>
          <p className="text-zinc-400">Manage and review student penalty records.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-white text-black font-semibold rounded-lg py-2.5 px-4 hover:bg-zinc-200 transition-colors flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Create Sheet
        </button>
      </div>

      {isCreating && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-card p-6"
        >
          <h2 className="text-xl font-bold text-white mb-4">Create New Sheet</h2>
          <form onSubmit={createSheet} className="flex gap-4">
            <input
              type="text"
              placeholder="E.g., Antaragni '24 Violations"
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              className="flex-1 bg-black/50 border border-zinc-800 rounded-lg py-2.5 px-4 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
            <button 
              type="button" 
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 border border-zinc-800 rounded-lg text-white hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200"
            >
              Create
            </button>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center">
            <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
          </div>
        ) : sheets.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-500 glass-card">
            No penalty sheets found. Create one to get started.
          </div>
        ) : (
          sheets.map((sheet, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={sheet.id}
            >
              <Link href={`/sheets/${sheet.id}`} className="block h-full">
                <div className="glass-card p-6 h-full hover:border-zinc-700 transition-colors group cursor-pointer flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                      <FileText className="h-6 w-6 text-zinc-400 group-hover:text-white transition-colors" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(sheet.status)}`}>
                      {sheet.status}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{sheet.name}</h3>
                  <div className="text-sm text-zinc-500 mb-6 flex-1">
                    <p>Created by: {sheet.creator.email}</p>
                    <p>Rows: {sheet._count.rows}</p>
                    <p>Date: {new Date(sheet.created_at).toLocaleDateString()}</p>
                  </div>
                  
                  <div className="flex items-center text-sm font-medium text-zinc-400 group-hover:text-white transition-colors mt-auto">
                    View Details
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
