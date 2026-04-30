'use client';

import { motion } from 'framer-motion';
import { Users, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const stats = [
  { name: 'Total Sheets', value: '12', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { name: 'Under Review', value: '3', icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { name: 'Approved', value: '7', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  { name: 'Total Students Penalized', value: '154', icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
];

export default function Dashboard() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Overview</h1>
        <p className="text-zinc-400">Welcome back, {user?.email}. Here is what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
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
          <h2 className="text-xl font-bold text-white mb-4">Recent Sheets</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-zinc-800 bg-black/50 flex justify-between items-center">
              <div>
                <p className="font-medium text-white">Antaragni '23 Penalty Sheet</p>
                <p className="text-sm text-zinc-500">Created 2 hours ago by admin</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                UNDER_REVIEW
              </span>
            </div>
            <div className="p-4 rounded-xl border border-zinc-800 bg-black/50 flex justify-between items-center">
              <div>
                <p className="font-medium text-white">Techkriti '24 Violations</p>
                <p className="text-sm text-zinc-500">Created 1 day ago by lovec23</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                FINAL_APPROVED
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 min-h-[400px]">
          <h2 className="text-xl font-bold text-white mb-4">Clause Distribution</h2>
          <div className="flex items-center justify-center h-full pb-10 text-zinc-500">
            [Chart Placeholder - e.g. Recharts Doughnut]
          </div>
        </div>
      </div>
    </div>
  );
}
