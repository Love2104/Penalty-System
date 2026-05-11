'use client';

import { useSyncExternalStore } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

const options = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

const subscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/70 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      {options.map(({ value, label, icon: Icon }) => {
        const isActive = mounted && theme === value;

        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
              isActive ? 'text-slate-950 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            type="button"
          >
            {isActive && (
              <motion.span
                layoutId="theme-pill"
                className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-slate-900"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
