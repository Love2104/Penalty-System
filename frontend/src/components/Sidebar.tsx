'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, FileText, LogOut, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Master Sheets', href: '/sheets', icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="w-64 border-r border-zinc-800 bg-black h-full flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3 text-white mb-8">
          <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-lg">EC Panel</span>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-white text-black font-medium' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
          {user?.role === 'SUPERADMIN' && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                pathname.startsWith('/admin')
                  ? 'bg-white text-black font-medium' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Shield className="h-5 w-5" />
              Admin Access
            </Link>
          )}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white truncate max-w-[140px]">{user?.email}</span>
            <span className="text-xs text-zinc-500">{user?.role}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
