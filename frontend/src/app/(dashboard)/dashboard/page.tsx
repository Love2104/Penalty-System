'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface DashboardStats {
  totalSpreadsheets: number;
  totalTabs: number;
  underReview: number;
  totalStudentsPenalized: number;
  recentTabs: any[];
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/sheets/dashboard-stats');
        setStats(res.data);
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { name: 'Total Files', value: stats?.totalSpreadsheets ?? 0, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Total Tabs', value: stats?.totalTabs ?? 0, icon: FileText, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { name: 'Under Review', value: stats?.underReview ?? 0, icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { name: 'Total Students Penalized', value: stats?.totalStudentsPenalized ?? 0, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Overview</h1>
        <p className="text-zinc-400">Welcome back, {user?.email}. Here is what's happening today.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={stat.name}
                className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-400 mb-1">{stat.name}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 min-h-[400px]">
              <h2 className="text-xl font-bold text-white mb-4">Recent Tabs</h2>
              <div className="space-y-4">
                {stats?.recentTabs.length === 0 ? (
                  <p className="text-zinc-500 text-sm">No penalty tabs created yet.</p>
                ) : (
                  stats?.recentTabs.map((sheet: any) => (
                    <div key={sheet.id} className="p-4 rounded-xl border border-zinc-800 bg-black/50 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-white line-clamp-1">{sheet.name}</p>
                        <p className="text-sm text-zinc-500">
                          Created {formatDistanceToNow(new Date(sheet.created_at), { addSuffix: true })} by {sheet.creator?.email}
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">{sheet.spreadsheet?.name}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        sheet.status === 'UNDER_REVIEW' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        sheet.status === 'FINAL_APPROVED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        sheet.status === 'SENT' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                      }`}>
                        {sheet.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 min-h-[400px]">
              <h2 className="text-xl font-bold text-white mb-4">Clause Distribution</h2>
              <div className="flex items-center justify-center h-full pb-10 text-zinc-500">
                [Chart Placeholder - e.g. Recharts Doughnut]
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
